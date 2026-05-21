import type { ForgeRecipe, Item, Player } from "@first-perception/types";
import { getRarityTier } from "@first-perception/engine";

export interface AnvilPanelProps {
  player: Player;
  recipes: ForgeRecipe[];
  onForge?: (recipeId: string) => void;
}

const EMPTY_FORGE_LINE = "The forge sleeps. Gather materials to wake it.";

interface MaterialIndex {
  counts: ReadonlyMap<string, number>;
  names: ReadonlyMap<string, string>;
}

/**
 * Index the inventory by `id` once per render. The runtime Item model is
 * one-instance-per-row, so a stack surfaces as multiple entries sharing
 * an id — count = entry count.
 */
function indexInventory(inventory: ReadonlyArray<Item>): MaterialIndex {
  const counts = new Map<string, number>();
  const names = new Map<string, string>();
  for (const item of inventory) {
    counts.set(item.item_id, (counts.get(item.item_id) ?? 0) + 1);
    if (!names.has(item.item_id)) names.set(item.item_id, item.name);
  }
  return { counts, names };
}

/** True iff the player has at least `quantity` of each input materialId. */
export function canForgeRecipe(recipe: ForgeRecipe, inventory: ReadonlyArray<Item>): boolean {
  const { counts } = indexInventory(inventory);
  return recipe.inputs.every((input) => (counts.get(input.materialId) ?? 0) >= input.quantity);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderHeading(): HTMLElement {
  const heading = el("div", "panel-heading");
  const titleGroup = el("div");
  titleGroup.appendChild(el("p", "eyebrow", "What the forge demands"));
  titleGroup.appendChild(el("h2", undefined, "The Anvil"));
  heading.appendChild(titleGroup);
  return heading;
}

function renderEmptyState(): HTMLElement {
  return el("p", "empty-note anvil-empty", EMPTY_FORGE_LINE);
}

function renderMaterialsSurface(
  index: MaterialIndex,
  recipes: ReadonlyArray<ForgeRecipe>,
): HTMLElement {
  const section = el("section", "anvil-materials");
  section.setAttribute("aria-label", "Available materials");
  section.appendChild(el("h3", "anvil-section-heading", "Materials"));

  const recipeMaterialIds = new Set<string>();
  for (const recipe of recipes) {
    for (const input of recipe.inputs) recipeMaterialIds.add(input.materialId);
  }

  // Held materials are the intersection of recipe-referenced ids and
  // ids the player actually carries — drives a focused "what you have
  // that the forge wants" list. Missing inputs are surfaced on the
  // recipe tiles instead.
  const matched = Array.from(recipeMaterialIds)
    .filter((id) => (index.counts.get(id) ?? 0) > 0)
    .sort();

  if (matched.length === 0) {
    section.appendChild(el("p", "anvil-materials-empty", "No matching materials in pack."));
    return section;
  }

  const list = el("ul", "anvil-materials-list");
  list.setAttribute("role", "list");
  for (const materialId of matched) {
    const li = el("li", "anvil-material-row");
    li.dataset.materialId = materialId;
    li.appendChild(el("span", "anvil-material-name", index.names.get(materialId) ?? materialId));
    li.appendChild(el("strong", "anvil-material-count", `x${index.counts.get(materialId) ?? 0}`));
    list.appendChild(li);
  }
  section.appendChild(list);
  return section;
}

function renderInputList(recipe: ForgeRecipe, index: MaterialIndex): HTMLElement {
  const list = el("ul", "anvil-recipe-inputs");
  list.setAttribute("aria-label", "Required materials");
  for (const input of recipe.inputs) {
    const have = index.counts.get(input.materialId) ?? 0;
    const row = el("li", "anvil-recipe-input");
    row.dataset.materialId = input.materialId;
    if (have < input.quantity) row.classList.add("is-missing");
    row.appendChild(el("span", "anvil-recipe-input-name", index.names.get(input.materialId) ?? input.materialId));
    row.appendChild(el("span", "anvil-recipe-input-ratio", `${have}/${input.quantity}`));
    list.appendChild(row);
  }
  return list;
}

function recipeIsSatisfied(recipe: ForgeRecipe, index: MaterialIndex): boolean {
  return recipe.inputs.every((input) => (index.counts.get(input.materialId) ?? 0) >= input.quantity);
}

function renderRecipeTile(
  recipe: ForgeRecipe,
  index: MaterialIndex,
  onForge?: (recipeId: string) => void,
): HTMLElement {
  const tier = getRarityTier(recipe.outputRarity);
  const tile = el("li", "anvil-recipe");
  tile.dataset.recipeId = recipe.id;
  tile.dataset.rarity = recipe.outputRarity;
  tile.style.setProperty("--slot-tier", `var(${tier.colorTokenCss})`);

  const header = el("div", "anvil-recipe-header");
  header.appendChild(el("h4", "anvil-recipe-label", recipe.label));
  const rarity = el("span", "anvil-recipe-rarity", tier.label);
  rarity.dataset.rarity = recipe.outputRarity;
  header.appendChild(rarity);
  tile.appendChild(header);

  tile.appendChild(renderInputList(recipe, index));

  const footer = el("div", "anvil-recipe-footer");
  const dc = el("span", "anvil-recipe-dc", `DC ${recipe.smithDC}`);
  dc.dataset.testid = "anvil-recipe-dc";
  footer.appendChild(dc);

  const btn = el("button", "anvil-recipe-action");
  btn.type = "button";
  btn.textContent = "Forge";
  btn.dataset.action = "forge";
  btn.dataset.recipeId = recipe.id;
  if (!recipeIsSatisfied(recipe, index)) {
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
    btn.title = "Missing required materials.";
  } else if (onForge) {
    btn.addEventListener("click", () => onForge(recipe.id));
  }
  footer.appendChild(btn);
  tile.appendChild(footer);

  return tile;
}

export function createAnvilPanel(props: AnvilPanelProps): HTMLElement {
  const { player, recipes, onForge } = props;
  const inventory: ReadonlyArray<Item> = player.inventory ?? [];

  const section = document.createElement("section");
  section.className = "panel anvil-panel grimoire-grain";
  section.setAttribute("role", "region");
  section.setAttribute("aria-label", "The Anvil");
  section.dataset.testid = "anvil-panel";

  section.appendChild(renderHeading());

  if (!recipes || recipes.length === 0) {
    section.appendChild(renderEmptyState());
    return section;
  }

  const index = indexInventory(inventory);

  // When the player has none of any recipe's required materials the
  // recipes list would just be a wall of disabled tiles; fold back to
  // the same empty-state line so the surface stays legible.
  const anyMaterial = recipes.some((recipe) =>
    recipe.inputs.some((input) => (index.counts.get(input.materialId) ?? 0) > 0),
  );
  if (!anyMaterial) {
    section.appendChild(renderEmptyState());
    return section;
  }

  section.appendChild(renderMaterialsSurface(index, recipes));

  const list = el("ul", "anvil-recipes");
  list.setAttribute("role", "list");
  for (const recipe of recipes) {
    list.appendChild(renderRecipeTile(recipe, index, onForge));
  }
  section.appendChild(list);

  return section;
}
