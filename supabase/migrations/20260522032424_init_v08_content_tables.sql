-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.5 — content.* tables (6 Phase 24b entities)
-- ============================================================================
-- Per PHASE_24C_HANDOFF.md §Phase 5a.5 (content namespace per ARD-010).
-- Source: extracted from `database/schema.postgres.generated.sql` lines 3527-3651.
--
-- Entities (all from Phase 24b authoring):
-- - institution (Bundle B / L.II-SC-01)
-- - trade_route_v08 (Bundle C / L.III-SC-06)
-- - creature (Cluster B / BES-SC-01)
-- - combatant (Cluster C / CMB-SC-01)
-- - prompt_skeleton (Bundle F / L.VI-SC-04)
-- - information (Bundle G / L.VII-SC-01)
--
-- RLS enable per-table emitted by gen-ddl (ALTER TABLE ... ENABLE RLS).
-- Service-role + read policies land in Phase 5a.9.
-- ============================================================================

-- ============================================================================
-- CONTENT schema — 6 entities
-- ============================================================================
-- institution (content.institution)
-- Phase 24b §4.3 / Bundle B — Institution entity. Distinct from FactionSchema: faction-level orgs may or may not be institutions (e.g. Drowned Church is both; a feud-clan is a faction but not an institution). Institutions have cadence, jurisdictional strength, internal sub-factions, and an institutional memory archetype. Source: Sec L.II.
CREATE TABLE IF NOT EXISTS "content"."institution" (
  "institution_id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "tags" JSONB,
  "institution_cadence" JSONB NOT NULL  -- $ref: #/$defs/institution_cadence,
  "jurisdictional_strength" SMALLINT NOT NULL,
  "internal_factions" JSONB NOT NULL,
  "institutional_memory_archetype" "content"."institutional_memory_archetype" NOT NULL,
  "parent_faction_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("jurisdictional_strength" >= 0),
  CHECK ("jurisdictional_strength" <= 100),
  CONSTRAINT "fk_institution_parent_faction_id" FOREIGN KEY ("parent_faction_id") REFERENCES "content"."faction"("id") ON DELETE SET NULL
);
COMMENT ON TABLE "content"."institution" IS "Phase 24b §4.3 / Bundle B — Institution entity. Distinct from FactionSchema: faction-level orgs may or may not be institutions (e.g. Drowned Church is both; a feud-clan is a faction but not an institution). Institutions have cadence, jurisdictional strength, internal sub-factions, and an institutional memory archetype. Source: Sec L.II.";
ALTER TABLE "content"."institution" ENABLE ROW LEVEL SECURITY;

-- trade_route_v08 (content.trade_route_v08)
-- Phase 24b §4.4 / Bundle C / L.III-SC-06 — Commerce route distinct from v0.7 geographic travel_route $def. Carries commodity + capacity + controlling faction + active status. Reconciled with v0.7 travel_route via engine adapter at scene-load boundary.
CREATE TABLE IF NOT EXISTS "content"."trade_route_v08" (
  "route_id" TEXT NOT NULL,
  "origin_location_id" TEXT NOT NULL,
  "destination_location_id" TEXT NOT NULL,
  "commodity_id" TEXT NOT NULL,
  "controlling_faction_id" TEXT,
  "weather_dependency" BOOLEAN NOT NULL,
  "active_status" "content"."trade_route_active_status" NOT NULL,
  "capacity_per_season" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_trade_route_v08_origin_location_id" FOREIGN KEY ("origin_location_id") REFERENCES "content"."location"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_trade_route_v08_destination_location_id" FOREIGN KEY ("destination_location_id") REFERENCES "content"."location"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_trade_route_v08_controlling_faction_id" FOREIGN KEY ("controlling_faction_id") REFERENCES "content"."faction"("id") ON DELETE SET NULL,
  CHECK ("capacity_per_season" >= 0)
);
COMMENT ON TABLE "content"."trade_route_v08" IS "Phase 24b §4.4 / Bundle C / L.III-SC-06 — Commerce route distinct from v0.7 geographic travel_route $def. Carries commodity + capacity + controlling faction + active status. Reconciled with v0.7 travel_route via engine adapter at scene-load boundary.";
ALTER TABLE "content"."trade_route_v08" ENABLE ROW LEVEL SECURITY;

