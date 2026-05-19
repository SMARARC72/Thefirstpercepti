import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CharacterCreationEngine, type CreationResult } from '../src/engine/CharacterCreation';
import { DiceEngine } from '../src/engine/DiceEngine';
import { GameController } from '../src/engine/GameController';
import { InputInterpreter } from '../src/engine/InputInterpreter';
import { RulesEngine, type Stakes } from '../src/engine/RulesEngine';
import { StateEngine } from '../src/engine/StateEngine';
import {
  DEFAULT_GAME_CONFIG,
  RESULT_BANDS,
  type ActionType,
  type Consequence,
  type GameConfig,
  type Intent,
  type Player,
  type RollResult,
  type Scene,
} from '../src/types';

const FIXED_NOW = new Date('2026-05-19T12:00:00.000Z');

function gameConfig(seed: number): GameConfig {
  return {
    ...DEFAULT_GAME_CONFIG,
    deterministic: true,
    seed,
    autoSave: false,
    autoSaveFrequency: 999,
    simulationFrequency: 999,
  };
}

function baseStats() {
  return {
    body: 2,
    grace: 2,
    sense: 2,
    mind: 2,
    will: 2,
    presence: 2,
    authority: 1,
    ruin: 1,
    creation: 1,
  };
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player_test',
    name: 'Test Witness',
    form: 'human',
    firstPerception: 'Grey ash fell upward.',
    capabilityClaim: 'I can endure what remains.',
    knowledgePosture: 'seeker',
    optionalDetails: '',
    stats: baseStats(),
    hp: 10,
    maxHp: 10,
    conditions: [],
    inventory: [],
    abilities: [],
    traits: [],
    locationId: 'loc_start',
    knownRumors: [],
    knownBeliefs: [],
    factionStanding: {},
    relationships: {},
    journal: [],
    alive: true,
    createdAt: Date.now(),
    actionsTaken: 0,
    timePlayed: 0,
    ...overrides,
  };
}

function completeCreation(seed = 4242): CreationResult {
  const creation = new CharacterCreationEngine(gameConfig(seed));

  expect(creation.submitName({ name: 'Ira Ash' })).toEqual({ success: true });
  expect(creation.submitForm({ form: 'human' })).toEqual({ success: true });
  expect(
    creation.submitFirstPerception({
      perception: 'Grey ash fell upward beside a broken market bell.',
      dominantSense: 'sight',
    })
  ).toEqual({ success: true });
  expect(
    creation.submitCapability({
      claim: 'I can endure, learn, and help survivors rebuild.',
      primaryDomain: 'lore',
    })
  ).toEqual({ success: true });
  expect(creation.submitKnowledgePosture({ posture: 'seeker' })).toEqual({ success: true });
  expect(
    creation.submitOptionalDetails({
      details: 'Keeps a cord of red thread tied around one wrist.',
      desiredItems: ['thread', 'knife'],
      fears: ['forgetting names'],
      leftBehind: 'a locked room',
    })
  ).toEqual({ success: true });

  let stats = creation.createStatAssignment();
  stats = creation.assignStat(stats, 'body', 3);
  stats = creation.assignStat(stats, 'sense', 3);
  stats = creation.assignStat(stats, 'mind', 3);
  stats = creation.assignStat(stats, 'will', 3);
  stats = creation.assignStat(stats, 'presence', 2);

  return creation.completeCreation(stats);
}

