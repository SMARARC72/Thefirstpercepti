# Postgres setup — The First Perception

This game's Living World layer needs a Postgres-compatible database to
persist save slots, world events, NPC memories, rumors, agent logs, and
legacy records across runs. Vercel Postgres, Neon, Supabase (via the
Vercel integration), and any other Postgres 14+ provider all work.

Schema lives in `database/schema.postgres.sql`. The migration script
applies it idempotently (`CREATE TABLE IF NOT EXISTS …`), so it is safe
to rerun on every deploy.

## 1. Provision the database

Easiest path: in the Vercel dashboard for this project, open
**Storage → Create or Add Existing**, pick your Postgres provider, and
attach it to the project. Vercel injects two environment variables
automatically:

| Env var                       | Purpose                                          |
| ----------------------------- | ------------------------------------------------ |
| `POSTGRES_URL`                | Pooled connection (pgbouncer / supavisor)         |
| `POSTGRES_URL_NON_POOLING`    | Direct connection, used for migrations + locks    |

Both must be present in production. Migrations use the **non-pooling**
URL because some pooler modes don't allow DDL transactions.

## 2. Local development

Copy the example file:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Fill in `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING` from your Vercel
project's environment variables tab, or from your provider's dashboard.
`apps/web/.env.local` is gitignored — never commit it.

Then run the migration:

```bash
npm run db:migrate
```

Output should end with:

```
[db-migrate] verified tables: agent_log, legacy_record, npc_memory, rumor, save_snapshot, world_event
```

Dry-run mode (prints the SQL without executing):

```bash
npm run db:migrate -- --dry-run
```

## 3. Verify the API is wired

With `vercel dev` (or `npm run dev` if you've configured Vite to proxy
`/api/*` to a vercel-dev shim), curl the health endpoint:

```bash
curl http://localhost:3000/api/health
# → {"ok":true,"data":{"ok":true,"schemaVersion":1}}
```

If `ok: false` is returned, the body's `error` field will say whether
the failure is missing env vars (`unavailable`), schema mismatch, or
network. Check `vercel logs` or `apps/web/.env.local`.

## 4. Rotating credentials

**Any secret pasted into a chat log, this docs file, or a screenshot
should be rotated.** Supabase's reset paths:

- **Database password** — Supabase dashboard → Project Settings →
  Database → "Reset database password". Vercel's integration picks up
  the new value automatically; for local dev, refresh
  `apps/web/.env.local`.
- **Service role + JWT secret** — Project Settings → API → "Roll
  service role" and "Roll JWT secret". After rolling, redeploy the
  Vercel project so functions get the new env values.
- **Anon key** — auto-derived from the JWT secret; rolled together.

Treat `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_JWT_SECRET`, `POSTGRES_PASSWORD`, and `ANTHROPIC_API_KEY` as
exfiltration-grade secrets. The anon / publishable key is meant to be
public (Row-Level Security gates real access), but the rest are not.

## 5. Browser fallback when the API is unreachable

The web client tries `HttpRepository` first and falls back to
`LocalStorageRepository` if `/api/health` fails. Save slots and legacy
records persist in `localStorage` in fallback mode, but world events
and NPC memories live only for the session — cross-run memory
genuinely requires the server.

A small "running offline" banner will surface in Phase 7 so the player
knows their save isn't compounding the living world.

## 6. Backups

For Supabase: dashboard → Database → Backups. Daily snapshots are
included on every tier.

For other providers: check their docs. At minimum, set up a logical
backup of `save_snapshot`, `legacy_record`, `world_event` —
`npc_memory` / `rumor` / `agent_log` are regenerable.

## 7. Schema migrations

When the schema changes:

1. Bump `SCHEMA_VERSION` in `packages/persistence/src/schema.ts`.
2. Add `database/migrations/002_*.sql` (or however the next number
   lands) with `ALTER TABLE … IF NOT EXISTS` or column-additive DDL.
3. Update `scripts/db-migrate.mjs` to apply newer migration files in
   order. (Phase 5 will replace this with a proper migration tool —
   currently the schema is small enough that a single file is fine.)
