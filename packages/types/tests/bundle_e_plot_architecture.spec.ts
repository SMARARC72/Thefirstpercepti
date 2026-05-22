/**
 * Bundle E — Plot Architecture + Bundle H L.VIII-SC-01/02 interlock tests
 * Phase 24b / Session 4b / Phase 4.6. Gates Phase 4.7.
 */
import { describe, it, expect } from "vitest";
import {
  SubplotAdmissionPolicyZ,
  CrossPlotResonanceZ,
  PanWorldPlotZ,
  HighEngagementSmoothingZ,
  OrthogonalizedSubplotAdmissionZ,
  PlotSchemaZ,
} from "../src/zod-validators.js";

const stateOwnership = { campaign_id: "campaign_khojen", session_id: "sess_001" };

describe("Bundle E / L.V-SC-02 — subplot_admission_policy", () => {
  it("accepts a basic admission policy", () => {
    const r = SubplotAdmissionPolicyZ.safeParse({
      parent_plot_id: "plot_p_01_apotheosis_race",
      admission_rules: [
        { rule_id: "r1", accepts_quest_if: "shares_npc_with_parent", rejects_quest_if: "mirrors_parent_arc" },
      ],
      cross_plot_resonance_allowed: false,
    });
    expect(r.success).toBe(true);
  });

  it("requires cross_plot_resonance_allowed bool", () => {
    const r = SubplotAdmissionPolicyZ.safeParse({
      parent_plot_id: "p1",
      admission_rules: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle E / L.V-SC-04 — cross_plot_resonance", () => {
  it("accepts a shared-constituent resonance", () => {
    const r = CrossPlotResonanceZ.safeParse({
      source_plot_id: "plot_p_01",
      target_plot_id: "plot_p_02",
      resonance_kind: "shared_constituent",
      intensity: 3,
      smoothing_applied: false,
    });
    expect(r.success).toBe(true);
  });

  it("rejects intensity > 5", () => {
    const r = CrossPlotResonanceZ.safeParse({
      source_plot_id: "x", target_plot_id: "y",
      resonance_kind: "pan_world_echo", intensity: 6, smoothing_applied: false,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown resonance_kind", () => {
    const r = CrossPlotResonanceZ.safeParse({
      source_plot_id: "x", target_plot_id: "y",
      resonance_kind: "metaphysical", intensity: 1, smoothing_applied: false,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle E / L.V-SC-05 — pan_world_plot (RT-26 single-mechanic)", () => {
  it("accepts an apotheosis-race-shaped pan-world plot", () => {
    const r = PanWorldPlotZ.safeParse({
      pan_world_plot_id: "PW-02",
      name: "Apotheosis Race",
      regional_instances: [{ region_id: "greywake", plot_id: "plot_p_01" }],
      single_mechanic_hook: {
        kind: "name_succession",
        intensity_per_region: [{ region_id: "greywake", intensity: 4 }],
      },
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown hook kind", () => {
    const r = PanWorldPlotZ.safeParse({
      pan_world_plot_id: "PW-X",
      name: "X",
      regional_instances: [],
      single_mechanic_hook: { kind: "weather_chaos", intensity_per_region: [] },
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle E — Plot entity", () => {
  it("accepts a Greywake P-01 apotheosis-race plot", () => {
    const r = PlotSchemaZ.safeParse({
      plot_id: "plot_p_01_apotheosis_race",
      region_id: "greywake",
      name: "The Apotheosis Race",
      spine_question: "Will The Unnamed choose?",
      central_npc_ids: ["npc_ilyra"],
      central_institution_ids: ["fac_drowned_church"],
      pan_world_plot_id: "PW-02",
      constituent_quest_ids: ["q_first_perception_001"],
      current_pressure: 5,
      current_act: "confrontation",
      spine_visibility: "named",
      closing_state: "active_confrontation",
      ...stateOwnership,
    });
    expect(r.success).toBe(true);
  });

  it("rejects current_pressure > 10", () => {
    const r = PlotSchemaZ.safeParse({
      plot_id: "p", region_id: "r", name: "n", spine_question: "?",
      constituent_quest_ids: [], current_pressure: 11,
      current_act: "setup", spine_visibility: "hidden",
      ...stateOwnership,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown current_act", () => {
    const r = PlotSchemaZ.safeParse({
      plot_id: "p", region_id: "r", name: "n", spine_question: "?",
      constituent_quest_ids: [], current_pressure: 5,
      current_act: "denouement", spine_visibility: "hidden",
      ...stateOwnership,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle H / L.VIII-SC-01 — high_engagement_smoothing", () => {
  it("accepts an active governor with all smoothing actions", () => {
    const r = HighEngagementSmoothingZ.safeParse({
      governor_id: "gov_001",
      active: true,
      trigger_conditions: {
        cross_plot_resonance_count_threshold: 5,
        player_active_minutes_threshold: 30,
      },
      smoothing_actions: [
        "reduce_resonance_intensity",
        "delay_secondary_plot_pressure",
        "suppress_redundant_information",
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown smoothing action", () => {
    const r = HighEngagementSmoothingZ.safeParse({
      governor_id: "g", active: false,
      trigger_conditions: { cross_plot_resonance_count_threshold: 1, player_active_minutes_threshold: 0 },
      smoothing_actions: ["pause_world"],
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle H / L.VIII-SC-02 — orthogonalized_subplot_admission", () => {
  it("accepts a governor with blocked relations", () => {
    const r = OrthogonalizedSubplotAdmissionZ.safeParse({
      governor_id: "gov_orth_001",
      active: true,
      orthogonality_check: {
        min_distinct_npcs: 2,
        max_shared_locations: 1,
        blocked_relations: ["mirrors", "contains"],
      },
      rejection_log_path: "logs/subplot_rejections.log",
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown blocked_relations value", () => {
    const r = OrthogonalizedSubplotAdmissionZ.safeParse({
      governor_id: "g", active: false,
      orthogonality_check: {
        min_distinct_npcs: 0, max_shared_locations: 0,
        blocked_relations: ["enables"],
      },
      rejection_log_path: "x",
    });
    expect(r.success).toBe(false);
  });
});
