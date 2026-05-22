#!/usr/bin/env node
/**
 * Phase 24d / Session 6a / 6a.5 — Closure-inventory walker (Discipline 9)
 *
 * Walks transitive-closure FK graph from a configurable start-set across
 * 5 catalogs (items + materials + spells + loot_tables + recipes) and
 * emits the closure set + counts vs stop thresholds.
 *
 * Risk 3 hardening: this is the read-only analysis pass. Any half-closure
 * (FK that resolves to a row NOT in the catalog) is flagged BROKEN and
 * surfaced for ratification before seed migrations are authored.
 *
 * Stop thresholds (user-set):
 *   items=30  materials=50  spells=25  loot_tables=8
 *
 * Usage: node tools/closure-inventory/walk-closure.mjs [--json] [--verbose]
 *
 * Output: tools/closure-inventory/CLOSURE_REPORT.md (default)
 *         + stdout summary
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const CONTENT = join(ROOT, "content", "world-data");

const STOP_THRESHOLDS = { items: 30, materials: 50, spells: 25, loot_tables: 8 };

// ----------------------------------------------------------------------------
// Start-set per user spec — Khojen warlock starter + Q1 tree + PO.I/II/III + currency
// ----------------------------------------------------------------------------
const START_SET = {
  items: [
    // PO.I antechamber + dry fountain (named slice items, verified IDs)
    "item_marrow_wax_seal_of_ilyra",        // Ilyra's sworn-gift seal
    "item_listening_childs_pebble",         // dry fountain gifted-only pebble
    "item_bell_marked_charm",               // Bell Court attuned charm
    "item_vial_of_practiced_name_water",    // Hear-the-Fountain output
    "item_salt_rime_shard",                 // raw substrate component (verified ID)
    "item_witness_bell",                    // bell for committed canon events (verified ID)
    "item_drowned_amber_pendant",           // Drowned Church initiate marker
    "item_bell_court_inkwell_stamp",        // Bell Court junior-clerk witness mark (verified ID)
    // PO.II Sea-watch + PO.III Bone Awning
    "item_field_journal_blank",             // ordinary cross-faction journal (Tale Log) (verified ID)
    "item_meteoric_iron_dagger",            // Greywake-forged meteoric-iron blade (verified ID)
    "item_compose_chalk",                   // Compose-ritual boundary chalk (verified ID)
    // Currency (scrip + salt-coin)
    "item_tide_league_scrip_bundle_25",     // Tide League issued scrip
    // Khojen warlock starter — concrete weapons/armor only
    // (component_pouch + scholars_pack abstractions NOT in catalog — defer to v0.9)
    "itm_dagger",                           // 2x dagger (warlock simple weapon)
    "itm_light_crossbow",                   // simple ranged
    "itm_leather_armor",                    // warlock light armor proficiency
  ],
  spells: [
    // Khojen warlock cantrips (2 known at L1)
    "eldritch_blast",                       // canonical warlock cantrip
    "mage_hand",                            // utility cantrip
    // Warlock L1 spells known (2 at L1)
    "hex",                                  // signature warlock spell
    // armor_of_agathys was in original start_set but is NOT present in spells.json
    // (dropped post-push verification). L1 defensive deferred to v0.9 spell expansion.
    // Slice-relevant warlock-allowed spells (contradiction/witness/name family)
    "contradiction_bolt",                   // L1; substitute for deferred spell_harden_contradiction
    "witness_true",                         // L0
    "name_pull",                            // L0
    "mark_stay",                            // L0
    "hum_of_witnesses",                     // L1
    // spell_harden_contradiction: DROPPED — Q-CLOSURE-1 spirit, deferred to v0.9
  ],
  recipes: [
    // All 12 recipes deferred to v0.9 per Q-CLOSURE-2 ratification
  ],
  materials: [],   // expand transitively from recipes
  loot_tables: [], // start empty; expand only if creatures/encounters need them
};

// ----------------------------------------------------------------------------
// FK edge declarations — what each catalog kind references in the others
// ----------------------------------------------------------------------------
function loadCatalogs() {
  const items     = JSON.parse(readFileSync(join(CONTENT, "items.json"),       "utf8"));
  const materials = JSON.parse(readFileSync(join(CONTENT, "materials.json"),   "utf8"));
  const spells    = JSON.parse(readFileSync(join(CONTENT, "spells.json"),      "utf8"));
  const loot      = JSON.parse(readFileSync(join(CONTENT, "loot_tables.json"), "utf8"));
  const recipes   = JSON.parse(readFileSync(join(CONTENT, "recipes.json"),     "utf8"));

  const arr = (x, key) => Array.isArray(x) ? x : (x[key] || []);
  return {
    items:       arr(items, "items"),
    materials:   arr(materials, "materials"),
    spells:      arr(spells, "spells"),
    loot_tables: arr(loot, "loot_tables"),
    recipes:     arr(recipes, "recipes"),
  };
}

function indexBy(arr, key) {
  const m = new Map();
  for (const row of arr) m.set(row[key], row);
  return m;
}

// Collect every spell_id referenced by an item's effect blocks (any of 4)
function spellRefsOnItem(item) {
  const out = new Set();
  for (const block of ["effects_on_attune_structured", "effects_on_equip_structured",
                       "effects_on_use_structured", "effects_passive_structured"]) {
    for (const eff of (item[block] || [])) {
      if (eff?.spell_id) out.add(eff.spell_id);
    }
  }
  return out;
}

// Collect recipe_id refs from an item (crafting.recipe_id + intermediate_steps[])
function recipeRefsOnItem(item) {
  const out = new Set();
  if (item.crafting?.recipe_id) out.add(item.crafting.recipe_id);
  // intermediate_steps are recipe-step strings (not full recipe IDs) per inspection
  // — treated as same-recipe substeps + ignored at FK level for now
  return out;
}

// Collect material_id refs from a recipe's materials[]
function materialRefsOnRecipe(recipe) {
  const out = new Set();
  for (const m of (recipe.materials || [])) {
    if (m?.material_id) out.add(m.material_id);
  }
  return out;
}

// Collect item_id ref from a recipe's produces_item_id
function itemRefsOnRecipe(recipe) {
  const out = new Set();
  if (recipe.produces_item_id) out.add(recipe.produces_item_id);
  return out;
}

// Collect item_id refs from a loot_table's rolls[]
function itemRefsOnLootTable(table) {
  const out = new Set();
  for (const roll of (table.rolls || [])) {
    if (roll?.item_id) out.add(roll.item_id);
    for (const entry of (roll.entries || [])) {
      if (entry?.item_id) out.add(entry.item_id);
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Closure walker — fixed-point BFS across FK graph
// ----------------------------------------------------------------------------
function walkClosure(cat) {
  const idxItem     = indexBy(cat.items,       "item_id");
  const idxMaterial = indexBy(cat.materials,   "material_id");
  const idxSpell    = indexBy(cat.spells,      "spell_id");
  const idxLoot     = indexBy(cat.loot_tables, "loot_table_id");
  const idxRecipe   = indexBy(cat.recipes,     "recipe_id");

  const closure = {
    items:       new Set(START_SET.items),
    materials:   new Set(START_SET.materials),
    spells:      new Set(START_SET.spells),
    loot_tables: new Set(START_SET.loot_tables),
    recipes:     new Set(START_SET.recipes),
  };
  const broken = []; // { kind, id, ref_kind, ref_id, source_kind, source_id }
  const seenBroken = new Set(); // dedupe key: `${kind}:${id}:${source_kind}:${source_id || ""}`
  const pushBroken = (entry) => {
    const key = `${entry.kind}:${entry.id}:${entry.source_kind}:${entry.source_id || ""}`;
    if (seenBroken.has(key)) return;
    seenBroken.add(key);
    broken.push(entry);
  };

  let grew = true;
  let iterations = 0;
  while (grew && iterations < 50) {
    grew = false;
    iterations++;

    // Items → spells, recipes
    for (const id of [...closure.items]) {
      const row = idxItem.get(id);
      if (!row) { pushBroken({ kind: "item", id, ref_kind: "self", ref_id: id, source_kind: "start_set" }); continue; }
      for (const s of spellRefsOnItem(row)) {
        if (!closure.spells.has(s)) {
          if (idxSpell.has(s)) { closure.spells.add(s); grew = true; }
          else pushBroken({ kind: "spell", id: s, ref_kind: "spell_id", ref_id: s, source_kind: "item", source_id: id });
        }
      }
      for (const r of recipeRefsOnItem(row)) {
        if (!closure.recipes.has(r)) {
          if (idxRecipe.has(r)) { closure.recipes.add(r); grew = true; }
          else pushBroken({ kind: "recipe", id: r, ref_kind: "recipe_id", ref_id: r, source_kind: "item", source_id: id });
        }
      }
    }

    // Recipes → materials, items
    for (const id of [...closure.recipes]) {
      const row = idxRecipe.get(id);
      if (!row) { pushBroken({ kind: "recipe", id, ref_kind: "self", ref_id: id, source_kind: "start_set" }); continue; }
      for (const m of materialRefsOnRecipe(row)) {
        if (!closure.materials.has(m)) {
          if (idxMaterial.has(m)) { closure.materials.add(m); grew = true; }
          else pushBroken({ kind: "material", id: m, ref_kind: "material_id", ref_id: m, source_kind: "recipe", source_id: id });
        }
      }
      for (const i of itemRefsOnRecipe(row)) {
        if (!closure.items.has(i)) {
          if (idxItem.has(i)) { closure.items.add(i); grew = true; }
          else pushBroken({ kind: "item", id: i, ref_kind: "produces_item_id", ref_id: i, source_kind: "recipe", source_id: id });
        }
      }
    }

    // Loot tables → items
    for (const id of [...closure.loot_tables]) {
      const row = idxLoot.get(id);
      if (!row) { pushBroken({ kind: "loot_table", id, ref_kind: "self", ref_id: id, source_kind: "start_set" }); continue; }
      for (const i of itemRefsOnLootTable(row)) {
        if (!closure.items.has(i)) {
          if (idxItem.has(i)) { closure.items.add(i); grew = true; }
          else pushBroken({ kind: "item", id: i, ref_kind: "loot_roll_item_id", ref_id: i, source_kind: "loot_table", source_id: id });
        }
      }
    }

    // Spells + materials are FK-terminal (no outgoing catalog refs in v0.8)
  }

  return { closure, broken, iterations };
}

// ----------------------------------------------------------------------------
// Report writer
// ----------------------------------------------------------------------------
function variantCountsForItems(closure, idxItem) {
  const variants = {};
  for (const id of closure.items) {
    const row = idxItem.get(id);
    if (!row) continue;
    const t = row.type || "(unknown)";
    variants[t] = (variants[t] || 0) + 1;
  }
  return variants;
}

function emitReport(cat, walk) {
  const idxItem = indexBy(cat.items, "item_id");
  const c = walk.closure;
  const variants = variantCountsForItems(c, idxItem);

  const counts = {
    items:       c.items.size,
    materials:   c.materials.size,
    spells:      c.spells.size,
    loot_tables: c.loot_tables.size,
    recipes:     c.recipes.size,
  };
  const thresholdRows = ["items", "materials", "spells", "loot_tables"].map(k => {
    const n = counts[k];
    const cap = STOP_THRESHOLDS[k];
    const status = n <= cap ? "OK" : "OVER";
    return `| ${k} | ${n} | ${cap} | ${status} |`;
  });

  const list = (set) => [...set].sort().map(x => `  - ${x}`).join("\n");

  const brokenLines = walk.broken.length === 0 ? "_(none — closure is well-formed)_" :
    walk.broken.map(b => `- **${b.kind}** \`${b.id}\` (referenced from ${b.source_kind} \`${b.source_id || "start_set"}\` via ${b.ref_kind})`).join("\n");

  return `# Phase 24d / 6a.5 — Catalog Closure Report

**Generated:** ${new Date().toISOString()}
**Discipline:** Discipline 9 transitive-closure (Risk 3 hardening)
**Stop thresholds:** items=30 / materials=50 / spells=25 / loot_tables=8

## Closure counts vs stop thresholds (closure-filtered catalogs)

| catalog | closure_size | threshold | status |
|---|---|---|---|
${thresholdRows.join("\n")}
| recipes | ${counts.recipes} | _(no explicit cap)_ | — |

**Fixed-point reached in ${walk.iterations} iterations.**

## Bulk-seed catalogs (NOT closure-filtered; slice-fixed content)

These catalogs are not part of the FK-closure walk — they are bulk-included
in 6a.5 commit 2 because they describe slice-fixed content not gated by
item FKs:

| catalog | rows | note |
|---|---|---|
| conditions.json | 4 | Greywake-specific conditions (matches user spec) |
| conditions-5e.json | 15 | Standard 5e conditions (canonical reference set) |
| litanies.json | 20 | Drowned Church liturgical content (matches user spec) |
| marginalia.json | 25 | Codex marginalia (matches user spec) |
| imposed_spells.json | 5 | NPC-imposed slice spells |
| forging-recipes.json | 5 | Slice-specific forging variants |
| recipes.json | 12 | All recipes (matches user spec) |

**abilities + traits**: v0.8 schema has NO standalone \`ability\` or \`trait\`
table. These live as embedded JSON inside race/class rows already seeded in
\`20260522143701_seed_v08_content_foundation.sql\` (race.tiefling derived
features + class.warlock pact features). Bulk-include = no-op for 6a.5.

## Item variant distribution (oneOf discriminator: \`type\`)

${Object.entries(variants).sort().map(([t, n]) => `- **${t}**: ${n}`).join("\n")}

This drives Item T handler design: only the variants above need bespoke handlers in 6a.5. Variants NOT exercised by closure → DEFER to v0.9 per first-read discipline.

## Broken FK refs (half-closures requiring ratification)

${brokenLines}

## Full closure set

### Items (${counts.items})
${list(c.items)}

### Materials (${counts.materials})
${list(c.materials)}

### Spells (${counts.spells})
${list(c.spells)}

### Loot tables (${counts.loot_tables})
${list(c.loot_tables)}

### Recipes (${counts.recipes})
${list(c.recipes)}

## Decision gates for Desktop

1. **Threshold compliance** — all 4 stop thresholds OK? If any OVER → expand cap OR drop closure entries.
2. **Broken FK list** — for each broken ref: (a) author the missing row into source JSON before 6a.5 commit 2, OR (b) drop the referencing row from closure, OR (c) defer to v0.9.
3. **Item variant set** — does the variant distribution match expected oneOf-handler scope? Approve list or amend.
4. **Listening Child CC hygiene** (non-blocking, separate decision per user) — confirm 2 CC entries carry death-equivalent semantic; small follow-up commit if not.

## Item T handler design (preview — not yet built)

Per Risk 3 hardening: bespoke-per-variant under oneOf dispatch.

\`\`\`ts
// Pseudocode — to be authored in 6a.5 commit 2
const itemVariantHandlers = {
  ${Object.keys(variants).sort().map(t => `${t}: translate${t.charAt(0).toUpperCase() + t.slice(1)}`).join(",\n  ")}
};
function translateItem(item) {
  const handler = itemVariantHandlers[item.type];
  if (!handler) throw new Error(\`No translator for item.type=\${item.type} (defer to v0.9)\`);
  return handler(item);
}
\`\`\`

NO base class. NO generic Translator<T>. NO inheritance.
Each variant gets its own roundtrip test fixture.
`;
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
function main() {
  const cat = loadCatalogs();
  const walk = walkClosure(cat);
  const report = emitReport(cat, walk);

  const outPath = join(__dirname, "CLOSURE_REPORT.md");
  writeFileSync(outPath, report, "utf8");

  console.log("=== Closure Inventory Summary ===");
  console.log(`items:       ${walk.closure.items.size} / ${STOP_THRESHOLDS.items}`);
  console.log(`materials:   ${walk.closure.materials.size} / ${STOP_THRESHOLDS.materials}`);
  console.log(`spells:      ${walk.closure.spells.size} / ${STOP_THRESHOLDS.spells}`);
  console.log(`loot_tables: ${walk.closure.loot_tables.size} / ${STOP_THRESHOLDS.loot_tables}`);
  console.log(`recipes:     ${walk.closure.recipes.size} (no cap)`);
  console.log(`broken FKs:  ${walk.broken.length}`);
  console.log(`iterations:  ${walk.iterations}`);
  console.log(`\nReport written to: ${outPath}`);
}

main();
