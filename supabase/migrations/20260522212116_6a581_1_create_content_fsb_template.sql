-- ============================================================================
-- Phase 24d / 6a.5.8.1.1 — CREATE content.failure_state_branch_template
-- ============================================================================
-- Per ratified 6a.5.8.1 field-classification audit (Discipline 10 split for
-- state.failure_state_branch). Mirrors 6a.5.5.1 plot/quest template pattern.
--
-- Category A backlog #22 execution: separates 7 TEMPLATE columns out of
-- state.failure_state_branch into per-world definitional table. State table
-- ALTER lands in 6a.5.8.1.2.
--
-- Conventions (matches existing content.* shape):
--   - NO schema_version column (4-table content.* precedent: institution,
--     creature, plot_template, quest_template — all drop schema_version;
--     schema versioning implicit via gen pipeline)
--   - NO is_published column (anon-read works via role check; qual=true)
--   - created_at + updated_at default NOW()
--   - RLS enabled + 2 policies: anon_select + service_role_all
--
-- BORDERLINE-FSB-1 RATIFIED Option A: parent_plot_id FK target is
-- content.plot_template.plot_id (single PK), NOT state.plot composite FK.
-- Per-campaign cascade preserved via campaign_id chain on state side
-- (state.failure_state_branch.campaign_id → public.campaign CASCADE).
--
-- BORDERLINE-FSB-2 RATIFIED: handle_window_days is TEMPLATE-only. v0.9
-- difficulty mode override deferred to backlog #24 (conditional, only
-- activates if v0.9 difficulty mode design greenlit).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- content.failure_state_branch_template (10 cols)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "content"."failure_state_branch_template" (
  "branch_id"                       TEXT PRIMARY KEY NOT NULL,
  "parent_plot_id"                  TEXT NOT NULL,
  "trigger"                         "public"."failure_state_trigger" NOT NULL,
  "cosmological_reach"              "public"."failure_state_cosmological_reach" NOT NULL,
  "winner_set"                      JSONB NOT NULL,
  "loser_set"                       JSONB NOT NULL,
  "handle_window_days"              INTEGER NOT NULL,
  "point_of_no_return_marker_ids"   JSONB,
  "created_at"                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("handle_window_days" >= 3),
  CONSTRAINT "fk_failure_state_branch_template_parent_plot_id"
    FOREIGN KEY ("parent_plot_id") REFERENCES "content"."plot_template"("plot_id") ON DELETE RESTRICT
);

COMMENT ON TABLE "content"."failure_state_branch_template" IS
  'Phase 24d 6a.5.8.1 / FS-SC-01 TEMPLATE layer — definitional FS branch rows authored once per world. Carries 7 definitional columns (parent_plot_id, trigger, cosmological_reach, winner_set, loser_set, handle_window_days, point_of_no_return_marker_ids). Per-campaign mutable state lives in state.failure_state_branch FK''d here via branch_id. Matches 6a.5.5 plot/quest template pattern. Backlog #22 closed in v0.8.';

ALTER TABLE "content"."failure_state_branch_template" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select" ON "content"."failure_state_branch_template";
CREATE POLICY "anon_select" ON "content"."failure_state_branch_template"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "service_role_all" ON "content"."failure_state_branch_template";
CREATE POLICY "service_role_all" ON "content"."failure_state_branch_template"
  FOR ALL TO service_role USING (true) WITH CHECK (true);
