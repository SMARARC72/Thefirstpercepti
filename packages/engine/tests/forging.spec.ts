import { describe, expect, it } from 'vitest';

import { attemptForge, loadForgingRecipes, validateRecipe } from '../src/forging';
import type { ForgeRecipe } from '@first-perception/types';

function baseRecipe(overrides: Partial<ForgeRecipe> = {}): ForgeRecipe {
  return {
    id: 'recipe-test',
    label: 'Test Recipe',
    outputTemplateId: 'item-test',
    outputRarity: 'uncommon',
    inputs: [{ materialId: 'material.test', quantity: 1 }],
    smithDC: 15,
    craftTimeHours: 4,
    successNarrativeKey: 'forge.recipe-test.success',
    partialNarrativeKey: 'forge.recipe-test.partial',
    failureNarrativeKey: 'forge.recipe-test.failure',
    ...overrides,
  };
}

describe('loadForgingRecipes', () => {
  it('returns the JSON content as ForgeRecipe[]', () => {
    const recipes = loadForgingRecipes();
    expect(recipes.length).toBeGreaterThanOrEqual(4);
    expect(recipes.length).toBeLessThanOrEqual(8);
    for (const recipe of recipes) {
      expect(typeof recipe.id).toBe('string');
      expect(recipe.id.length).toBeGreaterThan(0);
    }
  });

  it('every shipped recipe passes validateRecipe', () => {
    for (const recipe of loadForgingRecipes()) {
      expect(() => validateRecipe(recipe)).not.toThrow();
    }
  });

  it('hands out deep clones — mutating the result does not poison subsequent loads', () => {
    const first = loadForgingRecipes();
    first[0].label = 'Mutated';
    first[0].inputs[0].quantity = 999;
    const second = loadForgingRecipes();
    expect(second[0].label).not.toBe('Mutated');
    expect(second[0].inputs[0].quantity).not.toBe(999);
  });

  it('every recipe has the three required narrative keys in forge.<id>.<band> form', () => {
    for (const recipe of loadForgingRecipes()) {
      expect(recipe.successNarrativeKey).toBe(`forge.${recipe.id}.success`);
      expect(recipe.partialNarrativeKey).toBe(`forge.${recipe.id}.partial`);
      expect(recipe.failureNarrativeKey).toBe(`forge.${recipe.id}.failure`);
    }
  });
});

describe('validateRecipe', () => {
  it('accepts a well-formed recipe', () => {
    expect(() => validateRecipe(baseRecipe())).not.toThrow();
  });

  it('throws on empty inputs', () => {
    expect(() => validateRecipe(baseRecipe({ inputs: [] }))).toThrow(/inputs/);
  });

  it('throws on duplicate input materialId', () => {
    expect(() =>
      validateRecipe(
        baseRecipe({
          inputs: [
            { materialId: 'material.dup', quantity: 1 },
            { materialId: 'material.dup', quantity: 2 },
          ],
        }),
      ),
    ).toThrow(/duplicate/i);
  });

  it('throws when smithDC < 1', () => {
    expect(() => validateRecipe(baseRecipe({ smithDC: 0 }))).toThrow(/smithDC/);
  });

  it('throws when smithDC > 30', () => {
    expect(() => validateRecipe(baseRecipe({ smithDC: 31 }))).toThrow(/smithDC/);
  });

  it('throws when a narrative key is missing or empty', () => {
    expect(() =>
      validateRecipe(baseRecipe({ successNarrativeKey: '' })),
    ).toThrow(/successNarrativeKey/);
    expect(() =>
      validateRecipe(baseRecipe({ partialNarrativeKey: '' })),
    ).toThrow(/partialNarrativeKey/);
    expect(() =>
      validateRecipe(baseRecipe({ failureNarrativeKey: '' })),
    ).toThrow(/failureNarrativeKey/);
  });

  it('throws on unknown outputRarity', () => {
    // Cast through unknown to bypass the union in test setup; runtime guard
    // is the thing under test.
    expect(() =>
      validateRecipe(
        baseRecipe({ outputRarity: 'mythic' as unknown as ForgeRecipe['outputRarity'] }),
      ),
    ).toThrow(/outputRarity/);
  });

  it('throws on non-positive input quantity', () => {
    expect(() =>
      validateRecipe(baseRecipe({ inputs: [{ materialId: 'material.x', quantity: 0 }] })),
    ).toThrow(/quantity/);
  });
});

