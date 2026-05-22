-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.8 — ARD-016 dual-write phase A
-- ============================================================================
-- Per PHASE_24C_HANDOFF.md §Phase 5a.8 + ARD-016.
-- Three-phase migration plan (JSONB monolith → normalized persistence):
--   Phase A (THIS migration): KEEP public.save_snapshot.world_state_blob JSONB
--          intact; ADD schema_version metadata column noting v0.8 cutover.
--   Phase B (Session 24f): repository code dual-writes (blob + normalized).
--   Phase C (Session 24g+): drop blob, validate normalized parity.
--
-- This migration is annotation-only — no destructive changes. The world_state_blob
-- column is the escape hatch during the transition. New v0.8 reads/writes
-- target the normalized tables (state.*); legacy code paths still resolve via
-- the JSONB blob until Phase B repository wiring lands.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- save_snapshot schema_version annotation
-- ----------------------------------------------------------------------------
-- save_snapshot exists from 20260521041724_game_state_init.sql. Add a
-- schema_version column if not present so downstream code can tell which
-- snapshots are pre-v0.8 (interpret via legacy blob) vs v0.8+ (interpret
-- via normalized state.* tables when populated).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'save_snapshot'
      AND column_name = 'schema_version'
  ) THEN
    ALTER TABLE "public"."save_snapshot"
      ADD COLUMN "schema_version" TEXT NOT NULL DEFAULT 'v0.7';
    COMMENT ON COLUMN "public"."save_snapshot"."schema_version" IS
      'ARD-016 Phase A — set to "v0.8" by Phase B repository writes; "v0.7" for legacy snapshots.';
  END IF;
END $$;

-- Table-level comment marks the dual-write transitional status.
COMMENT ON TABLE "public"."save_snapshot" IS
  'ARD-016 Phase A — world_state_blob retained as escape hatch during v0.8 cutover. Phase B (Session 24f) wires repository code to dual-write blob + normalized state.*. Phase C drops the blob.';
