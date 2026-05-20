/**
 * ============================================================================
 * FORGING — pure recipe validator + attempt resolver
 * ============================================================================
 * 5e-aligned smith-check resolver. Inputs (the d20 + proficiency + stat mod
 * sum) come from the combat/skill stack; this module only decides outcome
 * bands and shapes the resulting ForgeOutcome.
 *
 * Canonical recipe content lives at content/world-data/forging-recipes.json.
 * As with item-rarity, recipes are mirrored here as a frozen const so the
 * engine compiles without crossing its rootDir; Phase 7's content-loading
 * pass will replace the mirror with a real loader.
 *
 * Outcome bands:
 *   smithRollTotal >= DC + 5  → success (full rarity)
 *   DC <= smithRollTotal      → success
 *   DC - 5 <= smithRollTotal  → partial (rarity down one tier; common refunds)
 *   smithRollTotal < DC - 5   → failure (materials consumed, no output)
 *
 * @module engine/forging
 * @version 1.0.0
 * ============================================================================
 */

import { downgradeRarity } from './item-rarity';
import type {
  ForgeOutcome,
  ForgeRecipe,
  RarityTierId,
} from './items-5e-types';

const FORGING_RECIPES: readonly ForgeRecipe[] = Object.freeze([
  Object.freeze<ForgeRecipe>({
    id: 'recipe-ironscale-blade',
    label: 'Ironscale Blade',
    outputTemplateId: 'item-ironscale-blade',
    outputRarity: 'uncommon',
    inputs: Object.freeze([
      Object.freeze({ materialId: 'material.ironscale', quantity: 3 }),
      Object.freeze({ materialId: 'material.salt_glass', quantity: 1 }),
    ]) as ForgeRecipe['inputs'],
    smithDC: 13,
    craftTimeHours: 6,
    successNarrativeKey: 'forge.recipe-ironscale-blade.success',
    partialNarrativeKey: 'forge.recipe-ironscale-blade.partial',
    failureNarrativeKey: 'forge.recipe-ironscale-blade.failure',
  }),
  Object.freeze<ForgeRecipe>({
    id: 'recipe-witness-charm',
    label: 'Witness Charm',
    outputTemplateId: 'item-witness-charm',
    outputRarity: 'rare',
    inputs: Object.freeze([
      Object.freeze({ materialId: 'material.witness_tooth', quantity: 2 }),
      Object.freeze({ materialId: 'material.silver_wire', quantity: 1 }),
      Object.freeze({ materialId: 'material.salt_glass', quantity: 1 }),
    ]) as ForgeRecipe['inputs'],
    smithDC: 17,
    craftTimeHours: 10,
    successNarrativeKey: 'forge.recipe-witness-charm.success',
    partialNarrativeKey: 'forge.recipe-witness-charm.partial',
    failureNarrativeKey: 'forge.recipe-witness-charm.failure',
  }),
  Object.freeze<ForgeRecipe>({
    id: 'recipe-salt-lantern',
    label: 'Salt Lantern',
    outputTemplateId: 'item-salt-lantern',
    outputRarity: 'common',
    inputs: Object.freeze([
      Object.freeze({ materialId: 'material.salt_glass', quantity: 2 }),
      Object.freeze({ materialId: 'material.tallow', quantity: 1 }),
    ]) as ForgeRecipe['inputs'],
    smithDC: 10,
    craftTimeHours: 2,
    successNarrativeKey: 'forge.recipe-salt-lantern.success',
    partialNarrativeKey: 'forge.recipe-salt-lantern.partial',
    failureNarrativeKey: 'forge.recipe-salt-lantern.failure',
  }),
  Object.freeze<ForgeRecipe>({
    id: 'recipe-deepsmith-ward',
    label: "Deepsmith's Ward",
    outputTemplateId: 'item-deepsmith-ward',
    outputRarity: 'very_rare',
    inputs: Object.freeze([
      Object.freeze({ materialId: 'material.ironscale', quantity: 5 }),
      Object.freeze({ materialId: 'material.witness_tooth', quantity: 1 }),
      Object.freeze({ materialId: 'material.cold_ash', quantity: 3 }),
    ]) as ForgeRecipe['inputs'],
    smithDC: 20,
    craftTimeHours: 18,
    successNarrativeKey: 'forge.recipe-deepsmith-ward.success',
    partialNarrativeKey: 'forge.recipe-deepsmith-ward.partial',
    failureNarrativeKey: 'forge.recipe-deepsmith-ward.failure',
  }),
  Object.freeze<ForgeRecipe>({
    id: 'recipe-bone-flute',
    label: 'Bone Flute',
    outputTemplateId: 'item-bone-flute',
    outputRarity: 'common',
    inputs: Object.freeze([
      Object.freeze({ materialId: 'material.hollow_bone', quantity: 1 }),
      Object.freeze({ materialId: 'material.tallow', quantity: 1 }),
    ]) as ForgeRecipe['inputs'],
    smithDC: 11,
    craftTimeHours: 1,
    successNarrativeKey: 'forge.recipe-bone-flute.success',
    partialNarrativeKey: 'forge.recipe-bone-flute.partial',
    failureNarrativeKey: 'forge.recipe-bone-flute.failure',
  }),
]);

