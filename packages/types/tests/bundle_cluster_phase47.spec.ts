/**
 * Phase 4.7 — Cluster B BES + Cluster C CMB + FS-SC interlock tests
 *
 * Phase 24b / Session 4b / Phase 4.7. Gates Phase 4.8 (Bundle F).
 *
 * Validates the 8 anchors:
 *   FS-SC-01 — failure_state_branch entity (state.*) with FS-RULE-1 (handle_window ≥3 days)
 *   FS-SC-02 — point_of_no_return_marker $def with FS-RULE-2 (readable signal ≤1 day)
 *   BES-SC-01 — creature entity (content.*) with provenance + witness_payload
 *   BES-SC-02 — outcome_uncertainty_resolver $def (Unnamed-Touched echo)
 *   BES-SC-03 — cross_regional_presence $def (RT-26 single_mechanic_touch)
 *   CMB-SC-01 — combatant entity (content.*) with voice_archetype + social_attacks
 *   CMB-SC-02 — social_attack $def (intimidation/doctrinal_pressure/etc.)
 *   CMB-SC-03 — cosmological_redirection $def (Sum-Wraith Whisperer)
 */
import { describe, it, expect } from "vitest";
import {
  PointOfNoReturnMarkerZ,
  OutcomeUncertaintyResolverZ,
  CrossRegionalPresenceZ,
  SocialAttackZ,
  CosmologicalRedirectionZ,
  FailureStateBranchSchemaZ,
  CreatureSchemaZ,
  CombatantSchemaZ,
} from "../src/zod-validators.js";

const stateOwnership = { campaign_id: "campaign_khojen", session_id: "sess_001" };

const minimalDerivedStats = {
  str: 10, dex: 10, con: 10,
  int: 10, wis: 10, cha: 10,
};

const minimalActionEconomy = {
  action: true,
  bonus_action: true,
  reaction: true,
};

