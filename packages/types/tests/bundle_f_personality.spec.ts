/**
 * Bundle F — Personality Fingerprints + Bundle H L.VIII-SC-03 interlock tests
 *
 * Phase 24b / Session 4b / Phase 4.8. Gates Phase 4.9 (Bundle G).
 *
 * Validates the 6 anchors:
 *   L.VI-SC-01 — personality_fingerprint $def (1:1 NPC binding)
 *   L.VI-SC-02 — archetype_enum (12 archetypes; harmonized with combatant.voice_archetype)
 *   L.VI-SC-03 — slide_trigger $def (from_archetype → to_archetype slide)
 *   L.VI-SC-04 — prompt_skeleton entity (UNIFIES Cluster A npc_prompt_skeleton)
 *   L.VI-SC-05 — fingerprint_waiver $def (Listening Child + Butcher)
 *   L.VIII-SC-03 — skeleton_cache $def (engine.* cache layer)
 */
import { describe, it, expect } from "vitest";
import {
  PersonalityFingerprintZ,
  SlideTriggerZ,
  FingerprintWaiverZ,
  SkeletonCacheZ,
  PromptSkeletonSchemaZ,
  CombatantSchemaZ,
} from "../src/zod-validators.js";

const minimalActionEconomy = { action: true, bonus_action: true, reaction: true };

