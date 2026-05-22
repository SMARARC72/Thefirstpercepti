#!/usr/bin/env node
/**
 * Phase 24d / 6a.5 commit 2 — Bulk-seed spot-check (Q-CLOSURE-5 discipline)
 *
 * For each bulk-include catalog: validate required fields per schema_pack_v0.8
 * + check internal FK refs (e.g., recipe.materials[].material_id resolves).
 * Drops broken rows from candidate seed set; reports clean/broken/deferred
 * counts. >25% broken-row rate on any catalog → exit 2 (STOP + surface).
 *
 * Outputs:
 *   - tools/closure-inventory/BULK_SEED_REPORT.md (per-catalog counts + drops)
 *   - tools/closure-inventory/.candidate/<catalog>.json (clean seed set)
 *
 * Catalogs spot-checked (per Q-CLOSURE-5 ratification):
 *   recipes / litanies / marginalia / imposed_spells / conditions
 *
 * Items + spells use closure-driven seeds, not bulk-include — handled by
 * walk-closure.mjs upstream.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const CONTENT = join(ROOT, "content", "world-data");
const SCHEMA = JSON.parse(readFileSync(join(ROOT, "content", "schemas", "schema_pack_v0.8.json"), "utf8"));
const CANDIDATE_DIR = join(__dirname, ".candidate");
mkdirSync(CANDIDATE_DIR, { recursive: true });

const STOP_THRESHOLD_BROKEN_PCT = 25;

// Closure-driven IDs (loaded from items.json/spells.json filtered by walker start_set)
// Used to validate cross-catalog FK refs from bulk catalogs back into closure
const CLOSURE_ITEM_IDS = new Set([
  "item_marrow_wax_seal_of_ilyra", "item_listening_childs_pebble", "item_bell_marked_charm",
  "item_vial_of_practiced_name_water", "item_salt_rime_shard", "item_witness_bell",
  "item_drowned_amber_pendant", "item_bell_court_inkwell_stamp", "item_field_journal_blank",
  "item_meteoric_iron_dagger", "item_compose_chalk", "item_tide_league_scrip_bundle_25",
  "itm_dagger", "itm_light_crossbow", "itm_leather_armor",
]);
const CLOSURE_SPELL_IDS = new Set([
  "eldritch_blast", "mage_hand", "hex",
  "contradiction_bolt", "witness_true", "name_pull", "mark_stay", "hum_of_witnesses",
]);

// ----------------------------------------------------------------------------
// Per-catalog validators
// ----------------------------------------------------------------------------
function validateRow(row, kind, schemas) {
  const def = schemas[kind];
  if (!def) return { ok: false, reason: `no schema for ${kind}` };

  const required = def.required || [];
  for (const k of required) {
    if (row[k] === undefined || row[k] === null) {
      return { ok: false, reason: `missing required field: ${k}` };
    }
  }
  return { ok: true };
}

function validateFkRefs(row, kind) {
  // Per-kind FK rules (cross-catalog only; intra-row refs handled elsewhere)
  const broken = [];
  if (kind === "recipe") {
    if (row.produces_item_id && !CLOSURE_ITEM_IDS.has(row.produces_item_id)) {
      broken.push(`produces_item_id=${row.produces_item_id} not in closure`);
    }
    for (const m of (row.materials || [])) {
      // Recipes reference materials via material_id; closure has 0 materials.
      // Any material_id ref is automatically broken (defer-to-v0.9 territory).
      if (m?.material_id) {
        broken.push(`materials[].material_id=${m.material_id} (no materials in closure; v0.9 defer)`);
      }
    }
  }
  // imposed_spell.spell_id is the PK of imposed_spells table — NOT a FK to spells.
  // No cross-catalog ref to validate.
  // litanies / marginalia / conditions: no cross-catalog FK to items/spells in typical shape
  return broken;
}

// ----------------------------------------------------------------------------
// Catalog loader
// ----------------------------------------------------------------------------
const CATALOGS = [
  { name: "conditions",      file: "conditions.json",      idKey: "condition_id",     kind: "condition" },
  { name: "litanies",        file: "litanies.json",        idKey: "litany_id",        kind: "litany" },
  { name: "marginalia",      file: "marginalia.json",      idKey: "marginalia_id",    kind: "marginalia" },
  { name: "imposed_spells",  file: "imposed_spells.json",  idKey: "spell_id",         kind: "imposed_spell" },
  // recipes: deferred per Q-CLOSURE-2 ratification — all 12 reference materials
  // not in slice closure (no materials seeded; defer crafting graph to v0.9).
  // Not skipped here so the report still surfaces the row count + deferred status.
  { name: "recipes",         file: "recipes.json",         idKey: "recipe_id",        kind: "recipe", deferred: "Q-CLOSURE-2" },
];

function loadAsArr(file, possibleKeys) {
  const j = JSON.parse(readFileSync(join(CONTENT, file), "utf8"));
  if (Array.isArray(j)) return j;
  for (const k of possibleKeys) if (Array.isArray(j[k])) return j[k];
  // Fall back to first array-valued key
  for (const k of Object.keys(j)) if (Array.isArray(j[k])) return j[k];
  return [];
}

function spotCheckAll() {
  const results = [];
  let stop = false;
  for (const cat of CATALOGS) {
    const rows = loadAsArr(cat.file, [cat.name]);
    const clean = [];
    const broken = [];
    for (const row of rows) {
      const sv = validateRow(row, cat.kind, SCHEMA.schemas);
      const fkBroken = validateFkRefs(row, cat.kind);
      if (!sv.ok) {
        broken.push({ id: row[cat.idKey] || "(no id)", reason: sv.reason });
      } else if (fkBroken.length > 0) {
        broken.push({ id: row[cat.idKey] || "(no id)", reason: fkBroken.join("; ") });
      } else {
        clean.push(row);
      }
    }
    const total = rows.length;
    const brokenPct = total === 0 ? 0 : Math.round((broken.length / total) * 100);
    // Catalogs marked `deferred` skip the STOP gate (ratification already covered)
    const isStop = !cat.deferred && brokenPct > STOP_THRESHOLD_BROKEN_PCT;
    if (isStop) stop = true;
    results.push({ name: cat.name, total, clean: clean.length, broken: broken.length, brokenPct, isStop, deferred: cat.deferred || null, brokenList: broken });

    // Skip writing candidate for deferred catalogs (won't be seeded in 6a.5)
    if (!cat.deferred) {
      writeFileSync(
        join(CANDIDATE_DIR, `${cat.name}.json`),
        JSON.stringify({ [cat.name]: clean, _meta: { source: cat.file, total, clean: clean.length, broken: broken.length, brokenPct, generated: new Date().toISOString() } }, null, 2),
        "utf8",
      );
    }
  }
  return { results, stop };
}

// ----------------------------------------------------------------------------
// Report
// ----------------------------------------------------------------------------
function emitReport(results, stop) {
  const lines = [`# Phase 24d / 6a.5 commit 2 — Bulk-seed spot-check report`, ``];
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Discipline:** Q-CLOSURE-5 pre-commit spot-check (Discipline 9 spirit)`);
  lines.push(`**Stop threshold:** >${STOP_THRESHOLD_BROKEN_PCT}% broken-row rate on any catalog → STOP + surface`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| catalog | total | clean | broken | broken_% | status |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const r of results) {
    const status = r.isStop ? "**STOP**" : (r.deferred ? `deferred (${r.deferred})` : (r.broken > 0 ? "warn" : "OK"));
    lines.push(`| ${r.name} | ${r.total} | ${r.clean} | ${r.broken} | ${r.brokenPct}% | ${status} |`);
  }
  lines.push(``);
  lines.push(`**Overall:** ${stop ? "STOP — at least one catalog exceeds broken-row threshold; surface before INSERT" : "OK — all catalogs below threshold; safe to proceed with candidate seed sets"}`);
  lines.push(``);
  for (const r of results) {
    if (r.broken === 0) continue;
    lines.push(`### Broken rows — ${r.name}`);
    lines.push(``);
    for (const b of r.brokenList) lines.push(`- \`${b.id}\` — ${b.reason}`);
    lines.push(``);
  }
  lines.push(`## Candidate seed sets`);
  lines.push(``);
  lines.push(`Clean rows written to \`tools/closure-inventory/.candidate/\` (one JSON per catalog).`);
  lines.push(`Use these as the source for 6a.5 commit 2c seed migrations.`);
  return lines.join("\n");
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
const { results, stop } = spotCheckAll();
const report = emitReport(results, stop);
writeFileSync(join(__dirname, "BULK_SEED_REPORT.md"), report, "utf8");

console.log("=== Bulk-Seed Spot-Check ===");
for (const r of results) {
  const tag = r.isStop ? " **STOP**" : (r.deferred ? ` (deferred ${r.deferred})` : (r.broken > 0 ? " warn" : ""));
  console.log(`  ${r.name.padEnd(16)} total=${r.total}  clean=${r.clean}  broken=${r.broken}  (${r.brokenPct}%)${tag}`);
}
console.log(`\nReport: ${join(__dirname, "BULK_SEED_REPORT.md")}`);
console.log(`Candidates: ${CANDIDATE_DIR}`);

if (stop) {
  console.error(`\nSTOP: at least one catalog exceeded ${STOP_THRESHOLD_BROKEN_PCT}% broken-row threshold.`);
  process.exit(2);
}
process.exit(0);
