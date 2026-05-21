import type { GameState, DeathRecord, Legacy, WorldMutation, Inheritance, StatePatch } from '@first-perception/types';
import { SeededRNG } from '../engine/DiceEngine';
import { makeId, patchReplace, patchAppend, patchIncrement } from '../engine-utils';

export class LegacySystem {
  generateLegacy(death: DeathRecord, game: GameState, rng: SeededRNG): Legacy {
    const worldChanges = this.generateWorldMutation(game, death, rng);
    const inheritance = this.generateInheritance(game, rng);

    return {
      id: makeId('legacy'),
      deadCharacter: death,
      worldChanges,
      inheritance,
      createdAt: new Date().toISOString(),
    };
  }

  generateWorldMutation(game: GameState, death: DeathRecord, rng: SeededRNG): WorldMutation {
    const shifts = game.factions.map((f) => ({
      factionId: f.id,
      trustDelta: Math.floor(rng.next() * 10) - 5,
      fearDelta: Math.floor(rng.next() * 10) - 2,
    }));

    return {
      factionShifts: shifts,
      rumors: [
        {
          id: makeId('rumor'),
          content: `${death.characterName} died at ${game.locations.find((l) => l.id === death.finalLocationId)?.name ?? 'an unknown place'}.`,
          belief: 50 + Math.floor(rng.next() * 30),
          truthValue: 100,
          locationsReached: [death.finalLocationId],
          createdTurn: game.turnCount,
        },
      ],
      locationChanges: game.locations
        .filter((l) => l.id === death.finalLocationId)
        .map((l) => ({
          locationId: l.id,
          tagsAdded: ['death-site'],
          tagsRemoved: [],
        })),
    };
  }

  generateInheritance(game: GameState, rng: SeededRNG): Inheritance {
    const items = game.player.inventory.filter((i) => i.type === 'key' || i.type === 'book');
    const item = items.length > 0 ? items[Math.floor(rng.next() * items.length)] : undefined;

    const reputation: Record<string, number> = {};
    for (const faction of game.factions) {
      reputation[faction.id] = faction.trust;
    }

    return {
      item,
      reputation,
      alteredFactions: game.factions.filter((f) => f.trust < 0).map((f) => f.id),
      startingAdvantage: rng.next() > 0.5 ? 'warned' : 'equipped',
    };
  }

  applyLegacyToState(game: GameState, legacy: Legacy): StatePatch[] {
    const patches: StatePatch[] = [];
    patches.push(patchReplace('/legacy', legacy));

    for (const shift of legacy.worldChanges.factionShifts) {
      const idx = game.factions.findIndex((f) => f.id === shift.factionId);
      if (idx >= 0) {
        patches.push(patchIncrement(`/factions/${idx}/trust`, shift.trustDelta));
        patches.push(patchIncrement(`/factions/${idx}/fear`, shift.fearDelta));
      }
    }

    for (const rumor of legacy.worldChanges.rumors) {
      patches.push(patchAppend('/rumors', rumor));
    }

    for (const change of legacy.worldChanges.locationChanges) {
      const idx = game.locations.findIndex((l) => l.id === change.locationId);
      if (idx >= 0) {
        const current = game.locations[idx];
        patches.push(patchReplace(`/locations/${idx}/tags`, [...current.tags, ...change.tagsAdded]));
      }
    }

    return patches;
  }
}
