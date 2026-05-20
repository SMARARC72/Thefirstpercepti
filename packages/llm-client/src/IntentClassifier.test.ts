import { describe, it, expect } from "vitest";
import { IntentClassifier, regexClassify } from "./IntentClassifier.js";
import type { LLMClient } from "./LLMClient.js";
import type { LLMResponse } from "./types.js";

interface ChatCall {
  system: string;
  user: string;
  jsonMode?: boolean;
}

function stubClient(
  content: string,
  latencyMs = 5,
  calls: ChatCall[] = [],
): LLMClient {
  const reply = (): LLMResponse => ({
    id: "stub",
    content,
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    latencyMs,
  });
  return {
    async complete(): Promise<LLMResponse> {
      return reply();
    },
    async *stream() {
      return {
        id: "stub",
        content: "",
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        latencyMs: 0,
      };
    },
    async chat(opts): Promise<LLMResponse> {
      calls.push({ system: opts.system, user: opts.user, jsonMode: opts.jsonMode });
      return reply();
    },
  };
}

describe("regexClassify", () => {
  it("recognises movement verbs", () => {
    const intent = regexClassify("approach the fountain");
    expect(intent.reducer).toBe("move");
    expect(intent.verb).toBe("approach");
    expect(intent.target).toBe("the fountain");
    expect(intent.confidence).toBeGreaterThan(0.5);
  });

  it("recognises investigation verbs", () => {
    const intent = regexClassify("examine the fountain");
    expect(intent.reducer).toBe("investigation");
    // Investigation in our domain map sits under wilderness (perception
    // / sense). Lore would win if the command mentioned "names" or
    // "remember" — see the hint priority.
    expect(intent.domain).toBe("wilderness");
  });

  it("maps combat verbs to the combat reducer + combat domain", () => {
    const intent = regexClassify("attack the warden");
    expect(intent.reducer).toBe("combat");
    expect(intent.domain).toBe("combat");
  });

  it("falls back to narrative_only for unknown verbs", () => {
    const intent = regexClassify("recite an old debt");
    expect(intent.reducer).toBe("narrative_only");
  });
});

describe("IntentClassifier", () => {
  it("returns regex result when no client is configured", async () => {
    const classifier = new IntentClassifier();
    const intent = await classifier.classify("flee toward the market");
    expect(intent.reducer).toBe("move");
    expect(intent.source).toBe("regex");
  });

  it("uses the LLM client and caches the result", async () => {
    const llmJson = JSON.stringify({
      verb: "speak",
      target: "sister mourn",
      domain: "social",
      reducer: "dialogue",
      confidence: 0.92,
    });
    const classifier = new IntentClassifier({ client: stubClient(llmJson) });

    const first = await classifier.classify("ask Sister Mourn about the fountain");
    expect(first.source).toBe("llm");
    expect(first.reducer).toBe("dialogue");
    expect(first.target).toBe("sister mourn");

    const second = await classifier.classify("ask Sister Mourn about the fountain");
    expect(second.source).toBe("cache");
  });

  it("falls back to regex when LLM confidence is below threshold", async () => {
    const llmJson = JSON.stringify({
      verb: "wander",
      target: "",
      domain: "physical",
      reducer: "narrative_only",
      confidence: 0.2,
    });
    const classifier = new IntentClassifier({
      client: stubClient(llmJson),
      acceptThreshold: 0.5,
    });
    const intent = await classifier.classify("attack the warden");
    // attack is a combat verb in the regex map — fallback should win
    expect(intent.reducer).toBe("combat");
    expect(intent.source).toBe("regex");
  });

  it("falls back to regex when the LLM returns malformed JSON", async () => {
    const classifier = new IntentClassifier({
      client: stubClient("not json at all"),
    });
    const intent = await classifier.classify("rest by the wall");
    expect(intent.reducer).toBe("rest");
    expect(intent.source).toBe("regex");
  });
});

/**
 * Phase 8b regression specs: each test pins down a real misroute fixed
 * in the regex map + the schema-explicit LLM prompt. See the commit
 * message for the full before/after audit.
 */
describe("regexClassify — Phase 8b misroute fixes", () => {
  it("routes 'break the lock' to investigation (was narrative_only)", () => {
    const intent = regexClassify("break the lock");
    expect(intent.reducer).toBe("investigation");
    expect(intent.verb).toBe("break");
  });

  it("routes 'pick the lock' to investigation (lockpicking is a skill check, not item use)", () => {
    const intent = regexClassify("pick the lock");
    expect(intent.reducer).toBe("investigation");
  });

  it("routes 'go talk to the man at the gate' to dialogue (was move)", () => {
    const intent = regexClassify("go talk to the man at the gate");
    expect(intent.reducer).toBe("dialogue");
  });

  it("routes 'head over and ask the smith' to dialogue (was move)", () => {
    const intent = regexClassify("head over and ask the smith");
    expect(intent.reducer).toBe("dialogue");
  });

  it("routes 'take a closer look at the altar' to investigation (was item)", () => {
    const intent = regexClassify("take a closer look at the altar");
    expect(intent.reducer).toBe("investigation");
  });

  it("routes 'approach and attack the warden' to combat (was move)", () => {
    const intent = regexClassify("approach and attack the warden");
    expect(intent.reducer).toBe("combat");
  });

  it("does NOT match domain 'social' on 'stalk the priestess' (was social via 'talk' substring)", () => {
    // Word-boundary scan stops "stalk" leaking into the social hint via "talk".
    const intent = regexClassify("stalk the priestess");
    expect(intent.domain).toBe("stealth");
  });

  it("preserves plain 'talk to' → dialogue (no leading movement verb)", () => {
    const intent = regexClassify("talk to sister mourn");
    expect(intent.reducer).toBe("dialogue");
    expect(intent.domain).toBe("social");
  });

  it("still routes plain 'go to the market' → move (no dialogue verb present)", () => {
    const intent = regexClassify("go to the market");
    expect(intent.reducer).toBe("move");
  });
});

describe("IntentClassifier — Phase 8b LLM-prompt regression", () => {
  it("passes jsonMode=true through to the LLM client and embeds the schema in the system prompt", async () => {
    const calls: ChatCall[] = [];
    const llmJson = JSON.stringify({
      verb: "examine",
      target: "altar",
      domain: "wilderness",
      reducer: "investigation",
      confidence: 0.9,
    });
    const classifier = new IntentClassifier({
      client: stubClient(llmJson, 5, calls),
    });
    await classifier.classify("examine the altar");

    expect(calls).toHaveLength(1);
    expect(calls[0].jsonMode).toBe(true);
    // The schema-explicit prompt must enumerate every reducer kind so the
    // LLM can't invent a new value.
    const prompt = calls[0].system;
    for (const kind of [
      "move",
      "combat",
      "rest",
      "item",
      "dialogue",
      "investigation",
      "narrative_only",
    ]) {
      expect(prompt).toContain(kind);
    }
    expect(prompt).toMatch(/JSON only/i);
  });
});