function summarizeCreation(result: CreationResult) {
  return {
    seed: result.seed,
    player: {
      name: result.player.name,
      form: result.player.form,
      firstPerception: result.player.firstPerception,
      capabilityClaim: result.player.capabilityClaim,
      knowledgePosture: result.player.knowledgePosture,
      stats: result.player.stats,
      hp: result.player.hp,
      maxHp: result.player.maxHp,
      inventory: result.player.inventory.map((item) => item.name),
      abilities: result.player.abilities.map((ability) => ability.name),
    },
    location: {
      name: result.startingLocation.name,
      safetyLevel: result.startingLocation.safetyLevel,
      atmosphere: result.startingLocation.environment.atmosphere,
    },
    region: {
      name: result.region.name,
      population: result.region.population,
      dangerLevel: result.region.dangerLevel,
    },
    factions: result.factions.map((faction) => ({
      name: faction.name,
      stance: faction.playerStance,
      goals: faction.goals.map((goal) => goal.type),
    })),
    npcs: result.npcs.map((npc) => ({
      name: npc.name,
      disposition: npc.disposition,
      factionId: npc.factionId,
    })),
    startingCrisis: {
      description: result.startingCrisis.description,
      trigger: result.startingCrisis.trigger,
      severity: result.startingCrisis.severity,
      source: result.startingCrisis.source,
    },
    deathVectors: result.deathVectors,
    rumors: result.startingRumors.map((rumor) => ({
      text: rumor.text,
      isTrue: rumor.isTrue,
      spread: rumor.spread,
    })),
    beliefs: result.startingBeliefs.map((belief) => ({
      statement: belief.statement,
      confidence: belief.confidence,
      isTrue: belief.isTrue,
    })),
  };
}

function makeRoll(actionType: ActionType, band = RESULT_BANDS.CLEAN_SUCCESS): RollResult {
  return {
    id: `roll_${actionType}`,
    timestamp: Date.now(),
    rawRoll: 10,
    dice: [10],
    totalModifier: 0,
    finalResult: 10,
    dc: 10,
    band,
    visible: true,
    actionType,
    statUsed: 'will',
    description: `Controlled ${actionType} roll`,
  };
}

function makeIntent(actionType: ActionType, text: string): Intent {
  return {
    originalText: text,
    primaryAction: actionType,
    domain: 'physical',
    suggestedStat: 'will',
    confidence: 1,
    ambiguous: false,
    alternatives: [],
    negated: false,
    mentionedItems: [],
    mentionedNPCs: [],
    mentionedLocations: [],
    modifiers: [],
    emotionalTone: 'calm',
  };
}

function makeStakes(): Stakes {
  return {
    criticalFailure: 'The wound opens and the character falls.',
    failure: 'The wound worsens.',
    partialFailure: 'The wound holds for now.',
    successWithCost: 'The character survives at a cost.',
    cleanSuccess: 'The character survives.',
    strongSuccess: 'The character recovers ground.',
    hasLethalOutcome: false,
    lethalOutcomes: [],
    riskLevel: 1,
  };
}

function startController(seed = 20260519): GameController {
  const controller = new GameController(gameConfig(seed));
  controller.newGame();

  expect(controller.submitCreationStep(0, { name: 'Ira Ash' }).success).toBe(true);
  expect(controller.submitCreationStep(1, { form: 'human' }).success).toBe(true);
  expect(
    controller.submitCreationStep(2, {
      perception: 'Grey ash fell upward beside a broken market bell.',
      dominantSense: 'sight',
    }).success
  ).toBe(true);
  expect(
    controller.submitCreationStep(3, {
      claim: 'I can endure, learn, and help survivors rebuild.',
      primaryDomain: 'lore',
    }).success
  ).toBe(true);
  expect(controller.submitCreationStep(4, { posture: 'seeker' }).success).toBe(true);
  expect(
    controller.submitCreationStep(5, {
      details: 'Keeps a cord of red thread tied around one wrist.',
      desiredItems: ['thread', 'knife'],
      fears: ['forgetting names'],
      leftBehind: 'a locked room',
    }).success
  ).toBe(true);

  let stats = controller.getStatAssignment();
  stats = controller.assignStat(stats, 'body', 3);
  stats = controller.assignStat(stats, 'sense', 3);
  stats = controller.assignStat(stats, 'mind', 3);
  stats = controller.assignStat(stats, 'will', 3);
  stats = controller.assignStat(stats, 'presence', 2);
  controller.completeCharacterCreation(stats);

  return controller;
}

