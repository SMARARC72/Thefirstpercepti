/**
 * ============================================================================
 * ITEM TYPES — v0.6 RUNTIME SHAPE
 * ============================================================================
 * Phase 20 / Wave J / TS-MIGRATE.
 *
 * Replaces the hand-authored `Item` interface that lived in `./index.ts`
 * (lines 200-232 in the pre-Phase-20 file). The previous shape predated
 * the v0.6 schema reshape (Phase 19 / SCHEMA-403) and used camelCase fields
 * like `id`, `equipSlot`, `magical`. The TypeScript compiler now flags every
 * consumer that hasn't migrated to the snake_case + discriminator-typed
 * shape — those are the intended forcing functions called out in the
 * Phase 19 README and the Phase 20 HANDOFF.
 *
 * Design discipline:
 *   - This file is hand-authored — `generated.ts` is the source of truth
 *     for the schema-extracted discriminator subtypes (WeaponItem, ArmorItem,
 *     …), but the generator emits those as branches WITHOUT the base item
 *     properties (item_id, name, rarity, equip_slot, …). That's a quirk of
 *     how json-schema-to-typescript walks oneOf: each branch only carries
 *     its own added required fields. To reconstruct the on-the-wire item
 *     shape that lives in `apps/web/src/data/items.json`, we intersect a
 *     hand-authored `BaseItem` with each generated subtype interface.
 *   - Schema is still the source of truth — if a base field is added in
 *     `schema_pack_v0.6.json`, update `BaseItem` here AND regenerate types.
 *   - Strict discriminator narrowing: callers must `switch (item.type)` or
 *     guard `item.type === "weapon"` before reading subtype-specific fields
 *     (`damage_dice`, `armor_ac_base`, …). This was the deliberate choice
 *     per Khoja 2026-05-20 — type-safe per-subtype rendering in the
 *     Character Sheet inventory tab (UI-404).
 *
 * Migration note for engine package consumers (itemReducer, LegacySystem,
 * Player.inventory population): the legacy convention treated `equipSlot`
 * as "currently equipped slot" runtime state. v0.6 separates that into
 * `InventoryEntry.equipped_slot` (generated.ts). For Phase 20 the apps/web
 * InventoryPanel reads `equip_slot` as "the slot this item type goes in"
 * (definitional). Equipped state belongs on a future `Player.inventory:
 * InventoryEntry[]` migration — Phase 21+ scope. See README.md.
 * ============================================================================
 */

import type {
  WeaponItem,
  ArmorItem,
  ShieldItem,
  AmmunitionItem,
  ToolItem,
  TrinketItem,
  ConsumableItem,
  WondrousItem,
  BookItem,
  KeyItem,
  CurrencyTokenItem,
} from "./generated.js";
import type { RarityTierId } from "./items-5e.js";

// ----------------------------------------------------------------------------
// Enums mirrored from schema_pack_v0.6.json item schema (lines 3689-3815).
// ----------------------------------------------------------------------------

export type EquipSlot =
  | "main_hand"
  | "off_hand"
  | "two_handed"
  | "armor"
  | "shield"
  | "helm"
  | "cloak"
  | "boots"
  | "gloves"
  | "ring"
  | "amulet"
  | "belt";

export type TintingClass =
  | "vellum_mundane"
  | "brass_greywake"
  | "tide_bloom_metaphysical"
  | "verdigris_consumable"
  | "drowned_red_cursed"
  | "bone_relic";

export type AttunementCeremony =
  | "short_rest"
  | "salt_immersion"
  | "sworn_oath"
  | "blood_consecration";

export type IdentificationRequirement =
  | "time_1hr"
  | "identify_spell"
  | "contemplation"
  | "canon_event"
  | "quest";

// ----------------------------------------------------------------------------
// Base item — every variant has these. Maps 1:1 to schema_pack_v0.6.json
// item.properties (the fields shared across all 11 discriminator subtypes).
// ----------------------------------------------------------------------------

export interface BaseItem {
  item_id: string;
  name: string;
  rarity: RarityTierId;

  equip_slot?: EquipSlot | null;
  attunement_required?: boolean;
  attunement_ceremony?: AttunementCeremony | null;
  identification_dc?: number;
  identification_requires?: IdentificationRequirement[];

  weight_kg?: number;
  value_cp?: number;
  tinting_class?: TintingClass;
  bound_to_you?: boolean;
  regional_origin_id?: string | null;

  // Effect surfaces — string[] of plain English phrases in v0.6 (replaces
  // the structured `ItemEffect[]` shape from the pre-Phase-19 hand-authored
  // Item). Use `effectSummary(item)` from InventoryPanel for display.
  effects_on_equip?: string[];
  effects_on_attune?: string[];
  effects_on_use?: string[];

