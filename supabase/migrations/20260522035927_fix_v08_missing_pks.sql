-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.4c — ALTER ADD PRIMARY KEY for tables
-- created without PK (generator pre-fix iteration).
-- ============================================================================
-- Per F-PK-FALLBACK fix in generate-ddl.mjs (Phase 5a.12 retry round 5).
-- An earlier iteration of the generator only detected PK as `<entity>_id` or
-- bare `id`. Entities with PKs named differently (pack_id, substrate_id,
-- skeleton_id, etc.) were CREATEd without PRIMARY KEY. That blocks FK
-- constraints in the subsequent migration (`fk_constraints`) because Postgres
-- requires a unique constraint on the referenced column.
--
-- This migration adds PRIMARY KEY constraints to those tables. Idempotent via
-- DO block + duplicate_object swallow.
-- ============================================================================

DO $$ BEGIN ALTER TABLE "public"."contradiction_ledger_entry" ADD CONSTRAINT "pk_contradiction_ledger_entry" PRIMARY KEY ("contradiction_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "public"."regional_pack" ADD CONSTRAINT "pk_regional_pack" PRIMARY KEY ("pack_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "public"."mythological_substrate_entry" ADD CONSTRAINT "pk_mythological_substrate_entry" PRIMARY KEY ("substrate_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "public"."regional_currency_state" ADD CONSTRAINT "pk_regional_currency_state" PRIMARY KEY ("currency_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "public"."material_substitution" ADD CONSTRAINT "pk_material_substitution" PRIMARY KEY ("substitution_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "public"."orchestrator_session" ADD CONSTRAINT "pk_orchestrator_session" PRIMARY KEY ("session_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "public"."agent_envelope" ADD CONSTRAINT "pk_agent_envelope" PRIMARY KEY ("envelope_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "public"."recruitment_quest" ADD CONSTRAINT "pk_recruitment_quest" PRIMARY KEY ("quest_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "public"."travel_route" ADD CONSTRAINT "pk_travel_route" PRIMARY KEY ("route_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "public"."conflict_envelope" ADD CONSTRAINT "pk_conflict_envelope" PRIMARY KEY ("envelope_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "public"."portrait_layer_definition" ADD CONSTRAINT "pk_portrait_layer_definition" PRIMARY KEY ("layer_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "public"."imposed_spell" ADD CONSTRAINT "pk_imposed_spell" PRIMARY KEY ("spell_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "public"."model_tier_policy" ADD CONSTRAINT "pk_model_tier_policy" PRIMARY KEY ("policy_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "content"."trade_route_v08" ADD CONSTRAINT "pk_trade_route_v08" PRIMARY KEY ("route_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "content"."prompt_skeleton" ADD CONSTRAINT "pk_prompt_skeleton" PRIMARY KEY ("skeleton_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "state"."failure_state_branch" ADD CONSTRAINT "pk_failure_state_branch" PRIMARY KEY ("branch_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "engine"."surfacing_threshold_config" ADD CONSTRAINT "pk_surfacing_threshold_config" PRIMARY KEY ("campaign_id"); EXCEPTION WHEN invalid_table_definition THEN NULL; WHEN duplicate_table THEN NULL; END $$;
