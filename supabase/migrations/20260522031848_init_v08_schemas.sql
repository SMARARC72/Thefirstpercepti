-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.1 — Extensions + schema namespaces init
-- ============================================================================
-- Per PHASE_24C_HANDOFF.md §Phase 5a.1.
-- Establishes the v0.8 schema partition (ARD-010) + required extensions +
-- shared updated_at trigger function (translation_rules_v0.8.md §7).
--
-- Idempotent: IF NOT EXISTS / CREATE OR REPLACE used throughout so re-running
-- against an already-bootstrapped database is safe.
--
-- Order matters: extensions → schemas → helper functions. Tables come in
-- Phase 5a.4+ migrations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions (per ARD-011 §3 JSONB rules + Phase 24c handoff §5a.1)
-- ----------------------------------------------------------------------------
-- pgcrypto: gen_random_uuid() for default UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- citext: case-insensitive text comparisons (used for names, slugs)
CREATE EXTENSION IF NOT EXISTS "citext";

-- pg_trgm: trigram similarity for fuzzy search (NPC name search, tag search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- btree_gin: GIN indexes on btree-supported types (tags arrays, JSONB indexes)
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- pg_jsonschema: JSONB CHECK constraints against JSON Schema (ARD-011 §3)
-- Available on Supabase Free+ tier. If unavailable on your tier, this migration
-- will fail loudly — flag to Khoja before downgrading the constraint discipline.
CREATE EXTENSION IF NOT EXISTS "pg_jsonschema";

-- ----------------------------------------------------------------------------
-- Schema namespaces (per ARD-010 5-schema partition)
-- ----------------------------------------------------------------------------
-- public:   pre-existing v0.7 tables (opex, save_snapshot, game_state, etc.)
-- content:  authored, read-mostly canonical data (NPCs, factions, items, plots)
-- state:    mutable runtime state (per-campaign / per-session)
-- behavior: derived projections (materialized views over state.*)
-- engine:   engine internals (producer logs, caches, scheduled tasks)
CREATE SCHEMA IF NOT EXISTS "content";
CREATE SCHEMA IF NOT EXISTS "state";
CREATE SCHEMA IF NOT EXISTS "behavior";
CREATE SCHEMA IF NOT EXISTS "engine";

COMMENT ON SCHEMA "content" IS 'ARD-010 §1: authored canonical content. Read-mostly, ships with the game.';
COMMENT ON SCHEMA "state" IS 'ARD-010 §2: per-campaign mutable runtime state. RLS-enforced.';
COMMENT ON SCHEMA "behavior" IS 'ARD-010 §3: derived projections (materialized views) over state.*. Refresh via Stage 6.';
COMMENT ON SCHEMA "engine" IS 'ARD-010 §4: engine internals. Service-role-only access.';

-- ----------------------------------------------------------------------------
-- Helper: update_updated_at() trigger function
-- ----------------------------------------------------------------------------
-- Per translation_rules_v0.8.md §7. Applied to all mutable tables via
-- BEFORE UPDATE FOR EACH ROW trigger. Mutable = NOT append-only logs
-- (excludes event_log, world_event, opex_event).
--
-- Generator emits created_at + updated_at columns on every table per
-- Foundation Audit Decision #9; this function keeps updated_at fresh.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at() IS
  'Phase 24c / translation_rules_v0.8.md §7 — BEFORE UPDATE trigger fn for mutable tables.';
