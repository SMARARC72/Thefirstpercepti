/**
 * applyDisagreementRules tests — Phase 24c §5c.3.
 *
 * Verifies the rule-application abstraction that bridges RuleRegistry to
 * Stage 5 / engine surface layer / state manager write paths.
 */
import { describe, it, expect } from "vitest";
import { RuleRegistry, type EngineRule } from "./RuleRegistry.js";
import {
  applyDisagreementRules,
  type SourceObservation,
} from "./applyDisagreementRules.js";

const openingHoursRule: EngineRule = {
  rule_id: "opening_hours_disagreement_rule_v1",
  applies_to_entity: "institution",
  applies_to_field: "opening_hours",
  resolution_strategy: "highest_trust_source",
  fallback_strategy: "surface_disagreement",
  trust_ranking: [
    { source_kind: "institution_canonical_record", trust: 10 },
    { source_kind: "npc_with_role_inside_institution", trust: 8 },
    { source_kind: "third_party_document", trust: 6 },
    { source_kind: "npc_with_role_outside_institution", trust: 5 },
    { source_kind: "rumor", trust: 2 },
  ],
  side_effects_on_disagreement: [
    { kind: "emit_contradiction_ledger_entry", with_topic: "institution_opening_hours_disagreement" },
    { kind: "tag_information_veracity", with_veracity: "partial" },
    { kind: "surface_to_player_if_threshold", trust_delta_threshold: 3 },
  ],
  validator_chain_stage_5_hook: true,
};

describe("applyDisagreementRules / no observations", () => {
  it("returns null resolution + empty side-effects", () => {
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule] });
    const result = applyDisagreementRules(reg, "institution.opening_hours", []);
    expect(result.matched_rule).toBeNull();
    expect(result.resolved_observation).toBeNull();
    expect(result.had_disagreement).toBe(false);
  });
});

describe("applyDisagreementRules / no rule matches target", () => {
  it("returns first observation as default winner; no side-effects", () => {
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule] });
    const obs: SourceObservation[] = [
      { source_kind: "npc_with_role_inside_institution", value: "x" },
    ];
    const result = applyDisagreementRules(reg, "faction.something_else", obs);
    expect(result.matched_rule).toBeNull();
    expect(result.resolved_observation).toEqual(obs[0]);
    expect(result.side_effects).toEqual([]);
  });
});

describe("applyDisagreementRules / all sources agree (no disagreement)", () => {
  it("returns matched rule + first observation; no side-effects emitted", () => {
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule] });
    const obs: SourceObservation[] = [
      { source_kind: "institution_canonical_record", value: "first dawn" },
      { source_kind: "npc_with_role_inside_institution", value: "first dawn" },
    ];
    const result = applyDisagreementRules(reg, "institution.opening_hours", obs);
    expect(result.matched_rule?.rule_id).toBe("opening_hours_disagreement_rule_v1");
    expect(result.had_disagreement).toBe(false);
    expect(result.side_effects).toEqual([]); // No disagreement → no side-effects
    expect(result.resolved_observation?.value).toBe("first dawn");
  });
});

describe("applyDisagreementRules / highest_trust_source resolution", () => {
  it("picks the source with highest trust score", () => {
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule] });
    const obs: SourceObservation[] = [
      { source_kind: "rumor", value: "midnight" }, // trust 2
      { source_kind: "npc_with_role_inside_institution", value: "first dawn" }, // trust 8
      { source_kind: "institution_canonical_record", value: "second bell" }, // trust 10
    ];
    const result = applyDisagreementRules(reg, "institution.opening_hours", obs);
    expect(result.resolved_observation?.value).toBe("second bell");
    expect(result.resolved_observation?.source_kind).toBe("institution_canonical_record");
    expect(result.had_disagreement).toBe(true);
  });

  it("emits all declared side-effects when disagreement detected", () => {
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule] });
    const obs: SourceObservation[] = [
      { source_kind: "institution_canonical_record", value: "first dawn" },
      { source_kind: "rumor", value: "midnight" },
    ];
    const result = applyDisagreementRules(reg, "institution.opening_hours", obs);
    expect(result.side_effects).toHaveLength(3);
    expect(result.side_effects[0].kind).toBe("emit_contradiction_ledger_entry");
    expect(result.side_effects[1].kind).toBe("tag_information_veracity");
    expect(result.side_effects[1].with_veracity).toBe("partial");
    expect(result.side_effects[2].kind).toBe("surface_to_player_if_threshold");
    expect(result.side_effects[2].trust_delta_threshold).toBe(3);
  });

  it("surfaces stage_5_hook=true when rule has validator_chain_stage_5_hook", () => {
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule] });
    const obs: SourceObservation[] = [
      { source_kind: "institution_canonical_record", value: "x" },
      { source_kind: "rumor", value: "y" },
    ];
    const result = applyDisagreementRules(reg, "institution.opening_hours", obs);
    expect(result.stage_5_hook).toBe(true);
  });
});

