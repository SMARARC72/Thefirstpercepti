-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.9 — RLS policies per ARD-012
-- ============================================================================
-- Per PHASE_24C_HANDOFF.md §Phase 5a.9 + ARD-012 RLS strategy.
--
-- gen-ddl already emitted `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` per
-- table (Phase 5a.4-5a.7 migrations). This migration adds the POLICIES that
-- govern WHO can do WHAT once RLS is enabled.
--
-- ARD-012 baseline policies for v0.8 (per-schema discipline):
-- - public.*:  service_role full access + anon SELECT on published content
--              (anon write blocked by absence of INSERT/UPDATE/DELETE policy)
-- - content.*: service_role full access + anon SELECT (content is authored,
--              read-mostly, ships with the game)
-- - state.*:   service_role full access ONLY (per-campaign player policies
--              deferred to Session 24f when auth.uid() mapping ships)
-- - engine.*:  service_role full access ONLY (engine internals, never
--              exposed to anon/authenticated roles per ARD-012)
-- - behavior.*: N/A (no tables yet; materialized views defer to Session 6+)
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE POLICY pattern. Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- service_role full-access policy generator (DRY helper via DO block)
-- ----------------------------------------------------------------------------
-- For every table in content.*, state.*, engine.*, ensure a service_role-all
-- policy exists. This is the universal escape hatch — service_role bypasses
-- RLS by default in Supabase, but explicit policy makes intent visible.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname IN ('content', 'state', 'engine')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      'service_role_all', r.schema_name, r.table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      'service_role_all', r.schema_name, r.table_name
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- content.* anon SELECT policy (read-mostly authored content)
-- ----------------------------------------------------------------------------
-- Per ARD-012: anon can READ content.* tables (the game's authored corpus
-- ships with the runtime). No INSERT/UPDATE/DELETE policy → writes blocked.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname = 'content'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON content.%I',
      'anon_select', r.table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON content.%I FOR SELECT TO anon, authenticated USING (true)',
      'anon_select', r.table_name
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- public.* service_role full-access policy
-- ----------------------------------------------------------------------------
-- gen-ddl emitted RLS enable for all v0.8 public tables. Existing v0.7 tables
-- (opex_state, opex_event, rumor, save_snapshot, etc.) already have policies
-- from prior opex_enable_rls.sql migration; skip those.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND c.relname IN (
        'campaign', 'player', 'event', 'faction', 'npc', 'belief',
        'consequence', 'state_diff', 'contradiction_ledger_entry',
        'class', 'race', 'subrace', 'deity', 'pantheon', 'spell',
        'condition', 'item', 'recipe', 'region', 'regional_pack',
        'mythological_substrate_entry', 'loot_table', 'material',
        'regional_currency_state', 'cult_institution', 'creature_material',
        'material_substitution', 'companion', 'orchestrator_session',
        'agent_envelope', 'quirk', 'recruitment_quest', 'location',
        'travel_route', 'conflict_envelope', 'portrait_layer_definition',
        'imposed_spell', 'litany', 'marginalia', 'model_tier_policy'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'service_role_all', r.table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      'service_role_all', r.table_name
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Deferred — player-role policies (Session 24f when auth.uid() lands)
-- ----------------------------------------------------------------------------
-- TODO Session 24f: state.* tables need per-campaign player isolation policies.
-- Pattern (when auth.uid() → player_id mapping ships):
--   CREATE POLICY "campaign_member_read" ON state.<table>
--     FOR SELECT TO authenticated
--     USING (campaign_id IN (SELECT campaign_id FROM public.campaign_members WHERE player_id = auth.uid()));
-- engine.* is service-role-only; NEVER exposed to authenticated/anon.