/** Common-output partial refund: distinct narrative hook (no item, no loss). */
const COMMON_PARTIAL_REFUND_KEY_SUFFIX = '.partial_refund';

const RARITY_IDS: ReadonlySet<RarityTierId> = new Set<RarityTierId>([
  'common',
  'uncommon',
  'rare',
  'very_rare',
  'legendary',
  'artifact',
]);

export function validateRecipe(recipe: ForgeRecipe): void {
  if (!recipe || typeof recipe !== 'object') {
    throw new Error('Invalid forge recipe: not an object.');
  }
  if (typeof recipe.id !== 'string' || recipe.id.length === 0) {
    throw new Error('Invalid forge recipe: id must be a non-empty string.');
  }
  if (typeof recipe.label !== 'string' || recipe.label.length === 0) {
    throw new Error(`Invalid forge recipe "${recipe.id}": label must be a non-empty string.`);
  }
  if (
    typeof recipe.outputTemplateId !== 'string' ||
    recipe.outputTemplateId.length === 0
  ) {
    throw new Error(
      `Invalid forge recipe "${recipe.id}": outputTemplateId must be a non-empty string.`,
    );
  }
  if (!RARITY_IDS.has(recipe.outputRarity)) {
    throw new Error(
      `Invalid forge recipe "${recipe.id}": outputRarity "${recipe.outputRarity}" is not a known tier.`,
    );
  }

  if (!Array.isArray(recipe.inputs) || recipe.inputs.length === 0) {
    throw new Error(`Invalid forge recipe "${recipe.id}": inputs must be a non-empty array.`);
  }
  const seenMaterials = new Set<string>();
  for (const input of recipe.inputs) {
    if (
      !input ||
      typeof input.materialId !== 'string' ||
      input.materialId.length === 0
    ) {
      throw new Error(
        `Invalid forge recipe "${recipe.id}": each input must have a non-empty materialId.`,
      );
    }
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      throw new Error(
        `Invalid forge recipe "${recipe.id}": input "${input.materialId}" quantity must be > 0.`,
      );
    }
    if (seenMaterials.has(input.materialId)) {
      throw new Error(
        `Invalid forge recipe "${recipe.id}": duplicate input materialId "${input.materialId}".`,
      );
    }
    seenMaterials.add(input.materialId);
  }

  if (!Number.isFinite(recipe.smithDC) || recipe.smithDC < 1 || recipe.smithDC > 30) {
    throw new Error(
      `Invalid forge recipe "${recipe.id}": smithDC must be in [1, 30], got ${recipe.smithDC}.`,
    );
  }

  if (!Number.isFinite(recipe.craftTimeHours) || recipe.craftTimeHours < 0) {
    throw new Error(
      `Invalid forge recipe "${recipe.id}": craftTimeHours must be >= 0.`,
    );
  }

  for (const key of ['successNarrativeKey', 'partialNarrativeKey', 'failureNarrativeKey'] as const) {
    const value = recipe[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(
        `Invalid forge recipe "${recipe.id}": ${key} must be a non-empty string.`,
      );
    }
  }
}

export function loadForgingRecipes(): ForgeRecipe[] {
  return FORGING_RECIPES.map((recipe) => ({
    ...recipe,
    inputs: recipe.inputs.map((input) => ({ ...input })),
  }));
}

export function attemptForge(params: {
  recipe: ForgeRecipe;
  smithRollTotal: number;
}): ForgeOutcome {
  const { recipe, smithRollTotal } = params;
  validateRecipe(recipe);
  if (!Number.isFinite(smithRollTotal)) {
    throw new Error(
      `attemptForge: smithRollTotal must be a finite number, got ${smithRollTotal}.`,
    );
  }

  const dc = recipe.smithDC;
  const consumedInputs = recipe.inputs.map((input) => ({ ...input }));

  if (smithRollTotal >= dc) {
    // Full success — band covers both "meets DC" and "DC + 5" cases; the
    // recipe doesn't distinguish, only narrative key choice does.
    return {
      kind: 'success',
      outputItemTemplateId: recipe.outputTemplateId,
      outputRarity: recipe.outputRarity,
      consumedInputs,
      smithRollTotal,
      smithDC: dc,
      narrativeKey: recipe.successNarrativeKey,
    };
  }

  if (smithRollTotal >= dc - 5) {
    // Partial band. A common-output recipe has nowhere to downgrade to, so
    // we refund materials and emit a distinct narrative key.
    if (recipe.outputRarity === 'common') {
      return {
        kind: 'failure',
        outputItemTemplateId: null,
        outputRarity: null,
        consumedInputs: [],
        smithRollTotal,
        smithDC: dc,
        narrativeKey: `${recipe.partialNarrativeKey}${COMMON_PARTIAL_REFUND_KEY_SUFFIX}`,
      };
    }
    return {
      kind: 'partial',
      outputItemTemplateId: recipe.outputTemplateId,
      outputRarity: downgradeRarity(recipe.outputRarity),
      consumedInputs,
      smithRollTotal,
      smithDC: dc,
      narrativeKey: recipe.partialNarrativeKey,
    };
  }

  return {
    kind: 'failure',
    outputItemTemplateId: null,
    outputRarity: null,
    consumedInputs,
    smithRollTotal,
    smithDC: dc,
    narrativeKey: recipe.failureNarrativeKey,
  };
}
