import type { GameState, DeathRecord, DeathVector } from '@first-perception/types';
import { SeededRNG } from '../engine/DiceEngine';
import { makeId } from '../engine-utils';

export class DeathSystem {
  checkDeath(game: GameState, lastCommand: string): DeathRecord | null {
    if (game.player.hp > 0) return null;

    const vector = this.determineVector(game, lastCommand);
    const epitaph = this.generateEpitaph(game, vector);

    return {
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
  }

  determineVector(game: GameState, lastCommand: string): DeathVector {
    if (lastCommand.includes('attack') || lastCommand.includes('defend')) return 'combat';
    if (game.player.conditions.some((c) => c.typeId === 'diseased' || c.typeId === 'poisoned')) return 'disease';
    if (game.player.conditions.some((c) => c.typeId === 'cursed')) return 'divine';
    if (lastCommand.includes('betray') || lastCommand.includes('traitor')) return 'betrayal';
    if (lastCommand.includes('end') || lastCommand.includes('kill') || lastCommand.includes('self')) return 'suicide';
    return 'unknown';
  }

  generateEpitaph(game: GameState, vector: DeathVector): string {
    const base = `${game.player.name} survived ${game.turnCount} turns.`;
    const vectorText: Record<DeathVector, string> = {
      combat: 'Death by violence.',
      disease: 'Death by sickness.',
      exposure: 'Death by exposure.',
      divine: 'Death by divine consequence.',
      betrayal: 'Death by betrayal.',
      suicide: 'Death by their own hand.',
      unknown: 'Death unexplained.',
    };
    return `${base} ${vectorText[vector]}`;
  }
}
