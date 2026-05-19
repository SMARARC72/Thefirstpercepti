import type { GameState, ActionResult } from '@first-perception/types';
import { SeededRNG } from '../engine/DiceEngine';
import {
  buildActionResult,
  makeTaleEntry,
  patchReplace,
  patchIncrement,
  patchRemove,
  makeId,
} from '../engine-utils';

export function conditionReducer(game: GameState, _command: string, _rng: SeededRNG): ActionResult {
  const patches = [];
  const narrative = [];

  for (let i = 0; i < game.player.conditions.length; i++) {
    const cond = game.player.conditions[i];
    if (cond.turnsRemaining !== null && cond.turnsRemaining > 0) {
      patches.push(patchReplace(`/player/conditions/${i}/turnsRemaining`, cond.turnsRemaining - 1));
    }

    for (const effect of cond.effects) {
      if (effect.hpPerTurn) {
        patches.push(patchIncrement('/player/hp', effect.hpPerTurn));
      }
      if (effect.focusPerTurn) {
        patches.push(patchIncrement('/player/focus', effect.focusPerTurn));
      }
    }

    // Trigger evaluation for stacked conditions
    if (cond.stacks >= cond.maxStacks && cond.isHarmful) {
      patches.push(patchIncrement('/player/hp', -1));
      narrative.push(makeTaleEntry(game, 'Condition Surge', `${cond.name} intensifies.`, 'danger'));
    }
  }

  // Remove expired conditions
  const expiredIndices = game.player.conditions
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.turnsRemaining !== null && c.turnsRemaining <= 0)
    .map(({ i }) => i)
    .sort((a, b) => b - a);

  for (const idx of expiredIndices) {
    patches.push(patchRemove(`/player/conditions/${idx}`));
  }

  return buildActionResult({
    patches,
    narrative: narrative.length > 0 ? narrative : undefined,
    feedback: narrative.length > 0 ? 'Conditions shift.' : 'Conditions tick.',
  });
}
