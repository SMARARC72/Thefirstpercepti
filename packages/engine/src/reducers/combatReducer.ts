/**
 * Combat reducer. Resolves attack / defend / riposte / surrender verbs
 * against any present NPC.
 *
 * Invariants enforced here that are tested elsewhere:
 *   - Tale-tone matches RollBand on both branches (see
 *     `roll-band-consistency.spec.ts`). Success paths never emit 'danger'.
 *   - On a partial_failure (graze), the npc's permanent body stat is
 *     unchanged; only hp is decremented (see `reducer-bugfixes.spec.ts`).
 *   - On a 7-band failure with a present NPC, the counterstrike narrative
 *     names the NPC (same bugfix spec).
 *   - On a triumph the damage dice count doubles; the modifier does not.
 */

import type {
  GameState,
  ActionResult,
  Consequence,
  Item,
  Player,
  RollBand,
  StatePatch,
  TaleTone,
} from '@first-perception/types';
import { rollBandToTaleTone } from '@first-perception/types';
import { SeededRNG } from '../engine/DiceEngine';
import {
  getCurrentLocation,
  getNpcsAtLocation,
  rollD20WithBand,
  buildActionResult,
  makeTaleEntry,
  makeSuggestion,
  parseCommand,
  patchReplace,
  patchIncrement,
  makeId,
} from '../engine-utils';
import { rollDice } from '../dice-expression';

// =============================================================================
// ACTION ECONOMY
// =============================================================================

type ActionSlot = 'action' | 'bonusAction' | 'reaction';

const SLOT_LABEL: Record<ActionSlot, string> = {
  action: 'action',
  bonusAction: 'bonus action',
  reaction: 'reaction',
};

const FULL_ECONOMY = { action: true, bonusAction: true, reaction: true } as const;

function slotForVerb(verb: string, command: string): ActionSlot {
  const c = command.toLowerCase();
  if (verb === 'riposte' || c.includes('riposte') || c.includes('parry') || c.includes('counter')) {
    return 'reaction';
  }
  if (verb === 'quick' || c.includes('quick strike') || c.includes('offhand') || c.includes('off-hand') || c.includes('jab')) {
    return 'bonusAction';
  }
  return 'action';
}

/**
 * Turn-end helper. Exported so any turn-advance harness can reset uniformly;
 * GameController.processTurn calls the engine-internal equivalent directly
 * on the StateEngine.
 */
export function resetActionEconomyPatches(): StatePatch[] {
  return [patchReplace('/player/actionEconomy', { ...FULL_ECONOMY })];
}

// =============================================================================
// DAMAGE EXPRESSION
// =============================================================================

/**
 * Pick the player's active weapon. Heuristic: the first inventory entry
 * whose `type === 'weapon'`. Equipped-slot tracking still lives in the
 * apps/web InventoryPanel; the reducer treats "has a weapon in pack" as
 * "wielding it" until that toggle ships.
 */
function activeWeapon(player: Player): Item | undefined {
  return player.inventory.find((it) => it.type === 'weapon');
}

/**
 * 5e-style damage expression for the current attack.
 *
 * Canonical Stats values in this engine are already direct modifiers (0–9),
 * not D&D ability scores (8–20), so `stats.body` is used straight rather
 * than collapsed through `floor((body - 10) / 2)`.
 *
 * On a triumph the dice count doubles; the modifier does not (5e canon).
 */
