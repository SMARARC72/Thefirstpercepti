/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { createInventoryPanel } from "../src/components/InventoryPanel";
import type { Player, Item } from "@first-perception/types";

function makeItem(id: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    name: `Item ${id}`,
    type: "misc",
    description: `Description for ${id}`,
    rarity: "common",
    ...overrides,
  };
}

function makePlayer(inventory: Item[]): Player {
  return {
    id: "p1",
    name: "Test",
    form: "human",
    formLabel: "Human",
    posture: "seeker",
    postureLabel: "Seeker",
    domain: "lore",
    stats: {
      body: 10,
      grace: 10,
      sense: 10,
      mind: 10,
      will: 10,
      presence: 10,
      authority: 10,
      ruin: 10,
      creation: 10,
    },
    hp: 10,
    maxHp: 10,
    focus: 5,
    maxFocus: 5,
    conditions: [],
    inventory,
    tags: [],
    proficiencyBonus: 2,
    hitDice: { current: 1, max: 1, die: "d8" },
    savingThrowProficiencies: [],
    attunementSlots: { used: 0, max: 3 },
  };
}

describe("createInventoryPanel", () => {
  it("returns an HTMLElement", () => {
    const el = createInventoryPanel({ player: makePlayer([]) });
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it("renders empty-state line when inventory is empty", () => {
    const el = createInventoryPanel({ player: makePlayer([]) });
    const empty = el.querySelector(".inventory-empty");
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toBe("The pack is empty.");
  });

  it("renders one slot tile per inventory item", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const el = createInventoryPanel({ player: makePlayer(items) });
    const tiles = el.querySelectorAll(".inventory-slot");
    expect(tiles.length).toBe(3);
  });

  it("fires onEquip with the item id when equip button is clicked", () => {
    const onEquip = vi.fn();
    const items = [makeItem("alpha")];
    const el = createInventoryPanel({ player: makePlayer(items), onEquip });

    const button = el.querySelector<HTMLButtonElement>(
      '.inventory-slot[data-item-id="alpha"] .inventory-slot-action'
    );
    expect(button?.dataset.action).toBe("equip");
    button?.click();

    expect(onEquip).toHaveBeenCalledTimes(1);
    expect(onEquip).toHaveBeenCalledWith("alpha");
  });

  it("fires onUnequip with the slot id when unequip button is clicked", () => {
    const onUnequip = vi.fn();
    const items = [makeItem("beta", { equipSlot: "hand" })];
    const el = createInventoryPanel({ player: makePlayer(items), onUnequip });

    const button = el.querySelector<HTMLButtonElement>(
      '.inventory-slot[data-item-id="beta"] .inventory-slot-action'
    );
    expect(button?.dataset.action).toBe("unequip");
    button?.click();

    expect(onUnequip).toHaveBeenCalledTimes(1);
    expect(onUnequip).toHaveBeenCalledWith("hand");
  });

  it("exposes the item description in the slot tooltip", () => {
    const items = [
      makeItem("gamma", { description: "A bone whistle carved by night." }),
    ];
    const el = createInventoryPanel({ player: makePlayer(items) });
    const tile = el.querySelector<HTMLElement>('.inventory-slot[data-item-id="gamma"]');
    expect(tile?.title).toContain("A bone whistle carved by night.");
  });

  it("renders footer weight total as the sum of getItemWeight across inventory", () => {
    const items = [makeItem("x"), makeItem("y"), makeItem("z")];
    const weights: Record<string, number> = { x: 2, y: 5, z: 3 };
    const el = createInventoryPanel({
      player: makePlayer(items),
      getItemWeight: (it) => weights[it.id] ?? 0,
    });
    const value = el.querySelector<HTMLElement>(
      '[data-testid="inventory-total-weight"] .inventory-stat-value'
    );
    expect(value?.textContent).toBe("10 wt");
  });

  it("renders the attunement counter from props", () => {
    const el = createInventoryPanel({
      player: makePlayer([]),
      attunementUsed: 2,
      attunementMax: 4,
    });
    const value = el.querySelector<HTMLElement>(
      '[data-testid="inventory-attunement"] .inventory-stat-value'
    );
    expect(value?.textContent).toBe("2 / 4");
  });

  it("uses default attunement values (0 / 3) when props are omitted", () => {
    const el = createInventoryPanel({ player: makePlayer([]) });
    const value = el.querySelector<HTMLElement>(
      '[data-testid="inventory-attunement"] .inventory-stat-value'
    );
    expect(value?.textContent).toBe("0 / 3");
  });
});
