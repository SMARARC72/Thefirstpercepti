/**
 * Roll-band ↔ tale-tone consistency spec (Phase 8d).
 *
 * Locks in the invariant that reducer narrative tone matches the mechanical
 * outcome. Drives each reducer through a clear-failure or clear-success roll
 * (forced via a fixed-value RNG) and asserts that emitted TaleEntry tones
 * fall in the allowed set for the RollBand.
 *
 *   failure branch  (RollBand: disaster | failure)  -> tone in {warning, danger, quiet}
 *   success branch  (RollBand: success  | triumph)  -> tone in {success, cosmic, quiet}
 *
 * 'warning' is permissible on the success branch only for partial outcomes
 * (e.g. a graze that still costs the player). We test reducer paths where
 * the outcome is unambiguous.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import type {
  GameState,
  Player,
  LocationNode,
  NpcState,
  TaleEntry,
  TaleTone,
  Item,
} from '@first-perception/types';
import { resultBandToRollBand, rollBandToTaleTone, type RollBand } from '@first-perception/types';
import { SeededRNG } from '../src/engine/DiceEngine';
import { combatReducer } from '../src/reducers/combatReducer';
import { dialogueReducer } from '../src/reducers/dialogueReducer';
import { itemReducer } from '../src/reducers/itemReducer';
import { restReducer } from '../src/reducers/restReducer';
import { investigationReducer } from '../src/reducers/investigationReducer';
import { moveReducer } from '../src/reducers/moveReducer';
import { resetIdCounter } from '../src/engine-utils';

// =============================================================================
// FIXED-OUTCOME RNG
// =============================================================================

/**
 * SeededRNG subclass whose rollDie() always returns a fixed face value and
 * whose next() returns a fixed scalar in [0, 1). This lets us force a specific
 * d20 outcome (and thus a specific ResultBand) without changing reducer or
 * util signatures, and also pins any rng.next() probability gates so the test
 * is deterministic end-to-end.
 *
 * For roll: total = die + player_stat; band derived from margin vs DC. With
 * stat=2 and DC=10:
 *   die=1   -> total=3,  margin=-7  -> failure          (RollBand disaster)
 *   die=20  -> total=22, margin=+12 -> critical_success (RollBand triumph)
 */
class FixedDieRNG extends SeededRNG {
  constructor(
    private readonly fixedDie: number,
    private readonly fixedNext: number = 0.99,
    seed = 1
  ) {
    super(seed);
  }
  override rollDie(_faces: number): number {
    return this.fixedDie;
  }
  override next(): number {
    return this.fixedNext;
  }
}

// =============================================================================
// MINIMAL GAMESTATE BUILDER
// =============================================================================

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player_test',
    name: 'Test Witness',
    form: 'human',
    formLabel: 'Human',
    posture: 'seeker',
    postureLabel: 'Seeker',
    domain: 'lore',
    stats: {
      body: 2,
      grace: 2,
      sense: 2,
      mind: 2,
      will: 2,
      presence: 2,
      authority: 1,
      ruin: 1,
      creation: 1,
    },
    hp: 10,
    maxHp: 10,
    focus: 5,
    maxFocus: 5,
    conditions: [],
    inventory: [],
    tags: [],
    ...overrides,
  };
}

function makeLocation(overrides: Partial<LocationNode> = {}): LocationNode {
  return {
    id: 'loc_test',
    name: 'Test Threshold',
    description: 'A quiet test space.',
    regionId: 'region_test',
    exits: [
      {
        toLocationId: 'loc_other',
        visible: true,
        travelRisk: 0,
        label: 'gate',
      },
    ],
    pointsOfInterest: [
      {
        id: 'poi_test',
        name: 'A test mark',
        description: 'A marking placed for the test.',
        investigated: false,
        tags: [],
      },
    ],
    dangerBase: 0,
    discovered: true,
    investigated: false,
    tags: [],
    ...overrides,
  };
}

function makeNpc(overrides: Partial<NpcState> = {}): NpcState {
  return {
    id: 'npc_test',
    name: 'Mira Voss',
    role: 'witness',
    disposition: 'wary',
    wants: 'to understand',
    lastSeen: 'here',
    locationId: 'loc_test',
    alive: true,
    dialogueState: { body: 2, grace: 2, ruin: 1, hp: 8, trust: 0 },
    secrets: [
      {
        id: 'secret_test',
        content: 'A buried name.',
        revealed: false,
        topicId: 'name',
        difficulty: 2,
      },
    ],
    tags: [],
    ...overrides,
  };
}

