import type { GameState, ActionResult, StatePatch } from '@first-perception/types';
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
  const isGlimpse = verb === 'glimpse' || command.startsWith('glimpse');

  // Glimpse is a spell-slotted investigation — Phase 10 wired
  // posture-driven spell slots on Witnesses but never built a way to
  // consume them. Glimpse is the minimal-scope spend: lights up the
  // POI discoveries that need a lower DC, costs one Level-1 slot.
  if (isGlimpse) {
    return castGlimpse(game, location);
  }

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

/**
 * Glimpse — the Witness posture's Level-1 spell. Spends a slot to
 * surface every undiscovered POI at the current location and append
 * matching journal entries. Refuses gracefully when no slots remain
 * or when the posture didn't grant any in the first place.
 */
function castGlimpse(
  game: GameState,
  location: NonNullable<ReturnType<typeof getCurrentLocation>>,
): ActionResult {
  const slots = game.player.spellSlots;
  const level1 = slots?.[1];
  if (!level1 || level1.current <= 0) {
    return buildActionResult({
      feedback: 'You have no Glimpses left. Rest to recover, or this posture grants none at all.',
      narrative: [
        makeTaleEntry(
          game,
          'No Glimpse Remains',
          'The Sight refuses you. Whatever you would have seen stays behind the membrane.',
          'warning',
        ),
      ],
    });
  }

  const patches: StatePatch[] = [];
  const narrative = [];

  // Consume the slot with a full-object replace so the patch lands
  // even on snapshots that don't yet have /player/spellSlots/1 (parity
  // with the actionEconomy fix from the Phase 9a Codex follow-up).
  const nextSlots = { ...slots, 1: { ...level1, current: level1.current - 1 } };
  patches.push(patchReplace('/player/spellSlots', nextSlots));

  const locIdx = game.locations.findIndex((l) => l.id === location.id);
  let revealed = 0;
  for (let i = 0; i < location.pointsOfInterest.length; i++) {
    const poi = location.pointsOfInterest[i];
    if (poi.investigated) continue;
    if (locIdx >= 0) {
      patches.push(patchReplace(`/locations/${locIdx}/pointsOfInterest/${i}/investigated`, true));
    }
    narrative.push(
      makeTaleEntry(
        game,
        'Glimpse',
        `Through the Sight: ${poi.name}. ${poi.description}`,
        'cosmic',
      ),
    );
    patches.push(
      patchAppend('/journal', {
        id: makeId('journal'),
        turn: game.turnCount,
        label: poi.name,
        detail: poi.description,
        category: 'evidence' as const,
      }),
    );
    revealed++;
  }

  if (revealed === 0) {
    narrative.push(
      makeTaleEntry(
        game,
        'Empty Sight',
        'You spend a Glimpse. Nothing answers — there is nothing hidden here.',
        'quiet',
      ),
    );
  }

  return buildActionResult({
    patches,
    narrative,
    feedback: revealed > 0
      ? `You glimpse ${revealed} hidden thing${revealed === 1 ? '' : 's'}. (${level1.current - 1}/${level1.max} slots left.)`
      : 'You spend a Glimpse on empty air.',
    suggestions: [
      makeSuggestion('Search', 'search', 'lore'),
      makeSuggestion('Listen', 'listen', 'lore'),
    ],
  });
}
