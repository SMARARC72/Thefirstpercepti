-- ============================================================================
-- Phase 24d / 6a.5.8.1.2 — ALTER state.failure_state_branch: Discipline-10 split
-- ============================================================================
-- Per ratified 6a.5.8.1 audit (Category A backlog #22). 6a.5.8.1.1 created
-- content.failure_state_branch_template; this migration drops the 7 TEMPLATE
-- columns from state.failure_state_branch and adds the FK to template.
--
-- Mirror of 6a.5.5.2 (plot/quest split) pattern.
--
-- Pre-ALTER assert: state.failure_state_branch empty (verified count=0
-- across multiple recent audits; re-asserted here to fail-fast if any row
-- appeared since 6a.5.8.0 triage).
--
-- Existing constraints affected:
--   - composite PK (campaign_id, branch_id) — already from 6a.5.7.1; PRESERVED
--   - FK fk_failure_state_branch_parent_plot_id (2-col composite to state.plot
--     from 6a.5.5.2) — DROPPED. Per BORDERLINE-FSB-1 Option A, the template
--     side now FKs to content.plot_template.plot_id (single PK; from 6a.5.8.1.1).
--     Per-campaign cascade preserved via existing fk_failure_state_branch_campaign_id
--     → public.campaign CASCADE.
--   - FK fk_failure_state_branch_campaign_id — PRESERVED
--
-- New constraint:
--   - FK fk_failure_state_branch_template_id: branch_id → content.failure_state_branch_template
--     ON DELETE RESTRICT (template is canon; can't be deleted while state rows exist)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Pre-ALTER hard assertion: empty table
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  fsb_count integer;
BEGIN
  SELECT count(*) INTO fsb_count FROM state.failure_state_branch;
  IF fsb_count <> 0 THEN
    RAISE EXCEPTION
      '6a.5.8.1.2 pre-ALTER assert failed: state.failure_state_branch must be empty. Found % rows.',
      fsb_count;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Drop the 2-column composite FK to state.plot (per BORDERLINE-FSB-1 Option A)
-- ----------------------------------------------------------------------------
ALTER TABLE "state"."failure_state_branch"
  DROP CONSTRAINT IF EXISTS "fk_failure_state_branch_parent_plot_id";

-- ----------------------------------------------------------------------------
-- Drop the 7 TEMPLATE columns
-- ----------------------------------------------------------------------------
ALTER TABLE "state"."failure_state_branch"
  DROP COLUMN IF EXISTS "parent_plot_id",
  DROP COLUMN IF EXISTS "trigger",
  DROP COLUMN IF EXISTS "cosmological_reach",
  DROP COLUMN IF EXISTS "winner_set",
  DROP COLUMN IF EXISTS "loser_set",
  DROP COLUMN IF EXISTS "handle_window_days",
  DROP COLUMN IF EXISTS "point_of_no_return_marker_ids";

-- ----------------------------------------------------------------------------
-- Add FK from state.branch_id to content.failure_state_branch_template.branch_id
-- ----------------------------------------------------------------------------
ALTER TABLE "state"."failure_state_branch"
  ADD CONSTRAINT "fk_failure_state_branch_template_id"
  FOREIGN KEY ("branch_id") REFERENCES "content"."failure_state_branch_template"("branch_id") ON DELETE RESTRICT;

COMMENT ON TABLE "state"."failure_state_branch" IS
  'Phase 24d 6a.5.8.1.2 — per-campaign mutable FS branch state. Definitional shape (parent_plot_id, trigger, cosmological_reach, winner_set, loser_set, handle_window_days, point_of_no_return_marker_ids) lives in content.failure_state_branch_template; this row FKs to branch_id there. Composite PK (campaign_id, branch_id) preserved from 6a.5.7.1. Discipline-10 split closes v0.8 backlog #22.';