describe('attemptForge — outcome bands', () => {
  const recipe = baseRecipe({ smithDC: 15, outputRarity: 'rare' });

  it('hits clean success at DC + 5', () => {
    const outcome = attemptForge({ recipe, smithRollTotal: 20 });
    expect(outcome.kind).toBe('success');
    expect(outcome.outputRarity).toBe('rare');
    expect(outcome.outputItemTemplateId).toBe(recipe.outputTemplateId);
    expect(outcome.narrativeKey).toBe(recipe.successNarrativeKey);
    expect(outcome.consumedInputs).toEqual(recipe.inputs);
  });

  it('hits basic success at DC', () => {
    const outcome = attemptForge({ recipe, smithRollTotal: 15 });
    expect(outcome.kind).toBe('success');
    expect(outcome.outputRarity).toBe('rare');
  });

  it('hits partial at DC - 5 — output rarity downgraded one tier', () => {
    const outcome = attemptForge({ recipe, smithRollTotal: 10 });
    expect(outcome.kind).toBe('partial');
    expect(outcome.outputRarity).toBe('uncommon');
    expect(outcome.outputItemTemplateId).toBe(recipe.outputTemplateId);
    expect(outcome.narrativeKey).toBe(recipe.partialNarrativeKey);
    expect(outcome.consumedInputs).toEqual(recipe.inputs);
  });

  it('hits failure at DC - 6 — materials consumed, no output', () => {
    const outcome = attemptForge({ recipe, smithRollTotal: 9 });
    expect(outcome.kind).toBe('failure');
    expect(outcome.outputItemTemplateId).toBeNull();
    expect(outcome.outputRarity).toBeNull();
    expect(outcome.narrativeKey).toBe(recipe.failureNarrativeKey);
    expect(outcome.consumedInputs).toEqual(recipe.inputs);
  });

  it('boundary: DC + 5 is still in the success band, just stronger', () => {
    const outcome = attemptForge({ recipe, smithRollTotal: recipe.smithDC + 5 });
    expect(outcome.kind).toBe('success');
  });
});

describe('attemptForge — common-output partial refunds materials', () => {
  const commonRecipe = baseRecipe({
    id: 'recipe-test-common',
    outputRarity: 'common',
    outputTemplateId: 'item-test-common',
    smithDC: 12,
    successNarrativeKey: 'forge.recipe-test-common.success',
    partialNarrativeKey: 'forge.recipe-test-common.partial',
    failureNarrativeKey: 'forge.recipe-test-common.failure',
  });

  it('partial band on a common-output recipe returns failure-kind with empty consumedInputs', () => {
    const outcome = attemptForge({ recipe: commonRecipe, smithRollTotal: 8 });
    expect(outcome.kind).toBe('failure');
    expect(outcome.outputItemTemplateId).toBeNull();
    expect(outcome.outputRarity).toBeNull();
    expect(outcome.consumedInputs).toEqual([]);
    expect(outcome.narrativeKey).toMatch(/partial_refund$/);
    expect(outcome.narrativeKey.startsWith(commonRecipe.partialNarrativeKey)).toBe(true);
  });

  it('full failure on a common-output recipe still consumes materials', () => {
    const outcome = attemptForge({ recipe: commonRecipe, smithRollTotal: 5 });
    expect(outcome.kind).toBe('failure');
    expect(outcome.consumedInputs).toEqual(commonRecipe.inputs);
    expect(outcome.narrativeKey).toBe(commonRecipe.failureNarrativeKey);
  });

  it('success on a common-output recipe behaves normally', () => {
    const outcome = attemptForge({ recipe: commonRecipe, smithRollTotal: 12 });
    expect(outcome.kind).toBe('success');
    expect(outcome.outputRarity).toBe('common');
  });
});

describe('attemptForge — input shape', () => {
  it('rejects a non-finite smithRollTotal', () => {
    expect(() =>
      attemptForge({ recipe: baseRecipe(), smithRollTotal: Number.NaN }),
    ).toThrow(/smithRollTotal/);
  });

  it('runs validateRecipe on the recipe before resolving', () => {
    const broken = baseRecipe({ inputs: [] });
    expect(() => attemptForge({ recipe: broken, smithRollTotal: 20 })).toThrow(/inputs/);
  });
});