describe("Bundle F / L.VI-SC-01 — personality_fingerprint", () => {
  it("accepts a Marrow-Saint fingerprint with ceremonial register", () => {
    const r = PersonalityFingerprintZ.safeParse({
      fingerprint_id: "fp_ilyra_001",
      npc_id: "npc_ilyra_marrow_saint",
      archetype_id: "marrow_saint",
      voice_register: "ceremonial",
      tonal_constraints: {
        max_sentence_words: 18,
        forbidden_register_drift_to: ["vernacular", "clinical"],
        required_lexical_anchors: ["the Unnamed", "marrow", "saint"],
      },
      drift_tolerance: 2,
      active_slide_trigger_ids: ["st_ilyra_to_contradiction_001"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects drift_tolerance > 10", () => {
    const r = PersonalityFingerprintZ.safeParse({
      fingerprint_id: "fp",
      npc_id: "n",
      archetype_id: "bell_magistrate",
      voice_register: "formal",
      tonal_constraints: {
        max_sentence_words: 20,
        forbidden_register_drift_to: [],
        required_lexical_anchors: [],
      },
      drift_tolerance: 11,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown archetype_id", () => {
    const r = PersonalityFingerprintZ.safeParse({
      fingerprint_id: "fp",
      npc_id: "n",
      archetype_id: "merchant_prince",
      voice_register: "formal",
      tonal_constraints: {
        max_sentence_words: 20,
        forbidden_register_drift_to: [],
        required_lexical_anchors: [],
      },
      drift_tolerance: 5,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown voice_register", () => {
    const r = PersonalityFingerprintZ.safeParse({
      fingerprint_id: "fp",
      npc_id: "n",
      archetype_id: "venn_hook",
      voice_register: "snarky",
      tonal_constraints: {
        max_sentence_words: 20,
        forbidden_register_drift_to: [],
        required_lexical_anchors: [],
      },
      drift_tolerance: 5,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle F / L.VI-SC-03 — slide_trigger", () => {
  it("accepts a marrow_saint → contradiction_bearer slide on canon_progression", () => {
    const r = SlideTriggerZ.safeParse({
      trigger_id: "st_ilyra_to_contradiction_001",
      from_archetype: "marrow_saint",
      to_archetype: "contradiction_bearer",
      trigger_kind: "canon_progression",
      conditions: [
        { predicate: "player.canon_progression.unnamed_witnessed >= 3", threshold: 3 },
      ],
      reversible: false,
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty conditions array", () => {
    const r = SlideTriggerZ.safeParse({
      trigger_id: "st",
      from_archetype: "bell_magistrate",
      to_archetype: "aesthete_magistrate",
      trigger_kind: "event_threshold",
      conditions: [],
      reversible: true,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown trigger_kind", () => {
    const r = SlideTriggerZ.safeParse({
      trigger_id: "st",
      from_archetype: "venn_hook",
      to_archetype: "butcher_who_repeats",
      trigger_kind: "moon_phase",
      conditions: [{ predicate: "x" }],
      reversible: true,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle F / L.VI-SC-05 — fingerprint_waiver", () => {
  it("accepts a Listening Child constraint_dominant waiver", () => {
    const r = FingerprintWaiverZ.safeParse({
      waiver_id: "fw_listening_child_001",
      npc_id: "npc_listening_child",
      reason: "constraint_dominant",
      override_skeleton_id: "ps_listening_child_override_001",
      notes: "Voice produces only echoed fragments of others' speech; cannot drift via standard fingerprint.",
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown reason", () => {
    const r = FingerprintWaiverZ.safeParse({
      waiver_id: "fw",
      npc_id: "n",
      reason: "author_preference",
      override_skeleton_id: "ps_x",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing override_skeleton_id", () => {
    const r = FingerprintWaiverZ.safeParse({
      waiver_id: "fw",
      npc_id: "n",
      reason: "ritual_prescribed",
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle H / L.VIII-SC-03 — skeleton_cache", () => {
  it("accepts a TTL-invalidated cache entry", () => {
    const r = SkeletonCacheZ.safeParse({
      cache_id: "sc_001",
      skeleton_id: "ps_marrow_saint_template",
      fingerprint_hash: "sha256:abc123...",
      cached_at_iso: "2026-05-21T22:30:00.000Z",
      cache_ttl_sec: 3600,
      invalidation_kind: "ttl",
      hit_count: 42,
      bytes_cached: 8192,
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown invalidation_kind", () => {
    const r = SkeletonCacheZ.safeParse({
      cache_id: "sc",
      skeleton_id: "ps",
      fingerprint_hash: "h",
      cached_at_iso: "2026-05-21T22:30:00.000Z",
      cache_ttl_sec: 0,
      invalidation_kind: "memory_pressure",
      hit_count: 0,
      bytes_cached: 0,
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative hit_count", () => {
    const r = SkeletonCacheZ.safeParse({
      cache_id: "sc",
      skeleton_id: "ps",
      fingerprint_hash: "h",
      cached_at_iso: "2026-05-21T22:30:00.000Z",
      cache_ttl_sec: 0,
      invalidation_kind: "session_end",
      hit_count: -1,
      bytes_cached: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle F / L.VI-SC-04 — prompt_skeleton entity", () => {
  it("accepts a Marrow-Saint archetype template skeleton (null npc_id)", () => {
    const r = PromptSkeletonSchemaZ.safeParse({
      skeleton_id: "ps_marrow_saint_template",
      archetype_id: "marrow_saint",
      npc_id: null,
      base_prompt: "You speak as a Marrow-Saint — ceremonial register, marrow imagery, {{npc_name}}.",
      voice_segments: [
        {
          segment_id: "vs_scene_open",
          trigger_kind: "scene_open",
          text_template: "The Unnamed listens. Speak slowly.",
        },
      ],
      constraint_block: {
        forbidden_phrases: ["lol", "okay so"],
        required_register: "ceremonial",
        max_response_tokens: 200,
      },
      cluster_a_override: false,
      schema_version: "v1",
    });
    expect(r.success).toBe(true);
  });

  it("accepts a Cluster A override skeleton with waiver FK", () => {
    const r = PromptSkeletonSchemaZ.safeParse({
      skeleton_id: "ps_listening_child_override_001",
      archetype_id: "listening_child",
      npc_id: "npc_listening_child",
      base_prompt: "Repeat last spoken line, fragmented.",
      voice_segments: [],
      constraint_block: {
        forbidden_phrases: [],
        required_register: "fragmentary",
        max_response_tokens: 40,
      },
      fingerprint_waiver_id: "fw_listening_child_001",
      cluster_a_override: true,
      schema_version: "v1",
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown schema_version", () => {
    const r = PromptSkeletonSchemaZ.safeParse({
      skeleton_id: "ps",
      archetype_id: "default_militant",
      base_prompt: "x",
      voice_segments: [],
      constraint_block: {
        forbidden_phrases: [],
        required_register: "formal",
        max_response_tokens: 1,
      },
      cluster_a_override: false,
      schema_version: "v2",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty base_prompt (min length 1)", () => {
    const r = PromptSkeletonSchemaZ.safeParse({
      skeleton_id: "ps",
      archetype_id: "scholar_witness",
      base_prompt: "",
      voice_segments: [],
      constraint_block: {
        forbidden_phrases: [],
        required_register: "clinical",
        max_response_tokens: 100,
      },
      cluster_a_override: false,
      schema_version: "v1",
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle F harmonization — combatant.voice_archetype shares personality_archetype enum", () => {
  it("accepts Cluster A archetype (butcher_who_repeats) on combatant", () => {
    const r = CombatantSchemaZ.safeParse({
      combatant_id: "cmb_butcher_001",
      base_npc_id: "npc_butcher_who_repeats",
      voice_archetype: "butcher_who_repeats",
      combat_block: {
        hp: { current: 12, max: 12 },
        ac: 11,
        initiative_modifier: 0,
        action_economy: minimalActionEconomy,
      },
      social_attacks: [],
    });
    expect(r.success).toBe(true);
  });

  it("rejects archetype removed from personality_archetype set", () => {
    const r = CombatantSchemaZ.safeParse({
      combatant_id: "cmb",
      base_npc_id: "n",
      voice_archetype: "barbarian_warlord",
      combat_block: {
        hp: { current: 1, max: 1 },
        ac: 10,
        initiative_modifier: 0,
        action_economy: minimalActionEconomy,
      },
      social_attacks: [],
    });
    expect(r.success).toBe(false);
  });
});
