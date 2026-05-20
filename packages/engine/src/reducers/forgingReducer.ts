import type { GameState, ActionResult, Item, StatePatch } from '@first-perception/types';
import type { ForgeRecipe } from '@first-perception/types';
import { SeededRNG } from '../engine/DiceEngine';
import {
  rollD20WithBand,
  buildActionResult,
  makeTaleEntry,
  makeSuggestion,
  patchRemove,
  patchAppend,
  makeId,
} from '../engine-utils';
import { attemptForge, loadForgingRecipes } from '../forging';

/**
 * MVP forging reducer. The Wave 1 `attemptForge` + `loadForgingRecipes`
 * primitives ship the mechanical core; this reducer is the player-facing
 * glue that the Anvil panel + the `forge` verb both call into.
 *
 * Output items are stub-templated from the recipe metadata (label →
 * name, outputRarity → rarity) because per-recipe item-template lookup
 * tables aren't authored yet. Once `content/world-data/item-templates.json`
 * lands, the stub here gets replaced with a real template hydration.
 */
export function forgingReducer(
  game: GameState,
  command: string,
  rng: SeededRNG,
): ActionResult {
  const match = command.match(/^\s*forge\s+(.+?)\s*$/i);
  if (!match) {
    return buildActionResult({
      feedback: 'Speak which recipe to forge.',
    });
  }
  const query = match[1].toLowerCase().trim();

  const recipes = loadForgingRecipes();
  const recipe = recipes.find(
    (r) => r.id.toLowerCase() === query || r.label.toLowerCase() === query,
  );
  if (!recipe) {
    return buildActionResult({
      feedback: 'No such recipe.',
      narrative: [
        makeTaleEntry(
          game,
          'The Anvil',
          'The forge waits, but the pattern you name is not in its memory.',
          'quiet',
        ),
      ],
    });
  }

  const materialMissing = missingMaterials(game, recipe);
  if (materialMissing.length > 0) {
    const list = materialMissing.map((m) => `${m.quantity}× ${m.materialId}`).join(', ');
    return buildActionResult({
      feedback: `The forge needs: ${list}.`,
      narrative: [
        makeTaleEntry(
          game,
          'Materials short',
          `The Anvil is silent. You lack: ${list}.`,
          'warning',
        ),
      ],
    });
  }

  // Smith check: creation stat with proficiency. Failed crafts still
  // burn part of the materials (5e canon) but the partial-on-common
  // recipe refund is handled inside attemptForge.
  const { roll } = rollD20WithBand(game, 'creation', recipe.smithDC, command, rng, 'craft', {
    proficient: true,
  });
  const outcome = attemptForge({ recipe, smithRollTotal: roll.total });

  const patches: StatePatch[] = consumeInputPatches(game, outcome.consumedInputs);

  if (outcome.outputItemTemplateId && outcome.outputRarity) {
    const output: Item = {
      id: `${outcome.outputItemTemplateId}-${makeId('forged')}`,
      name: recipe.label,
      type: 'tool',
      description: `Forged at The Anvil. ${recipe.label.toLowerCase()} — rolled ${roll.total} vs DC ${recipe.smithDC}.`,
      rarity: outcome.outputRarity,
      magical: outcome.outputRarity !== 'common',
    };
    patches.push(patchAppend('/player/inventory', output));
  }

  const { title, tone, body } = narrativeFor(outcome.kind, recipe, roll.total);

  return buildActionResult({
    feedback: outcome.kind === 'success'
      ? `${recipe.label} is forged.`
      : outcome.kind === 'partial'
        ? `${recipe.label} comes out flawed.`
        : 'The forge rejects the working.',
    rolls: [roll],
    narrative: [makeTaleEntry(game, title, body, tone)],
    patches,
    suggestions: [
      makeSuggestion('Inspect the forging', 'inspect ' + recipe.label, 'craft'),
      makeSuggestion('Leave the Anvil', 'look', 'physical'),
    ],
  });
}

function missingMaterials(
  game: GameState,
  recipe: ForgeRecipe,
): Array<{ materialId: string; quantity: number }> {
  const counts = new Map<string, number>();
  for (const item of game.player.inventory) {
    counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  }
  const missing: Array<{ materialId: string; quantity: number }> = [];
  for (const input of recipe.inputs) {
    const have = counts.get(input.materialId) ?? 0;
    if (have < input.quantity) {
      missing.push({ materialId: input.materialId, quantity: input.quantity - have });
    }
  }
  return missing;
}

function consumeInputPatches(
  game: GameState,
  consumed: ReadonlyArray<{ materialId: string; quantity: number }>,
): StatePatch[] {
  // Remove matching inventory entries by index, highest-first so the
  // earlier remove operations don't shift later indices.
  const indicesToRemove: number[] = [];
  for (const input of consumed) {
    let remaining = input.quantity;
    for (let i = 0; i < game.player.inventory.length && remaining > 0; i++) {
      if (game.player.inventory[i].id === input.materialId && !indicesToRemove.includes(i)) {
        indicesToRemove.push(i);
        remaining--;
      }
    }
  }
  indicesToRemove.sort((a, b) => b - a);
  return indicesToRemove.map((idx) => patchRemove(`/player/inventory/${idx}`));
}

function narrativeFor(
  kind: 'success' | 'partial' | 'failure',
  recipe: ForgeRecipe,
  rollTotal: number,
): { title: string; tone: 'success' | 'warning' | 'danger'; body: string } {
  switch (kind) {
    case 'success':
      return {
        title: 'The Anvil sings',
        tone: 'success',
        body: `The ${recipe.label} takes shape under your hands. Roll: ${rollTotal} vs DC ${recipe.smithDC}.`,
      };
    case 'partial':
      return {
        title: 'The Anvil compromises',
        tone: 'warning',
        body: `The ${recipe.label} emerges flawed — one rarity step lower than intended. Roll: ${rollTotal} vs DC ${recipe.smithDC}.`,
      };
    case 'failure':
      return {
        title: 'The Anvil refuses',
        tone: 'danger',
        body: `The working fails. The materials warp; you salvage nothing. Roll: ${rollTotal} vs DC ${recipe.smithDC}.`,
      };
  }
}
