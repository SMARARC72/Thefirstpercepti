import type { Player, Item, RarityTierId } from "@first-perception/types";

export interface InventoryPanelProps {
  player: Player;
  attunementUsed?: number;
  attunementMax?: number;
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

function isEquipped(item: Item): boolean {
  return typeof item.equipSlot === "string" && item.equipSlot.length > 0;
}

function requiresAttunement(item: Item, rarity: RarityTierId): boolean {
  if (item.attunement?.required) return true;
  if (rarity === "legendary" || rarity === "artifact") return true;
  return false;
}

function effectSummary(item: Item): string {
  if (!item.effects || item.effects.length === 0) return "";
  return item.effects
    .map((e) => {
      const sign = e.value >= 0 ? "+" : "";
      return `${e.type.replace(/_/g, " ")} ${e.target} ${sign}${e.value}`.trim();
    })
    .join("; ");
}

export function createInventoryPanel(props: InventoryPanelProps): HTMLElement {
  const {
    player,
    attunementUsed = player.attunementSlots?.used ?? 0,
    attunementMax = player.attunementSlots?.max ?? 3,
    getItemRarity = (item: Item) => item.rarity,
    getItemWeight = () => 1,
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
      const equipped = isEquipped(item);
      const needsAttune = requiresAttunement(item, rarity);

      const tile = document.createElement("li");
      tile.className = "inventory-slot";
      tile.dataset.itemId = item.id;
      tile.dataset.rarity = rarity;
      tile.style.setProperty("--slot-tier", `var(${RARITY_TOKEN[rarity]})`);

      // Native title is the minimum-viable tooltip — there is no richer
      // [data-tooltip] system in styles.css yet to upgrade to.
      const effects = effectSummary(item);
      const tipParts = [item.description, effects].filter(Boolean);
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
        eq.textContent = "◆"; // ◆
        eq.setAttribute("aria-label", "Equipped");
        glyphs.appendChild(eq);
      }
      if (needsAttune) {
        const at = document.createElement("span");
        at.className = "inventory-glyph inventory-glyph-attune";
        at.textContent = "✦"; // ✦
        at.setAttribute("aria-label", "Requires attunement");
        glyphs.appendChild(at);
      }
      header.appendChild(glyphs);
      tile.appendChild(header);

      const tier = document.createElement("p");
      tier.className = "inventory-slot-tier";
      tier.textContent = RARITY_LABEL[rarity];
      tile.appendChild(tier);

      const footer = document.createElement("div");
      footer.className = "inventory-slot-footer";

      const weightEl = document.createElement("span");
      weightEl.className = "inventory-slot-weight";
      weightEl.textContent = `${weight} wt`;
      footer.appendChild(weightEl);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "inventory-slot-action";
      if (equipped) {
        btn.textContent = "Unequip";
        btn.dataset.action = "unequip";
        btn.addEventListener("click", () => {
          // For unequip the contract takes a slot id; until Phase 8a wires
          // a real slot registry we forward the equipSlot string itself.
          onUnequip(item.equipSlot ?? item.id);
        });
      } else {
        btn.textContent = "Equip";
        btn.dataset.action = "equip";
        btn.addEventListener("click", () => onEquip(item.id));
      }
      footer.appendChild(btn);
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
  // Format: drop trailing .0 for clean integers but keep precision otherwise.
  weightValue.textContent = `${Number.isInteger(totalWeight) ? totalWeight : totalWeight.toFixed(1)} wt`;
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
