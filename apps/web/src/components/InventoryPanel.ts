import type { Player, Item, RarityTierId, EquipSlot } from "@first-perception/types";
import { isMagical, isEquippable, requiresAttunement } from "@first-perception/types";

export interface InventoryPanelProps {
  player: Player;
  attunementUsed?: number;
  attunementMax?: number;
  /**
   * Map of `equip_slot` → `item_id` for items currently worn. The
   * pre-Phase-19 InventoryPanel inferred this from `item.equipSlot` being
   * non-empty (i.e. the item itself remembered where it was equipped). v0.6
   * moved that runtime state to `InventoryEntry.equipped_slot` (generated.ts).
   * Until Player.inventory migrates from Item[] → InventoryEntry[] (Phase 21+
   * scope per the Phase 20 README), apps/web passes this map directly.
   */
  equippedSlots?: ReadonlyMap<EquipSlot, string>;
  getItemRarity?: (item: Item) => RarityTierId;
  getItemWeight?: (item: Item) => number;
  onEquip?: (itemId: string) => void;
  onUnequip?: (slotId: string) => void;
}

const RARITY_TOKEN: Record<RarityTierId, string> = {
  common: "--rarity-common",
  uncommon: "--rarity-uncommon",
  rare: "--rarity-rare",
  very_rare: "--rarity-very-rare",
  legendary: "--rarity-legendary",
  artifact: "--rarity-artifact",
};

const RARITY_LABEL: Record<RarityTierId, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  very_rare: "Very Rare",
  legendary: "Legendary",
  artifact: "Artifact",
};

function isEquippedAt(
  item: Item,
  equippedSlots: ReadonlyMap<EquipSlot, string> | undefined,
): boolean {
  if (!equippedSlots || !item.equip_slot) return false;
  return equippedSlots.get(item.equip_slot) === item.item_id;
}

/**
 * Compose the human-readable effect summary line for the tile tooltip.
 * v0.6 reshape: effects are now string[] of plain phrases on three surfaces
 * (effects_on_equip / effects_on_attune / effects_on_use). We compose all
 * three, prefixing with their trigger context so the player can read what's
 * conditional vs. always-on. Empty arrays produce an empty summary.
 */
function effectSummary(item: Item): string {
  const parts: string[] = [];
  const eq = item.effects_on_equip ?? [];
  const at = item.effects_on_attune ?? [];
  const us = item.effects_on_use ?? [];
  if (eq.length) parts.push(`equip: ${eq.join(", ").replace(/_/g, " ")}`);
  if (at.length) parts.push(`attune: ${at.join(", ").replace(/_/g, " ")}`);
  if (us.length) parts.push(`use: ${us.join(", ").replace(/_/g, " ")}`);
  return parts.join(" — ");
}

/**
 * v0.6 discriminator-narrowed type-specific badges. UI-404 spec line: weapons
 * show damage_dice/damage_type, armor shows armor_ac_base, etc. Returns
 * empty string for types with no display-worthy primary stat (tool, trinket,
 * book, key, currency_token), letting the rarity/name/glyphs carry the tile.
 */
function typeBadge(item: Item): string {
  switch (item.type) {
    case "weapon":
      return `${item.damage_dice} ${item.damage_type}`;
    case "armor":
      return `AC ${item.armor_ac_base}${item.subtype ? ` · ${item.subtype}` : ""}`;
    case "shield":
      return `+${item.armor_ac_base} AC`;
    case "ammunition":
      return item.subtype;
    case "consumable":
    case "wondrous":
    case "tool":
    case "trinket":
    case "book":
    case "key":
    case "currency_token":
      return "";
  }
}

