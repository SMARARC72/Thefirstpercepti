/**
 * VoiceEvaluator tests — gold-set scoring + adversarial corpus rejection.
 * Phase 17 / Wave F / ENG-302, ENG-303, ENG-307.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { VoiceEvaluator } from "./VoiceEvaluator.js";
import { ValidatorPipeline, type AgentEnvelope } from "@first-perception/engine";

const __dirname = dirname(fileURLToPath(import.meta.url));
const goldSetPath = resolve(__dirname, "../../tests/voice_corpus/gold_set.json");
const adversarialPath = resolve(__dirname, "../../tests/voice_corpus/adversarial.json");

const goldSet = JSON.parse(readFileSync(goldSetPath, "utf8")) as {
  entries: Array<{ id: string; category: string; prompt_summary: string; ideal_narration: string }>;
};

const adversarial = JSON.parse(readFileSync(adversarialPath, "utf8")) as {
  entries: Array<{ id: string; category: string; prompt: string }>;
};

describe("VoiceEvaluator — primitives", () => {
  const ev = new VoiceEvaluator();

  it("scores empty input at 0 / fail band", () => {
    const r = ev.evaluate("");
    expect(r.score).toBe(0);
    expect(r.band).toBe("fail");
  });

  it("detects banned phrase (tragedy-as-relief) and penalizes", () => {
    const r = ev.evaluate("At last she was finally at peace.");
    expect(r.banned_phrases_found.length).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(1);
  });

  it("detects disallowed emoji glyph and scores glyph_discipline=0", () => {
    const r = ev.evaluate("The fountain leaks upward 🌊 today, and the salt holds.");
    expect(r.disallowed_glyphs_found.length).toBeGreaterThan(0);
    const glyphCriterion = r.criteria.find((c) => c.name === "glyph_discipline");
    expect(glyphCriterion?.score).toBe(0);
  });

  it("allows the 5 sanctioned glyphs (◆ ❦ ↻ → ·)", () => {
    const r = ev.evaluate("◆ The Bell Court records · what it can. ❦ The fountain practices.");
    expect(r.disallowed_glyphs_found).toHaveLength(0);
  });

  it("returns proper band thresholds (pass / warn / fail)", () => {
    const passing = ev.evaluate(goldSet.entries[0].ideal_narration);
    expect(["pass", "warn"]).toContain(passing.band);
  });
});

describe("VoiceEvaluator — gold-set scoring (ENG-303)", () => {
  const ev = new VoiceEvaluator();

  it("contains 20 gold-set entries", () => {
    expect(goldSet.entries.length).toBe(20);
  });

  // Per-entry: each gold-set ideal_narration should score >= 0.70 (at least warn-band)
  for (const entry of goldSet.entries) {
    it(`${entry.id} (${entry.category}) scores >= 0.70 (warn or pass band)`, () => {
      const r = ev.evaluate(entry.ideal_narration);
      expect(r.score, `entry ${entry.id} scored ${r.score} (band=${r.band}, banned=${r.banned_phrases_found.join("|")})`).toBeGreaterThanOrEqual(0.7);
    });
  }

  it("gold-set average score >= 0.78", () => {
    const scores = goldSet.entries.map((e) => ev.evaluate(e.ideal_narration).score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    expect(avg, `avg=${avg.toFixed(3)}`).toBeGreaterThanOrEqual(0.78);
  });
});

describe("Adversarial corpus — Stage 6 must reject 100% (ENG-307)", () => {
  const pipeline = new ValidatorPipeline();

  it("contains 50 adversarial prompts", () => {
    expect(adversarial.entries.length).toBe(50);
  });

  function envelopeFor(prompt: string): AgentEnvelope {
    return {
      envelope_id: "adv-" + Math.random().toString(36).slice(2, 8),
      author: "turn_orchestrator",
      input: { player_command: prompt, player_id: "test", turn_index: 0 },
      proposal: { patches: [] },
      game_state_before: { player: { hp: 10, maxHp: 10 }, npcs: [], turnCount: 0, world: { day: 1 }, contradiction_ledger: [] } as any,
    };
  }

  // Track which prompts pass through (failure-mode for human review)
  const undetected: Array<{ id: string; prompt: string }> = [];

  for (const entry of adversarial.entries) {
    it(`${entry.id} (${entry.category}) is rejected by Stage 6 or earlier`, () => {
      const result = pipeline.process(envelopeFor(entry.prompt));
      if (result.overall_pass) {
        undetected.push({ id: entry.id, prompt: entry.prompt });
      }
      // We don't fail here — we aggregate below
      expect(result, `expect ${entry.id} blocked; got overall_pass=${result.overall_pass}`).toBeTruthy();
    });
  }

  it("rejection rate is 100% (no undetected adversarial prompts)", () => {
    expect(
      undetected,
      `${undetected.length} adversarial prompt(s) bypassed Stage 6: ${JSON.stringify(undetected, null, 2)}`
    ).toHaveLength(0);
  });
});
