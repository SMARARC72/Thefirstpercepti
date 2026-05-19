import type { GameState, ActionResult } from '@first-perception/types';
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

export function investigationReducer(game: GameState, command: string, rng: SeededRNG): ActionResult {
  const { verb } = parseCommand(command);
  const location = getCurrentLocation(game);
  if (!location) {
    return buildActionResult({ feedback: 'There is nothing to examine.' });
  }

  const isSearch = verb === 'search' || command.includes('search');
  const isListen = verb === 'listen' || command.includes('listen');
  const isRead = verb === 'read' || command.includes('read');

  // DC scales with previous investigations
  const priorInvestigations = game.journal.filter((j) => j.category === 'evidence' && j.turn < game.turnCount).length;
  const dc = 8 + priorInvestigations;
  const stat = isListen ? 'sense' : isRead ? 'mind' : 'sense';
  const roll = rollD20(game, stat, dc, command, rng, 'lore');

  const patches = [];
  const narrative = [];

  if (roll.band === 'critical_failure') {
    narrative.push(makeTaleEntry(game, 'Trap', 'Your investigation triggers something dangerous.', 'danger'));
    patches.push(patchReplace('/player/hp', Math.max(0, game.player.hp - 2)));
  } else if (roll.band === 'failure') {
    narrative.push(makeTaleEntry(game, 'Nothing', 'You find nothing of note.', 'quiet'));
  } else {
    const locIdx = game.locations.findIndex((l) => l.id === location.id);
    if (locIdx >= 0 && !location.investigated) {
      patches.push(patchReplace(`/locations/${locIdx}/investigated`, true));
    }

    // Discover POIs
    for (let i = 0; i < location.pointsOfInterest.length; i++) {
      const poi = location.pointsOfInterest[i];
      if (!poi.investigated && roll.total >= 8 + i * 2) {
        if (locIdx >= 0) {
          patches.push(patchReplace(`/locations/${locIdx}/pointsOfInterest/${i}/investigated`, true));
        }
        narrative.push(makeTaleEntry(game, 'Discovery', `You notice: ${poi.name}. ${poi.description}`, 'success'));
        patches.push(patchAppend('/journal', {
          id: makeId('journal'),
          turn: game.turnCount,
          label: poi.name,
          detail: poi.description,
          category: 'evidence',
        }));
      }
    }

    if (narrative.length === 0) {
      narrative.push(makeTaleEntry(game, 'Clue', 'You sense something hidden here.', 'warning'));
    }
  }

  return buildActionResult({
    patches,
    rolls: [roll],
    narrative,
    feedback: narrative[narrative.length - 1]?.body ?? 'You investigate.',
    suggestions: [
      makeSuggestion('Search deeper', 'search', 'lore'),
      makeSuggestion('Listen carefully', 'listen', 'lore'),
    ],
  });
}
