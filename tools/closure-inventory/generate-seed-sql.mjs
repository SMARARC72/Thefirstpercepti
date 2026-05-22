#!/usr/bin/env node
/**
 * Phase 24d / 6a.5 commit 2c — Seed SQL generator
 *
 * Reads closure-filtered + bulk-spot-checked JSON catalogs and emits
 * idempotent INSERT SQL migrations.
 *
 * Pattern: jsonb_array_elements + ON CONFLICT DO NOTHING. Required NOT NULL
 * columns are extracted by JSON path; remaining schema-conformant fields
 * land in the matching JSONB column where present.
 *
 * Outputs (overwrites if present):
 *   supabase/migrations/<ts>_seed_v08_content_items_spells.sql
 *   supabase/migrations/<ts>_seed_v08_content_bulk_catalogs.sql
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const CONTENT = join(ROOT, "content", "world-data");
const MIGRATIONS = join(ROOT, "supabase", "migrations");

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

const loadArr = (file, key) => {
  const j = JSON.parse(readFileSync(join(CONTENT, file), "utf8"));
  if (Array.isArray(j)) return j;
  return j[key] || Object.values(j).find((v) => Array.isArray(v)) || [];
};

function sqlString(s) {
  if (s === null || s === undefined) return "NULL";
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlJsonbLiteral(value) {
  // PG-safe JSONB literal — escape single quotes by doubling
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

/**
 * Build INSERT using jsonb_array_elements expansion. Required (NOT NULL)
 * columns extracted via ->>; remaining fields persisted via JSONB columns.
 */
function buildJsonbArrayInsert(table, rows, columnMappings, primaryKey, schemaVersion = "v0.8") {
  // columnMappings: [{col, jsonPath, type, isJsonb}]
  const colList = columnMappings.map((m) => `"${m.col}"`).join(", ") + ', "schema_version"';
  const selectExprs = columnMappings.map((m) => {
    if (m.isJsonb) {
      // JSONB column: select the sub-object as JSONB
      return `(x->${sqlString(m.jsonPath)})`;
    }
    if (m.type === "int" || m.type === "numeric" || m.type === "boolean") {
      return `(x->>${sqlString(m.jsonPath)})::${m.type}`;
    }
    // text default
    return `x->>${sqlString(m.jsonPath)}`;
  }).join(",\n  ");
  return `INSERT INTO "public"."${table}" (${colList})
SELECT
  ${selectExprs},
  '${schemaVersion}'
FROM jsonb_array_elements(${sqlJsonbLiteral(rows)}) AS x
ON CONFLICT ("${primaryKey}") DO NOTHING;`;
}

// ----------------------------------------------------------------------------
// ITEMS — closure-filtered (15 rows)
// ----------------------------------------------------------------------------
function generateItemsSeed() {
  const all = loadArr("items.json", "items");
  const closure = all.filter((it) => CLOSURE_ITEM_IDS.has(it.item_id));

  const mappings = [
    { col: "item_id",    jsonPath: "item_id",    type: "text" },
    { col: "name",       jsonPath: "name",       type: "text" },
    { col: "type",       jsonPath: "type",       type: "text" },
    { col: "rarity",     jsonPath: "rarity",     type: "text" },
    { col: "subtype",    jsonPath: "subtype",    type: "text" },
    { col: "weight_lb",  jsonPath: "weight_lb",  type: "numeric" },
    { col: "value_cp",   jsonPath: "value_cp",   type: "int" },
    { col: "regional_origin_id", jsonPath: "regional_origin_id", type: "text" },
    { col: "regional_pack_id",   jsonPath: "regional_pack_id",   type: "text" },
    { col: "description_short",  jsonPath: "description_short",  type: "text" },
    { col: "description_long",   jsonPath: "description_long",   type: "text" },
    { col: "damage_dice", jsonPath: "damage_dice", type: "text" },
    { col: "damage_type", jsonPath: "damage_type", type: "text" },
    { col: "armor_ac_base", jsonPath: "armor_ac_base", type: "int" },
    { col: "armor_dex_cap", jsonPath: "armor_dex_cap", type: "int" },
    { col: "requires_attunement", jsonPath: "requires_attunement", type: "boolean" },
    { col: "attunement_ceremony", jsonPath: "attunement_ceremony", type: "text" },
    { col: "attunement_slot_cost", jsonPath: "attunement_slot_cost", type: "int" },
    { col: "charges_max", jsonPath: "charges_max", type: "int" },
    { col: "charges_recover", jsonPath: "charges_recover", type: "text" },
    { col: "acquisition_method", jsonPath: "acquisition_method", type: "text" },
    { col: "value_in_scrip", jsonPath: "value_in_scrip", type: "int" },
    { col: "value_note",  jsonPath: "value_note",  type: "text" },
    // JSONB columns
    { col: "weapon_properties", jsonPath: "weapon_properties", isJsonb: true },
    { col: "effects_on_attune_structured", jsonPath: "effects_on_attune_structured", isJsonb: true },
    { col: "effects_on_equip_structured",  jsonPath: "effects_on_equip_structured",  isJsonb: true },
    { col: "effects_on_use_structured",    jsonPath: "effects_on_use_structured",    isJsonb: true },
    { col: "effects_passive_structured",   jsonPath: "effects_passive_structured",   isJsonb: true },
    { col: "witness_payload", jsonPath: "witness_payload", isJsonb: true },
    { col: "tags",        jsonPath: "tags",        isJsonb: true },
  ];

  return buildJsonbArrayInsert("item", closure, mappings, "item_id");
}

