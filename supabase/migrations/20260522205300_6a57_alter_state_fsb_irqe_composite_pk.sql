-- ============================================================================
-- Phase 24d / 6a.5.7.1 — ALTER state.failure_state_branch + state.irqe to composite PK
-- ============================================================================
-- Per ratified 6a.5.7.0 audit (Risk 2 hardening; Path B promotion from 6a.5.6).
-- Brings remaining state.* tables to tenant-isolation composite-PK parity with
-- state.plot + state.quest (done in 6a.5.5.2 + annotated in 6a.5.6).
--
-- Tables:
--   - state.failure_state_branch:                drop PK(branch_id), add PK(campaign_id, branch_id)
--   - state.institution_response_queue_entry:    drop PK(id), add PK(campaign_id, id)
--
-- Pre-ALTER assert: both tables empty (verified count=0 in 6a.5.7.0 audit).
-- Hard assertion re-checks at apply time to fail-fast if rows appeared since.
--
-- No incoming FKs to either table (confirmed in 6a.5.7.0 audit — nothing
-- references failure_state_branch.branch_id or irqe.id from elsewhere).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Pre-ALTER hard assertion: empty tables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  fsb_count integer;
  irqe_count integer;
BEGIN
  SELECT count(*) INTO fsb_count FROM state.failure_state_branch;
  SELECT count(*) INTO irqe_count FROM state.institution_response_queue_entry;

  IF fsb_count <> 0 OR irqe_count <> 0 THEN
    RAISE EXCEPTION
      '6a.5.7.1 pre-ALTER assert failed: tables must be empty. state.failure_state_branch=%, state.institution_response_queue_entry=%',
      fsb_count, irqe_count;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- state.failure_state_branch: composite PK upgrade
-- ----------------------------------------------------------------------------
ALTER TABLE "state"."failure_state_branch"
  DROP CONSTRAINT "pk_failure_state_branch";

ALTER TABLE "state"."failure_state_branch"
  ADD CONSTRAINT "pk_failure_state_branch" PRIMARY KEY ("campaign_id", "branch_id");

COMMENT ON TABLE "state"."failure_state_branch" IS
  'Phase 24d 6a.5.7.1 — per-campaign FS branch state. Composite PK (campaign_id, branch_id) for tenant isolation parity with state.plot/state.quest. NOTE: Discipline-10 template/state split for this table flagged as v0.8.1 backlog #22 (some fields like trigger, cosmological_reach, winner_set, loser_set, handle_window_days are definitional; branch_state + armed_at_day are mutable per-campaign).';

-- ----------------------------------------------------------------------------
-- state.institution_response_queue_entry: composite PK upgrade
-- ----------------------------------------------------------------------------
ALTER TABLE "state"."institution_response_queue_entry"
  DROP CONSTRAINT "institution_response_queue_entry_pkey";

ALTER TABLE "state"."institution_response_queue_entry"
  ADD CONSTRAINT "institution_response_queue_entry_pkey" PRIMARY KEY ("campaign_id", "id");

COMMENT ON TABLE "state"."institution_response_queue_entry" IS
  'Phase 24d 6a.5.7.1 — per-campaign institution response queue entry. Composite PK (campaign_id, id) for tenant isolation parity. No Discipline-10 split needed (true STATE-only table; institution_id already FKs to content.institution).';