async function runTenTurnSmoke(seed = 9001) {
  const controller = startController(seed);
  const npcName = controller.getAllNPCs()[0]?.name ?? 'the nearest witness';
  const itemName = controller.getPlayer()?.inventory[0]?.name ?? 'the keepsake';
  const locationName = controller.getCurrentLocation()?.name ?? 'the threshold';

  const commands = [
    `examine ${locationName} carefully`,
    `talk to ${npcName}`,
    `help ${npcName}`,
    'travel north carefully',
    'rest',
    `use ${itemName}`,
    'investigate the ruins',
    'wait',
    `bargain with ${npcName}`,
    'defend myself',
  ];

  const turns = [];
  for (const command of commands) {
    const response = await controller.processTurn(command);
    const player = controller.getPlayer();
    turns.push({
      command,
      turn: controller.getTurnCount(),
      actionType: response.rolls[0]?.actionType,
      band: response.rolls[0]?.band,
      sceneType: response.scene.type,
      locationId: player?.locationId,
      hp: player?.hp,
      actionsTaken: player?.actionsTaken,
      journalEntries: player?.journal.length,
      world: controller.getWorldStateSummary(),
      characterDied: response.characterDied,
      newConsequences: response.newConsequences.map((consequence) => ({
        description: consequence.description,
        trigger: consequence.trigger,
        severity: consequence.severity,
        source: consequence.source,
      })),
    });
  }

  return {
    phase: controller.getPhase(),
    finalTurn: controller.getTurnCount(),
    finalPlayer: {
      alive: controller.getPlayer()?.alive,
      actionsTaken: controller.getPlayer()?.actionsTaken,
      journalEntries: controller.getPlayer()?.journal.length,
      locationId: controller.getPlayer()?.locationId,
    },
    turns,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('dice bands and deterministic rolls', () => {
  it('maps exact D20 margins to the seven intended result bands', () => {
    const dice = new DiceEngine(1, true);
    const dc = 10;

    expect([
      dice.determineResultBand(0, dc),
      dice.determineResultBand(5, dc),
      dice.determineResultBand(9, dc),
      dice.determineResultBand(10, dc),
      dice.determineResultBand(14, dc),
      dice.determineResultBand(19, dc),
      dice.determineResultBand(20, dc),
    ]).toEqual([
      RESULT_BANDS.CRITICAL_FAILURE,
      RESULT_BANDS.FAILURE,
      RESULT_BANDS.PARTIAL_FAILURE,
      RESULT_BANDS.SUCCESS_WITH_COST,
      RESULT_BANDS.CLEAN_SUCCESS,
      RESULT_BANDS.STRONG_SUCCESS,
      RESULT_BANDS.CRITICAL_SUCCESS,
    ]);
  });

  it('replays the same visible roll sequence for the same seed and inputs', () => {
    const rollShape = (roll: RollResult) => ({
      rawRoll: roll.rawRoll,
      dice: roll.dice,
      totalModifier: roll.totalModifier,
      finalResult: roll.finalResult,
      dc: roll.dc,
      band: roll.band,
      visible: roll.visible,
      actionType: roll.actionType,
      statUsed: roll.statUsed,
      description: roll.description,
    });

    const first = new DiceEngine(314159, true);
    const second = new DiceEngine(314159, true);

    const firstRolls = [
      first.rollD20({
        statValue: 2,
        statName: 'sense',
        dc: 11,
        actionType: 'investigate',
        description: 'Search the ash for a sign.',
      }),
      first.rollD20({
        statValue: 3,
        statName: 'will',
        dc: 12,
        actionType: 'defend',
        description: 'Hold steady against the pressure.',
      }),
    ].map(rollShape);

    const secondRolls = [
      second.rollD20({
        statValue: 2,
        statName: 'sense',
        dc: 11,
        actionType: 'investigate',
        description: 'Search the ash for a sign.',
      }),
      second.rollD20({
        statValue: 3,
        statName: 'will',
        dc: 12,
        actionType: 'defend',
        description: 'Hold steady against the pressure.',
      }),
    ].map(rollShape);

    expect(secondRolls).toEqual(firstRolls);
  });
});

describe('input interpretation', () => {
  it('resolves negated NPC-targeted combat intent', () => {
    const interpreter = new InputInterpreter();
    interpreter.setKnownEntities(
      [],
      [{ id: 'npc_mira', name: 'Mira Voss', disposition: 'wary' } as any],
      [{ id: 'item_lantern', name: 'storm lantern' } as any]
    );

    const attackIntent = interpreter.interpret('I do not attack Mira Voss');
    expect(attackIntent).toMatchObject({
      primaryAction: 'attack',
      targetId: 'npc_mira',
      domain: 'combat',
      suggestedStat: 'body',
      negated: true,
      ambiguous: false,
    });
  });

  it('interprets the first clause as primary intent and later clauses as secondary intent', () => {
    const interpreter = new InputInterpreter();
    const travelIntent = interpreter.interpret('travel north carefully then examine the gate');
    expect(travelIntent).toMatchObject({
      primaryAction: 'go',
      secondaryAction: 'examine',
      target: 'north',
      domain: 'wilderness',
      suggestedStat: 'grace',
      modifiers: ['carefully'],
    });
  });
});

describe('character creation snapshot determinism', () => {
  it('produces the same world snapshot for the same seed even when Math.random differs', () => {
    const randomSpy = vi.spyOn(Math, 'random');

    randomSpy.mockReturnValueOnce(0.1).mockReturnValueOnce(0.9).mockReturnValue(0.4);
    const first = summarizeCreation(completeCreation(4242));
    const second = summarizeCreation(completeCreation(4242));

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      seed: 4242,
      player: {
        name: 'Ira Ash',
        form: 'human',
        knowledgePosture: 'seeker',
        hp: 19,
        maxHp: 19,
      },
      location: {
        name: 'Ashen Crossing',
        safetyLevel: 3,
      },
      region: {
        name: 'The Shattered Reach',
        dangerLevel: 7,
      },
    });
    expect(first.factions).toHaveLength(3);
    expect(first.npcs).toHaveLength(5);
    expect(first.rumors).toHaveLength(8);
    expect(first.beliefs.length).toBeGreaterThan(0);
    expect(first.startingCrisis.trigger.turnsRemaining).toBe(5);
    expect(first.deathVectors).toContain('violence');
  });
});

