-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.11 — Indexes + updated_at triggers
-- ============================================================================
-- Per PHASE_24C_HANDOFF.md §Phase 5a.11 + translation_rules_v0.8.md §7.
--
-- Two responsibilities:
-- 1. updated_at BEFORE UPDATE triggers on all mutable tables (excludes
--    append-only logs: event, world_event, opex_event, contradiction_ledger_entry,
--    agent_log per translation_rules §7).
-- 2. Default composite indexes:
--    - (campaign_id, updated_at DESC) on state.* entities (per handoff §5a.11)
--    - GIN indexes on tags[] columns for tag-based search
--    - trigram indexes on content.npc.name / content.institution.name for fuzzy
--      search (per pg_trgm extension from Phase 5a.1)
--
-- Idempotent: CREATE INDEX IF NOT EXISTS + CREATE TRIGGER drop-and-recreate.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- updated_at triggers (uses public.update_updated_at() from Phase 5a.1)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  excluded TEXT[] := ARRAY['event', 'world_event', 'opex_event', 'contradiction_ledger_entry', 'agent_log', 'legacy_record'];
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname IN ('public', 'content', 'state', 'engine')
      AND NOT (c.relname = ANY(excluded))
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = n.nspname
          AND table_name = c.relname
          AND column_name = 'updated_at'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I',
      'trg_' || r.table_name || '_updated_at', r.schema_name, r.table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()',
      'trg_' || r.table_name || '_updated_at', r.schema_name, r.table_name
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- state.* default composite indexes — (campaign_id, updated_at DESC)
-- ----------------------------------------------------------------------------
-- Player-facing queries always filter by campaign_id; updated_at DESC for
-- recency-prioritized scans.
CREATE INDEX IF NOT EXISTS "idx_state_quest_campaign_updated"
  ON "state"."quest" ("campaign_id", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_state_plot_campaign_updated"
  ON "state"."plot" ("campaign_id", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_state_irq_campaign_updated"
  ON "state"."institution_response_queue_entry" ("campaign_id", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_state_fsb_campaign_updated"
  ON "state"."failure_state_branch" ("campaign_id", "updated_at" DESC);

-- ----------------------------------------------------------------------------
-- GIN indexes on tags[] columns (per ARD-011 §3 tag-based search)
-- ----------------------------------------------------------------------------
-- Skip tables whose tags column is JSONB rather than TEXT[]; check column type first.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_schema, c.table_name, c.data_type
    FROM information_schema.columns c
    WHERE c.column_name = 'tags'
      AND c.table_schema IN ('public', 'content', 'state', 'engine')
      AND c.data_type = 'ARRAY'
  LOOP
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I.%I USING GIN (tags)',
      'idx_' || r.table_name || '_tags_gin', r.table_schema, r.table_name
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Trigram indexes on name columns (fuzzy NPC + institution search)
-- ----------------------------------------------------------------------------
-- Per pg_trgm extension from Phase 5a.1.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'npc') THEN
    CREATE INDEX IF NOT EXISTS "idx_public_npc_name_trgm"
      ON "public"."npc" USING GIN ("name" gin_trgm_ops);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'content' AND c.relname = 'institution') THEN
    CREATE INDEX IF NOT EXISTS "idx_content_institution_name_trgm"
      ON "content"."institution" USING GIN ("name" gin_trgm_ops);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- content.information indexes — frequent query patterns
-- ----------------------------------------------------------------------------
-- info_class + half_life_days filters for decay sweep + daily_news_3tier surfacing.
CREATE INDEX IF NOT EXISTS "idx_content_information_class"
  ON "content"."information" ("info_class");
CREATE INDEX IF NOT EXISTS "idx_content_information_emerged_at"
  ON "content"."information" ("emerged_at_day");
CREATE INDEX IF NOT EXISTS "idx_content_information_campaign"
  ON "content"."information" ("campaign_id");
