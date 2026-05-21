/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from "vitest";
import type { ForgeRecipe, Item, Player } from "@first-perception/types";
import { canForgeRecipe, createAnvilPanel } from "../src/components/AnvilPanel";

function makeItem(id: string, overrides: Partial<Item> = {}): Item {
  return {
    item_id: id,
    name: overrides.name ?? id,
    type: "trinket",
    rarity: "common",
    ...overrides,
  } as Item;
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

function makeRecipe(overrides: Partial<ForgeRecipe> = {}): ForgeRecipe {
  return {
    id: "recipe-test",
    label: "Test Blade",
    outputTemplateId: "item-test-blade",
    outputRarity: "uncommon",
    inputs: [{ materialId: "material.ironscale", quantity: 2 }],
    smithDC: 13,
    craftTimeHours: 1,
    successNarrativeKey: "forge.test.success",
    partialNarrativeKey: "forge.test.partial",
    failureNarrativeKey: "forge.test.failure",
    ...overrides,
  };
}

describe("createAnvilPanel", () => {
  it("returns an HTMLElement with class `anvil-panel`", () => {
    const el = createAnvilPanel({ player: makePlayer([]), recipes: [] });
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.classList.contains("anvil-panel")).toBe(true);
  });

  it("renders the eyebrow + heading from the panel contract", () => {
    const el = createAnvilPanel({ player: makePlayer([]), recipes: [] });
    expect(el.querySelector(".eyebrow")?.textContent).toBe("What the forge demands");
    expect(el.querySelector("h2")?.textContent).toBe("The Anvil");
  });

  it("shows the empty-state line when the recipes array is empty", () => {
    const el = createAnvilPanel({ player: makePlayer([]), recipes: [] });
    const empty = el.querySelector(".anvil-empty");
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toBe("The forge sleeps. Gather materials to wake it.");
    expect(el.querySelector(".anvil-recipes")).toBeNull();
  });

  it("shows the empty-state line when the player has none of the required materials", () => {
    const recipes = [makeRecipe()];
    const el = createAnvilPanel({ player: makePlayer([makeItem("item-other")]), recipes });
    const empty = el.querySelector(".anvil-empty");
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toBe("The forge sleeps. Gather materials to wake it.");
    expect(el.querySelector(".anvil-recipes")).toBeNull();
  });

  it("renders one tile per recipe with rarity, inputs, and DC visible when materials are present", () => {
    const recipes = [
      makeRecipe({ id: "recipe-a", label: "Alpha", outputRarity: "rare", smithDC: 15 }),
      makeRecipe({ id: "recipe-b", label: "Beta", outputRarity: "common", smithDC: 10 }),
    ];
    const player = makePlayer([
      makeItem("material.ironscale", { name: "Ironscale" }),
      makeItem("material.ironscale", { name: "Ironscale" }),
    ]);
    const el = createAnvilPanel({ player, recipes });

    const tiles = el.querySelectorAll(".anvil-recipe");
    expect(tiles.length).toBe(2);

    const first = tiles[0] as HTMLElement;
    expect(first.dataset.recipeId).toBe("recipe-a");
    expect(first.dataset.rarity).toBe("rare");
    expect(first.querySelector(".anvil-recipe-label")?.textContent).toBe("Alpha");
    expect(first.querySelector(".anvil-recipe-rarity")?.textContent).toBe("Rare");
    expect(first.querySelector(".anvil-recipe-dc")?.textContent).toBe("DC 15");
    expect(first.querySelectorAll(".anvil-recipe-input").length).toBe(1);

    const second = tiles[1] as HTMLElement;
    expect(second.querySelector(".anvil-recipe-dc")?.textContent).toBe("DC 10");
  });

  it("disables the Forge button when the player cannot satisfy the recipe inputs", () => {
    const recipe = makeRecipe({
      inputs: [{ materialId: "material.ironscale", quantity: 3 }],
    });
    // Player has only one of three required units.
    const player = makePlayer([makeItem("material.ironscale")]);
    const el = createAnvilPanel({ player, recipes: [recipe] });

    const btn = el.querySelector<HTMLButtonElement>(
      '.anvil-recipe[data-recipe-id="recipe-test"] .anvil-recipe-action',
    );
    expect(btn?.disabled).toBe(true);
    expect(btn?.getAttribute("aria-disabled")).toBe("true");
  });

  it("enables the Forge button and fires onForge with the recipe id when satisfied", () => {
    const recipe = makeRecipe({
      inputs: [{ materialId: "material.ironscale", quantity: 2 }],
    });
    const player = makePlayer([
      makeItem("material.ironscale"),
      makeItem("material.ironscale"),
    ]);
    const onForge = vi.fn();
    const el = createAnvilPanel({ player, recipes: [recipe], onForge });

    const btn = el.querySelector<HTMLButtonElement>(
      '.anvil-recipe[data-recipe-id="recipe-test"] .anvil-recipe-action',
    );
    expect(btn?.disabled).toBe(false);
    btn?.click();
    expect(onForge).toHaveBeenCalledTimes(1);
    expect(onForge).toHaveBeenCalledWith("recipe-test");
  });

  it("renders the materials surface listing held materials with counts", () => {
    const recipes = [makeRecipe()];
    const player = makePlayer([
      makeItem("material.ironscale", { name: "Ironscale" }),
      makeItem("material.ironscale", { name: "Ironscale" }),
      makeItem("material.ironscale", { name: "Ironscale" }),
      makeItem("item-noise", { name: "Noise" }), // not referenced by any recipe — should NOT appear
    ]);
    const el = createAnvilPanel({ player, recipes });

    const rows = el.querySelectorAll(".anvil-material-row");
    expect(rows.length).toBe(1);
    const row = rows[0] as HTMLElement;
    expect(row.dataset.materialId).toBe("material.ironscale");
    expect(row.querySelector(".anvil-material-name")?.textContent).toBe("Ironscale");
    expect(row.querySelector(".anvil-material-count")?.textContent).toBe("x3");
  });

  it("flags individual recipe inputs as missing when the player is short", () => {
    const recipe = makeRecipe({
      inputs: [
        { materialId: "material.ironscale", quantity: 2 },
        { materialId: "material.salt_glass", quantity: 1 },
      ],
    });
    // Has the ironscale but not the salt_glass.
    const player = makePlayer([
      makeItem("material.ironscale"),
      makeItem("material.ironscale"),
    ]);
    const el = createAnvilPanel({ player, recipes: [recipe] });

    const inputs = el.querySelectorAll(".anvil-recipe-input");
    expect(inputs.length).toBe(2);
    const byId = (id: string) => el.querySelector(`.anvil-recipe-input[data-material-id="${id}"]`);
    expect(byId("material.ironscale")?.classList.contains("is-missing")).toBe(false);
    expect(byId("material.salt_glass")?.classList.contains("is-missing")).toBe(true);
    expect(byId("material.ironscale")?.querySelector(".anvil-recipe-input-ratio")?.textContent).toBe("2/2");
    expect(byId("material.salt_glass")?.querySelector(".anvil-recipe-input-ratio")?.textContent).toBe("0/1");
  });
});

describe("canForgeRecipe", () => {
  it("returns true when inventory satisfies every input quantity", () => {
    const recipe = makeRecipe({
      inputs: [
        { materialId: "material.ironscale", quantity: 2 },
        { materialId: "material.salt_glass", quantity: 1 },
      ],
    });
    const inventory = [
      makeItem("material.ironscale"),
      makeItem("material.ironscale"),
      makeItem("material.salt_glass"),
    ];
    expect(canForgeRecipe(recipe, inventory)).toBe(true);
  });

  it("returns false when any input quantity is unmet", () => {
    const recipe = makeRecipe({
      inputs: [{ materialId: "material.ironscale", quantity: 3 }],
    });
    expect(canForgeRecipe(recipe, [makeItem("material.ironscale"), makeItem("material.ironscale")])).toBe(false);
  });
});