describe('consequence countdown behavior', () => {
  it('persists countdown ticks and fires a delayed consequence exactly on its third turn', () => {
    const state = new StateEngine(gameConfig(7));
    state.setPlayer(makePlayer({ stats: { ...baseStats(), body: 3 } }));

    const delayedConsequence: Consequence = {
      id: 'consequence_three_turn_countdown',
      description: 'The ash fever reaches the lungs on the third turn.',
      trigger: { type: 'time', condition: 'three_turn_countdown', turnsRemaining: 3 },
      effect: {
        description: 'Body weakens as the fever settles.',
        statChanges: { body: -1 },
      },
      severity: 'major',
      processed: false,
      queuedAt: Date.now(),
      source: 'test',
    };

    state.queueConsequence(delayedConsequence);

    expect(state.processConsequences().processed).toEqual([]);
    expect(state.getConsequence(delayedConsequence.id)?.trigger.turnsRemaining).toBe(2);
    expect(state.getConsequence(delayedConsequence.id)?.processed).toBe(false);

    expect(state.processConsequences().processed).toEqual([]);
    expect(state.getConsequence(delayedConsequence.id)?.trigger.turnsRemaining).toBe(1);
    expect(state.getConsequence(delayedConsequence.id)?.processed).toBe(false);

    const thirdTurn = state.processConsequences();
    expect(thirdTurn.processed).toHaveLength(1);
    expect(thirdTurn.processed[0]).toMatchObject({
      id: delayedConsequence.id,
      processed: true,
    });
    expect(state.getConsequence(delayedConsequence.id)?.processed).toBe(true);
    expect(state.getWorldState().consequenceQueue).not.toContain(delayedConsequence.id);
    expect(state.getPlayer()?.stats.body).toBe(2);
  });
});