function buildDamageExpression(player: Player, band: RollBand): string {
  const strMod = player.stats.body;
  const weapon = activeWeapon(player);
  const die = weapon ? 6 : 4;
  const weaponBonus =
    weapon?.effects
      ?.filter((e) => e.type === 'damage')
      .reduce((acc, e) => acc + (e.value ?? 0), 0) ?? 0;

  const modifier = strMod + weaponBonus;
  const diceCount = band === 'triumph' ? 2 : 1;
  const modStr = modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`;
  return `${diceCount}d${die}${modStr}`;
}

// =============================================================================
// REDUCER
// =============================================================================

export function combatReducer(game: GameState, command: string, rng: SeededRNG): ActionResult {
  const { verb, target } = parseCommand(command);
  const location = getCurrentLocation(game);
  const npcs = location ? getNpcsAtLocation(game, location.id) : [];
  let npc = npcs.find((n) => n.name.toLowerCase().includes(target));
  if (!npc && npcs.length > 0) npc = npcs.find((n) => n.disposition === 'hostile') ?? npcs[0];

  const isDefend = verb === 'defend' || command.includes('defend');
  const isRiposte = verb === 'riposte' || command.includes('riposte');
  const isSurrender = verb === 'surrender' || command.includes('surrender');

  // Surrender bypasses the action economy entirely — it's a narrative
  // resignation, not a combat verb.
  if (isSurrender) {
    return buildActionResult({
      feedback: 'You surrender.',
      narrative: [makeTaleEntry(game, 'Surrender', 'You lower your guard and submit.', 'warning')],
      suggestions: [makeSuggestion('Speak', 'speak', 'social')],
    });
  }

  const economy = game.player.actionEconomy ?? FULL_ECONOMY;
  const slot = slotForVerb(verb, command);
  if (!economy[slot]) {
    const label = SLOT_LABEL[slot];
    return buildActionResult({
      feedback: `You've already taken your ${label} this turn.`,
      narrative: [
        makeTaleEntry(
          game,
          'No Slot Left',
          `You've already used your ${label} this turn — wait for the next opening.`,
          'warning'
        ),
      ],
      suggestions: [
        makeSuggestion('Defend', 'defend', 'combat'),
        makeSuggestion('Wait', 'wait', 'physical'),
      ],
    });
  }

  const npcBody = (npc?.dialogueState?.body as number) ?? 2;
  const npcGrace = (npc?.dialogueState?.grace as number) ?? 2;
  const dc = 10 + (npc ? Math.floor((npcBody + npcGrace) / 2) : 0);
  const stat = isRiposte ? 'grace' : 'body';
  // 5e RAW: weapon attacks (and unarmed strikes) are made with proficiency.
  const { roll, band: rollBand } = rollD20WithBand(game, stat, dc, command, rng, 'combat', {
    proficient: true,
  });

  const patches: StatePatch[] = [];
  const narrative = [];
  const consequences: Consequence[] = [];

  // Slot is charged for any verb that gets past the gate, hit or miss.
  // Patch the whole actionEconomy object rather than the nested slot so
  // the gate works even on Players that arrive without the field
  // initialised (e.g. apps/web's createGameFromCreation, which builds
  // the canonical Player and never sets actionEconomy). A nested-path
  // patchReplace would be silently dropped on a missing intermediate.
  patches.push(patchReplace('/player/actionEconomy', { ...economy, [slot]: false }));

  // 7-band branching: the graze (partial_failure / success_with_cost) and
  // counterstrike (failure) paths must stay split — `reducer-bugfixes.spec.ts`
  // locks in the distinction. RollBand drives tale-tone selection only.
  if (roll.band === 'critical_failure') {
    narrative.push(
      makeTaleEntry(game, 'Disaster', 'Your attack goes horribly wrong.', 'danger')
    );
    patches.push(patchIncrement('/player/hp', -3));
  } else if (roll.band === 'failure') {
    if (npc) {
      const npcRuin = (npc?.dialogueState?.ruin as number) ?? 0;
      const retaliation = Math.max(1, Math.floor((npcBody + npcRuin) / 4));
      patches.push(patchIncrement('/player/hp', -retaliation));
      narrative.push(
        makeTaleEntry(
          game,
          'Counterstrike',
          `You fail to connect; ${npc.name} answers for ${retaliation}.`,
          'danger'
        )
      );
    } else {
      narrative.push(makeTaleEntry(game, 'Miss', 'You fail to connect.', 'warning'));
    }
  } else if (roll.band === 'partial_failure' || roll.band === 'success_with_cost') {
    if (npc) {
      const idx = game.npcs.findIndex((n) => n.id === npc!.id);
      if (idx >= 0) {
        const currentHp = ((npc.dialogueState?.hp as number) ?? 6) - 1;
        patches.push(patchReplace(`/npcs/${idx}/hp`, currentHp));
        narrative.push(
          makeTaleEntry(game, 'Graze', `A glancing blow lands on ${npc.name} for 1.`, 'warning')
        );
      } else {
        narrative.push(makeTaleEntry(game, 'Graze', 'A glancing blow.', 'warning'));
      }
    } else {
      narrative.push(makeTaleEntry(game, 'Graze', 'A glancing blow.', 'warning'));
    }
  } else {
    const expr = buildDamageExpression(game.player, rollBand);
    const damage = Math.max(1, rollDice(expr, () => rng.next()).total);
    const successTone: TaleTone = rollBandToTaleTone(rollBand); // 'success' | 'cosmic'

    if (isDefend) {
      narrative.push(makeTaleEntry(game, 'Defended', 'You hold the line.', successTone));
    } else if (npc) {
      const idx = game.npcs.findIndex((n) => n.id === npc!.id);
      if (idx >= 0) {
        const currentHp = ((npc.dialogueState?.hp as number) ?? 6) - damage;
        patches.push(patchReplace(`/npcs/${idx}/hp`, currentHp));
        if (currentHp <= 0) {
          patches.push(patchReplace(`/npcs/${idx}/alive`, false));
          // Success paths never emit 'danger'; 'quiet' fits a clean kill.
          narrative.push(makeTaleEntry(game, 'Slain', `${npc.name} falls.`, 'quiet'));
          consequences.push({
            id: makeId('conseq'),
            type: 'world_event',
            trigger: { kind: 'immediate' },
            effects: [{ type: 'faction_shift', description: `Death of ${npc.name}` }],
            source: { turn: game.turnCount, action: command },
            resolved: false,
          });
        } else {
          narrative.push(
            makeTaleEntry(
              game,
              rollBand === 'triumph' ? 'Triumph' : 'Wound',
              `You strike ${npc.name} for ${damage} (${expr}).`,
              successTone
            )
          );
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
