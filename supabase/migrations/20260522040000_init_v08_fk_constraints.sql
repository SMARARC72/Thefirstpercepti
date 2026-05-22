-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.4b — FK constraints (F-FK-ORDER fix)
-- ============================================================================
-- Per generator fix F-FK-ORDER: FK constraints emitted LAST (after all tables
-- across all namespaces) to avoid forward-reference errors during CREATE TABLE.
--
-- Pattern: each FK wrapped in DO $$ BEGIN ... EXCEPTION WHEN duplicate_object
-- THEN NULL; END $$ for idempotency (ADD CONSTRAINT has no IF NOT EXISTS).
--
-- Source: extracted from `database/schema.postgres.generated.sql` FK section
-- (gen-ddl now emits FKs separately from CREATE TABLE).
-- ============================================================================

-- ============================================================================
-- FK CONSTRAINTS — emitted last to avoid forward-reference errors (F-FK-ORDER)
-- ============================================================================
DO $$ BEGIN
  ALTER TABLE "public"."player" ADD CONSTRAINT "fk_player_race_id" FOREIGN KEY ("race_id") REFERENCES "public"."race"("race_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."player" ADD CONSTRAINT "fk_player_subrace_id" FOREIGN KEY ("subrace_id") REFERENCES "public"."subrace"("subrace_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."event" ADD CONSTRAINT "fk_event_location_id" FOREIGN KEY ("location_id") REFERENCES "public"."location"("location_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."event" ADD CONSTRAINT "fk_event_region_id" FOREIGN KEY ("region_id") REFERENCES "public"."region"("region_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."faction" ADD CONSTRAINT "fk_faction_region_id" FOREIGN KEY ("region_id") REFERENCES "public"."region"("region_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."npc" ADD CONSTRAINT "fk_npc_race_id" FOREIGN KEY ("race_id") REFERENCES "public"."race"("race_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."item" ADD CONSTRAINT "fk_item_regional_pack_id" FOREIGN KEY ("regional_pack_id") REFERENCES "public"."regional_pack"("pack_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."regional_pack" ADD CONSTRAINT "fk_regional_pack_region_id" FOREIGN KEY ("region_id") REFERENCES "public"."region"("region_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."loot_table" ADD CONSTRAINT "fk_loot_table_region_id" FOREIGN KEY ("region_id") REFERENCES "public"."region"("region_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."loot_table" ADD CONSTRAINT "fk_loot_table_location_id" FOREIGN KEY ("location_id") REFERENCES "public"."location"("location_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."loot_table" ADD CONSTRAINT "fk_loot_table_faction_id" FOREIGN KEY ("faction_id") REFERENCES "public"."faction"("faction_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."regional_currency_state" ADD CONSTRAINT "fk_regional_currency_state_region_id" FOREIGN KEY ("region_id") REFERENCES "public"."region"("region_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."cult_institution" ADD CONSTRAINT "fk_cult_institution_faction_id" FOREIGN KEY ("faction_id") REFERENCES "public"."faction"("faction_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."cult_institution" ADD CONSTRAINT "fk_cult_institution_region_id" FOREIGN KEY ("region_id") REFERENCES "public"."region"("region_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."creature_material" ADD CONSTRAINT "fk_creature_material_regional_pack_id" FOREIGN KEY ("regional_pack_id") REFERENCES "public"."regional_pack"("pack_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."material_substitution" ADD CONSTRAINT "fk_material_substitution_recipe_id" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("recipe_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."orchestrator_session" ADD CONSTRAINT "fk_orchestrator_session_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("campaign_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "public"."location" ADD CONSTRAINT "fk_location_region_id" FOREIGN KEY ("region_id") REFERENCES "public"."region"("region_id") ON DELETE RESTRICT;  /* F5: inferred from naming convention */
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "content"."institution" ADD CONSTRAINT "fk_institution_parent_faction_id" FOREIGN KEY ("parent_faction_id") REFERENCES "public"."faction"("faction_id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "content"."trade_route_v08" ADD CONSTRAINT "fk_trade_route_v08_origin_location_id" FOREIGN KEY ("origin_location_id") REFERENCES "public"."location"("location_id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "content"."trade_route_v08" ADD CONSTRAINT "fk_trade_route_v08_destination_location_id" FOREIGN KEY ("destination_location_id") REFERENCES "public"."location"("location_id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "content"."trade_route_v08" ADD CONSTRAINT "fk_trade_route_v08_controlling_faction_id" FOREIGN KEY ("controlling_faction_id") REFERENCES "public"."faction"("faction_id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "content"."combatant" ADD CONSTRAINT "fk_combatant_base_npc_id" FOREIGN KEY ("base_npc_id") REFERENCES "public"."npc"("npc_id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "content"."prompt_skeleton" ADD CONSTRAINT "fk_prompt_skeleton_npc_id" FOREIGN KEY ("npc_id") REFERENCES "public"."npc"("npc_id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "content"."information" ADD CONSTRAINT "fk_information_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("campaign_id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "state"."quest" ADD CONSTRAINT "fk_quest_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("campaign_id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "state"."plot" ADD CONSTRAINT "fk_plot_region_id" FOREIGN KEY ("region_id") REFERENCES "public"."region"("region_id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "state"."plot" ADD CONSTRAINT "fk_plot_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("campaign_id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "state"."institution_response_queue_entry" ADD CONSTRAINT "fk_institution_response_queue_entry_institution_id" FOREIGN KEY ("institution_id") REFERENCES "content"."institution"("institution_id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "state"."institution_response_queue_entry" ADD CONSTRAINT "fk_institution_response_queue_entry_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("campaign_id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "state"."failure_state_branch" ADD CONSTRAINT "fk_failure_state_branch_parent_plot_id" FOREIGN KEY ("parent_plot_id") REFERENCES "state"."plot"("plot_id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "state"."failure_state_branch" ADD CONSTRAINT "fk_failure_state_branch_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("campaign_id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- END OF GENERATED DDL
-- 54 entities · 201 enums · 5 schemas
