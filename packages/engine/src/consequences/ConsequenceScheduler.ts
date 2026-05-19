import type { GameState, Consequence, StatePatch, TriggerKind } from '@first-perception/types';
import { SeededRNG } from '../engine/DiceEngine';
import { patchReplace, patchIncrement, patchRemove, makeId } from '../engine-utils';

export class ConsequenceScheduler {
  private queue: Consequence[] = [];

  add(consequence: Consequence): void {
    this.queue.push(consequence);
  }

  getQueue(): Consequence[] {
    return this.queue;
  }

  clearResolved(): void {
    this.queue = this.queue.filter((c) => !c.resolved);
  }

  evaluate(game: GameState, rng: SeededRNG): { resolved: Consequence[]; patches: StatePatch[] } {
    const resolved: Consequence[] = [];
    const patches: StatePatch[] = [];

    for (const consequence of this.queue) {
      if (consequence.resolved) continue;

      const shouldFire = this.checkTrigger(consequence, game, rng);
      if (shouldFire) {
        consequence.resolved = true;
        resolved.push(consequence);
        for (const effect of consequence.effects) {
          this.applyEffect(effect, game, patches);
        }
      }
    }

    // Decrement turns_remaining on stored consequences (mutate in place)
    for (const consequence of this.queue) {
      if (!consequence.resolved && consequence.trigger.kind === 'turns_remaining' && consequence.trigger.count !== undefined) {
        consequence.trigger.count = Math.max(0, consequence.trigger.count - 1);
      }
    }

    return { resolved, patches };
  }

  private checkTrigger(consequence: Consequence, game: GameState, rng: SeededRNG): boolean {
    const trigger = consequence.trigger;
    switch (trigger.kind) {
      case 'immediate':
        return true;
      case 'turns_remaining':
        return trigger.count !== undefined && trigger.count <= 0;
      case 'condition':
        return game.player.conditions.some((c) => c.typeId === trigger.conditionId);
      case 'location':
        return game.currentLocationId === trigger.locationId;
      case 'action':
        return true; // Action triggers are checked externally before calling evaluate
      case 'random':
        if (trigger.chance === undefined) return false;
        const roll = rng.next();
        return roll < trigger.chance / 100;
      default:
        return false;
    }
  }

  private applyEffect(effect: Consequence['effects'][number], _game: GameState, patches: StatePatch[]): void {
    switch (effect.type) {
      case 'damage':
        patches.push(patchIncrement('/player/hp', -(effect.value ?? 1)));
        break;
      case 'heal':
        patches.push(patchIncrement('/player/hp', effect.value ?? 1));
        break;
      case 'condition':
        patches.push({
          path: '/player/conditions',
          op: 'append',
          item: {
            id: makeId('cond'),
            typeId: effect.conditionTypeId ?? 'unknown',
            name: effect.conditionTypeId ?? 'Unknown',
            description: `Applied by consequence`,
            category: 'physical',
            isHarmful: true,
            turnsRemaining: effect.duration ?? 3,
            stacks: 1,
            maxStacks: 5,
            effects: [],
          },
        });
        break;
      case 'reveal_exit':
        // Requires external resolution via location graph
        break;
      case 'world_event':
      case 'faction_shift':
      case 'death_check':
      case 'spawn_npc':
      case 'move_npc':
        // Narrative or world-level; no direct patch
        break;
    }
  }
}