describe('death handling expectations', () => {
  it('uses the current player state after turn effects before deciding death flow', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);

    const controller = startController(99);
    const internal = controller as any;
    const location = controller.getCurrentLocation();
    const scene = controller.getLastScene();
    const region = internal.state.getRegion(location?.regionId);
    const intent = makeIntent('rest', 'rest until the wound closes');
    const roll = makeRoll('rest');

    internal.phaseInterpretInput = () => ({
      phase: 1,
      phaseName: 'interpret_input',
      output: intent,
    });
    internal.phaseAssessState = () => ({
      phase: 2,
      phaseName: 'assess_state',
      output: { location, region, presentNPCs: [], currentScene: scene },
    });
    internal.phaseResolveAction = () => ({
      phase: 3,
      phaseName: 'resolve_action',
      output: { roll, dc: { finalDC: 10 }, stakes: makeStakes() },
    });
    internal.phaseDetermineOutcome = () => {
      internal.state.updatePlayer({ hp: 0 });
      return {
        phase: 4,
        phaseName: 'determine_outcome',
        output: {
          resultBand: roll.band,
          outcomeNarrative: 'The cost opens the wound.',
          requiresConsequence: false,
          costApplied: true,
        },
      };
    };
    internal.phaseNarrateResult = () => ({
      phase: 5,
      phaseName: 'narrate_result',
      output: 'The wound opens and the character collapses.',
    });
    internal.phaseUpdateWorld = () => ({
      phase: 6,
      phaseName: 'update_world',
      output: 'updated',
    });
    internal.phaseCheckConsequences = () => ({
      phase: 7,
      phaseName: 'check_consequences',
      output: [],
    });
    internal.phaseGenerateScene = () => ({
      phase: 8,
      phaseName: 'generate_scene',
      output: {
        ...(scene as Scene),
        narrative: 'The wound opens and the character collapses.',
        type: 'death',
      },
    });

    const response = await controller.processTurn('rest until the wound closes');

    expect(response.characterDied).toBe(true);
    expect(response.deathRecord).toMatchObject({
      characterName: 'Ira Ash',
      deathVector: 'violence',
      description: 'HP reached zero',
    });
    expect(controller.getPhase()).toBe('game_over');
    expect(controller.getPlayer()).toMatchObject({
      hp: 0,
      alive: false,
    });
  });

  it('replays survival/death checks deterministically under a fixed seed', () => {
    const woundedPlayer = makePlayer({
      hp: 1,
      maxHp: 10,
      stats: { ...baseStats(), will: 3 },
    });

    const first = new RulesEngine(new DiceEngine(222, true)).performDeathCheck(woundedPlayer);
    const second = new RulesEngine(new DiceEngine(222, true)).performDeathCheck(woundedPlayer);

    expect({
      survives: second.survives,
      rawRoll: second.roll.rawRoll,
      finalResult: second.roll.finalResult,
      dc: second.roll.dc,
      band: second.roll.band,
      narrative: second.narrative,
    }).toEqual({
      survives: first.survives,
      rawRoll: first.roll.rawRoll,
      finalResult: first.roll.finalResult,
      dc: first.roll.dc,
      band: first.roll.band,
      narrative: first.narrative,
    });
    expect(first.roll.visible).toBe(false);
    expect(first.roll.description).toBe('Death check - clinging to life');
    expect(first.survives).toBe(
      first.roll.band !== RESULT_BANDS.CRITICAL_FAILURE && first.roll.band !== RESULT_BANDS.FAILURE
    );
  });
});

describe('golden 10-turn smoke', () => {
  it('replays a fixed 10-turn command sequence with stable rolls, journals, and state counters', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);

    const first = await runTenTurnSmoke(9001);
    const second = await runTenTurnSmoke(9001);

    expect(second).toEqual(first);
    expect(first.phase).toBe('playing');
    expect(first.finalTurn).toBe(10);
    expect(first.finalPlayer).toMatchObject({
      alive: true,
      actionsTaken: 10,
      journalEntries: 10,
    });
    expect(first.turns).toHaveLength(10);
    expect(first.turns.map((turn) => turn.turn)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(first.turns.every((turn) => typeof turn.actionType === 'string')).toBe(true);
    expect(first.turns.every((turn) => typeof turn.band === 'string')).toBe(true);
  });
});
