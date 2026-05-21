/**
 * @vitest-environment happy-dom
 */
// ============================================================================
// InventoryPanel — v0.6 discriminator-narrowed rendering
// ============================================================================
// Phase 20 / Wave J / UI-404 (Character Sheet inventory tab) + TS-MIGRATE.
//
// Covers:
//   - Discriminator narrowing: weapon shows damage_dice, armor shows AC, etc.
//   - v0.6 base-field reads (item_id, equip_slot, attunement_required)
//   - Magical-derivation rules (tinting_class + attunement)
//   - Equipped/unequipped state from the equippedSlots Map (not the legacy
//     "equipSlot set means equipped" convention)
//   - Empty inventory render
//   - Total weight aggregates from weight_kg
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { createInventoryPanel } from "../InventoryPanel.js";
import type { Item, Player, EquipSlot } from "@first-perception/types";

/**
 * Build a minimal Player stub satisfying the InventoryPanel contract. Only
 * the fields the panel actually reads are populated; the rest are dummied
 * with the loosest valid value. We deliberately do NOT pull in the full
 * createGameFromCreation flow because that drags the engine package and
 * would couple this UI test to mechanical reducers.
 */
function makePlayer(inventory: Item[]): Player {
  return {
    id: "player",
    name: "Khojen",
    form: "spirit_bound" as Player["form"],
    formLabel: "Indebted",
    posture: "witness" as Player["posture"],
    postureLabel: "Witness",
    domain: "lore" as Player["domain"],
    stats: { might: 10, grace: 10, wit: 10, presence: 10, will: 10, sense: 10 } as unknown as Player["stats"],
    hp: 10,
    maxHp: 10,
    focus: 5,
    maxFocus: 5,
    conditions: [],
    inventory,
    tags: [],
    proficiencyBonus: 2,
    hitDice: { d6: 0, d8: 2, d10: 0, d12: 0 } as unknown as Player["hitDice"],
    savingThrowProficiencies: [],
    attunementSlots: { used: 1, max: 3 },
  };
}

const weapon: Item = {
  item_id: "itm_dagger",
  name: "Dagger",
  type: "weapon",
  rarity: "common",
  weight_kg: 0.5,
  value_cp: 200,
  equip_slot: "main_hand",
  tinting_class: "vellum_mundane",
  bound_to_you: false,
  regional_origin_id: null,
  attunement_required: false,
  attunement_ceremony: null,
  identification_dc: 0,
  subtype: "simple_melee",
  damage_dice: "1d4",
  damage_type: "piercing",
  weapon_properties: ["finesse", "light", "thrown"],
};

const armor: Item = {
  item_id: "itm_leather_armor",
  name: "Leather Armor",
  type: "armor",
  rarity: "common",
  weight_kg: 5,
  value_cp: 1000,
  equip_slot: "armor",
  tinting_class: "vellum_mundane",
  attunement_required: false,
  subtype: "light",
  armor_ac_base: 11,
  armor_dex_cap: 99,
};

const shield: Item = {
  item_id: "itm_shield",
  name: "Shield",
  type: "shield",
  rarity: "common",
  weight_kg: 3,
  equip_slot: "shield",
  tinting_class: "vellum_mundane",
  armor_ac_base: 2,
};

const charm: Item = {
  // The Phase 15 Bell-Marked Charm survived the v0.6 reshape with a new
  // discriminator. Per Phase 19 README: "design wins" — Greywake-specific
  // items adopt the v0.6 canonical shape, so this is now a wondrous_item.
  item_id: "itm_bell_marked_charm",
  name: "Bell-Marked Charm",
  type: "wondrous",
  rarity: "rare",
  weight_kg: 0.05,
  equip_slot: "amulet",
  tinting_class: "brass_greywake",
  attunement_required: true,
  attunement_ceremony: "short_rest",
  regional_origin_id: "rgn_greywake",
  effects_on_attune: ["presence_plus_1", "bell_court_proximity_detection_30ft"],
};

const consumable: Item = {
  item_id: "itm_practiced_name_water",
  name: "Vial of Practiced-Name Water",
  type: "consumable",
  rarity: "rare",
  weight_kg: 0.1,
  tinting_class: "tide_bloom_metaphysical",
  charges: { max: 1, current: 1 },
  effects_on_use: ["temporary_fluency_unspoken_names"],
};

