#!/usr/bin/env node
/**
 * scripts/normalize-content.mjs — v1 → v2 catalog normalizer
 *
 * Phase 19 / CONTENT-300. Used by Phase 19 port; kept in repo for future
 * v1-shaped contributions (legacy data import, regional pack contributions
 * from external authors, etc.).
 *
 * Discipline: catalog files in content/world-data/ MUST be v2-shape.
 * If a contributor lands a v1-shape file, run this normalizer before merge.
 *
 * Usage:
 *   node scripts/normalize-content.mjs litany  <input.json> <output.json>
 *   node scripts/normalize-content.mjs recipe  <input.json> <output.json>
 *   node scripts/normalize-content.mjs marginalia <input.json> <output.json>
 */
import { readFileSync, writeFileSync } from "node:fs";

export function normalizeLitanyV1(r) {
  if (r.title && r.text_body) {
    return { ...r, schema_version: r.schema_version || "v2" };
  }
  const text = Array.isArray(r.text) ? r.text.join(" / ") : (r.text_body || r.text || "");
  return {
    litany_id: r.litany_id,
    title: r.title || r.name || "Untitled",
    text_body: text,
    mechanical_effect: r.mechanical_effect || "",
    voice_register: r.voice_register || "unspecified",
    rite_kind: r.rite_kind || (r.canonical_use || "").slice(0, 60) || "unspecified",
    faction_origin: r.faction_origin || "",
    first_heard_default_npc: r.first_heard_default_npc || "",
    origin_institution: r.origin_institution || "",
    canonical_use: r.canonical_use || "",
    tags: r.tags || [],
    tone_tags: r.tone_tags || [],
    schema_version: "v1",
  };
}

export function normalizeRecipeV1(r) {
  if (r.materials && r.produces_item_id) return r;
  const materials = (r.ingredients || []).map(ing => ({
    material_id: ing.material_id || ing.item_id || "",
    quantity: ing.quantity || 1,
  }));
  return {
    recipe_id: r.recipe_id,
    name: r.name,
    materials,
    produces_item_id: r.output_item_id || r.produces_item_id || "",
    primary_station_id: r.station_required || r.primary_station_id || "",
    time_in_world_hours: r.workday_cost || 0,
    tags: r.tags || [],
    craft_track: r.track || r.craft_track || "",
    skill_check: r.ability_check || r.skill_check || "",
    dc: r.difficulty_dc || r.dc || 10,
  };
}

export function normalizeMarginaliaV1(r) {
  if (r.trigger_kind) return r;
  return {
    marginalia_id: r.marginalia_id,
    text: r.text,
    trigger_kind: "canon_progression_event",
    trigger_event_kind: r.trigger_event_kind || "",
    tone_tags: r.tone_tags || [],
    schema_version: "v1",
  };
}

const NORMALIZERS = {
  litany: normalizeLitanyV1,
  recipe: normalizeRecipeV1,
  marginalia: normalizeMarginaliaV1,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const [kind, inPath, outPath] = process.argv.slice(2);
  const fn = NORMALIZERS[kind];
  if (!fn) {
    console.error(`Unknown catalog kind: ${kind}. Use one of: ${Object.keys(NORMALIZERS).join(", ")}`);
    process.exit(2);
  }
  const data = JSON.parse(readFileSync(inPath, "utf8"));
  // Container key inference
  const containerKey = data.litanies ? "litanies"
    : data.recipes ? "recipes"
    : data.marginalia ? "marginalia"
    : data.additions ? "additions"
    : null;
  if (!containerKey) {
    console.error(`Cannot locate container array in ${inPath}`);
    process.exit(2);
  }
  const normalized = data[containerKey].map(fn);
  // Write under the canonical container key for the catalog
  const outKey = { litany: "litanies", recipe: "recipes", marginalia: "marginalia" }[kind];
  writeFileSync(outPath, JSON.stringify({ [outKey]: normalized }, null, 2), "utf8");
  console.log(`OK normalized ${normalized.length} ${kind} records -> ${outPath}`);
}
