#!/usr/bin/env node
/**
 * Phase 6a.5.8.2 #2 — Dump DB-level FK constraints to a cached JSON file.
 *
 * Walker `walk-closure.mjs` only sees JSON-source-file refs. DB-level FKs
 * (e.g. items.regional_pack_id → regional_pack — caught only at INSERT-time
 * during 6a.5 commit 2) are invisible to it without help. This script
 * dumps Postgres `information_schema.referential_constraints` to a JSON
 * file the walker reads + cross-checks on each run.
 *
 * Run after any schema migration that touches FK constraints.
 *
 * Usage: node tools/closure-inventory/dump-db-fk-targets.mjs
 * Output: tools/closure-inventory/db-fk-targets.json
 *
 * Requires: supabase CLI configured + linked project.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "db-fk-targets.json");

const SQL = `
SELECT
  tc.table_schema AS source_schema,
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_schema AS target_schema,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema IN ('public', 'content', 'state', 'engine')
ORDER BY tc.table_schema, tc.table_name, kcu.column_name
`;

console.log("Querying DB FK constraints via supabase CLI...");

let result;
try {
  result = execSync(
    `npx supabase db query --linked "${SQL.replace(/\n/g, " ").trim()}"`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
} catch (e) {
  console.error("Failed to query DB:", e.message);
  process.exit(1);
}

// supabase CLI emits a wrapper object `{boundary, rows, warning}`; extract rows.
const jsonStart = result.indexOf("{");
const parsed = JSON.parse(result.slice(jsonStart));
const fks = parsed.rows || [];

// Group by source table for ergonomic lookup
const grouped = {};
for (const fk of fks) {
  const sourceKey = `${fk.source_schema}.${fk.source_table}`;
  grouped[sourceKey] ??= [];
  grouped[sourceKey].push({
    column: fk.source_column,
    targets: `${fk.target_schema}.${fk.target_table}.${fk.target_column}`,
    on_delete: fk.delete_rule,
  });
}

const out = {
  _meta: {
    generated: new Date().toISOString(),
    source: "supabase db query --linked information_schema.referential_constraints",
    note: "Re-run dump-db-fk-targets.mjs after any schema migration touching FK constraints.",
  },
  fk_count: fks.length,
  by_source_table: grouped,
};

writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
console.log(`Wrote ${fks.length} FK constraints to ${OUT_PATH}`);