export function createInventoryPanel(props: InventoryPanelProps): HTMLElement {
  const {
    player,
    attunementUsed = player.attunementSlots?.used ?? 0,
    attunementMax = player.attunementSlots?.max ?? 3,
    equippedSlots,
    getItemRarity = (item: Item) => item.rarity,
    getItemWeight = (item: Item) => item.weight_kg ?? 1,
    onEquip = () => {},
    onUnequip = () => {},
  } = props;

  const inventory: Item[] = player.inventory ?? [];

  const section = document.createElement("section");
  section.className = "panel inventory-panel grimoire-grain";
  section.setAttribute("role", "region");
  section.setAttribute("aria-label", "Inventory");
  section.dataset.testid = "inventory-panel";

  const heading = document.createElement("div");
  heading.className = "panel-heading";
  const titleGroup = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "What the pack holds";
  const h2 = document.createElement("h2");
  h2.textContent = "The Pack";
  titleGroup.appendChild(eyebrow);
  titleGroup.appendChild(h2);
  heading.appendChild(titleGroup);
  section.appendChild(heading);

  if (inventory.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note inventory-empty";
    empty.textContent = "The pack is empty.";
    section.appendChild(empty);
  } else {
    const grid = document.createElement("ul");
    grid.className = "inventory-grid";
    grid.setAttribute("role", "list");

    for (const item of inventory) {
      const rarity = getItemRarity(item);
      const weight = getItemWeight(item);
      const equipped = isEquippedAt(item, equippedSlots);
      const equippable = isEquippable(item);
      const needsAttune = requiresAttunement(item);
      const magical = isMagical(item);

      const tile = document.createElement("li");
      tile.className = "inventory-slot";
      tile.dataset.itemId = item.item_id;
      tile.dataset.itemType = item.type;
      tile.dataset.rarity = rarity;
      if (magical) tile.dataset.magical = "true";
      tile.style.setProperty("--slot-tier", `var(${RARITY_TOKEN[rarity]})`);

      // Native title is the minimum-viable tooltip — there is no richer
      // [data-tooltip] system in styles.css yet to upgrade to. v0.6 removed
      // the free-text `description` field; effects + type badge carry the
      // tooltip now.
      const tipParts = [typeBadge(item), effectSummary(item)].filter(Boolean);
      tile.title = tipParts.join(" — ");

      const header = document.createElement("div");
      header.className = "inventory-slot-header";

      const label = document.createElement("h3");
      label.className = "inventory-slot-name";
      label.textContent = item.name;
      header.appendChild(label);

      const glyphs = document.createElement("span");
      glyphs.className = "inventory-slot-glyphs";
      glyphs.setAttribute("aria-hidden", "true");
      if (equipped) {
        const eq = document.createElement("span");
        eq.className = "inventory-glyph inventory-glyph-equipped";
        eq.textContent = "◆";
        eq.setAttribute("aria-label", "Equipped");
        glyphs.appendChild(eq);
      }
      if (needsAttune) {
        const at = document.createElement("span");
        at.className = "inventory-glyph inventory-glyph-attune";
        at.textContent = "◆"; // Authority-cost / attunement marker (Tide-Stained allowed glyph)
        at.setAttribute("aria-label", "Requires attunement");
        glyphs.appendChild(at);
      }
      header.appendChild(glyphs);
      tile.appendChild(header);

      const tier = document.createElement("p");
      tier.className = "inventory-slot-tier";
      tier.textContent = RARITY_LABEL[rarity];
      tile.appendChild(tier);

      const badge = typeBadge(item);
      if (badge) {
        const badgeEl = document.createElement("p");
        badgeEl.className = "inventory-slot-badge";
        badgeEl.dataset.testid = `inventory-badge-${item.item_id}`;
        badgeEl.textContent = badge;
        tile.appendChild(badgeEl);
      }

      const footer = document.createElement("div");
      footer.className = "inventory-slot-footer";

      const weightEl = document.createElement("span");
      weightEl.className = "inventory-slot-weight";
      // Format: drop trailing .0 for clean integers but keep precision otherwise.
      weightEl.textContent = `${Number.isInteger(weight) ? weight : weight.toFixed(1)} kg`;
      footer.appendChild(weightEl);

      if (equippable) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "inventory-slot-action";
        if (equipped) {
          btn.textContent = "Unequip";
          btn.dataset.action = "unequip";
          btn.addEventListener("click", () => {
            onUnequip(item.equip_slot ?? item.item_id);
          });
        } else {
          btn.textContent = "Equip";
          btn.dataset.action = "equip";
          btn.addEventListener("click", () => onEquip(item.item_id));
        }
        footer.appendChild(btn);
      }
      tile.appendChild(footer);

      grid.appendChild(tile);
    }

    section.appendChild(grid);
  }

  const totalWeight = inventory.reduce((sum, it) => sum + getItemWeight(it), 0);

  const summary = document.createElement("footer");
  summary.className = "inventory-summary";

  const weightStat = document.createElement("div");
  weightStat.className = "inventory-stat";
  weightStat.dataset.testid = "inventory-total-weight";
  const weightLabel = document.createElement("span");
  weightLabel.className = "inventory-stat-label";
  weightLabel.textContent = "Burden";
  const weightValue = document.createElement("strong");
  weightValue.className = "inventory-stat-value";
  weightValue.textContent = `${Number.isInteger(totalWeight) ? totalWeight : totalWeight.toFixed(1)} kg`;
  weightStat.appendChild(weightLabel);
  weightStat.appendChild(weightValue);
  summary.appendChild(weightStat);

  const attuneStat = document.createElement("div");
  attuneStat.className = "inventory-stat";
  attuneStat.dataset.testid = "inventory-attunement";
  const attuneLabel = document.createElement("span");
  attuneLabel.className = "inventory-stat-label";
  attuneLabel.textContent = "Attunement";
  const attuneValue = document.createElement("strong");
  attuneValue.className = "inventory-stat-value";
  attuneValue.textContent = `${attunementUsed} / ${attunementMax}`;
  attuneStat.appendChild(attuneLabel);
  attuneStat.appendChild(attuneValue);
  summary.appendChild(attuneStat);

  const slotsStat = document.createElement("div");
  slotsStat.className = "inventory-stat";
  slotsStat.dataset.testid = "inventory-slot-count";
  const slotsLabel = document.createElement("span");
  slotsLabel.className = "inventory-stat-label";
  slotsLabel.textContent = "Slots";
  const slotsValue = document.createElement("strong");
  slotsValue.className = "inventory-stat-value";
  slotsValue.textContent = String(inventory.length);
  slotsStat.appendChild(slotsLabel);
  slotsStat.appendChild(slotsValue);
  summary.appendChild(slotsStat);

  section.appendChild(summary);

  return section;
}
