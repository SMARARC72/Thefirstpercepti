-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.6 — state.* tables (4 mutable runtime entities)
-- ============================================================================
-- Per PHASE_24C_HANDOFF.md §Phase 5a.6 (state namespace per ARD-010).
-- Source: extracted from gen-ddl lines 3652-3761.
--
-- Entities (all carry campaign_id + session_id REQUIRED per translation_rules §8):
-- - quest (Bundle D / L.IV)
-- - plot (Bundle E / L.V)
-- - institution_response_queue_entry (Bundle B / L.II-SC-02)
-- - failure_state_branch (Cluster B / FS-SC-01)
-- ============================================================================

-- ============================================================================
-- STATE schema — 4 entities
-- ============================================================================
-- quest (state.quest)
-- Phase 24b §4.5 / Bundle D — Quest entity. Quests emerge from collision_pressure crossing surfacing_threshold; harvest NPC want_models (Bundle A), institutional failures (Bundle B), and faction reach attempts (Bundle C). Bundle E clusters quests into plots. Source: Sec L.IV.
CREATE TABLE IF NOT EXISTS "state"."quest" (
  "quest_id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "tags" JSONB,
  "archetype" "public"."quest_archetype" NOT NULL,
  "discovery_channel" JSONB NOT NULL  /* $ref: #/$defs/discovery_channel */,
  "collision_pressure" JSONB  /* $ref: #/$defs/collision_pressure */,
  "closing_state" "public"."quest_closing_state" NOT NULL,
  "subplot_graph_relation" JSONB NOT NULL  /* $ref: #/$defs/subplot_graph_relation */,
  "primary_npc_ids" JSONB,
  "primary_faction_ids" JSONB,
  "primary_region_id" TEXT,
  "emerged_at_day" INTEGER,
  "campaign_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL DEFAULT 'v0.8',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("emerged_at_day" >= 0)
);
COMMENT ON TABLE "state"."quest" IS 'Phase 24b §4.5 / Bundle D — Quest entity. Quests emerge from collision_pressure crossing surfacing_threshold; harvest NPC want_models (Bundle A), institutional failures (Bundle B), and faction reach attempts (Bundle C). Bundle E clusters quests into plots. Source: Sec L.IV.';
ALTER TABLE "state"."quest" ENABLE ROW LEVEL SECURITY;

-- plot (state.plot)
-- Phase 24b §4.6 / Bundle E / L.V-SC-01 — Plot entity. Clusters constituent quests (Bundle D) around a spine_question; may anchor a pan_world_plot. Source: Sec L.V.
CREATE TABLE IF NOT EXISTS "state"."plot" (
  "plot_id" TEXT PRIMARY KEY NOT NULL,
  "region_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "tags" JSONB,
  "spine_question" TEXT NOT NULL,
  "central_npc_ids" JSONB,
  "central_institution_ids" JSONB,
  "pan_world_plot_id" TEXT,
  "constituent_quest_ids" JSONB NOT NULL,
  "current_pressure" SMALLINT NOT NULL,
  "current_act" "public"."plot_current_act" NOT NULL,
  "spine_visibility" "public"."spine_visibility" NOT NULL,
  "closing_state" "public"."plot_closing_state",
  "subplot_admission_policy" JSONB  /* $ref: #/$defs/subplot_admission_policy */,
  "campaign_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL DEFAULT 'v0.8',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("current_pressure" >= 0),
  CHECK ("current_pressure" <= 10)
);
COMMENT ON TABLE "state"."plot" IS 'Phase 24b §4.6 / Bundle E / L.V-SC-01 — Plot entity. Clusters constituent quests (Bundle D) around a spine_question; may anchor a pan_world_plot. Source: Sec L.V.';
ALTER TABLE "state"."plot" ENABLE ROW LEVEL SECURITY;

-- institution_response_queue_entry (state.institution_response_queue_entry)
-- Phase 24b §4.3 / Bundle B / L.II-SC-02 — Per-event entry in an institution's response queue. Lives in state.* schema (per ARD-010; mutable runtime queue). Engine writes entries when triggering events fire; resolves by NPC actions or institutional default policy.
CREATE TABLE IF NOT EXISTS "state"."institution_response_queue_entry" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "institution_id" TEXT NOT NULL,
  "trigger_event_id" TEXT NOT NULL,
  "proposed_response" TEXT NOT NULL,
  "decision_window" JSONB NOT NULL,
  "resolved_by_npc_ids" JSONB,
  "resolution_kind" "public"."institution_response_resolution_kind",
  "campaign_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL DEFAULT 'v0.8',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE "state"."institution_response_queue_entry" IS 'Phase 24b §4.3 / Bundle B / L.II-SC-02 — Per-event entry in an institution''s response queue. Lives in state.* schema (per ARD-010; mutable runtime queue). Engine writes entries when triggering events fire; resolves by NPC actions or institutional default policy.';
ALTER TABLE "state"."institution_response_queue_entry" ENABLE ROW LEVEL SECURITY;

-- failure_state_branch (state.failure_state_branch)
-- Phase 24b §4.7 / FS-SC-01 — Per-plot failure-state branch (lives in state.* because plot outcomes mutate per session). Holds trigger conditions, cosmological reach, winner/loser sets, and a handle window. Bound to FS-RULE-1 (≥3 day handle window) + FS-RULE-2 (readable signal via point_of_no_return_marker within 1 in-world day).
CREATE TABLE IF NOT EXISTS "state"."failure_state_branch" (
  "branch_id" TEXT PRIMARY KEY NOT NULL,
  "parent_plot_id" TEXT NOT NULL,
  "trigger" "public"."failure_state_trigger" NOT NULL,
  "cosmological_reach" "public"."failure_state_cosmological_reach" NOT NULL,
  "winner_set" JSONB NOT NULL,
  "loser_set" JSONB NOT NULL,
  "handle_window_days" INTEGER NOT NULL,
  "point_of_no_return_marker_ids" JSONB,
  "branch_state" "public"."failure_state_branch_state" NOT NULL,
  "armed_at_day" INTEGER,
  "resolved_at_day" INTEGER,
  "campaign_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL DEFAULT 'v0.8',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("handle_window_days" >= 3),
  CHECK ("armed_at_day" >= 0),
  CHECK ("resolved_at_day" >= 0)
);
COMMENT ON TABLE "state"."failure_state_branch" IS 'Phase 24b §4.7 / FS-SC-01 — Per-plot failure-state branch (lives in state.* because plot outcomes mutate per session). Holds trigger conditions, cosmological reach, winner/loser sets, and a handle window. Bound to FS-RULE-1 (≥3 day handle window) + FS-RULE-2 (readable signal via point_of_no_return_marker within 1 in-world day).';
ALTER TABLE "state"."failure_state_branch" ENABLE ROW LEVEL SECURITY;

