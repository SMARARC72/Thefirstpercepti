-- ============================================================================
-- Phase 24d / 6a.7 commit 1 (C1) — Drop combatant.cosmological_redirection_id
-- ============================================================================
-- Per ratified 6a.7.0 Path B-narrow option α: SC-03 (cosmological_redirection)
-- promotion deferred to v0.9 in full. The text column on content.combatant
-- referencing the (non-existent) cosmological_redirection table is dead
-- weight in v0.8 — ALTER drop while table is empty (zero rows; clean while
-- cheap per Khoja "B-clean" directive).
--
-- Pre-ALTER assert: content.combatant empty (verified count=0 in 6a.7.0 audit).
--
-- v0.9 RE-PROMOTION REQUIREMENTS (per ADR-018 §B):
--   1. SC-03 schema redesign eliminating ARD-011 polymorphic-FK violation
--   2. Prerequisite target tables (wraith/haunting/cult/spirit/named_being) authored
--   3. Numerand-region content brought into slice scope
--   4. Greywake or other in-slice combatant exercising the mechanic
-- When all 4 met, v0.9 ALTER re-adds the column with proper FK target.
-- ============================================================================

DO $$
DECLARE
  combatant_count integer;
BEGIN
  SELECT count(*) INTO combatant_count FROM content.combatant;
  IF combatant_count <> 0 THEN
    RAISE EXCEPTION
      '6a.7.1 C1 pre-ALTER assert failed: content.combatant must be empty. Found % rows.',
      combatant_count;
  END IF;
END $$;

ALTER TABLE "content"."combatant"
  DROP COLUMN IF EXISTS "cosmological_redirection_id";

COMMENT ON TABLE "content"."combatant" IS
  'Phase 24d 6a.7.1 — content.combatant per ADR-018. social_attacks remains embedded JSONB array. cosmological_redirection_id dropped per Path B-narrow option α (deferred to v0.9; see ADR-018 §B for re-promotion requirements).';