// ----------------------------------------------------------------------------
// SPELLS — closure-filtered (9 rows)
// ----------------------------------------------------------------------------
function generateSpellsSeed() {
  const all = loadArr("spells.json", "spells");
  const closure = all.filter((s) => CLOSURE_SPELL_IDS.has(s.spell_id));

  const mappings = [
    { col: "spell_id", jsonPath: "spell_id", type: "text" },
    { col: "name", jsonPath: "name", type: "text" },
    { col: "level", jsonPath: "level", type: "int" },
    { col: "school", jsonPath: "school", type: "text" },
    { col: "casting_time", jsonPath: "casting_time", type: "text" },
    { col: "range", jsonPath: "range", type: "text" },
    { col: "components", jsonPath: "components", isJsonb: true },
    { col: "duration", jsonPath: "duration", isJsonb: true },
    { col: "classes_allowed", jsonPath: "classes_allowed", isJsonb: true },
    { col: "concentration", jsonPath: "concentration", type: "boolean" },
    { col: "ritual_eligible", jsonPath: "ritual_eligible", type: "boolean" },
    { col: "save_type", jsonPath: "save_type", type: "text" },
    { col: "attack_kind", jsonPath: "attack_kind", type: "text" },
    { col: "damage_dice", jsonPath: "damage_dice", type: "text" },
    { col: "damage_type", jsonPath: "damage_type", type: "text" },
  ];

  return buildJsonbArrayInsert("spell", closure, mappings, "spell_id");
}

// ----------------------------------------------------------------------------
// CONDITIONS — bulk (4 rows)
// ----------------------------------------------------------------------------
function generateConditionsSeed() {
  const all = loadArr("conditions.json", "conditions");
  const mappings = [
    { col: "condition_id",          jsonPath: "condition_id",         type: "text" },
    { col: "name",                  jsonPath: "name",                 type: "text" },
    { col: "scope",                 jsonPath: "scope",                type: "text" },
    { col: "source_pack",           jsonPath: "source_pack",          type: "text" },
    { col: "abbreviation",          jsonPath: "abbreviation",         type: "text" },
    { col: "ui_glyph",              jsonPath: "ui_glyph",             type: "text" },
    { col: "ui_category",           jsonPath: "ui_category",          type: "text" },
    { col: "stackable",             jsonPath: "stackable",            type: "boolean" },
    { col: "level_based",           jsonPath: "level_based",          type: "boolean" },
    { col: "max_level",             jsonPath: "max_level",            type: "int" },
    { col: "duration_types_allowed", jsonPath: "duration_types_allowed", isJsonb: true },
    { col: "effect_rules",          jsonPath: "effect_rules",         type: "text" },
    { col: "removal_methods",       jsonPath: "removal_methods",      isJsonb: true },
  ];
  return buildJsonbArrayInsert("condition", all, mappings, "condition_id");
}

