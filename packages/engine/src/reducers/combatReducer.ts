import type { GameState, ActionResult, Consequence } from '@first-perception/types';
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
  patchIncrement,
  patchAppend,
  makeId,
} from '../engine-utils';

export function combatReducer(game: GameState, command: string, rng: SeededRNG): ActionResult {
  const { verb, target } = parseCommand(command);
  const location = getCurrentLocation(game);
  const npcs = location ? getNpcsAtLocation(game, location.id) : [];
  let npc = npcs.find((n) => n.name.toLowerCase().includes(target));
  if (!npc && npcs.length > 0) npc = npcs.find((n) => n.disposition === 'hostile') ?? npcs[0];

  const isDefend = verb === 'defend' || command.includes('defend');
  const isRiposte = verb === 'riposte' || command.includes('riposte');
  const isSurrender = verb === 'surrender' || command.includes('surrender');

  if (isSurrender) {
    return buildActionResult({
      feedback: 'You surrender.',
      narrative: [makeTaleEntry(game, 'Surrender', 'You lower your guard and submit.', 'warning')],
      suggestions: [makeSuggestion('Speak', 'speak', 'social')],
    });
  }

  const npcBody = (npc?.dialogueState?.body as number) ?? 2;
  const npcGrace = (npc?.dialogueState?.grace as number) ?? 2;
  const dc = 10 + (npc ? Math.floor((npcBody + npcGrace) / 2) : 0);
  const stat = isRiposte ? 'grace' : 'body';
  const roll = rollD20(game, stat, dc, command, rng, 'combat');

  const patches = [];
  const narrative = [];
  const consequences: Consequence[] = [];

  if (roll.band === 'critical_failure') {
    narrative.push(makeTaleEntry(game, 'Disaster', 'Your attack goes horribly wrong.', 'danger'));
    patches.push(patchIncrement('/player/hp', -3));
  } else if (roll.band === 'failure') {
    narrative.push(makeTaleEntry(game, 'Miss', 'You fail to connect.', 'warning'));
    if (npc) {
      const npcRuin = (npc?.dialogueState?.ruin as number) ?? 0;
      const retaliation = Math.max(1, Math.floor((npcBody + npcRuin) / 4));
      patches.push(patchIncrement('/player/hp', -retaliation));
    }
  } else if (roll.band === 'partial_failure') {
    narrative.push(makeTaleEntry(game, 'Graze', 'A glancing blow.', 'warning'));
    if (npc) {
      const idx = game.npcs.findIndex((n) => n.id === npc!.id);
      if (idx >= 0) patches.push(patchIncrement(`/npcs/${idx}/stats/body`, -1));
    }
  } else {
    let damage = Math.max(1, (game.player.stats.body ?? 0) + (game.player.stats.ruin ?? 0));
    if (roll.band === 'clean_success') damage += 1;
    if (roll.band === 'strong_success') damage += 2;
    if (roll.band === 'critical_success') damage += 4;

    if (isDefend) {
      narrative.push(makeTaleEntry(game, 'Defended', 'You hold the line.', 'success'));
    } else if (npc) {
      const idx = game.npcs.findIndex((n) => n.id === npc!.id);
      if (idx >= 0) {
        const currentHp = ((npc.dialogueState?.hp as number) ?? 6) - damage;
        patches.push(patchReplace(`/npcs/${idx}/hp`, currentHp));
        if (currentHp <= 0) {
          patches.push(patchReplace(`/npcs/${idx}/alive`, false));
          narrative.push(makeTaleEntry(game, 'Slain', `${npc.name} falls.`, 'danger'));
          consequences.push({
            id: makeId('conseq'),
            type: 'world_event',
            trigger: { kind: 'immediate' },
            effects: [{ type: 'faction_shift', description: `Death of ${npc.name}` }],
            source: { turn: game.turnCount, action: command },
            resolved: false,
          });
        } else {
          narrative.push(makeTaleEntry(game, 'Wound', `You strike ${npc.name} for ${damage}.`, 'success'));
        }
      }
    } else {
      narrative.push(makeTaleEntry(game, 'Swing', 'You swing at empty air.', 'quiet'));
    }
  }

  return buildActionResult({
    patches,
    rolls: [roll],
    narrative,
    consequences,
    feedback: narrative[narrative.length - 1]?.body ?? 'Combat unfolds.',
    suggestions: [
      makeSuggestion('Defend', 'defend', 'combat'),
      makeSuggestion('Flee', 'flee', 'stealth'),
    ],
  });
}