describe("Phase 4.7 / FS-SC-02 — point_of_no_return_marker", () => {
  it("accepts a marker with item_movement event + ≤1 day signal", () => {
    const r = PointOfNoReturnMarkerZ.safeParse({
      marker_id: "ponr_001",
      parent_branch_id: "fsb_apotheosis_unanswered",
      description: "The Drowned Church bell is rung at midnight signaling final ritual.",
      in_world_event: {
        kind: "scheduled_announcement",
        location_id: "loc_drowned_church_belfry",
      },
      emits_readable_signal_within_days: 1,
    });
    expect(r.success).toBe(true);
  });

  it("rejects signal window > 1 day (FS-RULE-2 violation)", () => {
    const r = PointOfNoReturnMarkerZ.safeParse({
      marker_id: "ponr_001",
      parent_branch_id: "fsb_x",
      description: "x",
      in_world_event: { kind: "item_movement" },
      emits_readable_signal_within_days: 2,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown in_world_event.kind", () => {
    const r = PointOfNoReturnMarkerZ.safeParse({
      marker_id: "ponr_001",
      parent_branch_id: "fsb_x",
      description: "x",
      in_world_event: { kind: "weather_change" },
      emits_readable_signal_within_days: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe("Phase 4.7 / FS-SC-01 — failure_state_branch", () => {
  it("accepts apotheosis-race spine-unanswered branch", () => {
    const r = FailureStateBranchSchemaZ.safeParse({
      branch_id: "fsb_apotheosis_unanswered",
      parent_plot_id: "plot_p_01_apotheosis_race",
      trigger: "spine_question_unanswered",
      cosmological_reach: "pan_world",
      winner_set: [{ actor_kind: "faction", actor_id: "fac_drowned_church" }],
      loser_set: [{ actor_kind: "npc", actor_id: "npc_ilyra" }],
      handle_window_days: 3,
      point_of_no_return_marker_ids: ["ponr_001"],
      branch_state: "armed",
      armed_at_day: 14,
      ...stateOwnership,
    });
    expect(r.success).toBe(true);
  });

  it("rejects handle_window_days < 3 (FS-RULE-1 violation)", () => {
    const r = FailureStateBranchSchemaZ.safeParse({
      branch_id: "fsb_x",
      parent_plot_id: "p",
      trigger: "central_npc_lost",
      cosmological_reach: "local",
      winner_set: [{ actor_kind: "npc", actor_id: "a" }],
      loser_set: [{ actor_kind: "npc", actor_id: "b" }],
      handle_window_days: 2,
      branch_state: "pending",
      ...stateOwnership,
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty winner_set", () => {
    const r = FailureStateBranchSchemaZ.safeParse({
      branch_id: "fsb_x",
      parent_plot_id: "p",
      trigger: "player_withdrawal",
      cosmological_reach: "regional",
      winner_set: [],
      loser_set: [{ actor_kind: "faction", actor_id: "f" }],
      handle_window_days: 5,
      branch_state: "pending",
      ...stateOwnership,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown trigger", () => {
    const r = FailureStateBranchSchemaZ.safeParse({
      branch_id: "fsb_x",
      parent_plot_id: "p",
      trigger: "asteroid_impact",
      cosmological_reach: "local",
      winner_set: [{ actor_kind: "npc", actor_id: "a" }],
      loser_set: [{ actor_kind: "npc", actor_id: "b" }],
      handle_window_days: 3,
      branch_state: "pending",
      ...stateOwnership,
    });
    expect(r.success).toBe(false);
  });
});

describe("Phase 4.7 / BES-SC-02 — outcome_uncertainty_resolver", () => {
  it("accepts an Unnamed-Touched echo resolver", () => {
    const r = OutcomeUncertaintyResolverZ.safeParse({
      primitive_id: "our_unnamed_echo_001",
      applies_to_creature_id: "cr_unnamed_touched_witness",
      trigger_event: "player_makes_eye_contact",
      uncertainty_window_days: 3,
      resolution_mechanic: "specific_liturgical_action",
      affects_engine_rolls_until_resolved: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing affects_engine_rolls_until_resolved", () => {
    const r = OutcomeUncertaintyResolverZ.safeParse({
      primitive_id: "x",
      applies_to_creature_id: "y",
      trigger_event: "z",
      uncertainty_window_days: 0,
      resolution_mechanic: "rest_required",
    });
    expect(r.success).toBe(false);
  });
});

describe("Phase 4.7 / BES-SC-03 — cross_regional_presence (RT-26 single_mechanic)", () => {
  it("accepts a pan-world creature with single mechanic touch", () => {
    const r = CrossRegionalPresenceZ.safeParse({
      primitive_id: "crp_wraith_class_001",
      creature_id: "cr_wraith_class",
      regions_present: [
        { region_id: "greywake", presence_kind: "endemic" },
        { region_id: "reg_north_passes", presence_kind: "rumor_only" },
      ],
      single_mechanic_touch: {
        mechanic_kind: "ledger_audit",
        description: "Wraith demands ledger reading wherever it manifests.",
      },
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown presence_kind", () => {
    const r = CrossRegionalPresenceZ.safeParse({
      primitive_id: "x",
      creature_id: "y",
      regions_present: [{ region_id: "r", presence_kind: "summoned" }],
      single_mechanic_touch: { mechanic_kind: "x", description: "y" },
    });
    expect(r.success).toBe(false);
  });
});

describe("Phase 4.7 / BES-SC-01 — creature entity", () => {
  it("accepts a named-tier Drowned Church creature", () => {
    const r = CreatureSchemaZ.safeParse({
      creature_id: "cr_drowned_lector",
      name: "Drowned Lector",
      description: "Bell-clad echo of a priest whose name was unmade.",
      provenance: "drowned_church",
      tier: "named",
      combat_block: {
        hp: { current: 24, max: 24 },
        ac: 14,
        derived_stats: minimalDerivedStats,
        traits: [{ name: "Bell-Echo", description: "Heard before seen." }],
        actions: [
          { name: "Drowned Touch", kind: "melee", to_hit: 5, damage: "1d8 cold" },
        ],
      },
      tags: ["drowned_church", "echo"],
      witness_payload: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown provenance", () => {
    const r = CreatureSchemaZ.safeParse({
      creature_id: "x",
      name: "x",
      provenance: "fey",
      tier: "scenery",
      combat_block: {
        hp: { current: 1, max: 1 },
        ac: 10,
        derived_stats: minimalDerivedStats,
        traits: [],
        actions: [],
      },
      tags: [],
      witness_payload: false,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown tier", () => {
    const r = CreatureSchemaZ.safeParse({
      creature_id: "x",
      name: "x",
      provenance: "mundane",
      tier: "demigod",
      combat_block: {
        hp: { current: 1, max: 1 },
        ac: 10,
        derived_stats: minimalDerivedStats,
        traits: [],
        actions: [],
      },
      tags: [],
      witness_payload: false,
    });
    expect(r.success).toBe(false);
  });
});

describe("Phase 4.7 / CMB-SC-02 — social_attack", () => {
  it("accepts a doctrinal_pressure attack", () => {
    const r = SocialAttackZ.safeParse({
      attack_id: "sa_doctrinal_001",
      name: "Liturgy of Sanctions",
      attack_kind: "doctrinal_pressure",
      range_in_scene_turns: 2,
      target_resistance: { stat: "will", dc: 14 },
      effect_on_failure: "Target gains 'doctrinally_marked' condition for 1 day.",
      effect_on_success: "Target shrugs off pressure; gains +1 to Will saves vs source.",
      ledger_record: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown attack_kind", () => {
    const r = SocialAttackZ.safeParse({
      attack_id: "x",
      name: "x",
      attack_kind: "physical_threat",
      target_resistance: { stat: "presence", dc: 10 },
      effect_on_failure: "x",
      effect_on_success: "y",
      ledger_record: false,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown target_resistance.stat", () => {
    const r = SocialAttackZ.safeParse({
      attack_id: "x",
      name: "x",
      attack_kind: "intimidation",
      target_resistance: { stat: "luck", dc: 10 },
      effect_on_failure: "x",
      effect_on_success: "y",
      ledger_record: false,
    });
    expect(r.success).toBe(false);
  });
});

describe("Phase 4.7 / CMB-SC-03 — cosmological_redirection", () => {
  it("accepts a Sum-Wraith Whisperer redirection", () => {
    const r = CosmologicalRedirectionZ.safeParse({
      primitive_id: "cr_001",
      applies_to_combatant_id: "cmb_sum_wraith_whisperer_npc_zev",
      target_entity_kind: "wraith",
      target_entity_id: "creature_sum_wraith_001",
      negotiation_ritual: {
        duration_minutes_in_game: 10,
        dc_check: { stat: "mind", dc: 16 },
        dc_modifiers: [
          { kind: "wraith_recognizes_caller", modifier: -2 },
          { kind: "ritual_interrupted", modifier: 4 },
        ],
      },
      effect_kind: "redirect_haunting",
      effect_duration: { unit: "game_day", count: 1 },
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown target_entity_kind", () => {
    const r = CosmologicalRedirectionZ.safeParse({
      primitive_id: "x",
      applies_to_combatant_id: "y",
      target_entity_kind: "demon",
      negotiation_ritual: {
        duration_minutes_in_game: 1,
        dc_check: { stat: "mind", dc: 10 },
      },
      effect_kind: "x",
      effect_duration: "y",
    });
    expect(r.success).toBe(false);
  });
});

describe("Phase 4.7 / CMB-SC-01 — combatant entity", () => {
  it("accepts an Aesthete-Magistrate combatant", () => {
    const r = CombatantSchemaZ.safeParse({
      combatant_id: "cmb_aesthete_magistrate_orro",
      base_npc_id: "npc_orro_bell_magistrate",
      voice_archetype: "aesthete_magistrate",
      combat_block: {
        hp: { current: 28, max: 28 },
        ac: 15,
        initiative_modifier: 2,
        action_economy: minimalActionEconomy,
        weapons: [{ name: "Ceremonial Cane", to_hit: 4, damage: "1d6 bludgeoning" }],
      },
      social_attacks: [
        {
          attack_id: "sa_001",
          name: "Aesthetic Judgment",
          attack_kind: "aesthetic_judgment",
          target_resistance: { stat: "presence", dc: 13 },
          effect_on_failure: "Target's next social roll suffers -2.",
          effect_on_success: "Target gains insight into Aesthete's true valuation.",
          ledger_record: false,
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown voice_archetype", () => {
    const r = CombatantSchemaZ.safeParse({
      combatant_id: "x",
      base_npc_id: "y",
      voice_archetype: "court_jester",
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

  it("rejects missing base_npc_id (per CMB-SC-01 NPC-derivation contract)", () => {
    const r = CombatantSchemaZ.safeParse({
      combatant_id: "x",
      voice_archetype: "default_militant",
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
