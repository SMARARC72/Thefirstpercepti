/**
 * Bundle A — NPC Behavior interlock tests
 *
 * Phase 24b / Session 4a / Phase 4.2.
 *
 * Gates Bundle B per House red-team #2: "For each bundle, author tests
 * BEFORE moving to the next bundle." If any of these tests fail, Bundle B
 * authoring does not begin.
 *
 * Validates the 6 Bundle A anchors against the generated Zod validators:
 *   1. want_model — intensity bound 1..5
 *   2. knowledge_tri_layer — knows/says/believes structure
 *   3. closing_conditions — ≥2 entries, ≥1 player_reachable (Death's binding rule)
 *   4. memory_archetype — closed enum
 *   5. ambition_tick — cadence enum + signed success_streak
 *   6. schedule_nesting — institution FK + variance_seed
 *
 * Source-NPC fixture validations (Ilyra, Orro, Venn, Listening Child, Butcher)
 * are deferred to Bundle A integration tests (Session 4b+) when the seed data
 * lands in Session 6.
 */
import { describe, it, expect } from "vitest";
import {
  WantModelZ,
  KnowledgeTriLayerZ,
  NpcClosingConditionEntryZ,
  AmbitionTickZ,
  ScheduleNestingZ,
  NpcSchemaZ,
} from "../src/zod-validators.js";

// ────────────────────────────────────────────────────────────────────────────
// L.I-SC-01 — want_model
// ────────────────────────────────────────────────────────────────────────────