function makeGame(overrides: Partial<GameState> = {}, npcs: NpcState[] = []): GameState {
  const location = makeLocation();
  return {
    seed: 1,
    turnCount: 1,
    day: 1,
    phaseIndex: 0,
    phaseName: 'playing',
    player: makePlayer(),
    currentLocationId: location.id,
    locations: [location, makeLocation({ id: 'loc_other', name: 'Other Place', discovered: false })],
    regions: [],
    factions: [],
    npcs,
    tale: [],
    journal: [],
    fate: [],
    consequences: [],
    rumors: [],
    suggestedActions: [],
    lastFeedback: '',
    onboardingDismissed: true,
    gameOver: false,
    world: {
      day: 1,
      phaseIndex: 0,
      location: location.id,
      region: 'Test',
      weather: 'clear',
      danger: 0,
      pulse: '',
      crisis: '',
      seed: 1,
      map: [],
      phaseName: 'playing',
    },
    ...overrides,
  };
}

// =============================================================================
// TONE INVARIANT HELPERS
// =============================================================================

const FAILURE_ALLOWED: ReadonlySet<TaleTone> = new Set(['warning', 'danger', 'quiet']);
const SUCCESS_ALLOWED: ReadonlySet<TaleTone> = new Set(['success', 'cosmic', 'quiet']);

function expectFailureTones(narrative: TaleEntry[]): void {
  for (const entry of narrative) {
    expect(FAILURE_ALLOWED.has(entry.tone), `unexpected tone '${entry.tone}' on failure path for "${entry.title}"`).toBe(true);
  }
}

function expectSuccessTones(narrative: TaleEntry[], opts: { allowWarning?: boolean } = {}): void {
  const allowed = opts.allowWarning
    ? new Set<TaleTone>(['success', 'cosmic', 'quiet', 'warning'])
    : SUCCESS_ALLOWED;
  for (const entry of narrative) {
    expect(allowed.has(entry.tone), `unexpected tone '${entry.tone}' on success path for "${entry.title}"`).toBe(true);
  }
}

// =============================================================================
// TESTS
// =============================================================================

beforeEach(() => {
  resetIdCounter();
});

describe('RollBand ↔ TaleTone helper invariants', () => {
  it('maps every RollBand to a TaleTone that is allowed on its own outcome path', () => {
    const bands: RollBand[] = ['disaster', 'failure', 'success', 'triumph'];
    const expected: Record<RollBand, TaleTone> = {
      disaster: 'danger',
      failure: 'warning',
      success: 'success',
      triumph: 'cosmic',
    };
    for (const band of bands) {
      expect(rollBandToTaleTone(band)).toBe(expected[band]);
    }
  });

  it('collapses every ResultBand into the correct coarse RollBand', () => {
    expect(resultBandToRollBand('critical_failure')).toBe('disaster');
    expect(resultBandToRollBand('failure')).toBe('disaster');
    expect(resultBandToRollBand('partial_failure')).toBe('failure');
    expect(resultBandToRollBand('success_with_cost')).toBe('failure');
    expect(resultBandToRollBand('clean_success')).toBe('success');
    expect(resultBandToRollBand('strong_success')).toBe('success');
    expect(resultBandToRollBand('critical_success')).toBe('triumph');
  });
});

describe('combatReducer tale-tone consistency', () => {
  it('emits only failure-allowed tones when an attack misses (forced die=1)', () => {
    const npc = makeNpc();
    const game = makeGame({}, [npc]);
    const result = combatReducer(game, 'attack mira', new FixedDieRNG(1));
    expect(result.narrative.length).toBeGreaterThan(0);
    expectFailureTones(result.narrative);
  });

  it('emits only success-allowed tones when an attack lands (forced die=20)', () => {
    const npc = makeNpc({ dialogueState: { body: 1, grace: 1, ruin: 0, hp: 2, trust: 0 } });
    const game = makeGame({}, [npc]);
    const result = combatReducer(game, 'attack mira', new FixedDieRNG(20));
    expect(result.narrative.length).toBeGreaterThan(0);
    expectSuccessTones(result.narrative);
  });
});

describe('dialogueReducer tale-tone consistency', () => {
  it('emits only failure-allowed tones when a refusal lands (forced die=1)', () => {
    const game = makeGame({}, [makeNpc({ disposition: 'hostile' })]);
    const result = dialogueReducer(game, 'threaten mira', new FixedDieRNG(1));
    expect(result.narrative.length).toBeGreaterThan(0);
    expectFailureTones(result.narrative);
  });

  it('emits only success-allowed tones when persuasion succeeds (forced die=20)', () => {
    const game = makeGame({}, [makeNpc({ disposition: 'curious' })]);
    const result = dialogueReducer(game, 'ask mira about the name', new FixedDieRNG(20));
    expect(result.narrative.length).toBeGreaterThan(0);
    expectSuccessTones(result.narrative);
  });
});

