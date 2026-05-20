import { describe, expect, it } from 'vitest';

import { spellSlotsForPosture } from '../src/engine/CharacterCreation';
import type { KnowledgePosture } from '../src/engine-types';

const ALL_POSTURES: KnowledgePosture[] = [
  'seeker',
  'guardian',
  'destroyer',
  'maker',
  'witness',
  'trickster',
];

describe('spellSlotsForPosture — Phase 10 minimal scope', () => {
  it('returns a level-1 slot record for witness', () => {
    const slots = spellSlotsForPosture('witness');
    expect(slots).toEqual({ 1: { current: 2, max: 2 } });
  });

  it('returns undefined for every non-witness posture', () => {
    const nonWitness = ALL_POSTURES.filter((p) => p !== 'witness');
    for (const p of nonWitness) {
      expect(spellSlotsForPosture(p)).toBeUndefined();
    }
  });

  it("seeds witness players with current = max so they open with all slots full", () => {
    const slots = spellSlotsForPosture('witness');
    expect(slots).toBeDefined();
    const level1 = slots![1];
    expect(level1.current).toBe(level1.max);
  });
});
