-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.12c — pg_jsonschema namespace fix
-- ============================================================================
-- `pg_jsonschema` does not support ALTER EXTENSION SET SCHEMA (Postgres limit).
-- The only way to move it is DROP + recreate in the target schema. This is
-- safe in v0.8 because no CHECK constraints yet reference its functions
-- (validate_json_schema is not invoked anywhere in current schema).
-- Future use in Session 6+ should reference `extensions.json_matches_schema`
-- etc. with explicit schema qualification.
-- ============================================================================

DROP EXTENSION IF EXISTS "pg_jsonschema" CASCADE;

CREATE EXTENSION "pg_jsonschema" SCHEMA "extensions";

COMMENT ON EXTENSION "pg_jsonschema" IS 'JSONB CHECK constraint validation (ARD-011 §3). Reinstalled in extensions schema per Supabase advisor 0014.';