describe('itemReducer tale-tone consistency', () => {
  it('emits only failure-allowed tones when item use fails (forced die=1)', () => {
    const item: Item = {
      id: 'item_test',
      name: 'cracked vial',
      type: 'consumable',
      description: 'A cracked vial of test fluid.',
    };
    const game = makeGame({ player: makePlayer({ inventory: [item] }) });
    const result = itemReducer(game, 'use cracked vial', new FixedDieRNG(1));
    expect(result.narrative.length).toBeGreaterThan(0);
    expectFailureTones(result.narrative);
  });

  it('emits only success-allowed tones when item use succeeds (forced die=20)', () => {
    const item: Item = {
      id: 'item_test',
      name: 'salve',
      type: 'consumable',
      description: 'A healing salve.',
      effects: [{ type: 'heal', target: 'player', value: 2 }],
    };
    const game = makeGame({ player: makePlayer({ inventory: [item], hp: 5 }) });
    const result = itemReducer(game, 'use salve', new FixedDieRNG(20));
    expect(result.narrative.length).toBeGreaterThan(0);
    expectSuccessTones(result.narrative);
  });
});

describe('restReducer tale-tone consistency', () => {
  it('emits only failure-allowed tones when rest fails (forced die=1, weak will)', () => {
    // dangerBase=80 -> dc = 4 + floor(80/20) = 8; die=1, will=0 -> margin=-7 -> band `failure`
    // (margin <= -5). fixedNext=0.99 keeps the danger-vulnerability intrusion gate closed.
    const game = makeGame({
      player: makePlayer({ stats: { ...makePlayer().stats, will: 0 } }),
      locations: [
        makeLocation({ id: 'loc_test', dangerBase: 80 }),
        makeLocation({ id: 'loc_other', discovered: false }),
      ],
    });
    const result = restReducer(game, 'rest', new FixedDieRNG(1, 0.99));
    expect(result.narrative.length).toBeGreaterThan(0);
    expectFailureTones(result.narrative);
  });

  it('emits only success-allowed tones when rest succeeds in a safe location (forced die=20)', () => {
    // dangerBase=0 keeps the danger-vulnerability gate shut; fixedNext=0.99
    // also closes the dream-event probability gate (>0.3).
    const result = restReducer(makeGame(), 'rest', new FixedDieRNG(20, 0.99));
    expect(result.narrative.length).toBeGreaterThan(0);
    expectSuccessTones(result.narrative);
  });
});

describe('investigationReducer tale-tone consistency', () => {
  it('emits only failure-allowed tones when an investigation triggers a trap (forced die=1)', () => {
    const result = investigationReducer(makeGame(), 'search the threshold', new FixedDieRNG(1));
    expect(result.narrative.length).toBeGreaterThan(0);
    expectFailureTones(result.narrative);
  });

  it('emits only success-allowed tones when investigation reveals a discovery (forced die=20)', () => {
    const result = investigationReducer(makeGame(), 'search the threshold', new FixedDieRNG(20));
    expect(result.narrative.length).toBeGreaterThan(0);
    // The fallback 'Clue' tale (tone 'warning') is permitted as a partial-success outcome.
    expectSuccessTones(result.narrative, { allowWarning: true });
  });
});

describe('moveReducer tale-tone consistency', () => {
  it('emits only failure-allowed tones when a move fails (forced die=1, weak sense)', () => {
    // travelRisk=20 + sense=0 + die=1 -> dc=8, margin=-7 -> band `failure` (margin <= -5).
    const start = makeLocation({
      id: 'loc_test',
      exits: [{ toLocationId: 'loc_other', visible: true, travelRisk: 20, label: 'gate' }],
    });
    const game = makeGame({
      player: makePlayer({ stats: { ...makePlayer().stats, sense: 0 } }),
      locations: [start, makeLocation({ id: 'loc_other', discovered: false })],
    });
    const result = moveReducer(game, 'go gate', new FixedDieRNG(1));
    expect(result.narrative.length).toBeGreaterThan(0);
    expectFailureTones(result.narrative);
  });

  it('emits only success-allowed tones when a move succeeds (forced die=20)', () => {
    const result = moveReducer(makeGame(), 'go gate', new FixedDieRNG(20));
    expect(result.narrative.length).toBeGreaterThan(0);
    expectSuccessTones(result.narrative);
  });
});
