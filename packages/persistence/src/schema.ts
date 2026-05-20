/**
 * Schema constants. The canonical Postgres DDL lives in
 * database/schema.postgres.sql at the repo root; this file mirrors the
 * version number so the migration script and the runtime stay in sync.
 *
 * On bump:
 *   1. Add a new database/migrations/NNN_*.sql file with idempotent changes.
 *   2. Update SCHEMA_VERSION.
 *   3. scripts/db-migrate.mjs reads SCHEMA_VERSION to decide what to apply.
 */
export const SCHEMA_VERSION = 1;

/**
 * Default Postgres schema name. Override via PG_SCHEMA env var on the server.
 */
export const DEFAULT_PG_SCHEMA = "public";