describe("InventoryPanel — v0.6 discriminator narrowing", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders empty state when inventory is empty", () => {
    const panel = createInventoryPanel({ player: makePlayer([]) });
    document.body.appendChild(panel);
    expect(panel.querySelector(".inventory-empty")?.textContent).toBe("The pack is empty.");
    expect(panel.querySelector(".inventory-grid")).toBeNull();
  });

  it("renders one tile per inventory item, keyed by item_id", () => {
    const panel = createInventoryPanel({ player: makePlayer([weapon, armor, charm]) });
    const tiles = panel.querySelectorAll(".inventory-slot");
    expect(tiles).toHaveLength(3);
    expect((tiles[0] as HTMLElement).dataset.itemId).toBe("itm_dagger");
    expect((tiles[1] as HTMLElement).dataset.itemId).toBe("itm_leather_armor");
    expect((tiles[2] as HTMLElement).dataset.itemId).toBe("itm_bell_marked_charm");
  });

  it("weapon discriminator → damage_dice + damage_type badge", () => {
    const panel = createInventoryPanel({ player: makePlayer([weapon]) });
    const badge = panel.querySelector(`[data-testid="inventory-badge-itm_dagger"]`);
    expect(badge?.textContent).toBe("1d4 piercing");
  });

  it("armor discriminator → AC + subtype badge", () => {
    const panel = createInventoryPanel({ player: makePlayer([armor]) });
    const badge = panel.querySelector(`[data-testid="inventory-badge-itm_leather_armor"]`);
    expect(badge?.textContent).toBe("AC 11 · light");
  });

  it("shield discriminator → +N AC badge", () => {
    const panel = createInventoryPanel({ player: makePlayer([shield]) });
    const badge = panel.querySelector(`[data-testid="inventory-badge-itm_shield"]`);
    expect(badge?.textContent).toBe("+2 AC");
  });

  it("wondrous + consumable suppress the type badge (no primary stat)", () => {
    const panel = createInventoryPanel({ player: makePlayer([charm, consumable]) });
    expect(panel.querySelector(`[data-testid="inventory-badge-itm_bell_marked_charm"]`)).toBeNull();
    expect(panel.querySelector(`[data-testid="inventory-badge-itm_practiced_name_water"]`)).toBeNull();
  });

  it("magical derivation: brass_greywake + attunement_required → magical=true", () => {
    const panel = createInventoryPanel({ player: makePlayer([charm]) });
    const tile = panel.querySelector(".inventory-slot") as HTMLElement;
    expect(tile.dataset.magical).toBe("true");
  });

  it("magical derivation: vellum_mundane + no attunement → magical=false", () => {
    const panel = createInventoryPanel({ player: makePlayer([weapon]) });
    const tile = panel.querySelector(".inventory-slot") as HTMLElement;
    expect(tile.dataset.magical).toBeUndefined();
  });

  it("attunement glyph appears when attunement_required is true", () => {
    const panel = createInventoryPanel({ player: makePlayer([charm]) });
    const glyph = panel.querySelector(".inventory-glyph-attune");
    expect(glyph).not.toBeNull();
    expect(glyph?.getAttribute("aria-label")).toBe("Requires attunement");
  });

  it("equipped state comes from equippedSlots map, not the item itself", () => {
    const equipped = new Map<EquipSlot, string>([["main_hand", "itm_dagger"]]);
    const panel = createInventoryPanel({
      player: makePlayer([weapon, armor]),
      equippedSlots: equipped,
    });
    const tiles = Array.from(panel.querySelectorAll(".inventory-slot")) as HTMLElement[];
    const daggerTile = tiles.find((t) => t.dataset.itemId === "itm_dagger");
    const armorTile = tiles.find((t) => t.dataset.itemId === "itm_leather_armor");
    expect(daggerTile?.querySelector(".inventory-glyph-equipped")).not.toBeNull();
    expect(armorTile?.querySelector(".inventory-glyph-equipped")).toBeNull();
    expect(daggerTile?.querySelector('[data-action="unequip"]')).not.toBeNull();
    expect(armorTile?.querySelector('[data-action="equip"]')).not.toBeNull();
  });

  it("non-equippable items (no equip_slot) suppress the equip button", () => {
    const panel = createInventoryPanel({ player: makePlayer([consumable]) });
    const tile = panel.querySelector(".inventory-slot");
    expect(tile?.querySelector("button.inventory-slot-action")).toBeNull();
  });

  it("equip click fires onEquip with item_id", () => {
    const calls: string[] = [];
    const panel = createInventoryPanel({
      player: makePlayer([weapon]),
      onEquip: (id) => calls.push(id),
    });
    (panel.querySelector('[data-action="equip"]') as HTMLButtonElement).click();
    expect(calls).toEqual(["itm_dagger"]);
  });

  it("unequip click fires onUnequip with equip_slot (not item_id)", () => {
    const equipped = new Map<EquipSlot, string>([["main_hand", "itm_dagger"]]);
    const calls: string[] = [];
    const panel = createInventoryPanel({
      player: makePlayer([weapon]),
      equippedSlots: equipped,
      onUnequip: (slot) => calls.push(slot),
    });
    (panel.querySelector('[data-action="unequip"]') as HTMLButtonElement).click();
    expect(calls).toEqual(["main_hand"]);
  });

  it("total weight sums weight_kg across items", () => {
    const panel = createInventoryPanel({ player: makePlayer([weapon, armor, shield]) });
    const total = panel.querySelector('[data-testid="inventory-total-weight"] .inventory-stat-value');
    expect(total?.textContent).toBe("8.5 kg");
  });

  it("attunement footer reads from player.attunementSlots", () => {
    const panel = createInventoryPanel({ player: makePlayer([charm]) });
    const v = panel.querySelector('[data-testid="inventory-attunement"] .inventory-stat-value');
    expect(v?.textContent).toBe("1 / 3");
  });

  it("rarity label maps very_rare → 'Very Rare'", () => {
    const veryRare: Item = { ...charm, rarity: "very_rare" };
    const panel = createInventoryPanel({ player: makePlayer([veryRare]) });
    expect(panel.querySelector(".inventory-slot-tier")?.textContent).toBe("Very Rare");
  });
});
