/**
 * Bundle D — Quest Emergence interlock tests
 *
 * Phase 24b / Session 4a / Phase 4.5.
 * Final Session 4a phase. Gates Bundle E (Session 4b).
 *
 * Validates the 6 Bundle D anchors:
 *   1. quest_archetype — 8-value ENUM
 *   2. discovery_channel — 6-value ENUM + payload
 *   3. collision_pressure — 0..10 + 4-value kind ENUM
 *   4. surfacing_threshold_config — 7-thread hard cap
 *   5. subplot_graph_relation — relation_kind ENUM + emergence_path
 *   6. quest_closing_state — 8-value ENUM
 */
import { describe, it, expect } from "vitest";
import {
  DiscoveryChannelZ,
  CollisionPressureZ,
  SubplotGraphRelationZ,
  QuestSchemaZ,
  SurfacingThresholdConfigSchemaZ,
} from "../src/zod-validators.js";

describe("Bundle D / L.IV-SC-02 — discovery_channel", () => {
  it("accepts overheard channel with NPC source", () => {
    const r = DiscoveryChannelZ.safeParse({
      kind: "overheard",
      surface_at_day: 12,
      surface_via_npc_id: "npc_orro",
      surface_at_location_id: "loc_market_district",
    });
    expect(r.success).toBe(true);
  });

  it("accepts prophecy channel with required skill check", () => {
    const r = DiscoveryChannelZ.safeParse({
      kind: "prophecy",
      surface_at_day: 30,
      required_player_skill: { stat: "sense", dc: 15 },
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown discovery kind", () => {
    const r = DiscoveryChannelZ.safeParse({
      kind: "dreamed",
      surface_at_day: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle D / L.IV-SC-03 — collision_pressure", () => {
  it("accepts a want_overlap collision", () => {
    const r = CollisionPressureZ.safeParse({
      npc_id_a: "npc_ilyra",
      npc_id_b: "npc_butcher_who_repeats",
      pressure_value: 7,
      collision_kind: "want_overlap",
      emerged_at_day: 18,
    });
    expect(r.success).toBe(true);
  });

  it("rejects pressure_value > 10", () => {
    const r = CollisionPressureZ.safeParse({
      npc_id_a: "x",
      npc_id_b: "y",
      pressure_value: 11,
      collision_kind: "want_overlap",
      emerged_at_day: 0,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown collision_kind", () => {
    const r = CollisionPressureZ.safeParse({
      npc_id_a: "x",
      npc_id_b: "y",
      pressure_value: 5,
      collision_kind: "metaphysical",
      emerged_at_day: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle D / L.IV-SC-05 — subplot_graph_relation", () => {
  it("accepts a quest with subplot_of relation", () => {
    const r = SubplotGraphRelationZ.safeParse({
      quest_id: "q_001",
      parent_plot_id: "plot_p_01",
      related_quest_ids: [
        { quest_id: "q_002", relation_kind: "subplot_of" },
      ],
      emergence_path: ["evt_npc_collision_001", "evt_witness_002"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown relation_kind", () => {
    const r = SubplotGraphRelationZ.safeParse({
      quest_id: "q_001",
      related_quest_ids: [{ quest_id: "q_002", relation_kind: "fights" }],
      emergence_path: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle D — Quest entity", () => {
  it("accepts a 'want_collision' quest", () => {
    const r = QuestSchemaZ.safeParse({
      quest_id: "q_first_perception_001",
      name: "Two devout claim the Unnamed",
      archetype: "want_collision",
      discovery_channel: {
        kind: "overheard",
        surface_at_day: 5,
        surface_at_location_id: "loc_market_district",
      },
      collision_pressure: {
        npc_id_a: "npc_ilyra",
        npc_id_b: "npc_butcher_who_repeats",
        pressure_value: 8,
        collision_kind: "want_overlap",
        emerged_at_day: 4,
      },
      closing_state: "open",
      subplot_graph_relation: {
        quest_id: "q_first_perception_001",
        related_quest_ids: [],
        emergence_path: ["evt_collision_001"],
      },
      primary_npc_ids: ["npc_ilyra", "npc_butcher_who_repeats"],
      primary_faction_ids: ["fac_drowned"],
      emerged_at_day: 4,
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown archetype", () => {
    const r = QuestSchemaZ.safeParse({
      quest_id: "q",
      name: "x",
      archetype: "puzzle",
      discovery_channel: { kind: "overheard", surface_at_day: 0 },
      closing_state: "open",
      subplot_graph_relation: { quest_id: "q", related_quest_ids: [], emergence_path: [] },
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown closing_state", () => {
    const r = QuestSchemaZ.safeParse({
      quest_id: "q",
      name: "x",
      archetype: "discovery",
      discovery_channel: { kind: "stumbled", surface_at_day: 0 },
      closing_state: "victory_lap",
      subplot_graph_relation: { quest_id: "q", related_quest_ids: [], emergence_path: [] },
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle D / L.IV-SC-04 — surfacing_threshold_config (House governor)", () => {
  it("accepts canonical config (7-thread hard cap)", () => {
    const r = SurfacingThresholdConfigSchemaZ.safeParse({
      max_surfaced_per_region: 7,
      pressure_threshold: 6,
      recency_weight: 1.2,
      channel_priority: ["witnessed", "overheard", "requested"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects pressure_threshold > 10", () => {
    const r = SurfacingThresholdConfigSchemaZ.safeParse({
      max_surfaced_per_region: 7,
      pressure_threshold: 11,
      recency_weight: 1.0,
      channel_priority: ["overheard"],
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown channel in priority list", () => {
    const r = SurfacingThresholdConfigSchemaZ.safeParse({
      max_surfaced_per_region: 7,
      pressure_threshold: 5,
      recency_weight: 1.0,
      channel_priority: ["dreamed"],
    });
    expect(r.success).toBe(false);
  });
});
