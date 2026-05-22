/**
 * Bundle G — Information Economy interlock tests
 *
 * Phase 24b / Session 4b / Phase 4.9. Gates Phase 4.10 (Bundle H L.VIII-SC-04 audit).
 *
 * Validates the 7 anchors:
 *   L.VII-SC-01 — information entity (content.*)
 *   L.VII-SC-02 — info_class enum (RT-40 frozen 7-value)
 *   L.VII-SC-02 — concealment_policy $def
 *   L.VII-SC-03 — shaping_operator $def
 *   L.VII-SC-04 — third_party_document $def
 *   L.VII-SC-05 — archetype_lock $def
 *   L.VII-SC-07 — daily_news_3tier $def
 */
import { describe, it, expect } from "vitest";
import {
  InformationSchemaZ,
  ConcealmentPolicyZ,
  ShapingOperatorZ,
  ThirdPartyDocumentZ,
  ArchetypeLockZ,
  DailyNews3tierZ,
} from "../src/zod-validators.js";

const stateOwnership = { campaign_id: "campaign_khojen", session_id: "sess_001" };

describe("Bundle G / L.VII-SC-01 — information entity (RT-40 info_class)", () => {
  it("accepts an Ilyra-witnessed prophecy", () => {
    const r = InformationSchemaZ.safeParse({
      information_id: "info_unnamed_witnessed_001",
      content: "The Unnamed walks among us; the saint shall name them at the third bell.",
      info_class: "prophecy",
      source_npc_ids: ["npc_ilyra_marrow_saint"],
      veracity: "partial",
      half_life_days: 0,
      emerged_at_day: 5,
      tags: ["unnamed", "apotheosis"],
      ...stateOwnership,
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown info_class (RT-40 frozen)", () => {
    const r = InformationSchemaZ.safeParse({
      information_id: "info_x",
      content: "x",
      info_class: "gossip",
      veracity: "unknown",
      half_life_days: 7,
      emerged_at_day: 0,
      tags: [],
      ...stateOwnership,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown veracity", () => {
    const r = InformationSchemaZ.safeParse({
      information_id: "info_x",
      content: "x",
      info_class: "rumor",
      veracity: "fabricated",
      half_life_days: 1,
      emerged_at_day: 0,
      tags: [],
      ...stateOwnership,
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty content (min length 1)", () => {
    const r = InformationSchemaZ.safeParse({
      information_id: "info_x",
      content: "",
      info_class: "fact",
      veracity: "true",
      half_life_days: 0,
      emerged_at_day: 0,
      tags: [],
      ...stateOwnership,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle G / L.VII-SC-02 — concealment_policy", () => {
  it("accepts a marrow_saint-concealed doctrine policy", () => {
    const r = ConcealmentPolicyZ.safeParse({
      policy_id: "cp_marrow_doctrine_001",
      conceal_from_archetypes: ["aesthete_magistrate", "sergeant_of_sanctions"],
      reveal_on_trigger_kind: "ritual_performance",
      penalty_on_premature_reveal: "canon_event",
    });
    expect(r.success).toBe(true);
  });

  it("accepts skill_check reveal with DC", () => {
    const r = ConcealmentPolicyZ.safeParse({
      policy_id: "cp_x",
      conceal_from_archetypes: ["default_militant"],
      reveal_on_trigger_kind: "skill_check",
      reveal_dc: 18,
      penalty_on_premature_reveal: "relationship_damage",
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown reveal_on_trigger_kind", () => {
    const r = ConcealmentPolicyZ.safeParse({
      policy_id: "cp",
      conceal_from_archetypes: [],
      reveal_on_trigger_kind: "moon_phase",
      penalty_on_premature_reveal: "none",
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown archetype in conceal_from_archetypes", () => {
    const r = ConcealmentPolicyZ.safeParse({
      policy_id: "cp",
      conceal_from_archetypes: ["necromancer"],
      reveal_on_trigger_kind: "narrative_beat",
      penalty_on_premature_reveal: "none",
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle G / L.VII-SC-03 — shaping_operator", () => {
  it("accepts a butcher_who_repeats fragment operator", () => {
    const r = ShapingOperatorZ.safeParse({
      operator_id: "so_butcher_fragment_001",
      operator_kind: "fragment",
      applies_when_intermediary_archetype: "butcher_who_repeats",
      distortion_strength: 7,
    });
    expect(r.success).toBe(true);
  });

  it("rejects distortion_strength > 10", () => {
    const r = ShapingOperatorZ.safeParse({
      operator_id: "so",
      operator_kind: "amplify",
      applies_when_intermediary_archetype: "bell_magistrate",
      distortion_strength: 11,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown operator_kind", () => {
    const r = ShapingOperatorZ.safeParse({
      operator_id: "so",
      operator_kind: "obfuscate",
      applies_when_intermediary_archetype: "venn_hook",
      distortion_strength: 3,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle G / L.VII-SC-04 — third_party_document", () => {
  it("accepts a marginalia document containing one information", () => {
    const r = ThirdPartyDocumentZ.safeParse({
      document_id: "doc_marginalia_001",
      document_kind: "marginalia",
      contained_information_ids: ["info_001"],
      author_npc_id: "npc_scholar_witness",
      produced_at_day: 12,
      decay_rate: 3,
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty contained_information_ids (min 1)", () => {
    const r = ThirdPartyDocumentZ.safeParse({
      document_id: "doc",
      document_kind: "letter",
      contained_information_ids: [],
      author_npc_id: "n",
      produced_at_day: 0,
      decay_rate: 0,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown document_kind", () => {
    const r = ThirdPartyDocumentZ.safeParse({
      document_id: "doc",
      document_kind: "scroll",
      contained_information_ids: ["info_x"],
      author_npc_id: "n",
      produced_at_day: 0,
      decay_rate: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle G / L.VII-SC-05 — archetype_lock", () => {
  it("accepts a marrow_saint-permitted, aesthete-forbidden lock", () => {
    const r = ArchetypeLockZ.safeParse({
      lock_id: "al_marrow_doctrine_001",
      permitted_archetypes: ["marrow_saint", "contradiction_bearer"],
      forbidden_archetypes: ["aesthete_magistrate", "sergeant_of_sanctions"],
      unlock_condition: "canon_progression.unnamed_witnessed >= 5",
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown archetype in permitted_archetypes", () => {
    const r = ArchetypeLockZ.safeParse({
      lock_id: "al",
      permitted_archetypes: ["wizard"],
      forbidden_archetypes: [],
      unlock_condition: "x",
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle G / L.VII-SC-07 — daily_news_3tier", () => {
  it("accepts a 3-tier news day with institutional response triggers", () => {
    const r = DailyNews3tierZ.safeParse({
      tier_id: "dn_001",
      date_day: 14,
      tier1_local: ["info_local_001", "info_local_002"],
      tier2_regional: ["info_regional_001"],
      tier3_world: [],
      triggered_institutional_response_ids: ["irq_drowned_church_001"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects negative date_day", () => {
    const r = DailyNews3tierZ.safeParse({
      tier_id: "dn",
      date_day: -1,
      tier1_local: [],
      tier2_regional: [],
      tier3_world: [],
    });
    expect(r.success).toBe(false);
  });
});
