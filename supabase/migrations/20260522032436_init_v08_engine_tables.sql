-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.7 — engine.* tables (1 entity)
-- ============================================================================
-- Per PHASE_24C_HANDOFF.md §Phase 5a.7 (engine namespace per ARD-010).
-- Source: extracted from gen-ddl lines 3762-end.
--
-- Entities: surfacing_threshold_config (Bundle D / L.IV-SC-04 -- House governor).
-- engine.* is service-role-only per ARD-012 (Phase 5a.9 policies).
-- ============================================================================

-- ============================================================================
-- ENGINE schema — 1 entities
-- ============================================================================
-- surfacing_threshold_config (engine.surfacing_threshold_config)
-- Phase 24b §4.5 / Bundle D / L.IV-SC-04 — Engine config governing when collision_pressure crosses to emerge as a quest. Hard cap of 7 surfaced threads per region (House L.I governor; codified).
CREATE TABLE IF NOT EXISTS "engine"."surfacing_threshold_config" (
  "max_surfaced_per_region" INTEGER NOT NULL,
  "pressure_threshold" NUMERIC NOT NULL,
  "recency_weight" NUMERIC NOT NULL,
  "channel_priority" JSONB NOT NULL,
  "campaign_id" TEXT PRIMARY KEY NOT NULL,
  "session_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("pressure_threshold" >= 0),
  CHECK ("pressure_threshold" <= 10),
  CHECK ("recency_weight" >= 0),
  CHECK ("recency_weight" <= 2)
);
COMMENT ON TABLE "engine"."surfacing_threshold_config" IS 'Phase 24b §4.5 / Bundle D / L.IV-SC-04 — Engine config governing when collision_pressure crosses to emerge as a quest. Hard cap of 7 surfaced threads per region (House L.I governor; codified).';
ALTER TABLE "engine"."surfacing_threshold_config" ENABLE ROW LEVEL SECURITY;

