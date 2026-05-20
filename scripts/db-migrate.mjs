#!/usr/bin/env node
/**
 * db-migrate.mjs — apply database/schema.postgres.sql to the configured
 * Postgres instance.
 *
 * Reads from (in priority order):
 *   1. process.env.POSTGRES_URL_NON_POOLING
 *   2. process.env.POSTGRES_URL
 *
 * For local dev, put the connection string in apps/web/.env.local
 * (gitignored). For Vercel, set both env vars in the Project Settings.
 *
 * Idempotent: every statement uses IF NOT EXISTS. Safe to rerun.
 *
 * Usage:
 *   npm run db:migrate
 *   POSTGRES_URL=... node scripts/db-migrate.mjs
 *   node scripts/db-migrate.mjs --dry-run     # print SQL, don't execute
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

async function loadDotEnv() {
  // Lightweight .env loader — covers the keys we care about and avoids a
  // dotenv dep. Honors apps/web/.env.local (preferred for dev) and root
  // .env.local. Quoted values, comment lines, and blanks are all handled.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "..", "apps", "web", ".env.local"),
    path.resolve(here, "..", ".env.local"),
  ];
  for (const file of candidates) {
    try {
      const raw = await readFile(file, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) {
          process.env[key] = value;
        }
      }
      console.log(`[db-migrate] loaded env from ${file}`);
      return;
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code !== "ENOENT") {
        throw err;
      }
    }
  }
  console.log(`[db-migrate] no .env.local found; using process env only`);
}

function pickConnectionString() {
  const candidates = ["POSTGRES_URL_NON_POOLING", "POSTGRES_URL"];
  for (const key of candidates) {
    const value = process.env[key];
    if (value && value.length > 0) return { key, value };
  }
  return null;
}

async function readSchema() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const schemaPath = path.resolve(here, "..", "database", "schema.postgres.sql");
  return readFile(schemaPath, "utf8");
}

async function main() {
  await loadDotEnv();
  const dryRun = process.argv.includes("--dry-run");
  const sql = await readSchema();

  if (dryRun) {
    console.log("=== schema.postgres.sql ===\n");
    console.log(sql);
    return;
  }

  const target = pickConnectionString();
  if (!target) {
    console.error(
      "[db-migrate] No POSTGRES_URL_NON_POOLING or POSTGRES_URL in env.\n" +
        "  Set one in apps/web/.env.local for local migration, or in Vercel\n" +
        "  for production. See docs/POSTGRES_SETUP.md.",
    );
    process.exit(1);
  }

  console.log(`[db-migrate] using ${target.key}`);
  const client = new Client({
    connectionString: target.value,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log(`[db-migrate] connected`);
    await client.query(sql);
    console.log(`[db-migrate] schema applied`);
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('save_snapshot','world_event','npc_memory','rumor','agent_log','legacy_record')
       ORDER BY table_name
    `);
    console.log(
      `[db-migrate] verified tables: ${result.rows.map((r) => r.table_name).join(", ")}`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[db-migrate] failed:", err);
  process.exit(1);
});