describe("applyDisagreementRules / majority_consensus resolution", () => {
  it("returns the value with most votes", () => {
    const majorityRule: EngineRule = {
      rule_id: "majority_test_v1",
      applies_to_entity: "test",
      applies_to_field: "field",
      resolution_strategy: "majority_consensus",
      fallback_strategy: "surface_disagreement",
    };
    const reg = new RuleRegistry({ preloadedRules: [majorityRule] });
    const obs: SourceObservation[] = [
      { source_kind: "a", value: "X" },
      { source_kind: "b", value: "X" },
      { source_kind: "c", value: "Y" },
    ];
    const result = applyDisagreementRules(reg, "test.field", obs);
    expect(result.resolved_observation?.value).toBe("X");
  });

  it("returns null winner on tie (caller must use fallback)", () => {
    const majorityRule: EngineRule = {
      rule_id: "majority_test_v1",
      applies_to_entity: "test",
      applies_to_field: "field",
      resolution_strategy: "majority_consensus",
      fallback_strategy: "surface_disagreement",
    };
    const reg = new RuleRegistry({ preloadedRules: [majorityRule] });
    const obs: SourceObservation[] = [
      { source_kind: "a", value: "X" },
      { source_kind: "b", value: "Y" },
    ];
    const result = applyDisagreementRules(reg, "test.field", obs);
    expect(result.resolved_observation).toBeNull(); // tie → no winner; surface_disagreement
    expect(result.had_disagreement).toBe(true);
  });
});

describe("applyDisagreementRules / most_recent_source resolution", () => {
  it("returns first observation (caller orders newest-first)", () => {
    const recentRule: EngineRule = {
      rule_id: "recent_test_v1",
      applies_to_entity: "test",
      applies_to_field: "field",
      resolution_strategy: "most_recent_source",
      fallback_strategy: "use_default",
    };
    const reg = new RuleRegistry({ preloadedRules: [recentRule] });
    const obs: SourceObservation[] = [
      { source_kind: "newest", value: "Z" },
      { source_kind: "older", value: "Y" },
      { source_kind: "oldest", value: "X" },
    ];
    const result = applyDisagreementRules(reg, "test.field", obs);
    expect(result.resolved_observation?.value).toBe("Z");
  });
});

describe("applyDisagreementRules / Phase 4.10 scenario (Ilyra vs Orro on bell-tower hours)", () => {
  it("resolves Marrow-Saint Ilyra (npc inside) vs Bell-Magistrate Orro (institution_canonical) to the institutional record", () => {
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule] });
    // Player asks both about bell-tower opening hours;
    // Ilyra (npc with role inside) says "first dawn";
    // Orro (treated here as the institutional canonical record speaker) says "third bell"
    const obs: SourceObservation[] = [
      {
        source_kind: "npc_with_role_inside_institution",
        value: "first dawn",
        source_id: "npc_ilyra_marrow_saint",
      },
      {
        source_kind: "institution_canonical_record",
        value: "third bell after dawn",
        source_id: "npc_orro_bell_magistrate",
      },
    ];
    const result = applyDisagreementRules(reg, "institution.opening_hours", obs);
    expect(result.resolved_observation?.value).toBe("third bell after dawn");
    expect(result.resolved_observation?.source_id).toBe("npc_orro_bell_magistrate");
    expect(result.had_disagreement).toBe(true);
    // Side-effects propagate: ledger entry, veracity tag, player surface threshold
    expect(result.side_effects).toHaveLength(3);
    // Stage 5 should care about this resolution
    expect(result.stage_5_hook).toBe(true);
  });
});
