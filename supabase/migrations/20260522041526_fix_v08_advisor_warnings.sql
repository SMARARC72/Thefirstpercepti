-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.12b — Fix 5 advisor WARN warnings
-- ============================================================================
-- Per `supabase db advisors --linked` after initial v0.8 push:
--   1. Function `public.update_updated_at` has mutable search_path
--   2-5. 4 extensions installed in public schema (citext, pg_trgm, btree_gin,
--        pg_jsonschema) should move to dedicated `extensions` schema
--
-- Per Supabase security best practice.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fix 1: harden update_updated_at search_path
-- ----------------------------------------------------------------------------
-- CREATE OR REPLACE with explicit SET search_path = '' so the function does
-- not depend on caller's search_path (defends against search_path injection).
-- The function body uses NEW (a trigger pseudo-table) + NOW() (built-in), both
-- of which resolve regardless of search_path.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at() IS
  'Phase 24c / translation_rules_v0.8.md §7 — BEFORE UPDATE trigger fn for mutable tables. Hardened search_path per Supabase advisor 0011.';

-- ----------------------------------------------------------------------------
-- Fix 2-5: move extensions to dedicated `extensions` schema
-- ----------------------------------------------------------------------------
-- Standard Supabase pattern. Indexes that reference `gin_trgm_ops` need to
-- be dropped + recreated post-move so they pick up the new schema-qualified
-- operator class reference.

CREATE SCHEMA IF NOT EXISTS "extensions";
COMMENT ON SCHEMA "extensions" IS 'Supabase advisor 0014 — dedicated schema for installed extensions.';

-- Grant usage so existing roles can still call extension functions
GRANT USAGE ON SCHEMA "extensions" TO postgres, anon, authenticated, service_role;

-- ALTER EXTENSION SET SCHEMA is non-destructive but may fail if extension
-- objects are referenced by name in code. Wrap each in DO block.

-- citext (unused so far, safe to move)
DO $$ BEGIN
  ALTER EXTENSION "citext" SET SCHEMA "extensions";
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN invalid_parameter_value THEN NULL;
  WHEN dependent_objects_still_exist THEN NULL;
  WHEN feature_not_supported THEN NULL;
END $$;

-- btree_gin (no direct references; used implicitly by GIN indexes)
DO $$ BEGIN
  ALTER EXTENSION "btree_gin" SET SCHEMA "extensions";
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN invalid_parameter_value THEN NULL;
  WHEN dependent_objects_still_exist THEN NULL;
  WHEN feature_not_supported THEN NULL;
END $$;

-- pg_jsonschema (unused so far, safe to move)
DO $$ BEGIN
  ALTER EXTENSION "pg_jsonschema" SET SCHEMA "extensions";
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN invalid_parameter_value THEN NULL;
  WHEN dependent_objects_still_exist THEN NULL;
  WHEN feature_not_supported THEN NULL;
END $$;

-- pg_trgm needs care: drop trigram indexes, move extension, recreate indexes
-- with extensions-qualified operator class reference.
DROP INDEX IF EXISTS "public"."idx_public_npc_name_trgm";
DROP INDEX IF EXISTS "content"."idx_content_institution_name_trgm";

DO $$ BEGIN
  ALTER EXTENSION "pg_trgm" SET SCHEMA "extensions";
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN invalid_parameter_value THEN NULL;
  WHEN dependent_objects_still_exist THEN NULL;
  WHEN feature_not_supported THEN NULL;
END $$;

-- Recreate trigram indexes with qualified operator class.
-- Wrap in DO so missing tables don't break the migration.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'npc') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_public_npc_name_trgm" ON "public"."npc" USING GIN ("name" extensions.gin_trgm_ops)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'content' AND c.relname = 'institution') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_content_institution_name_trgm" ON "content"."institution" USING GIN ("name" extensions.gin_trgm_ops)';
  END IF;
END $$;
