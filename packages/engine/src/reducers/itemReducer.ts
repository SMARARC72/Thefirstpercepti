import type { GameState, ActionResult } from '@first-perception/types';
import { SeededRNG } from '../engine/DiceEngine';
import {
  rollD20,
  buildActionResult,
  makeTaleEntry,
  makeSuggestion,
  parseCommand,
  patchReplace,
  patchIncrement,
  patchRemove,
  makeId,
} from '../engine-utils';

export function itemReducer(game: GameState, command: string, rng: SeededRNG): ActionResult {
  const { verb, target } = parseCommand(command);
  const itemIndex = game.player.inventory.findIndex((i) =>
    i.name.toLowerCase().includes(target) || i.type.toLowerCase().includes(target)
  );

  if (itemIndex < 0) {
    return buildActionResult({
      feedback: `You do not have ${target || 'that item'}.`,
      suggestions: game.player.inventory.slice(0, 3).map((i) =>
        makeSuggestion(`Use ${i.name}`, `use ${i.name}`, 'physical')
      ),
    });
  }

  const item = game.player.inventory[itemIndex];
  const isEquip = verb === 'equip' || command.includes('equip');
  const isConsume = verb === 'consume' || verb === 'eat' || verb === 'drink';
  const isInspect = verb === 'inspect' || verb === 'read';
  const isDrop = verb === 'drop';

  if (isInspect) {
    return buildActionResult({
      feedback: `${item.name}: ${item.description}`,
      narrative: [makeTaleEntry(game, 'Inspection', `You study ${item.name}.`, 'quiet')],
      suggestions: [makeSuggestion('Use it', `use ${item.name}`, 'physical')],
    });
  }

  const dc = 8;
  const stat = 'mind';
  const roll = rollD20(game, stat, dc, command, rng, 'physical');
  const patches = [];
  const narrative = [];

  if (roll.band === 'critical_failure') {
    narrative.push(makeTaleEntry(game, 'Breakage', `${item.name} breaks in your hands.`, 'danger'));
    patches.push(patchRemove(`/player/inventory/${itemIndex}`));
  } else if (roll.band === 'failure') {
    narrative.push(makeTaleEntry(game, 'Fumble', `Nothing happens.`, 'warning'));
  } else {
    if (isEquip && item.equipSlot) {
      // Unequip same-slot items
      for (let i = 0; i < game.player.inventory.length; i++) {
        const other = game.player.inventory[i];
        if (other.id !== item.id && other.equipSlot === item.equipSlot) {
          patches.push(patchReplace(`/player/inventory/${i}/equipSlot`, undefined));
        }
      }
      narrative.push(makeTaleEntry(game, 'Equipped', `You ready ${item.name}.`, 'success'));
    } else if (isConsume && item.type === 'consumable') {
      const heal = 3;
      const newHp = Math.min(game.player.maxHp, game.player.hp + heal);
      patches.push(patchReplace('/player/hp', newHp));
      narrative.push(makeTaleEntry(game, 'Consumed', `You consume ${item.name} and feel restored.`, 'success'));
      if (item.charges !== undefined && item.charges > 0) {
        patches.push(patchReplace(`/player/inventory/${itemIndex}/charges`, item.charges - 1));
      }
    } else if (isDrop) {
      patches.push(patchRemove(`/player/inventory/${itemIndex}`));
      narrative.push(makeTaleEntry(game, 'Dropped', `You leave ${item.name} behind.`, 'quiet'));
    } else {
      narrative.push(makeTaleEntry(game, 'Used', `You use ${item.name}.`, 'success'));
      if (item.effects && item.effects.some((e) => e.type === 'heal')) {
        const newHp = Math.min(game.player.maxHp, game.player.hp + 2);
        patches.push(patchReplace('/player/hp', newHp));
      }
      if (item.durability !== undefined && item.durability > 0) {
        patches.push(patchReplace(`/player/inventory/${itemIndex}/durability`, item.durability - 1));
      }
    }
  }

  return buildActionResult({
    patches,
    rolls: [roll],
    narrative,
    feedback: narrative[narrative.length - 1]?.body ?? 'Item used.',
    suggestions: game.player.inventory
      .filter((i) => i.id !== item.id)
      .slice(0, 3)
      .map((i) => makeSuggestion(`Use ${i.name}`, `use ${i.name}`, 'physical')),
  });
}
