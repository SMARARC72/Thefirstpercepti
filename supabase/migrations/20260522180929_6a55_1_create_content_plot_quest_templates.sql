-- ============================================================================
-- Phase 24d / 6a.5.5.1 — CREATE content.plot_template + content.quest_template
-- ============================================================================
-- Per ratified 6a.5.5.0 schema audit (repo_mirror/phase_24d/6a55_schema_audit.md).
-- Splits definitional columns out of state.plot/state.quest into per-world
-- template tables in content.* schema (ARD-010 namespace, ARD-012 RLS).
--
-- Template tables carry the canonical Codex-authored shape:
--   - content.plot_template: plot_id (PK), region_id, name, description, tags,
--     spine_question, central_npc_ids, central_institution_ids, pan_world_plot_id,
--     constituent_quest_ids, subplot_admission_policy (BORDERLINE-1 → TEMPLATE)
--   - content.quest_template: quest_id (PK), name, description, tags, archetype,
--     discovery_channel (BORDERLINE-2 → TEMPLATE; channel SET, not fired channel),
--     subplot_graph_relation (BORDERLINE-3 → TEMPLATE), primary_npc_ids,
--     primary_faction_ids, primary_region_id
--
-- Conventions:
--   - NO schema_version column (matches existing content.* convention; institution,
--     creature, combatant, etc. do NOT carry per-row schema_version). Schema-level
--     versioning is implicit via gen pipeline + Zod types.
--   - NO is_published BOOLEAN — anon-read works via role check only (qual=true)
--     per existing content.institution / content.creature / content.combatant /
--     content.prompt_skeleton / content.information / content.trade_route_v08
--     precedent.
--   - created_at + updated_at timestamps default NOW() (matches existing).
--   - RLS enabled + 2 policies per table: anon_select (anon+authenticated, SELECT,
--     qual=true) + service_role_all (service_role, ALL, qual=true).
--
-- State table ALTER deferred to 6a.5.5.2 (separate migration with pre-ALTER
-- empty-table assertion).
--
-- Scene status: per audit, no content.scene_template needed — event.scene_id
-- text grouping handles slice scope. v0.9 backlog #11 if scenes promoted to
-- first-class entity later.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- content.plot_template
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "content"."plot_template" (
  "plot_id"                   TEXT PRIMARY KEY NOT NULL,
  "region_id"                 TEXT NOT NULL,
  "name"                      TEXT NOT NULL,
  "description"               TEXT,
  "tags"                      JSONB,
  "spine_question"            TEXT NOT NULL,
  "central_npc_ids"           JSONB,
  "central_institution_ids"   JSONB,
  "pan_world_plot_id"         TEXT,
  "constituent_quest_ids"     JSONB NOT NULL,
  "subplot_admission_policy"  JSONB,
  "created_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_plot_template_region_id"
    FOREIGN KEY ("region_id") REFERENCES "public"."region"("region_id") ON DELETE RESTRICT
);

COMMENT ON TABLE "content"."plot_template" IS
  'Phase 24d 6a.5.5.1 / Bundle E template layer — definitional plot rows authored once per world. Per-campaign mutable state lives in state.plot (post-6a.5.5.2 ALTER) which FKs to plot_id here.';

ALTER TABLE "content"."plot_template" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select" ON "content"."plot_template";
CREATE POLICY "anon_select" ON "content"."plot_template"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "service_role_all" ON "content"."plot_template";
CREATE POLICY "service_role_all" ON "content"."plot_template"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- content.quest_template
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "content"."quest_template" (
  "quest_id"                  TEXT PRIMARY KEY NOT NULL,
  "name"                      TEXT NOT NULL,
  "description"               TEXT,
  "tags"                      JSONB,
  "archetype"                 "public"."quest_archetype" NOT NULL,
  "discovery_channel"         JSONB NOT NULL,
  "subplot_graph_relation"    JSONB NOT NULL,
  "primary_npc_ids"           JSONB,
  "primary_faction_ids"       JSONB,
  "primary_region_id"         TEXT,
  "created_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_quest_template_primary_region_id"
    FOREIGN KEY ("primary_region_id") REFERENCES "public"."region"("region_id") ON DELETE RESTRICT
);

COMMENT ON TABLE "content"."quest_template" IS
  'Phase 24d 6a.5.5.1 / Bundle E template layer — definitional quest rows authored once per world. discovery_channel here is the channel SET (canonical surfacing modes). Fired channel in a specific campaign is implicit via event.cause_event_ids chain. Per-campaign mutable state lives in state.quest (post-6a.5.5.2 ALTER) which FKs to quest_id here.';

ALTER TABLE "content"."quest_template" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select" ON "content"."quest_template";
CREATE POLICY "anon_select" ON "content"."quest_template"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "service_role_all" ON "content"."quest_template";
CREATE POLICY "service_role_all" ON "content"."quest_template"
  FOR ALL TO service_role USING (true) WITH CHECK (true);
