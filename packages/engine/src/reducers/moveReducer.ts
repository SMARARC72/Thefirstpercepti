import type { GameState, ActionResult, Consequence } from '@first-perception/types';
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
  patchAppend,
  makeId,
} from '../engine-utils';

export function moveReducer(game: GameState, command: string, rng: SeededRNG): ActionResult {
  const { verb, target } = parseCommand(command);
  const location = getCurrentLocation(game);
  if (!location) {
    return buildActionResult({ feedback: 'You are nowhere.' });
  }

  const isSneak = verb === 'sneak' || command.includes('sneak');
  const isFlee = verb === 'flee' || command.includes('flee');
  const isApproach = verb === 'approach' || command.includes('approach');

  let exit = location.exits.find((e) =>
    e.label.toLowerCase().includes(target) ||
    e.toLocationId.toLowerCase().includes(target)
  );

  if (!exit && location.exits.length > 0) {
    exit = location.exits.find((e) => e.visible) ?? location.exits[0];
  }

  if (!exit) {
    return buildActionResult({
      feedback: 'There is no way in that direction.',
      suggestions: location.exits.filter((e) => e.visible).map((e) =>
        makeSuggestion(`Go to ${e.label}`, `go ${e.label}`, 'wilderness')
      ),
    });
  }

  if (!exit.visible && !isSneak) {
    return buildActionResult({
      feedback: 'That way is hidden from view.',
      narrative: [makeTaleEntry(game, 'Hidden Path', 'Something obscures the way forward.', 'warning')],
    });
  }

  if (exit.locked) {
    const hasKey = game.player.inventory.some((i) => i.type === 'key');
    if (!hasKey) {
      return buildActionResult({
        feedback: `The way is locked: ${exit.locked.description}`,
        narrative: [makeTaleEntry(game, 'Locked', exit.locked.description, 'warning')],
      });
    }
  }

  const dc = 6 + Math.floor(exit.travelRisk / 10) + (isSneak ? 2 : 0) + (isFlee ? 3 : 0);
  const stat = isSneak ? 'grace' : 'sense';
  const roll = rollD20(game, stat, dc, command, rng, isSneak ? 'stealth' : 'wilderness');

  const patches = [];
  const narrative = [];
  const consequences: Consequence[] = [];

  // Branch on the coarse 4-band RollBand so partial-failure rolls produce
  // partial outcomes (not the prior bug where they fell into full-success).
  const rollBand = resultBandToRollBand(roll.band);

  if (rollBand === 'disaster') {
    // Total stumble — no movement, possibly frightened on a failed flee.
    narrative.push(makeTaleEntry(game, 'Stumble', 'You lose your footing. The path resists.', 'danger'));
    if (isFlee) {
      patches.push(patchAppend('/player/conditions', {
        id: makeId('cond'),
        typeId: 'frightened',
        name: 'Frightened',
        description: 'Shaken by a failed escape.',
        category: 'mental',
        isHarmful: true,
        turnsRemaining: 2,
        stacks: 1,
        maxStacks: 5,
        effects: [{ stat: 'will', modifier: -1 }],
      }));
    }
  } else if (rollBand === 'failure') {
    // Partial band: movement still happens but the player draws attention
    // (no stealth bonus) and discovery doesn't trigger this turn. Tone
    // matches the mechanical outcome.
    patches.push(patchReplace('/currentLocationId', exit.toLocationId));
    narrative.push(makeTaleEntry(game, 'Awkward Passage', `You reach ${exit.label}, but the path costs more than it should.`, 'warning'));
  } else {
    // Success / triumph: movement + first-time discovery + stealth bonus.
    patches.push(patchReplace('/currentLocationId', exit.toLocationId));
    const dest = game.locations.find((l) => l.id === exit.toLocationId);
    if (dest && !dest.discovered) {
      patches.push(patchReplace(`/locations/${game.locations.findIndex((l) => l.id === exit.toLocationId)}/discovered`, true));
      narrative.push(makeTaleEntry(game, 'Discovery', `You discover ${dest.name}.`, 'success'));
    }
    if (isSneak) {
      narrative.push(makeTaleEntry(game, 'Silent Passage', 'You move unseen.', 'quiet'));
    } else {
      narrative.push(makeTaleEntry(game, 'Movement', `You travel to ${exit.label}.`, 'quiet'));
    }
  }

  if (exit.travelRisk > 30 && roll.band !== 'critical_success') {
    consequences.push({
      id: makeId('conseq'),
      type: 'damage',
      trigger: { kind: 'immediate' },
      effects: [{ type: 'damage', value: 1, description: 'Travel hazard' }],
      source: { turn: game.turnCount, action: command },
      resolved: false,
    });
  }

  return buildActionResult({
    patches,
    rolls: [roll],
    narrative,
    consequences,
    feedback: narrative[narrative.length - 1]?.body ?? 'You move.',
    suggestions: [
      makeSuggestion('Look around', 'look', 'lore'),
      makeSuggestion('Rest', 'rest', 'physical'),
    ],
  });
}
