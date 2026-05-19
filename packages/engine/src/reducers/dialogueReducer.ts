import type { GameState, ActionResult } from '@first-perception/types';
import { SeededRNG } from '../engine/DiceEngine';
import {
  getCurrentLocation,
  getNpcsAtLocation,
  rollD20,
  buildActionResult,
  makeTaleEntry,
  makeSuggestion,
  parseCommand,
  patchReplace,
  makeId,
} from '../engine-utils';

export function dialogueReducer(game: GameState, command: string, rng: SeededRNG): ActionResult {
  const { verb, target } = parseCommand(command);
  const location = getCurrentLocation(game);
  const npcs = location ? getNpcsAtLocation(game, location.id) : [];
  let npc = npcs.find((n) => n.name.toLowerCase().includes(target));
  if (!npc && npcs.length > 0) npc = npcs[0];

  if (!npc) {
    return buildActionResult({
      feedback: 'There is no one to speak with.',
      suggestions: [makeSuggestion('Investigate', 'investigate', 'lore')],
    });
  }

  const isBargain = verb === 'bargain' || command.includes('bargain');
  const isThreaten = verb === 'threaten' || command.includes('threaten');
  const isLie = verb === 'lie' || command.includes('lie');
  const isAsk = verb === 'ask' || command.includes('ask');

  const baseDc = 6;
  const dc = baseDc + (isThreaten ? 4 : isLie ? 3 : isBargain ? 2 : 0) +
    (npc.disposition === 'hostile' ? 4 : npc.disposition === 'wary' ? 2 : 0);
  const stat = isBargain || isLie ? 'mind' : 'presence';
  const roll = rollD20(game, stat, dc, command, rng, 'social');

  const patches = [];
  const narrative = [];
  const npcIdx = game.npcs.findIndex((n) => n.id === npc!.id);

  if (roll.band === 'critical_failure') {
    narrative.push(makeTaleEntry(game, 'Offense', `${npc.name} is deeply offended.`, 'danger'));
    if (npcIdx >= 0) patches.push(patchReplace(`/npcs/${npcIdx}/disposition`, 'hostile'));
  } else if (roll.band === 'failure') {
    narrative.push(makeTaleEntry(game, 'Dismissed', `${npc.name} is unmoved.`, 'warning'));
  } else if (roll.band === 'partial_failure') {
    narrative.push(makeTaleEntry(game, 'Hesitation', `${npc.name} responds cautiously.`, 'warning'));
  } else {
    narrative.push(makeTaleEntry(game, 'Engaged', `${npc.name} listens.`, 'success'));

    // Topic discovery on strong success
    if ((roll.band === 'strong_success' || roll.band === 'critical_success') && npc.secrets && npc.secrets.length > 0) {
      const secret = npc.secrets.find((s) => !s.revealed);
      if (secret && npcIdx >= 0) {
        const secretIdx = npc.secrets.findIndex((s) => s.id === secret.id);
        patches.push(patchReplace(`/npcs/${npcIdx}/secrets/${secretIdx}/revealed`, true));
        narrative.push(makeTaleEntry(game, 'Secret', `You learn: ${secret.content}`, 'success'));
      }
    }

    // Relationship shift
    if (npcIdx >= 0) {
      const shift = isThreaten ? -1 : roll.band === 'critical_success' ? 2 : 1;
      // We don't have a direct relationship field on NPC in new types, so we store in dialogueState
      const currentTrust = (game.npcs[npcIdx].dialogueState?.trust as number) ?? 0;
      patches.push(patchReplace(`/npcs/${npcIdx}/dialogueState/trust`, currentTrust + shift));
    }
  }

  return buildActionResult({
    patches,
    rolls: [roll],
    narrative,
    feedback: narrative[narrative.length - 1]?.body ?? 'You speak.',
    suggestions: [
      makeSuggestion(`Ask ${npc.name}`, `ask ${npc.name}`, 'social'),
      makeSuggestion(`Bargain with ${npc.name}`, `bargain ${npc.name}`, 'social'),
    ],
  });
}
