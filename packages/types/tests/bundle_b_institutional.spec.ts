/**
 * Bundle B — Institutional Reactivity interlock tests
 *
 * Phase 24b / Session 4a / Phase 4.3.
 * Gates Bundle C. Per House red-team #2 + handoff Discipline 2.
 *
 * Validates the 5 Bundle B anchors:
 *   1. institution_cadence — schedule_tier + baseline_resolution_unit enums
 *   2. institution_response_queue_entry — queue row shape + resolution_kind
 *   3. institution.jurisdictional_strength — 0..100 bound
 *   4. internal_factions[] — alignment_with_parent enum + influence_weight 1..5
 *   5. institution.institutional_memory_archetype — subset enum (4 values)
 */
import { describe, it, expect } from "vitest";
import {
  InstitutionCadenceZ,
  InternalFactionEntryZ,
  InstitutionSchemaZ,
  InstitutionResponseQueueEntrySchemaZ,
} from "../src/zod-validators.js";

describe("Bundle B / L.II-SC-01 — institution_cadence", () => {
  it("accepts canonical schedule_tier + baseline_resolution_unit combo", () => {
    const r = InstitutionCadenceZ.safeParse({
      schedule_tier: "civic_weekly",
      baseline_resolution_unit: "game_week",
      decision_cycle_per_unit: 1,
      member_npc_ids: ["npc_orro", "npc_clerk"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown schedule_tier", () => {
    const r = InstitutionCadenceZ.safeParse({
      schedule_tier: "hourly",
      baseline_resolution_unit: "game_day",
      decision_cycle_per_unit: 1,
      member_npc_ids: [],
    });
    expect(r.success).toBe(false);
  });

  it("rejects decision_cycle_per_unit < 1", () => {
    const r = InstitutionCadenceZ.safeParse({
      schedule_tier: "ngo_internal",
      baseline_resolution_unit: "game_day",
      decision_cycle_per_unit: 0,
      member_npc_ids: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle B / L.II-SC-04 — internal_faction_entry", () => {
  it("accepts a reformist sub-faction", () => {
    const r = InternalFactionEntryZ.safeParse({
      sub_faction_id: "sub_drowned_reformist",
      sub_faction_name: "Drowned Church Reformist Wing",
      member_npc_ids: ["npc_ilyra"],
      alignment_with_parent: "reformist",
      influence_weight: 3,
    });
    expect(r.success).toBe(true);
  });

  it("rejects influence_weight outside 1..5", () => {
    const r = InternalFactionEntryZ.safeParse({
      sub_faction_id: "x",
      sub_faction_name: "x",
      alignment_with_parent: "loyal",
      influence_weight: 6,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown alignment_with_parent", () => {
    const r = InternalFactionEntryZ.safeParse({
      sub_faction_id: "x",
      sub_faction_name: "x",
      alignment_with_parent: "neutral",
      influence_weight: 3,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle B — Institution entity", () => {
  const minimalCadence = {
    schedule_tier: "civic_weekly" as const,
    baseline_resolution_unit: "game_week" as const,
    decision_cycle_per_unit: 1,
    member_npc_ids: [],
  };

  it("accepts a Bell-Court-shaped institution", () => {
    const r = InstitutionSchemaZ.safeParse({
      institution_id: "fac_civic_bell_court",
      name: "Bell Court",
      description: "Civic magistrate institution",
      institution_cadence: minimalCadence,
      jurisdictional_strength: 75,
      internal_factions: [],
      institutional_memory_archetype: "magistrate",
    });
    expect(r.success).toBe(true);
  });

  it("rejects jurisdictional_strength outside 0..100", () => {
    const r = InstitutionSchemaZ.safeParse({
      institution_id: "x",
      name: "x",
      institution_cadence: minimalCadence,
      jurisdictional_strength: 150,
      internal_factions: [],
      institutional_memory_archetype: "broker",
    });
    expect(r.success).toBe(false);
  });

  it("rejects NPC-only archetypes (memory_archetype subset enforcement)", () => {
    // peasant/soldier/aspirant_divine/child/contradiction_bearing are NPC-only;
    // institutional_memory_archetype permits only devout/magistrate/scholar/broker
    const r = InstitutionSchemaZ.safeParse({
      institution_id: "x",
      name: "x",
      institution_cadence: minimalCadence,
      jurisdictional_strength: 50,
      internal_factions: [],
      institutional_memory_archetype: "peasant",
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle B / L.II-SC-02 — institution_response_queue_entry", () => {
  // Phase 4a.5 — state.* ownership sweep adds campaign_id + session_id REQUIRED.
  const stateOwnership = {
    campaign_id: "campaign_khojen_001",
    session_id: "sess_001",
  };

  it("accepts a pending queue entry (resolution_kind omitted while open)", () => {
    const r = InstitutionResponseQueueEntrySchemaZ.safeParse({
      id: "queue_001",
      institution_id: "fac_civic_bell_court",
      trigger_event_id: "evt_player_deicide_attempt",
      proposed_response: "Issue writ of summons by 7th bell.",
      decision_window: { start_day: 12, close_day: 14 },
      resolved_by_npc_ids: [],
      ...stateOwnership,
    });
    expect(r.success).toBe(true);
  });

  it("accepts a resolved queue entry with 'decisive' kind", () => {
    const r = InstitutionResponseQueueEntrySchemaZ.safeParse({
      id: "queue_002",
      institution_id: "fac_civic_bell_court",
      trigger_event_id: "evt_x",
      proposed_response: "Summons issued.",
      decision_window: { start_day: 12, close_day: 14 },
      resolved_by_npc_ids: ["npc_orro"],
      resolution_kind: "decisive",
      ...stateOwnership,
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown resolution_kind", () => {
    const r = InstitutionResponseQueueEntrySchemaZ.safeParse({
      id: "x",
      institution_id: "y",
      trigger_event_id: "z",
      proposed_response: "x",
      decision_window: { start_day: 1, close_day: 2 },
      resolution_kind: "negotiated",
    });
    expect(r.success).toBe(false);
  });
});
