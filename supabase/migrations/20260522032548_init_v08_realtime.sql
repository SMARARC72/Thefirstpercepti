-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.10 — Realtime publications per ARD-013
-- ============================================================================
-- Per PHASE_24C_HANDOFF.md §Phase 5a.10 + ARD-013.
--
-- ARD-013 ratified 4 realtime channels for v0.8:
--   1. public.world_event       — append-only event log (insert)
--   2. state.plot                — plot pressure / spine_visibility changes (update)
--   3. state.quest               — quest state transitions (insert + update)
--   4. engine.surfacing_threshold_config — governor config changes (update)
--
-- Note: state.npc_state and engine.fs_firing_timeline listed in the handoff
-- aren't in v0.8 yet (npc_state is a Phase 24d entity; fs_firing_timeline is
-- engine.* deferred). They'll be added in later realtime migrations.
--
-- ARD-013 discipline: PUBLISH insert + update only (NEVER delete) — deletion
-- events would leak normalization-deferred shape changes to clients. Per-row
-- redaction handled by RLS at the subscriber boundary.
--
-- Idempotent: ALTER PUBLICATION ... ADD TABLE is safe because Supabase
-- provisions `supabase_realtime` empty by default; if a table is already
-- in the publication, ALTER ADD raises a duplicate_object error we ignore.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Ensure publication exists (Supabase auto-provisions this; safety net)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Add v0.8 tables to publication (insert + update only per ARD-013)
-- ----------------------------------------------------------------------------
-- world_event already exists from 20260521041724_game_state_init.sql.
-- The other 3 land via Phase 5a.4-5a.7 migrations earlier in this batch.
DO $$
BEGIN
  -- public.world_event (insert: new events surface to subscribers)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.world_event;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  -- state.plot (update: pressure changes, spine_visibility transitions)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE state.plot;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  -- state.quest (insert + update: quest spawning + state transitions)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE state.quest;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  -- engine.surfacing_threshold_config (update: governor tuning)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE engine.surfacing_threshold_config;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ----------------------------------------------------------------------------
-- Restrict publication operations: insert + update (NO delete per ARD-013)
-- ----------------------------------------------------------------------------
-- Supabase's default publication includes all operations. Override per ARD-013.
ALTER PUBLICATION supabase_realtime SET (publish = 'insert, update');

COMMENT ON PUBLICATION supabase_realtime IS
  'ARD-013 — v0.8 realtime channels. insert + update only (no delete). 4 tables: world_event / plot / quest / surfacing_threshold_config.';