-- creature (content.creature)
-- Phase 24b §4.7 / BES-SC-01 — Bestiary entity (content.* namespace). Distinct from NPC (no DialogueState/Wants/Ambitions): adversarial/encountered being with combat block + provenance. Witness-payload flag marks creatures whose presence/sighting constitutes a canon-progression event.
CREATE TABLE IF NOT EXISTS "content"."creature" (
  "creature_id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "provenance" "content"."creature_provenance" NOT NULL,
  "tier" "content"."creature_tier" NOT NULL,
  "combat_block" JSONB NOT NULL,
  "regional_presence_id" TEXT,
  "uncertainty_resolver_id" TEXT,
  "tags" JSONB NOT NULL,
  "witness_payload" BOOLEAN NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE "content"."creature" IS "Phase 24b §4.7 / BES-SC-01 — Bestiary entity (content.* namespace). Distinct from NPC (no DialogueState/Wants/Ambitions): adversarial/encountered being with combat block + provenance. Witness-payload flag marks creatures whose presence/sighting constitutes a canon-progression event.";
ALTER TABLE "content"."creature" ENABLE ROW LEVEL SECURITY;

-- combatant (content.combatant)
-- Phase 24b §4.7 / CMB-SC-01 — Combatant entity (content.* namespace). Extends NPC via base_npc_id FK with combat-specific overlay: voice_archetype routes to Bundle F personality_fingerprint, social_attacks[] references social_attack $def. Cosmological_redirection FK for Sum-Wraith Whisperer signature mechanic.
CREATE TABLE IF NOT EXISTS "content"."combatant" (
  "combatant_id" TEXT PRIMARY KEY NOT NULL,
  "base_npc_id" TEXT NOT NULL,
  "voice_archetype" "content"."personality_archetype" NOT NULL,
  "combat_block" JSONB NOT NULL,
  "social_attacks" JSONB NOT NULL,
  "cosmological_redirection_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_combatant_base_npc_id" FOREIGN KEY ("base_npc_id") REFERENCES "content"."npc"("id") ON DELETE CASCADE
);
COMMENT ON TABLE "content"."combatant" IS "Phase 24b §4.7 / CMB-SC-01 — Combatant entity (content.* namespace). Extends NPC via base_npc_id FK with combat-specific overlay: voice_archetype routes to Bundle F personality_fingerprint, social_attacks[] references social_attack $def. Cosmological_redirection FK for Sum-Wraith Whisperer signature mechanic.";
ALTER TABLE "content"."combatant" ENABLE ROW LEVEL SECURITY;

-- prompt_skeleton (content.prompt_skeleton)
-- Phase 24b §4.8 / Bundle F / L.VI-SC-04 — Generation scaffold for NPC dialogue. UNIFIES Cluster A npc_prompt_skeleton per Session 3.5 overlap resolution. Two flavors: archetype-templated (default) and cluster_a_override=true (constraint-dominant per L.VI-SC-05 / fingerprint_waiver).
CREATE TABLE IF NOT EXISTS "content"."prompt_skeleton" (
  "skeleton_id" TEXT NOT NULL,
  "archetype_id" "content"."personality_archetype" NOT NULL,
  "npc_id" TEXT,
  "base_prompt" TEXT NOT NULL,
  "voice_segments" JSONB NOT NULL,
  "constraint_block" JSONB NOT NULL,
  "fingerprint_waiver_id" TEXT,
  "cluster_a_override" BOOLEAN NOT NULL,
  "schema_version" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_prompt_skeleton_npc_id" FOREIGN KEY ("npc_id") REFERENCES "content"."npc"("id") ON DELETE CASCADE
);
COMMENT ON TABLE "content"."prompt_skeleton" IS "Phase 24b §4.8 / Bundle F / L.VI-SC-04 — Generation scaffold for NPC dialogue. UNIFIES Cluster A npc_prompt_skeleton per Session 3.5 overlap resolution. Two flavors: archetype-templated (default) and cluster_a_override=true (constraint-dominant per L.VI-SC-05 / fingerprint_waiver).";
ALTER TABLE "content"."prompt_skeleton" ENABLE ROW LEVEL SECURITY;

-- information (content.information)
-- Phase 24b §4.9 / Bundle G / L.VII-SC-01 — Bundle G core entity. Discrete unit of in-world information with provenance (source_npc / source_event), veracity classification, decay (half_life_days), and optional concealment + archetype-lock policies. Pairs with daily_news_3tier for time-banded surfacing.
CREATE TABLE IF NOT EXISTS "content"."information" (
  "information_id" TEXT PRIMARY KEY NOT NULL,
  "content" TEXT NOT NULL,
  "info_class" "content"."info_class" NOT NULL,
  "source_npc_ids" JSONB,
  "source_event_id" TEXT,
  "veracity" "content"."information_veracity" NOT NULL,
  "half_life_days" INTEGER NOT NULL,
  "concealment_policy_id" TEXT,
  "archetype_lock_id" TEXT,
  "shaping_operator_ids" JSONB,
  "emerged_at_day" INTEGER NOT NULL,
  "tags" JSONB NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("half_life_days" >= 0),
  CHECK ("emerged_at_day" >= 0),
  CONSTRAINT "fk_information_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "content"."campaign"("id") ON DELETE CASCADE
);
COMMENT ON TABLE "content"."information" IS "Phase 24b §4.9 / Bundle G / L.VII-SC-01 — Bundle G core entity. Discrete unit of in-world information with provenance (source_npc / source_event), veracity classification, decay (half_life_days), and optional concealment + archetype-lock policies. Pairs with daily_news_3tier for time-banded surfacing.";
ALTER TABLE "content"."information" ENABLE ROW LEVEL SECURITY;