  charges?: {
    max?: number;
    current?: number;
    recharge?: string;
  };

  curse_kind?: string;
  deicidal?: boolean;
}

// ----------------------------------------------------------------------------
// Strict discriminated union. Per Khoja 2026-05-20: every consumer must
// switch on `item.type` before reading subtype-specific fields. TypeScript
// will narrow `damage_dice` to "weapon" only, `armor_ac_base` to "armor" or
// "shield" only, `subtype` to its per-type enum union, etc.
//
// Why intersect base & generated subtype: generated subtype interfaces from
// `generated.ts` (e.g. `WeaponItem`) only carry the per-type added required
// fields (damage_dice, damage_type). They do NOT include base fields like
// item_id/name/rarity — those live on the parent item object in the schema's
// allOf composition. We reconstruct that composition here by intersection.
// ----------------------------------------------------------------------------

export type Item =
  | (BaseItem & WeaponItem & { type: "weapon" })
  | (BaseItem & ArmorItem & { type: "armor" })
  | (BaseItem & ShieldItem & { type: "shield" })
  | (BaseItem & AmmunitionItem & { type: "ammunition" })
  | (BaseItem & ToolItem & { type: "tool" })
  | (BaseItem & TrinketItem & { type: "trinket" })
  | (BaseItem & ConsumableItem & { type: "consumable" })
  | (BaseItem & WondrousItem & { type: "wondrous" })
  | (BaseItem & BookItem & { type: "book" })
  | (BaseItem & KeyItem & { type: "key" })
  | (BaseItem & CurrencyTokenItem & { type: "currency_token" });

export type ItemType = Item["type"];

export const ITEM_TYPES = [
  "weapon",
  "armor",
  "shield",
  "ammunition",
  "tool",
  "trinket",
  "consumable",
  "wondrous",
  "book",
  "key",
  "currency_token",
] as const satisfies readonly ItemType[];

// ----------------------------------------------------------------------------
// Type guards — narrowing helpers for the discriminated union. Callers can
// use these instead of inline `item.type === "weapon"` checks.
// ----------------------------------------------------------------------------

export function isWeapon(item: Item): item is BaseItem & WeaponItem & { type: "weapon" } {
  return item.type === "weapon";
}

export function isArmor(item: Item): item is BaseItem & ArmorItem & { type: "armor" } {
  return item.type === "armor";
}

export function isShield(item: Item): item is BaseItem & ShieldItem & { type: "shield" } {
  return item.type === "shield";
}

export function isAmmunition(item: Item): item is BaseItem & AmmunitionItem & { type: "ammunition" } {
  return item.type === "ammunition";
}

export function isConsumable(item: Item): item is BaseItem & ConsumableItem & { type: "consumable" } {
  return item.type === "consumable";
}

// ----------------------------------------------------------------------------
// Derived helpers — replace the pre-Phase-19 `item.magical` boolean and the
// pre-Phase-19 `item.attunement?.required` predicate that lived on the old
// hand-authored Item interface. Consumers should call these rather than
// reading raw fields, so the rules stay in one place.
// ----------------------------------------------------------------------------

/**
 * "Magical" in v0.6 is derived: anything not mundane vellum, or anything
 * requiring attunement, or anything with a tide-bloom / drowned-red tinting
 * class. Replaces the explicit `magical: boolean` field from the pre-Phase-19
 * Item shape. (R-50: closed Tide-Stained palette — no magical-glow icon, the
 * tinting class IS the magical signal.)
 */
export function isMagical(item: Item): boolean {
  if (item.attunement_required === true) return true;
  if (item.deicidal === true) return true;
  switch (item.tinting_class) {
    case "tide_bloom_metaphysical":
    case "drowned_red_cursed":
    case "bone_relic":
    case "brass_greywake":
      return true;
    case "vellum_mundane":
    case "verdigris_consumable":
    case undefined:
      return false;
  }
}

/**
 * Heuristic predicate for "requires attunement" — explicit `attunement_required`
 * wins; otherwise falls back to rarity (legendary/artifact always do). Matches
 * the pre-Phase-19 InventoryPanel.requiresAttunement() spec but reads the new
 * snake_case field.
 */
export function requiresAttunement(item: Item): boolean {
  if (item.attunement_required === true) return true;
  return item.rarity === "legendary" || item.rarity === "artifact";
}

/**
 * Whether the item carries enough info to be equipped at all. Definitional
 * predicate, not a "currently-equipped" check.
 */
export function isEquippable(item: Item): boolean {
  return typeof item.equip_slot === "string" && item.equip_slot.length > 0;
}
