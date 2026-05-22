-- ============================================================================
-- Phase 24d / 6a.5.5.2 — ALTER state.plot + state.quest: template/state split
-- ============================================================================
-- Per ratified 6a.5.5.0 audit + 6a.5.5.1 template tables LIVE.
--
-- Drops definitional columns from state.plot + state.quest (now owned by
-- content.plot_template + content.quest_template). Adds composite PK
-- (campaign_id, plot_id) / (campaign_id, quest_id) per audit ratification.
-- Adds template-FK from state to content.
--
-- Dependency handled: state.failure_state_branch.parent_plot_id has a single-
-- column FK into state.plot.plot_id. Composite PK change requires that FK to
-- become 2-column (campaign_id, parent_plot_id) → state.plot(campaign_id, plot_id).
-- state.failure_state_branch already carries campaign_id NOT NULL, so the
-- 2-column FK addition is a pure schema change with no data migration.
--
-- Pre-ALTER guarantees: state.plot, state.quest, state.failure_state_branch
-- ALL empty at audit time (verified via SELECT count(*)). Hard assertion
-- inside this migration repeats the check to fail-fast if any row appeared
-- between audit and apply.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Pre-ALTER hard assertion: empty tables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  plot_count integer;
  quest_count integer;
  fsb_count integer;
BEGIN
  SELECT count(*) INTO plot_count FROM state.plot;
  SELECT count(*) INTO quest_count FROM state.quest;
  SELECT count(*) INTO fsb_count FROM state.failure_state_branch;

  IF plot_count <> 0 OR quest_count <> 0 OR fsb_count <> 0 THEN
    RAISE EXCEPTION
      '6a.5.5.2 pre-ALTER assert failed: tables must be empty. state.plot=%, state.quest=%, state.failure_state_branch=%',
      plot_count, quest_count, fsb_count;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Drop dependent FK on state.failure_state_branch (will rebuild as 2-column FK)
-- ----------------------------------------------------------------------------
ALTER TABLE "state"."failure_state_branch"
  DROP CONSTRAINT IF EXISTS "fk_failure_state_branch_parent_plot_id";

-- ----------------------------------------------------------------------------
-- state.plot — drop TEMPLATE columns, swap PK to composite, add template FK
-- ----------------------------------------------------------------------------
-- Drop TEMPLATE-only columns (definitional; owned by content.plot_template)
ALTER TABLE "state"."plot"
  DROP CONSTRAINT IF EXISTS "fk_plot_region_id",
  DROP COLUMN IF EXISTS "region_id",
  DROP COLUMN IF EXISTS "name",
  DROP COLUMN IF EXISTS "description",
  DROP COLUMN IF EXISTS "tags",
  DROP COLUMN IF EXISTS "spine_question",
  DROP COLUMN IF EXISTS "central_npc_ids",
  DROP COLUMN IF EXISTS "central_institution_ids",
  DROP COLUMN IF EXISTS "pan_world_plot_id",
  DROP COLUMN IF EXISTS "constituent_quest_ids",
  DROP COLUMN IF EXISTS "subplot_admission_policy";

-- Swap PK plot_id → composite (campaign_id, plot_id)
ALTER TABLE "state"."plot"
  DROP CONSTRAINT "plot_pkey";

ALTER TABLE "state"."plot"
  ADD CONSTRAINT "plot_pkey" PRIMARY KEY ("campaign_id", "plot_id");

-- Add FK to content.plot_template.plot_id
ALTER TABLE "state"."plot"
  ADD CONSTRAINT "fk_plot_template_id"
  FOREIGN KEY ("plot_id") REFERENCES "content"."plot_template"("plot_id") ON DELETE RESTRICT;

COMMENT ON TABLE "state"."plot" IS
  'Phase 24d 6a.5.5.2 — per-campaign mutable plot state. Definitional shape lives in content.plot_template. Composite PK (campaign_id, plot_id) — one row per plot per campaign.';

-- ----------------------------------------------------------------------------
-- state.quest — drop TEMPLATE columns, swap PK to composite, add template FK
-- ----------------------------------------------------------------------------
ALTER TABLE "state"."quest"
  DROP COLUMN IF EXISTS "name",
  DROP COLUMN IF EXISTS "description",
  DROP COLUMN IF EXISTS "tags",
  DROP COLUMN IF EXISTS "archetype",
  DROP COLUMN IF EXISTS "discovery_channel",
  DROP COLUMN IF EXISTS "subplot_graph_relation",
  DROP COLUMN IF EXISTS "primary_npc_ids",
  DROP COLUMN IF EXISTS "primary_faction_ids",
  DROP COLUMN IF EXISTS "primary_region_id";

-- Swap PK quest_id → composite (campaign_id, quest_id)
ALTER TABLE "state"."quest"
  DROP CONSTRAINT "quest_pkey";

ALTER TABLE "state"."quest"
  ADD CONSTRAINT "quest_pkey" PRIMARY KEY ("campaign_id", "quest_id");

-- Add FK to content.quest_template.quest_id
ALTER TABLE "state"."quest"
  ADD CONSTRAINT "fk_quest_template_id"
  FOREIGN KEY ("quest_id") REFERENCES "content"."quest_template"("quest_id") ON DELETE RESTRICT;

COMMENT ON TABLE "state"."quest" IS
  'Phase 24d 6a.5.5.2 — per-campaign mutable quest state. Definitional shape lives in content.quest_template. Composite PK (campaign_id, quest_id) — one row per quest per campaign.';

-- ----------------------------------------------------------------------------
-- state.failure_state_branch — rebuild parent_plot_id FK as 2-column composite
-- ----------------------------------------------------------------------------
ALTER TABLE "state"."failure_state_branch"
  ADD CONSTRAINT "fk_failure_state_branch_parent_plot_id"
  FOREIGN KEY ("campaign_id", "parent_plot_id")
  REFERENCES "state"."plot"("campaign_id", "plot_id")
  ON DELETE CASCADE;
