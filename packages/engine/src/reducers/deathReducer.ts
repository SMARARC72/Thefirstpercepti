import type { GameState, ActionResult, DeathRecord, DeathVector } from '@first-perception/types';
import { SeededRNG } from '../engine/DiceEngine';
import {
  buildActionResult,
  makeTaleEntry,
  patchReplace,
  makeId,
} from '../engine-utils';

export function deathReducer(game: GameState, command: string, rng: SeededRNG): ActionResult {
  if (game.player.hp > 0) {
    return buildActionResult({ feedback: '' });
  }

  // Determine death vector from game state context
  const recentCombat = command.includes('attack') || command.includes('defend');
  const recentDisease = game.player.conditions.some((c) => c.typeId === 'diseased' || c.typeId === 'poisoned');
  const vector: DeathVector = recentCombat ? 'combat' : recentDisease ? 'disease' : 'unknown';

  const epitaphs: Record<DeathVector, string[]> = {
    combat: ['Died as they lived: fighting.', 'The last blow fell, and they did not rise.'],
    disease: ['Sickness claimed what will could not hold.', 'The body failed, consumed from within.'],
    exposure: ['The world was too cold, too empty.', 'Weather and wilderness took their toll.'],
    divine: ['Something reached back.', 'The divine does not forgive curiosity.'],
    betrayal: ['Trust was the weapon that killed them.', 'They believed, and belief was fatal.'],
    suicide: ['They chose their own ending.', 'The weight became too much.'],
    unknown: ['They are gone. The reason remains hidden.', 'Death came without announcing itself.'],
  };

  const lines = epitaphs[vector] ?? epitaphs.unknown;
  const epitaph = lines[Math.floor(rng.next() * lines.length)] ?? lines[0];

  const deathRecord: DeathRecord = {
    id: makeId('death'),
    characterName: game.player.name,
    vector,
    epitaph,
    turnsSurvived: game.turnCount,
    finalLocationId: game.currentLocationId,
    worldSnapshot: {
      seed: game.seed,
      turnCount: game.turnCount,
      day: game.day,
      phaseIndex: game.phaseIndex,
      locationId: game.currentLocationId,
      regionId: game.locations.find((l) => l.id === game.currentLocationId)?.regionId ?? '',
      weather: game.regions[0]?.weatherPatterns[0]?.type ?? 'clear',
      danger: game.locations.find((l) => l.id === game.currentLocationId)?.dangerBase ?? 0,
      pulse: 'quiet',
      crisis: 'none',
    },
  };

  return buildActionResult({
    patches: [patchReplace('/gameOver', true)],
    narrative: [makeTaleEntry(game, 'Death', `${game.player.name} has fallen. ${epitaph}`, 'danger')],
    feedback: 'You have died.',
    journal: {
      id: makeId('journal'),
      turn: game.turnCount,
      label: 'Death',
      detail: `${game.player.name} died: ${epitaph}`,
      category: 'legacy',
    },
  });
}