describe("Bundle A / L.I-SC-01 — want_model", () => {
  it("accepts a minimal valid want_model", () => {
    const result = WantModelZ.safeParse({
      drive: { description: "be named", intensity: 4, freshness_decay: 7 },
      barter: [],
      kill_for: {
        trigger_condition: "Bell Court audit closes",
        threshold: "critical",
        target_class: "institution",
      },
      fear_loss: {
        what: "sister's parish standing",
        urgency: 3,
        abandons_drive_if_imminent: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects drive.intensity outside 1..5", () => {
    const result = WantModelZ.safeParse({
      drive: { description: "be named", intensity: 6, freshness_decay: 7 },
      barter: [],
      kill_for: {
        trigger_condition: "x",
        threshold: "warning",
        target_class: "self",
      },
      fear_loss: { what: "y", urgency: 2, abandons_drive_if_imminent: false },
    });
    expect(result.success).toBe(false);
  });

  it("rejects fear_loss.urgency outside 1..5", () => {
    const result = WantModelZ.safeParse({
      drive: { description: "x", intensity: 3, freshness_decay: 7 },
      barter: [],
      kill_for: {
        trigger_condition: "x",
        threshold: "warning",
        target_class: "self",
      },
      fear_loss: { what: "y", urgency: 0, abandons_drive_if_imminent: false },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown kill_for.threshold values", () => {
    const result = WantModelZ.safeParse({
      drive: { description: "x", intensity: 3, freshness_decay: 7 },
      barter: [],
      kill_for: {
        trigger_condition: "x",
        threshold: "extreme",
        target_class: "self",
      },
      fear_loss: { what: "y", urgency: 2, abandons_drive_if_imminent: false },
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// L.I-SC-02 — knowledge_tri_layer
// ────────────────────────────────────────────────────────────────────────────

describe("Bundle A / L.I-SC-02 — knowledge_tri_layer", () => {
  it("accepts NPC with knows[] populated, believes[] empty", () => {
    const result = KnowledgeTriLayerZ.safeParse({
      knows: [
        { fact_id: "event_001", certainty: 4 },
      ],
      says: { default_policy: "guarded" },
      believes: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown says.default_policy", () => {
    const result = KnowledgeTriLayerZ.safeParse({
      knows: [],
      says: { default_policy: "shouty" },
      believes: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects believes.conviction outside 1..5", () => {
    const result = KnowledgeTriLayerZ.safeParse({
      knows: [],
      says: { default_policy: "silent" },
      believes: [
        { proposition: "x", conviction: 7, evidence_resistance: 3 },
      ],
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// L.I-SC-03 — closing_conditions (Death's binding rule)
// ────────────────────────────────────────────────────────────────────────────

describe("Bundle A / L.I-SC-03 — closing_conditions entry", () => {
  it("accepts a success_state entry", () => {
    const result = NpcClosingConditionEntryZ.safeParse({
      kind: "success_state",
      description: "named by Unnamed",
      player_reachable: true,
      consequence_summary: "Marrow-Saint Ilyra ascends",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown kind", () => {
    const result = NpcClosingConditionEntryZ.safeParse({
      kind: "wandering_state",
      description: "x",
      player_reachable: true,
    });
    expect(result.success).toBe(false);
  });

  it("residue_drive.intensity bounded 1..5", () => {
    const result = NpcClosingConditionEntryZ.safeParse({
      kind: "passover_state",
      description: "Ilyra resigns from Drowned Church",
      player_reachable: true,
      residue_drive: { description: "quiet sabotage", intensity: 6 },
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// L.I-SC-04 — memory_archetype (closed enum, native Postgres type at DDL)
// ────────────────────────────────────────────────────────────────────────────

describe("Bundle A / L.I-SC-04 — memory_archetype (via NpcSchema)", () => {
  // Test via a minimal NpcSchema fixture (memory_archetype is a field on npc, not its own $def)
  const minimalNpc = {
    npc_id: "test_npc",
    name: "Test",
    role: "test",
    desire: "x",
    fear: "y",
    current_plan: "z",
    want_model: {
      drive: { description: "x", intensity: 3, freshness_decay: 5 },
      barter: [],
      kill_for: {
        trigger_condition: "x",
        threshold: "warning",
        target_class: "self",
      },
      fear_loss: { what: "y", urgency: 2, abandons_drive_if_imminent: false },
    },
    knowledge_tri_layer: {
      knows: [],
      says: { default_policy: "open" },
      believes: [],
    },
    closing_conditions: [
      { kind: "success_state", description: "ok", player_reachable: true },
      { kind: "death_state", description: "ko", player_reachable: false },
    ],
    ambition_tick: { cadence: "monthly", success_streak: 0 },
    schedule_nesting: {
      local_pattern: { summary: "wanders" },
      nested_under_institution_id: null,
      variance_seed: 42,
    },
  };

  it("accepts a valid memory_archetype enum value", () => {
    const result = NpcSchemaZ.safeParse({
      ...minimalNpc,
      memory_archetype: "magistrate",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown memory_archetype", () => {
    const result = NpcSchemaZ.safeParse({
      ...minimalNpc,
      memory_archetype: "wizard",
    });
    expect(result.success).toBe(false);
  });

  it("accepts 'contradiction_bearing' (Death's binding rule waiver)", () => {
    const result = NpcSchemaZ.safeParse({
      ...minimalNpc,
      memory_archetype: "contradiction_bearing",
    });
    expect(result.success).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// L.I-SC-05 — ambition_tick
// ────────────────────────────────────────────────────────────────────────────

describe("Bundle A / L.I-SC-05 — ambition_tick", () => {
  it("accepts signed success_streak (positive)", () => {
    const result = AmbitionTickZ.safeParse({
      cadence: "civic_6x_year",
      success_streak: 3,
    });
    expect(result.success).toBe(true);
  });

  it("accepts signed success_streak (negative — setback streak)", () => {
    const result = AmbitionTickZ.safeParse({
      cadence: "theological_irregular",
      success_streak: -2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown cadence", () => {
    const result = AmbitionTickZ.safeParse({
      cadence: "daily",
      success_streak: 0,
    });
    expect(result.success).toBe(false);
  });

  it("permits last_attempt null + next_scheduled_attempt null (NPC never attempted yet)", () => {
    const result = AmbitionTickZ.safeParse({
      cadence: "trade_season_8x_year",
      success_streak: 0,
      last_attempt: null,
      next_scheduled_attempt: null,
    });
    expect(result.success).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// L.I-SC-06 — schedule_nesting
// ────────────────────────────────────────────────────────────────────────────

describe("Bundle A / L.I-SC-06 — schedule_nesting", () => {
  it("accepts unaffiliated NPC (nested_under_institution_id null)", () => {
    const result = ScheduleNestingZ.safeParse({
      local_pattern: { summary: "wanders the docks" },
      nested_under_institution_id: null,
      variance_seed: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts NPC nested under an institution", () => {
    const result = ScheduleNestingZ.safeParse({
      local_pattern: {
        summary: "antechamber 04:00-06:00, dry-fountain vigil sunset",
        typical_locations_per_hour: [
          {
            hour_range: [4, 6],
            location_id: "loc_drowned_antechamber",
            activity: "vigil",
          },
        ],
      },
      nested_under_institution_id: "fac_drowned_church",
      variance_seed: 7,
    });
    expect(result.success).toBe(true);
  });

  it("rejects hour_range with values outside 0..23", () => {
    const result = ScheduleNestingZ.safeParse({
      local_pattern: {
        summary: "x",
        typical_locations_per_hour: [
          {
            hour_range: [4, 25],
            location_id: "x",
            activity: "y",
          },
        ],
      },
      nested_under_institution_id: null,
      variance_seed: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Interlock — Bundle A field requirement on NpcSchema
// ────────────────────────────────────────────────────────────────────────────

describe("Bundle A interlock — NpcSchema requires all 6 anchors", () => {
  it("rejects NPC missing want_model", () => {
    const result = NpcSchemaZ.safeParse({
      npc_id: "x",
      name: "x",
      role: "x",
      desire: "x",
      fear: "x",
      current_plan: "x",
      // want_model intentionally missing
      knowledge_tri_layer: { knows: [], says: { default_policy: "open" }, believes: [] },
      closing_conditions: [
        { kind: "success_state", description: "ok", player_reachable: true },
        { kind: "death_state", description: "ko", player_reachable: false },
      ],
      memory_archetype: "peasant",
      ambition_tick: { cadence: "monthly", success_streak: 0 },
      schedule_nesting: { local_pattern: { summary: "x" }, nested_under_institution_id: null, variance_seed: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects NPC with only 1 closing_condition (minItems violation)", () => {
    const result = NpcSchemaZ.safeParse({
      npc_id: "x",
      name: "x",
      role: "x",
      desire: "x",
      fear: "x",
      current_plan: "x",
      want_model: {
        drive: { description: "x", intensity: 3, freshness_decay: 5 },
        barter: [],
        kill_for: { trigger_condition: "x", threshold: "warning", target_class: "self" },
        fear_loss: { what: "y", urgency: 2, abandons_drive_if_imminent: false },
      },
      knowledge_tri_layer: { knows: [], says: { default_policy: "open" }, believes: [] },
      closing_conditions: [
        { kind: "success_state", description: "ok", player_reachable: true },
      ],
      memory_archetype: "peasant",
      ambition_tick: { cadence: "monthly", success_streak: 0 },
      schedule_nesting: { local_pattern: { summary: "x" }, nested_under_institution_id: null, variance_seed: 0 },
    });
    expect(result.success).toBe(false);
  });
});
