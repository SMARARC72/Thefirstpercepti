import type { GameState, ActionResult } from '@first-perception/types';
import { resultBandToRollBand } from '@first-perception/types';
import { SeededRNG } from '../engine/DiceEngine';
import {
  getCurrentLocation,
  rollD20,
  buildActionResult,
  makeTaleEntry,
  makeSuggestion,
  parseCommand,
  patchReplace,
  patchIncrement,
  patchAppend,
  makeId,
} from '../engine-utils';

export function restReducer(game: GameState, command: string, rng: SeededRNG): ActionResult {
  const { verb } = parseCommand(command);
  const isSleep = verb === 'sleep' || command.includes('sleep');
  const location = getCurrentLocation(game);
  const danger = location ? location.dangerBase : 0;

  const dc = 4 + Math.floor(danger / 20);
  const roll = rollD20(game, 'will', dc, command, rng, 'physical');

  const patches = [];
  const narrative = [];

  // Branch on the coarse 4-band RollBand so partial-failure rolls produce
  // partial outcomes (not the prior bug where they fell into full-success).
  const rollBand = resultBandToRollBand(roll.band);

  if (rollBand === 'disaster') {
    narrative.push(makeTaleEntry(game, 'Nightmare', 'Rest brings no peace. Something watches.', 'danger'));
    patches.push(patchIncrement('/player/hp', -1));
  } else if (rollBand === 'failure') {
    // Partial band: minimal recovery, with a tone that matches the
    // mechanical outcome. Fitful rest is still rest.
    const heal = isSleep ? 2 : 1;
    const newHp = Math.min(game.player.maxHp, game.player.hp + heal);
    patches.push(patchReplace('/player/hp', newHp));
    narrative.push(makeTaleEntry(game, 'Fitful', `You rest poorly. You recover ${heal} vitality.`, 'warning'));
  } else {
    const heal = isSleep ? 6 : 4;
    const newHp = Math.min(game.player.maxHp, game.player.hp + heal);
    patches.push(patchReplace('/player/hp', newHp));
    narrative.push(makeTaleEntry(game, 'Rest', `You recover ${heal} vitality.`, 'success'));

    // Reduce condition durations on a full success only.
    for (let i = 0; i < game.player.conditions.length; i++) {
      const cond = game.player.conditions[i];
      if (cond.turnsRemaining !== null && cond.turnsRemaining > 0) {
        const reduction = isSleep ? 2 : 1;
        patches.push(patchReplace(`/player/conditions/${i}/turnsRemaining`, Math.max(0, cond.turnsRemaining - reduction)));
      }
    }
  }

  // Danger vulnerability check
  if (danger > 30 && rng.next() < danger / 200) {
    narrative.push(makeTaleEntry(game, 'Intrusion', 'You are disturbed while resting.', 'danger'));
    patches.push(patchIncrement('/player/hp', -2));
  }

  // Dream event on sleep — only on the success / triumph bands so a
  // disaster rest doesn't produce a cosmic glimpse anyway.
  if (isSleep && (rollBand === 'success' || rollBand === 'triumph') && rng.next() < 0.3) {
    narrative.push(makeTaleEntry(game, 'Dream', 'A fragment of the Shattering visits your sleep.', 'cosmic'));
    patches.push(patchAppend('/journal', {
      id: makeId('journal'),
      turn: game.turnCount,
      label: 'Dream',
      detail: 'A fragment of the Shattering visits your sleep.',
      category: 'world',
    }));
  }

  return buildActionResult({
    patches,
    rolls: [roll],
    narrative,
    feedback: narrative[narrative.length - 1]?.body ?? 'You rest.',
    suggestions: [
      makeSuggestion('Look around', 'look', 'lore'),
      makeSuggestion('Investigate', 'investigate', 'lore'),
    ],
  });
}