// ----------------------------------------------------------------------------
// LITANIES — bulk (20 rows)
// ----------------------------------------------------------------------------
function generateLitaniesSeed() {
  const all = loadArr("litanies.json", "litanies");
  const mappings = [
    { col: "litany_id",               jsonPath: "litany_id",               type: "text" },
    { col: "title",                   jsonPath: "title",                   type: "text" },
    { col: "text_body",               jsonPath: "text_body",               type: "text" },
    { col: "mechanical_effect",       jsonPath: "mechanical_effect",       type: "text" },
    { col: "voice_register",          jsonPath: "voice_register",          type: "text" },
    { col: "rite_kind",               jsonPath: "rite_kind",               type: "text" },
    { col: "faction_origin",          jsonPath: "faction_origin",          type: "text" },
    { col: "first_heard_default_npc", jsonPath: "first_heard_default_npc", type: "text" },
    { col: "origin_institution",      jsonPath: "origin_institution",      type: "text" },
    { col: "canonical_use",           jsonPath: "canonical_use",           type: "text" },
    { col: "tags",                    jsonPath: "tags",                    isJsonb: true },
    { col: "tone_tags",               jsonPath: "tone_tags",               isJsonb: true },
  ];
  return buildJsonbArrayInsert("litany", all, mappings, "litany_id");
}

// ----------------------------------------------------------------------------
// MARGINALIA — bulk (25 rows)
// ----------------------------------------------------------------------------
function generateMarginaliaSeed() {
  const all = loadArr("marginalia.json", "marginalia");
  const mappings = [
    { col: "marginalia_id",      jsonPath: "marginalia_id",      type: "text" },
    { col: "text",               jsonPath: "text",               type: "text" },
    { col: "trigger_kind",       jsonPath: "trigger_kind",       type: "text" },
    { col: "trigger_event_kind", jsonPath: "trigger_event_kind", type: "text" },
    { col: "tone_tags",          jsonPath: "tone_tags",          isJsonb: true },
  ];
  return buildJsonbArrayInsert("marginalia", all, mappings, "marginalia_id");
}

// ----------------------------------------------------------------------------
// IMPOSED SPELLS — bulk (5 rows)
// ----------------------------------------------------------------------------
function generateImposedSpellsSeed() {
  const all = loadArr("imposed_spells.json", "imposed_spells");
  const mappings = [
    { col: "spell_id",                  jsonPath: "spell_id",                  type: "text" },
    { col: "name",                      jsonPath: "name",                      type: "text" },
    { col: "level",                     jsonPath: "level",                     type: "int" },
    { col: "school",                    jsonPath: "school",                    type: "text" },
    { col: "regional_school_id",        jsonPath: "regional_school_id",        type: "text" },
    { col: "regional_origin_id",        jsonPath: "regional_origin_id",        type: "text" },
    { col: "regional_pantheon_alignment", jsonPath: "regional_pantheon_alignment", type: "text" },
    { col: "casting_time",              jsonPath: "casting_time",              type: "text" },
    { col: "range",                     jsonPath: "range",                     type: "text" },
    { col: "components",                jsonPath: "components",                isJsonb: true },
    { col: "duration",                  jsonPath: "duration",                  isJsonb: true },
    { col: "classes_allowed",           jsonPath: "classes_allowed",           isJsonb: true },
    { col: "domain_aligned",            jsonPath: "domain_aligned",            isJsonb: true },
    { col: "cost_layer",                jsonPath: "cost_layer",                isJsonb: true },
    { col: "concentration",             jsonPath: "concentration",             type: "boolean" },
    { col: "ritual_eligible",           jsonPath: "ritual_eligible",           type: "boolean" },
    { col: "save_type",                 jsonPath: "save_type",                 type: "text" },
    { col: "attack_kind",               jsonPath: "attack_kind",               type: "text" },
    { col: "damage_dice",               jsonPath: "damage_dice",               type: "text" },
    { col: "damage_type",               jsonPath: "damage_type",               type: "text" },
    { col: "description_template",      jsonPath: "description_template",      type: "text" },
  ];
  return buildJsonbArrayInsert("imposed_spell", all, mappings, "spell_id");
}

