import { describe, expect, it } from 'vitest';

import {
  compareRarity,
  downgradeRarity,
  getRarityTier,
  loadRarityTiers,
} from '../src/item-rarity';
import type { RarityTierId } from '../src/items-5e-types';

describe('compareRarity', () => {
  it('returns a negative number when a is lower than b', () => {
    expect(compareRarity('common', 'rare')).toBeLessThan(0);
    expect(compareRarity('uncommon', 'legendary')).toBeLessThan(0);
  });

  it('returns a positive number when a is higher than b', () => {
    expect(compareRarity('artifact', 'legendary')).toBeGreaterThan(0);
    expect(compareRarity('rare', 'common')).toBeGreaterThan(0);
  });

  it('returns 0 for equal tiers', () => {
    expect(compareRarity('common', 'common')).toBe(0);
    expect(compareRarity('artifact', 'artifact')).toBe(0);
  });

  it('normalizes returns to exactly -1, 0, or +1', () => {
    const pairs: Array<[RarityTierId, RarityTierId, number]> = [
      ['common', 'rare', -1],
      ['rare', 'common', 1],
      ['very_rare', 'very_rare', 0],
    ];
    for (const [a, b, expected] of pairs) {
      expect(compareRarity(a, b)).toBe(expected);
    }
  });
});

describe('downgradeRarity', () => {
  it('steps one tier down for each non-common tier', () => {
    expect(downgradeRarity('legendary')).toBe('very_rare');
    expect(downgradeRarity('artifact')).toBe('legendary');
    expect(downgradeRarity('very_rare')).toBe('rare');
    expect(downgradeRarity('rare')).toBe('uncommon');
    expect(downgradeRarity('uncommon')).toBe('common');
  });

  it('keeps common at common (already at the floor)', () => {
    expect(downgradeRarity('common')).toBe('common');
  });
});

describe('loadRarityTiers', () => {
  it('returns all six 5e tiers in ascending order', () => {
    const tiers = loadRarityTiers();
    expect(tiers).toHaveLength(6);
    expect(tiers.map((t) => t.id)).toEqual([
      'common',
      'uncommon',
      'rare',
      'very_rare',
      'legendary',
      'artifact',
    ]);
    for (let i = 0; i < tiers.length; i += 1) {
      expect(tiers[i].order).toBe(i);
    }
  });

  it('hands out deep clones — mutating the result does not poison subsequent loads', () => {
    const first = loadRarityTiers();
    first[0].label = 'Mutated';
    const second = loadRarityTiers();
    expect(second[0].label).toBe('Common');
  });

  it('every tier carries a colorTokenCss in --rarity-<slug> form', () => {
    for (const tier of loadRarityTiers()) {
      expect(tier.colorTokenCss).toMatch(/^--rarity-[a-z-]+$/);
    }
  });
});

describe('getRarityTier', () => {
  it('returns the tier definition for each known id', () => {
    const ids: RarityTierId[] = [
      'common',
      'uncommon',
      'rare',
      'very_rare',
      'legendary',
      'artifact',
    ];
    for (const id of ids) {
      expect(getRarityTier(id).id).toBe(id);
    }
  });

  it('throws on an unknown id', () => {
    expect(() => getRarityTier('mythic' as RarityTierId)).toThrow(/unknown rarity tier/i);
  });
});
