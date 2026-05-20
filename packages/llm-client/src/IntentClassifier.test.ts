import { describe, it, expect } from "vitest";
import { IntentClassifier, regexClassify } from "./IntentClassifier.js";
import type { LLMClient } from "./LLMClient.js";
import type { LLMResponse } from "./types.js";

function stubClient(content: string, latencyMs = 5): LLMClient {
  return {
    async complete(): Promise<LLMResponse> {
      return {
        id: "stub",
        content,
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        latencyMs,
      };
    },
    async *stream() {
      return {
        id: "stub",
        content: "",
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        latencyMs: 0,
      };
    },
    async chat(): Promise<LLMResponse> {
      return {
        id: "stub",
        content,
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        latencyMs,
      };
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