// ----------------------------------------------------------------------------
// Q-CLOSURE-3: warlock starter_pack UPDATE
// ----------------------------------------------------------------------------
function generateWarlockStarterPackUpdate() {
  // Per Q-CLOSURE-3 ratification: v0.8 Khojen starter = dagger + quarterstaff
  // + pact-trinket + initial scrip. Pact-trinket TBD; left empty per first-read
  // discipline (NOT a sentinel — explicit empty until pact-trinket authored).
  const starterPack = [
    { item_id: "itm_dagger", qty: 2, slot: "main_hand" },
    { item_id: "itm_quarterstaff", qty: 1, slot: "main_hand_alt" },
    { item_id: "item_tide_league_scrip_bundle_25", qty: 1, slot: "currency" },
  ];
  return `-- Q-CLOSURE-3 patch: v0.8 Khojen warlock starter_pack
--   dropped: itm_component_pouch + itm_scholars_pack (not in catalog; defer v0.9)
--   added: dagger (x2) + quarterstaff + Tide League scrip bundle
--   pact-trinket: TBD per pact-defined; omitted until pact subclass authored
UPDATE "public"."class"
SET starter_pack = ${sqlJsonbLiteral(starterPack)}
WHERE class_id = 'cls-warlock';`;
}

// ----------------------------------------------------------------------------
// Migration file assembly
// ----------------------------------------------------------------------------
function header(title) {
  return `-- ============================================================================
-- ${title}
-- Generated by tools/closure-inventory/generate-seed-sql.mjs
-- DO NOT EDIT BY HAND — regenerate via the script after closure changes.
-- ============================================================================
`;
}

function writeMigration(ts, name, body) {
  const path = join(MIGRATIONS, `${ts}_${name}.sql`);
  writeFileSync(path, body, "utf8");
  console.log(`  wrote ${path}`);
}

const TS_ITEMS_SPELLS  = "20260522161900";
const TS_BULK_CATALOGS = "20260522161901";
// TS_WARLOCK_PATCH removed: public.class has NO starter_pack column.
// Q-CLOSURE-3 patch deferred to v0.8.1 schema pack (requires ALTER TABLE +
// schema_pack_v0.8.1 update). Logged in OPEN_QUESTIONS.md.

console.log("Generating 6a.5 commit 2c seed migrations:");

// FK pre-flight: items.regional_pack_id='greywake' requires public.regional_pack
// row with pack_id='greywake'. Foundation seed seeded `region` (different table).
// Insert the regional_pack row here so the items FK resolves.
const regionalPackSeed = `-- Regional pack umbrella row (FK target for item.regional_pack_id)
INSERT INTO "public"."regional_pack" ("pack_id", "region_id", "kind", "version", "schema_version")
VALUES ('greywake', 'greywake', 'items', 'v0.8', 'v0.8')
ON CONFLICT ("pack_id") DO NOTHING;`;

writeMigration(
  TS_ITEMS_SPELLS,
  "seed_v08_content_items_spells",
  header("Phase 24d / 6a.5 commit 2c — items (15 closure) + spells (9 closure)") +
  "\n-- REGIONAL_PACK (FK pre-flight; required by item.regional_pack_id='greywake')\n" +
  regionalPackSeed + "\n\n" +
  "-- ITEMS (Khojen slice closure, 15 rows; 8 of 11 oneOf variants exercised)\n" +
  generateItemsSeed() + "\n\n" +
  "-- SPELLS (Khojen warlock baseline + slice-contradiction family, 9 rows)\n" +
  generateSpellsSeed() + "\n",
);

writeMigration(
  TS_BULK_CATALOGS,
  "seed_v08_content_bulk_catalogs",
  header("Phase 24d / 6a.5 commit 2c — bulk catalogs (conditions+litanies+marginalia+imposed_spells)") +
  "\n-- CONDITIONS (4 rows; Greywake-specific)\n" +
  generateConditionsSeed() + "\n\n" +
  "-- LITANIES (20 rows; Drowned Church liturgical content)\n" +
  generateLitaniesSeed() + "\n\n" +
  "-- MARGINALIA (25 rows; Codex marginalia)\n" +
  generateMarginaliaSeed() + "\n\n" +
  "-- IMPOSED SPELLS (5 rows; NPC-imposed slice spells incl. harden_contradiction, compose, hear_the_fountain)\n" +
  generateImposedSpellsSeed() + "\n",
);

// Q-CLOSURE-3 warlock starter_pack: DEFERRED — see OPEN_QUESTIONS.md
// generateWarlockStarterPackUpdate() retained for future v0.8.1 re-use.

console.log("\nDone.");
