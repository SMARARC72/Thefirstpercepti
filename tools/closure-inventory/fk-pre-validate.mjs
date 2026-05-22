#!/usr/bin/env node
/**
 * Phase 24d / Session 6a / 6a.5 — Pre-commit FK closure validator
 *
 * Used as a pre-flight gate BEFORE running each 6a.5 seed migration.
 * Loads a candidate seed-set JSON (the closure that's about to be inserted)
 * and verifies every cross-catalog FK resolves to another row in the same
 * candidate seed-set OR to a row already present in the live DB.
 *
 * Usage:
 *   node tools/closure-inventory/fk-pre-validate.mjs path/to/candidate.json
 *
 * Exit code:
 *   0 — all FKs resolve (safe to proceed with migration)
 *   1 — at least one FK does not resolve (STOP — expand closure or drop row)
 *
 * Candidate JSON shape:
 * {
 *   "items":       [{ "item_id": "...", ... }, ...],
 *   "materials":   [{ "material_id": "...", ... }, ...],
 *   "spells":      [{ "spell_id": "...", ... }, ...],
 *   "loot_tables": [{ "loot_table_id": "...", ... }, ...],
 *   "recipes":     [{ "recipe_id": "...", ... }, ...],
 *   "_live_db_ids_by_kind": {       // optional — IDs assumed present in live DB
 *     "items": [...], "materials": [...], ...
 *   }
 * }
 *
 * Note: this script does NOT hit Supabase. The caller is responsible for
 * populating _live_db_ids_by_kind from a prior SELECT query if validating
 * incremental seeds.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node fk-pre-validate.mjs <candidate.json>");
  process.exit(2);
}

const candidate = JSON.parse(readFileSync(resolve(path), "utf8"));
const live = candidate._live_db_ids_by_kind || {};
const liveSet = (kind) => new Set(live[kind] || []);

function idSet(arr, key) {
  return new Set((arr || []).map((r) => r[key]));
}

const known = {
  items:       new Set([...idSet(candidate.items,       "item_id"),       ...liveSet("items")]),
  materials:   new Set([...idSet(candidate.materials,   "material_id"),   ...liveSet("materials")]),
  spells:      new Set([...idSet(candidate.spells,      "spell_id"),      ...liveSet("spells")]),
  loot_tables: new Set([...idSet(candidate.loot_tables, "loot_table_id"), ...liveSet("loot_tables")]),
  recipes:     new Set([...idSet(candidate.recipes,     "recipe_id"),     ...liveSet("recipes")]),
};

const failures = [];

// FK edges (must match walk-closure.mjs declarations)
for (const item of (candidate.items || [])) {
  for (const block of ["effects_on_attune_structured", "effects_on_equip_structured",
                       "effects_on_use_structured", "effects_passive_structured"]) {
    for (const eff of (item[block] || [])) {
      if (eff?.spell_id && !known.spells.has(eff.spell_id)) {
        failures.push({ source: `item:${item.item_id}.${block}`, ref_kind: "spell", ref_id: eff.spell_id });
      }
    }
  }
  if (item.crafting?.recipe_id && !known.recipes.has(item.crafting.recipe_id)) {
    failures.push({ source: `item:${item.item_id}.crafting.recipe_id`, ref_kind: "recipe", ref_id: item.crafting.recipe_id });
  }
}

for (const recipe of (candidate.recipes || [])) {
  for (const m of (recipe.materials || [])) {
    if (m?.material_id && !known.materials.has(m.material_id)) {
      failures.push({ source: `recipe:${recipe.recipe_id}.materials[]`, ref_kind: "material", ref_id: m.material_id });
    }
  }
  if (recipe.produces_item_id && !known.items.has(recipe.produces_item_id)) {
    failures.push({ source: `recipe:${recipe.recipe_id}.produces_item_id`, ref_kind: "item", ref_id: recipe.produces_item_id });
  }
}

for (const table of (candidate.loot_tables || [])) {
  for (const roll of (table.rolls || [])) {
    if (roll?.item_id && !known.items.has(roll.item_id)) {
      failures.push({ source: `loot_table:${table.loot_table_id}.rolls[]`, ref_kind: "item", ref_id: roll.item_id });
    }
    for (const entry of (roll.entries || [])) {
      if (entry?.item_id && !known.items.has(entry.item_id)) {
        failures.push({ source: `loot_table:${table.loot_table_id}.rolls[].entries[]`, ref_kind: "item", ref_id: entry.item_id });
      }
    }
  }
}

if (failures.length === 0) {
  console.log("FK pre-validate: OK — all cross-catalog FKs resolve within candidate + live DB.");
  console.log(`  items=${known.items.size} materials=${known.materials.size} spells=${known.spells.size} loot_tables=${known.loot_tables.size} recipes=${known.recipes.size}`);
  process.exit(0);
}

console.error(`FK pre-validate: FAIL — ${failures.length} unresolved FK(s):`);
for (const f of failures) {
  console.error(`  - ${f.source} → ${f.ref_kind}:${f.ref_id} NOT FOUND`);
}
console.error("\nFix options: (a) add the missing row to candidate, (b) drop the referencing row, (c) populate _live_db_ids_by_kind if the row is already live.");
process.exit(1);
