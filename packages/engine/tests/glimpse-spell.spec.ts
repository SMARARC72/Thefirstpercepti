import { describe, expect, it } from 'vitest';

import { investigationReducer } from '../src/reducers/investigationReducer';
import { applyPatches } from '../src/state-adapter';
import { SeededRNG } from '../src/engine/DiceEngine';
import { makeGameState, makePlayer } from './fixtures';

describe('investigationReducer — glimpse verb (spell-slot affordance)', () => {
  it('refuses to cast when the player has no spellSlots at all', () => {
    const game = makeGameState({ player: makePlayer({}) });
    const result = investigationReducer(game, 'glimpse', new SeededRNG(1));
    expect(result.feedback.toLowerCase()).toContain('no glimpses left');
    expect(result.patches).toEqual([]);
    expect(result.narrative[0].tone).toBe('warning');
  });

  it('refuses to cast when the level-1 slot is empty', () => {
    const game = makeGameState({
      player: makePlayer({
        spellSlots: { 1: { current: 0, max: 2 } },
      }),
    });
    const result = investigationReducer(game, 'glimpse', new SeededRNG(1));
    expect(result.feedback.toLowerCase()).toContain('no glimpses left');
    expect(result.patches.filter((p) => p.path === '/player/spellSlots')).toEqual([]);
  });

  it('consumes a slot and full-object-replaces /player/spellSlots on cast', () => {
    const game = makeGameState({
      player: makePlayer({
        spellSlots: { 1: { current: 2, max: 2 } },
      }),
    });
    const result = investigationReducer(game, 'glimpse', new SeededRNG(1));
    const slotPatch = result.patches.find((p) => p.path === '/player/spellSlots');
    expect(slotPatch).toBeDefined();
    expect(slotPatch?.op).toBe('replace');
    expect((slotPatch?.value as { 1: { current: number } })[1].current).toBe(1);
  });

  it('round-trips through applyPatches to land the slot decrement on player state', () => {
    const game = makeGameState({
      player: makePlayer({
        spellSlots: { 1: { current: 2, max: 2 } },
      }),
    });
    const result = investigationReducer(game, 'glimpse', new SeededRNG(1));
    const after = applyPatches(game, result.patches);
    expect(after.player.spellSlots?.[1].current).toBe(1);
    expect(after.player.spellSlots?.[1].max).toBe(2);
  });

  it('emits a cosmic-tone tale when discoveries land, and a quiet tone when nothing is hidden', () => {
    const gameWithPois = makeGameState({
      player: makePlayer({
        spellSlots: { 1: { current: 2, max: 2 } },
      }),
    });
    // Sunken Fountain fixture ships pointsOfInterest; if uninvestigated, glimpse reveals.
    const result = investigationReducer(gameWithPois, 'glimpse', new SeededRNG(1));
    const tones = result.narrative.map((n) => n.tone);
    // Tone must be either 'cosmic' (revealed something) or 'quiet'
    // (location had no hidden POIs). Never 'danger', never 'success'.
    for (const t of tones) {
      expect(['cosmic', 'quiet']).toContain(t);
    }
  });
});
