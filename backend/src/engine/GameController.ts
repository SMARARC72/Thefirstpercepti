/**
 * ============================================================================
 * GAME CONTROLLER - The First Perception RPG
 * ============================================================================
 * Main game controller that orchestrates all engine components.
 * Game loop management, turn processing, 8-phase agent flow,
 * state updates, event processing, save/load coordination,
 * settings management, and debug mode.
 *
 * @module engine/GameController
 * @version 1.0.0
 * ============================================================================
 */

import {
  GameConfig,
  Player,
  Location,
  Region,
  Faction,
  NPC,
  Scene,
  TurnResponse,
  Intent,
  RollResult,
  StateDiff,
  SaveSnapshot,
  WorldPulse,
  JournalEntry,
  SuggestedAction,
  AgentPhaseResult,
  Consequence,
  DeathRecord,
  Condition,
  EVENT_SEVERITY,
  RESULT_BANDS,
  GAME_MODES,
  DEFAULT_GAME_CONFIG,
  IRONMAN_CONFIG,
  AGENT_PHASES,
  EntityId,
} from '../types';

import { DiceEngine, SeededRNG } from './DiceEngine';
import { StateEngine } from './StateEngine';
import {
  CharacterCreationEngine,
  CreationInputs,
  StatAssignment,
  CreationResult,
} from './CharacterCreation';
import { InputInterpreter } from './InputInterpreter';
import { RulesEngine, Stakes } from './RulesEngine';
import { Narrator } from './Narrator';
import { WorldSimulationEngine } from './WorldSimulation';
import { ContentValidator } from './ContentValidator';

// =============================================================================
// GAME STATE
// =============================================================================

/** The runtime state of the game controller */
interface ControllerState {
  phase: 'menu' | 'creating_character' | 'playing' | 'paused' | 'game_over';
  creationStep: number;
  turnCount: number;
  lastPlayerInput: string;
  lastScene?: Scene;
  pendingConsequences: Consequence[];
  settings: GameSettings;
  debug: DebugState;
}

/** Game settings */
interface GameSettings {
  textSpeed: number;
  showRolls: boolean;
  autoSave: boolean;
  soundEnabled: boolean;
  animationEnabled: boolean;
}

/** Debug state */
interface DebugState {
  enabled: boolean;
  showHiddenInfo: boolean;
  logLevel: 'none' | 'basic' | 'verbose';
  lastDiceRolls: RollResult[];
  lastDCCalculation: string;
  lastStakes: string;
}

// =============================================================================
// GAME CONTROLLER
// =============================================================================

/**
 * The GameController is the central orchestrator of the entire game.
 * It manages the game loop, processes turns through the 8-phase agent flow,
 * coordinates all engine components, and handles save/load.
 */
export class GameController {
  // Engine components
  private dice: DiceEngine;
  private state: StateEngine;
  private creation: CharacterCreationEngine | null = null;
  private interpreter: InputInterpreter;
  private rules: RulesEngine;
  private narrator: Narrator;
  private worldSim: WorldSimulationEngine;
  private validator: ContentValidator;

  // Controller state
  private controllerState: ControllerState;

  // Callbacks
  private onSceneGenerated?: (scene: Scene) => void;
  private onStateChanged?: (diff: StateDiff) => void;
  private onGameOver?: (deathRecord: DeathRecord) => void;
  private onMessage?: (message: string) => void;
  private onDebugLog?: (log: string) => void;

  constructor(config?: Partial<GameConfig>) {
    const gameConfig: GameConfig = {
      ...DEFAULT_GAME_CONFIG,
      ...config,
    };

    // Initialize engines
    this.dice = new DiceEngine(gameConfig.seed, gameConfig.deterministic);
    this.state = new StateEngine(gameConfig);
    this.interpreter = new InputInterpreter();
    this.rules = new RulesEngine(this.dice);
    this.narrator = new Narrator(this.dice);
    this.worldSim = new WorldSimulationEngine(this.dice, this.state);
    this.validator = new ContentValidator(gameConfig.depictionMode);

    // Controller state
    this.controllerState = {
      phase: 'menu',
      creationStep: 0,
      turnCount: 0,
      lastPlayerInput: '',
      pendingConsequences: [],
      settings: {
        textSpeed: 1,
        showRolls: true,
        autoSave: !gameConfig.ironman,
        soundEnabled: true,
        animationEnabled: true,
      },
      debug: {
        enabled: false,
        showHiddenInfo: false,
        logLevel: 'none',
        lastDiceRolls: [],
        lastDCCalculation: '',
        lastStakes: '',
      },
    };

    // Set up state change callback
    this.state.setOnStateChange((diff) => {
      if (this.onStateChanged) this.onStateChanged(diff);
    });
  }

  // =============================================================================
  // CALLBACK SETTERS
  // =============================================================================

  setOnSceneGenerated(callback: (scene: Scene) => void): void {
    this.onSceneGenerated = callback;
  }

  setOnStateChanged(callback: (diff: StateDiff) => void): void {
    this.onStateChanged = callback;
  }

  setOnGameOver(callback: (deathRecord: DeathRecord) => void): void {
    this.onGameOver = callback;
  }

  setOnMessage(callback: (message: string) => void): void {
    this.onMessage = callback;
  }

  setOnDebugLog(callback: (log: string) => void): void {
    this.onDebugLog = callback;
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  /** Start a new game - begins character creation */
  newGame(config?: Partial<GameConfig>): void {
    if (config) {
      this.state.updateConfig(config);
    }

    const gameConfig = this.state.getConfig();
    this.creation = new CharacterCreationEngine(gameConfig);
    this.controllerState.phase = 'creating_character';
    this.controllerState.creationStep = 0;
    this.controllerState.turnCount = 0;

    this.logDebug('New game started. Character creation begun.');
  }

  /** Load an existing game from a snapshot */
  loadGame(snapshot: SaveSnapshot): void {
    this.state.loadSnapshot(snapshot);
    this.controllerState.phase = 'playing';
    this.controllerState.turnCount = snapshot.turnNumber ?? 0;

    // Re-initialize engines with loaded state
    this.interpreter = new InputInterpreter();
    this.rules = new RulesEngine(this.dice);
    this.narrator = new Narrator(this.dice);
    this.worldSim = new WorldSimulationEngine(this.dice, this.state);
    this.validator = new ContentValidator(snapshot.config.depictionMode);

    this.logDebug('Game loaded from snapshot.');
  }

  // =============================================================================
  // CHARACTER CREATION
  // =============================================================================

  /** Get current creation step info */
  getCreationStep(): { step: number; total: number; name: string; canSubmit: boolean } {
    if (!this.creation || this.controllerState.phase !== 'creating_character') {
      return { step: 0, total: 6, name: 'None', canSubmit: false };
    }
    return {
      step: this.creation.getCurrentStep(),
      total: this.creation.getTotalSteps(),
      name: this.creation.getStepName(this.creation.getCurrentStep()),
      canSubmit: true,
    };
  }

  /** Submit a character creation step */
  submitCreationStep(stepIndex: number, data: unknown): { success: boolean; error?: string; nextStep?: number } {
    if (!this.creation) {
      return { success: false, error: 'Character creation not initialized' };
    }

    let result: { success: boolean; error?: string };

    switch (stepIndex) {
      case 0:
        result = this.creation.submitName(data as { name: string });
        break;
      case 1:
        result = this.creation.submitForm(data as { form: any; formDescription?: string });
        break;
      case 2:
        result = this.creation.submitFirstPerception(data as { perception: string; dominantSense: string });
        break;
      case 3:
        result = this.creation.submitCapability(data as { claim: string; primaryDomain: string });
        break;
      case 4:
        result = this.creation.submitKnowledgePosture(data as { posture: any; postureDescription?: string });
        break;
      case 5:
        result = this.creation.submitOptionalDetails(data as { details: string; desiredItems?: string[]; fears?: string[]; leftBehind?: string });
        break;
      default:
        return { success: false, error: `Invalid step index: ${stepIndex}` };
    }

    return {
      ...result,
      nextStep: result.success ? this.creation.getCurrentStep() : stepIndex,
    };
  }

  /** Get stat assignment interface */
  getStatAssignment(): StatAssignment {
    if (!this.creation) return { remaining: 0, stats: {} };
    return this.creation.createStatAssignment();
  }

  /** Assign a stat during creation */
  assignStat(assignment: StatAssignment, stat: string, value: number): StatAssignment {
    if (!this.creation) return assignment;
    return this.creation.assignStat(assignment, stat as any, value);
  }

  /** Complete character creation and generate world */
  completeCharacterCreation(statAssignment: StatAssignment): CreationResult {
    if (!this.creation) {
      throw new Error('Character creation not initialized');
    }

    const result = this.creation.completeCreation(statAssignment);

    // Load all generated entities into state
    this.state.setPlayer(result.player);
    this.state.addLocation(result.startingLocation);
    this.state.addRegion(result.region);
    for (const faction of result.factions) this.state.addFaction(faction);
    for (const npc of result.npcs) this.state.addNPC(npc);
    for (const rumor of result.startingRumors) this.state.addRumor(rumor);
    for (const belief of result.startingBeliefs) this.state.addBelief(belief);
    this.state.queueConsequence(result.startingCrisis);

    // Set player starting location
    this.state.updatePlayer({ locationId: result.startingLocation.id });

    // Update location with NPCs
    this.state.updateLocation(result.startingLocation.id, {
      npcIds: result.npcs.map((n) => n.id),
    });

    // Set region faction influence
    const factionInfluence: Record<string, number> = {};
    for (const faction of result.factions) {
      factionInfluence[faction.id] = 5;
    }
    this.state.updateRegion(result.region.id, { factionInfluence });

    // Transition to playing
    this.controllerState.phase = 'playing';
    this.creation = null;

    // Generate opening scene
    this.generateOpeningScene(result);

    this.logDebug('Character creation completed. World generated.');

    return result;
  }

  /** Generate the opening scene after character creation */
  private generateOpeningScene(creationResult: CreationResult): Scene {
    const { player, startingLocation, region, npcs } = creationResult;

    const scene = this.buildScene({
      type: 'exploration',
      location: startingLocation,
      region,
      presentNPCs: npcs,
      narrative: this.generateOpeningNarrative(creationResult),
      context: `You are ${player.name}, ${player.form}, in a world shattered by an event known only as the Shattering. You first perceived: ${player.firstPerception}. You believe yourself capable of: ${player.capabilityClaim}. Your posture toward knowledge: ${player.knowledgePosture}.`,
    });

    this.controllerState.lastScene = scene;

    if (this.onSceneGenerated) {
      this.onSceneGenerated(scene);
    }

    return scene;
  }

  private generateOpeningNarrative(result: CreationResult): string {
    const { player, startingLocation } = result;
    return `You are ${player.name}. ${startingLocation.description}

${player.firstPerception} - this was your first perception of the new world. It has shaped everything since.

You carry the belief that you are capable of ${player.capabilityClaim.toLowerCase()}. Whether this proves true remains to be seen.

Your posture toward knowledge: ${player.knowledgePosture}. In a world where truth is fragile, this stance will be tested.

The Shattered Reach awaits. What do you do?`;
  }

  // =============================================================================
  // GAME LOOP - 8-PHASE AGENT FLOW
  // =============================================================================

  /**
   * Process a single player turn through the 8-phase agent flow.
   *
   * Phase 1: Interpret Input
   * Phase 2: Assess State
   * Phase 3: Resolve Action
   * Phase 4: Determine Outcome
   * Phase 5: Narrate Result
   * Phase 6: Update World
   * Phase 7: Check Consequences
   * Phase 8: Generate Scene
   */
  async processTurn(playerInput: string): Promise<TurnResponse> {
    if (this.controllerState.phase !== 'playing') {
      throw new Error(`Cannot process turn in phase: ${this.controllerState.phase}`);
    }

    const diffStartIndex = this.state.getStateDiffs().length;
    this.controllerState.turnCount++;
    this.controllerState.lastPlayerInput = playerInput;
    const turn = this.controllerState.turnCount;

    this.logDebug(`=== TURN ${turn} ===`);
    this.logDebug(`Input: "${playerInput}"`);

    const player = this.state.getPlayer();
    if (!player) throw new Error('No player exists');

    const config = this.state.getConfig();
    const phaseResults: AgentPhaseResult[] = [];

    // === PHASE 1: Interpret Input ===
    const phase1 = this.phaseInterpretInput(playerInput);
    phaseResults.push(phase1);
    const intent = phase1.output as unknown as Intent;

    // === PHASE 2: Assess State ===
    const phase2 = this.phaseAssessState(intent);
    phaseResults.push(phase2);
    const { location, region, presentNPCs, currentScene } = phase2.output as any;

    // === PHASE 3: Resolve Action ===
    const phase3 = this.phaseResolveAction(intent, player, location, presentNPCs);
    phaseResults.push(phase3);
    const { roll, dc, stakes } = phase3.output as any;

    // === PHASE 4: Determine Outcome ===
    const phase4 = this.phaseDetermineOutcome(roll, stakes, player, intent);
    phaseResults.push(phase4);
    const { resultBand, outcomeNarrative, requiresConsequence, costApplied } = phase4.output as any;

    // === PHASE 5: Narrate Result ===
    const phase5 = this.phaseNarrateResult(
      intent, roll, stakes, outcomeNarrative, player, location, presentNPCs, region
    );
    phaseResults.push(phase5);
    const narrative = phase5.output as string;

    // === PHASE 6: Update World ===
    const phase6 = this.phaseUpdateWorld(player, intent, roll, location, presentNPCs);
    phaseResults.push(phase6);

    // === PHASE 7: Check Consequences ===
    const phase7 = this.phaseCheckConsequences(roll, stakes, intent, player, location);
    phaseResults.push(phase7);
    const newConsequences = phase7.output as Consequence[];

    // Advance time
    const hoursPassed = this.calculateTimePassed(intent);
    this.state.advanceTime(hoursPassed);

    // Resolve queued consequences every turn so delayed costs and lethal checks cannot stall.
    const consequencePlayer = this.state.getPlayer();
    this.state.processConsequences({
      actionType: intent.primaryAction,
      locationId: consequencePlayer?.locationId ?? location.id,
      conditionTypes: consequencePlayer?.conditions.map((c) => c.type) ?? [],
    });

    // Run world simulation if needed
    let worldPulse: WorldPulse | undefined;
    if (this.worldSim.shouldTickThisTurn(turn, config.simulationFrequency)) {
      const simResult = this.worldSim.tick();
      worldPulse = simResult.pulse;
    }

    const currentPlayer = this.state.getPlayer();
    if (!currentPlayer) throw new Error('No player exists after turn resolution');
    const currentLocation = this.state.getLocation(currentPlayer.locationId) ?? location;
    const currentRegion = this.state.getRegion(currentLocation.regionId) ?? region;
    const currentNPCs = this.state.getNPCsInLocation(currentLocation.id);

    // === PHASE 8: Generate Scene ===
    const phase8 = this.phaseGenerateScene(
      currentPlayer, currentLocation, currentRegion, currentNPCs, narrative, intent, roll
    );
    phaseResults.push(phase8);
    const scene = phase8.output as Scene;

    // Update controller state
    this.controllerState.lastScene = scene;

    // Auto-save
    if (config.autoSave && turn % config.autoSaveFrequency === 0) {
      this.autoSave();
    }

    // Check for player death
    let characterDied = false;
    let deathRecord: DeathRecord | undefined;
    const playerAfterTurn = this.state.getPlayer();
    if (playerAfterTurn && playerAfterTurn.hp <= 0 && playerAfterTurn.alive) {
      const dr = this.state.killPlayer('violence', 'HP reached zero');
      characterDied = true;
      deathRecord = dr;
      this.controllerState.phase = 'game_over';
      if (this.onGameOver) this.onGameOver(dr);
    }

    // Increment player action counter
    const playerForCounter = this.state.getPlayer();
    if (playerForCounter) {
      this.state.updatePlayer({ actionsTaken: playerForCounter.actionsTaken + 1 });
    }

    // Build response
    const response: TurnResponse = {
      scene,
      worldPulse,
      rolls: [roll],
      newConsequences,
      stateChanges: this.buildStateDiff(diffStartIndex),
      characterDied,
      deathRecord,
      messages: this.buildMessages(phaseResults),
      suggestedActions: scene.availableActions,
    };

    // Emit scene
    if (this.onSceneGenerated) {
      this.onSceneGenerated(scene);
    }

    this.logDebug(`Turn ${turn} complete.`);

    return response;
  }

  // =============================================================================
  // 8 PHASES
  // =============================================================================

  /** Phase 1: Interpret player input into structured intent */
  private phaseInterpretInput(input: string): AgentPhaseResult {
    // Update interpreter with current context
    const player = this.state.getPlayer();
    if (player && this.controllerState.lastScene) {
      this.interpreter.setSceneContext(this.controllerState.lastScene);
    }
    this.interpreter.setKnownEntities(
      this.state.getAllLocations(),
      this.state.getAllNPCs(),
      player?.inventory ?? []
    );

    // Check for game commands
    const cmdCheck = this.interpreter.isGameCommand(input);
    if (cmdCheck.isCommand) {
      this.handleGameCommand(cmdCheck.command!, cmdCheck.args);
    }

    const intent = this.interpreter.interpret(input);

    this.logDebug(`Phase 1 - Intent: ${intent.primaryAction}, target: ${intent.target ?? 'none'}, confidence: ${intent.confidence.toFixed(2)}`);

    return {
      phase: 1,
      phaseName: 'interpret_input',
      output: intent as unknown as string,
    };
  }

  /** Phase 2: Assess current game state */
  private phaseAssessState(intent: Intent): AgentPhaseResult {
    const player = this.state.getPlayer();
    if (!player) throw new Error('No player');

    const location = this.state.getLocation(player.locationId);
    if (!location) throw new Error('Player location not found');

    const region = this.state.getRegion(location.regionId);
    const presentNPCs = this.state.getNPCsInLocation(location.id);
    const currentScene = this.controllerState.lastScene;

    return {
      phase: 2,
      phaseName: 'assess_state',
      output: { location, region, presentNPCs, currentScene } as unknown as string,
    };
  }

  /** Phase 3: Resolve the action (dice roll) */
  private phaseResolveAction(
    intent: Intent,
    player: Player,
    location: Location,
    presentNPCs: NPC[]
  ): AgentPhaseResult {
    // Calculate DC
    const targetNPC = intent.targetId
      ? presentNPCs.find((n) => n.id === intent.targetId)
      : undefined;

    const dc = this.rules.calculateFullDC({
      baseDC: this.getBaseDC(intent.primaryAction),
      complexity: this.getComplexity(intent, targetNPC),
      resistance: targetNPC ? this.getNPCResistance(targetNPC, intent.primaryAction) : 0,
      instability: location.safetyLevel < 3 ? 1 : 0,
      conditions: player.conditions,
      locationSafety: location.safetyLevel,
      rushed: intent.modifiers.includes('quickly'),
    });

    // Determine stakes
    const stakesContext = {
      player,
      actionType: intent.primaryAction,
      target: targetNPC,
      currentLocation: location,
      region: this.state.getRegion(location.regionId)!,
      conditions: player.conditions,
      description: intent.originalText,
    };
    const stakes = this.rules.determineStakes(stakesContext);

    // Determine if roll should be hidden
    const hidden = this.rules.shouldHideRoll({
      actionType: intent.primaryAction,
      playerConditions: player.conditions,
      locationSafety: location.safetyLevel,
      hasLethalStakes: this.rules.hasLethalStakes(stakes),
    });

    // Roll
    const roll = this.dice.rollD20({
      statValue: player.stats[intent.suggestedStat] ?? 1,
      statName: intent.suggestedStat,
      authority: player.stats.authority,
      ruin: player.stats.ruin,
      creation: player.stats.creation,
      modifiers: this.calculateIntentModifiers(intent, player),
      conditions: player.conditions,
      dc: dc.finalDC,
      actionType: intent.primaryAction,
      description: intent.originalText,
      visible: this.controllerState.settings.showRolls && !hidden,
    });

    this.controllerState.debug.lastDiceRolls = [roll];
    this.controllerState.debug.lastDCCalculation = `DC: ${dc.finalDC} (scale:${dc.targetScale} + complexity:${dc.complexity} + resistance:${dc.resistance} + instability:${dc.instability})`;

    this.logDebug(`Phase 3 - Roll: ${roll.rawRoll}+${roll.totalModifier}=${roll.finalResult} vs DC ${dc.finalDC} -> ${roll.band}`);

    return {
      phase: 3,
      phaseName: 'resolve_action',
      output: { roll, dc, stakes } as unknown as string,
    };
  }

  /** Phase 4: Determine outcome from roll */
  private phaseDetermineOutcome(
    roll: RollResult,
    stakes: Stakes,
    player: Player,
    intent: Intent
  ): AgentPhaseResult {
    const outcome = this.rules.calculateResult({
      rollResult: roll,
      stakes,
      player,
    });

    // Apply cost if success_with_cost
    let costApplied = false;
    if (roll.band === RESULT_BANDS.SUCCESS_WITH_COST && roll.cost) {
      costApplied = true;
      // Apply HP cost
      for (const costType of roll.cost.costTypes) {
        if (costType.resource === 'hp' && costType.amount > 0) {
          const currentPlayer = this.state.getPlayer() ?? player;
          this.state.updatePlayer({
            hp: Math.max(0, currentPlayer.hp - costType.amount),
          });
        }
      }
    }

    this.logDebug(`Phase 4 - Outcome: ${outcome.band}, consequence needed: ${outcome.requiresConsequence}`);

    return {
      phase: 4,
      phaseName: 'determine_outcome',
      output: {
        resultBand: outcome.band,
        outcomeNarrative: outcome.narrative,
        requiresConsequence: outcome.requiresConsequence,
        costApplied,
      } as unknown as string,
    };
  }

  /** Phase 5: Narrate the result */
  private phaseNarrateResult(
    intent: Intent,
    roll: RollResult,
    stakes: Stakes,
    outcomeNarrative: string,
    player: Player,
    location: Location,
    presentNPCs: NPC[],
    region: Region | undefined
  ): AgentPhaseResult {
    // Generate roll narration
    const rollNarrative = this.narrator.narrateRollResult(roll, stakes);

    // Build complete narrative
    let narrative = `${outcomeNarrative}\n\n${rollNarrative}`;

    // Add stat/condition effects
    if (player.conditions.length > 0) {
      narrative += '\n\n' + this.narrator.narrateConditionEffects(player.conditions);
    }

    // Validate content
    const validation = this.validator.validate(narrative);
    if (!validation.passes && validation.safeRewrite) {
      narrative = validation.safeRewrite;
    }

    // Add journal entry
    const entry = this.narrator.generateJournalEntry({
      player,
      action: intent.originalText,
      result: narrative,
      day: this.state.getWorldState().day,
      hour: this.state.getWorldState().hour,
    });
    this.state.addJournalEntry(entry);

    this.logDebug(`Phase 5 - Narrative generated (${narrative.length} chars)`);

    return {
      phase: 5,
      phaseName: 'narrate_result',
      output: narrative,
    };
  }

  /** Phase 6: Update world state */
  private phaseUpdateWorld(
    player: Player,
    intent: Intent,
    roll: RollResult,
    location: Location,
    presentNPCs: NPC[]
  ): AgentPhaseResult {
    const success = this.isSuccessfulRoll(roll);
    const failure = this.isFailedRoll(roll);

    switch (intent.primaryAction) {
      case 'go':
        this.applyMovement(intent, player, location, roll);
        break;
      case 'attack':
      case 'defend':
        this.applyCombat(intent, player, presentNPCs, roll);
        break;
      case 'rest':
        this.applyRest(player, roll);
        break;
      case 'use':
        this.applyItemUse(intent, player, roll);
        break;
      case 'flee':
        this.applyFlee(player, location, roll);
        break;
      case 'investigate':
      case 'examine':
      case 'perceive':
        this.applyInvestigation(location, roll);
        break;
    }

    // Update NPC relationships based on interaction
    if (intent.targetId) {
      const currentRelation = player.relationships[intent.targetId] ?? 0;
      let change = 0;

      switch (roll.band) {
        case RESULT_BANDS.CRITICAL_SUCCESS:
          change = 3;
          break;
        case RESULT_BANDS.STRONG_SUCCESS:
        case RESULT_BANDS.CLEAN_SUCCESS:
          change = 1;
          break;
        case RESULT_BANDS.FAILURE:
          change = -1;
          break;
        case RESULT_BANDS.CRITICAL_FAILURE:
          change = -3;
          break;
      }

      if (change !== 0) {
        const updated = { ...player.relationships, [intent.targetId]: currentRelation + change };
        this.state.updatePlayer({ relationships: updated });
      }
    }

    // Mark location explored on success
    if (
      (intent.primaryAction === 'investigate' || intent.primaryAction === 'examine') &&
      success
    ) {
      this.state.updateLocation(location.id, { explored: true });
    }

    if (failure && intent.primaryAction !== 'rest') {
      const currentPlayer = this.state.getPlayer() ?? player;
      if (roll.band === RESULT_BANDS.CRITICAL_FAILURE) {
        this.state.updatePlayer({ hp: Math.max(0, currentPlayer.hp - 2) });
      }
    }

    this.logDebug('Phase 6 - World state updated');

    return {
      phase: 6,
      phaseName: 'update_world',
      output: 'updated',
    };
  }

  /** Phase 7: Check and queue consequences */
  private phaseCheckConsequences(
    roll: RollResult,
    stakes: Stakes,
    intent: Intent,
    player: Player,
    location: Location
  ): AgentPhaseResult {
    const consequences = this.rules.generateConsequences({
      rollResult: roll,
      stakes,
      player,
      actionType: intent.primaryAction,
      target: location,
    });

    for (const consequence of consequences) {
      this.state.queueConsequence(consequence);
    }

    this.controllerState.pendingConsequences.push(...consequences);

    this.logDebug(`Phase 7 - ${consequences.length} consequences queued`);

    return {
      phase: 7,
      phaseName: 'check_consequences',
      output: consequences as unknown as string,
    };
  }

  /** Phase 8: Generate the next scene */
  private phaseGenerateScene(
    player: Player,
    location: Location,
    region: Region | undefined,
    presentNPCs: NPC[],
    narrative: string,
    intent: Intent,
    roll: RollResult
  ): AgentPhaseResult {
    // Determine scene type
    const sceneType = this.determineSceneType(intent, roll, presentNPCs);

    // Get known connections
    const knownConnections = location.connections
      .filter((c) => !c.hidden)
      .map((c) => {
        const target = this.state.getLocation(c.targetId);
        return {
          name: target?.name ?? 'Unknown',
          description: c.description,
        };
      });

    // Generate suggested actions
    const suggestedActions = this.narrator.generateSuggestedActions({
      player,
      location,
      presentNPCs,
      knownConnections,
    });

    // Generate suggested responses
    const suggestedResponses = suggestedActions.map((a) => a.description);

    // Get world state for time
    const worldState = this.state.getWorldState();

    const scene = this.buildScene({
      type: sceneType,
      location,
      region,
      presentNPCs,
      narrative,
      context: `Previous action: ${intent.originalText} (${roll.band})`,
      availableActions: suggestedActions,
      suggestedResponses,
      timeOfDay: worldState.hour,
      day: worldState.day,
      weather: region?.weather ?? 'clear',
    });

    this.logDebug('Phase 8 - Scene generated');

    return {
      phase: 8,
      phaseName: 'generate_scene',
      output: scene as unknown as string,
    };
  }

  // =============================================================================
  // SCENE BUILDING
  // =============================================================================

  private buildScene(params: {
    type: string;
    location: Location;
    region?: Region;
    presentNPCs: NPC[];
    narrative: string;
    context?: string;
    availableActions?: SuggestedAction[];
    suggestedResponses?: string[];
    timeOfDay?: number;
    day?: number;
    weather?: string;
  }): Scene {
    const player = this.state.getPlayer();

    return {
      id: `scene_${Date.now()}_${this.dice.roll(1000)}`,
      type: params.type as any,
      locationId: params.location.id,
      narrative: params.narrative,
      context: params.context ?? '',
      presentNPCs: params.presentNPCs.map((n) => n.id),
      availableActions: params.availableActions ?? [],
      environment: params.location.environment,
      timeOfDay: params.timeOfDay ?? 8,
      day: params.day ?? 1,
      weather: params.weather as any,
      ongoingConditions: player?.conditions.filter((c) => c.remaining !== 0) ?? [],
      suggestedResponses: params.suggestedResponses ?? [],
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private getBaseDC(actionType: string): number {
    const dcMap: Record<string, number> = {
      attack: 10,
      destroy: 12,
      create: 8,
      persuade: 10,
      investigate: 8,
      flee: 10,
      speak: 6,
      examine: 6,
      go: 6,
      help: 8,
      bargain: 10,
      use: 8,
      ritual: 14,
      defend: 10,
      evade: 8,
      manipulate: 10,
      perceive: 8,
      craft_action: 8,
      rest: 4,
      wait: 4,
      unknown: 8,
    };
    return dcMap[actionType] ?? 8;
  }

  private getComplexity(intent: Intent, targetNPC?: NPC): number {
    let complexity = 0;
    if (intent.modifiers.includes('carefully')) complexity -= 1;
    if (intent.modifiers.includes('quickly')) complexity += 1;
    if (intent.ambiguous) complexity += 1;
    if (targetNPC?.isAnomaly) complexity += 2;
    return Math.max(0, complexity);
  }

  private getNPCResistance(npc: NPC, actionType: string): number {
    const dispositionMod: Record<string, number> = {
      hateful: 4,
      unfriendly: 2,
      wary: 1,
      indifferent: 0,
      curious: -1,
      friendly: -2,
      loyal: -3,
      devoted: -4,
    };
    return Math.max(0, (dispositionMod[npc.disposition] ?? 0) + (npc.stats.will > 3 ? 1 : 0));
  }

  private calculateIntentModifiers(intent: Intent, player: Player): number {
    let mod = 0;
    if (intent.modifiers.includes('carefully')) mod += 1;
    if (intent.modifiers.includes('quickly')) mod -= 1;
    if (intent.modifiers.includes('quietly') && (intent.domain === 'stealth' || intent.primaryAction === 'flee')) mod += 1;
    if (intent.negated) mod -= 1;

    // Form bonuses
    if (player.form === 'warped' && (intent.primaryAction === 'attack' || intent.primaryAction === 'destroy')) mod += 1;
    if (player.form === 'formless' && intent.domain === 'stealth') mod += 1;

    return mod;
  }

  private calculateTimePassed(intent: Intent): number {
    switch (intent.primaryAction) {
      case 'rest': return 8;
      case 'ritual': return 2;
      case 'investigate': return 2;
      case 'create': return 3;
      case 'craft_action': return 4;
      case 'speak': return 1;
      case 'bargain': return 1;
      default: return 1;
    }
  }

  private determineSceneType(intent: Intent, roll: RollResult, presentNPCs: NPC[]): string {
    if (roll.band === RESULT_BANDS.CRITICAL_FAILURE && this.rules.hasLethalStakes({
      criticalFailure: '', failure: '', partialFailure: '', successWithCost: '',
      cleanSuccess: '', strongSuccess: '', hasLethalOutcome: true, lethalOutcomes: [], riskLevel: 5,
    })) return 'death';
    if (intent.primaryAction === 'speak' && presentNPCs.length > 0) return 'dialogue';
    if (intent.primaryAction === 'attack' || intent.primaryAction === 'defend') return 'combat';
    if (intent.primaryAction === 'ritual') return 'ritual';
    if (intent.primaryAction === 'investigate' || intent.primaryAction === 'examine') return 'investigation';
    if (intent.primaryAction === 'rest') return 'rest';
    if (intent.primaryAction === 'go') return 'travel';
    return 'exploration';
  }

  private isSuccessfulRoll(roll: RollResult): boolean {
    return (
      roll.band === RESULT_BANDS.SUCCESS_WITH_COST ||
      roll.band === RESULT_BANDS.CLEAN_SUCCESS ||
      roll.band === RESULT_BANDS.STRONG_SUCCESS ||
      roll.band === RESULT_BANDS.CRITICAL_SUCCESS
    );
  }

  private isFailedRoll(roll: RollResult): boolean {
    return (
      roll.band === RESULT_BANDS.CRITICAL_FAILURE ||
      roll.band === RESULT_BANDS.FAILURE ||
      roll.band === RESULT_BANDS.PARTIAL_FAILURE
    );
  }

  private applyMovement(intent: Intent, player: Player, location: Location, roll: RollResult): void {
    if (!this.isSuccessfulRoll(roll)) return;

    const target = (intent.target ?? '').toLowerCase();
    const visibleConnections = location.connections.filter((connection) => !connection.hidden);
    const connection =
      visibleConnections.find((candidate) => candidate.targetId === intent.targetId) ??
      visibleConnections.find((candidate) => {
        const destination = this.state.getLocation(candidate.targetId);
        return (
          destination?.name.toLowerCase().includes(target) ||
          candidate.description.toLowerCase().includes(target)
        );
      }) ??
      visibleConnections[0];

    if (!connection) return;

    const destination = this.state.getLocation(connection.targetId);
    if (!destination) return;

    this.state.updatePlayer({ locationId: destination.id });
    this.state.updateLocation(destination.id, {
      discovered: true,
    });
  }

  private applyCombat(intent: Intent, player: Player, presentNPCs: NPC[], roll: RollResult): void {
    const target = this.resolveTargetNPC(intent, presentNPCs);
    if (!target) {
      if (roll.band === RESULT_BANDS.CRITICAL_FAILURE) {
        this.state.updatePlayer({ hp: Math.max(0, player.hp - 2) });
      }
      return;
    }

    if (intent.primaryAction === 'attack' && this.isSuccessfulRoll(roll)) {
      const damage = this.rules.calculateDamage(roll, player.stats, target.stats).damage;
      const hp = Math.max(0, target.hp - damage);
      this.state.updateNPC(target.id, { hp, alive: hp > 0 });
      return;
    }

    if (this.isFailedRoll(roll)) {
      const retaliation = Math.max(1, Math.ceil((target.stats.body + target.stats.ruin) / 4));
      this.state.updatePlayer({ hp: Math.max(0, player.hp - retaliation) });
    }
  }

  private applyRest(player: Player, roll: RollResult): void {
    const current = this.state.getPlayer() ?? player;
    const healAmount = this.isSuccessfulRoll(roll) ? 4 : 1;
    const updatedConditions = current.conditions
      .map((condition) =>
        condition.remaining > 0
          ? { ...condition, remaining: Math.max(0, condition.remaining - (this.isSuccessfulRoll(roll) ? 2 : 1)) }
          : condition
      )
      .filter((condition) => condition.remaining !== 0);

    this.state.updatePlayer({
      hp: Math.min(current.maxHp, current.hp + healAmount),
      conditions: updatedConditions,
    });
  }

  private applyItemUse(intent: Intent, player: Player, roll: RollResult): void {
    if (!this.isSuccessfulRoll(roll)) return;

    const current = this.state.getPlayer() ?? player;
    const target = (intent.target ?? intent.mentionedItems[0] ?? '').toLowerCase();
    const item = current.inventory.find((candidate) => {
      const name = candidate.name.toLowerCase();
      return name === target || name.includes(target) || target.includes(name);
    });
    if (!item) return;

    const inventory = current.inventory.map((candidate) => ({ ...candidate }));
    const itemIndex = inventory.findIndex((candidate) => candidate.id === item.id);
    if (itemIndex < 0) return;

    let hp = current.hp;
    if (item.equippable) {
      for (const candidate of inventory) {
        if (candidate.slot && candidate.slot === item.slot) candidate.equipped = false;
      }
      inventory[itemIndex].equipped = true;
    }

    if (item.maxUses !== -1) {
      inventory[itemIndex].usesRemaining = Math.max(0, item.usesRemaining - 1);
    }

    const effectText = item.effects.map((effect) => effect.mechanicalEffect.toLowerCase()).join(' ');
    if (
      item.tags.some((tag) => ['healing', 'water', 'consumable'].includes(tag)) ||
      effectText.includes('heal') ||
      effectText.includes('restore')
    ) {
      hp = Math.min(current.maxHp, current.hp + 3);
    }

    this.state.updatePlayer({
      hp,
      inventory: inventory.filter((candidate) => candidate.maxUses === -1 || candidate.usesRemaining > 0),
    });
  }

  private applyFlee(player: Player, location: Location, roll: RollResult): void {
    const safeConnection = location.connections
      .filter((connection) => !connection.hidden)
      .map((connection) => this.state.getLocation(connection.targetId))
      .filter((candidate): candidate is Location => Boolean(candidate))
      .sort((a, b) => b.safetyLevel - a.safetyLevel)[0];

    if (this.isSuccessfulRoll(roll) && safeConnection) {
      this.state.updatePlayer({ locationId: safeConnection.id });
      this.state.updateLocation(safeConnection.id, {
        discovered: true,
      });
      return;
    }

    this.state.applyPlayerCondition({
      type: 'frightened',
      description: 'Shaken by a failed escape.',
      severity: roll.band === RESULT_BANDS.CRITICAL_FAILURE ? 5 : 3,
      appliedAt: Date.now(),
      duration: 2,
      remaining: 2,
      source: 'flee',
      statModifiers: { will: -1 },
    });
  }

  private applyInvestigation(location: Location, roll: RollResult): void {
    if (!this.isSuccessfulRoll(roll)) return;

    const hiddenFeatures = location.hiddenFeatures.map((feature, index) => {
      if (feature.found) return feature;
      if (index === 0 || roll.finalResult >= feature.revealDC) {
        return { ...feature, found: true };
      }
      return feature;
    });

    this.state.updateLocation(location.id, {
      explored: true,
      hiddenFeatures,
    });
  }

  private resolveTargetNPC(intent: Intent, presentNPCs: NPC[]): NPC | undefined {
    if (intent.targetId) {
      const byId = presentNPCs.find((npc) => npc.id === intent.targetId);
      if (byId) return byId;
    }

    const target = (intent.target ?? intent.mentionedNPCs[0] ?? '').toLowerCase();
    if (target) {
      const byName = presentNPCs.find((npc) => {
        const name = npc.name.toLowerCase();
        return name === target || name.includes(target) || target.includes(name);
      });
      if (byName) return byName;
    }

    return presentNPCs.find((npc) => npc.disposition === 'hateful' || npc.disposition === 'unfriendly');
  }

  private buildStateDiff(startIndex: number): StateDiff {
    const diffs = this.state.getStateDiffs().slice(startIndex);
    const changes: StateDiff['changes'] = {};
    const additions: StateDiff['additions'] = [];
    const removals: StateDiff['removals'] = [];

    for (const diff of diffs) {
      for (const [entityType, byId] of Object.entries(diff.changes)) {
        changes[entityType] = { ...(changes[entityType] ?? {}), ...byId };
      }
      additions.push(...diff.additions);
      removals.push(...diff.removals);
    }

    return {
      id: `turn_${this.controllerState.turnCount}`,
      turn: this.controllerState.turnCount,
      timestamp: Date.now(),
      changes,
      additions,
      removals,
    };
  }

  private buildMessages(phases: AgentPhaseResult[]): string[] {
    return phases.map((p) => `${p.phaseName}: complete`);
  }

  // =============================================================================
  // GAME COMMANDS
  // =============================================================================

  private handleGameCommand(command: string, args?: string[]): void {
    switch (command) {
      case 'save':
        if (!this.state.getConfig().ironman) {
          const snapshot = this.state.createSnapshot();
          this.emitMessage('Game saved.');
        }
        break;
      case 'load':
        // Load handled externally
        break;
      case 'inventory':
        this.showInventory();
        break;
      case 'status':
        this.showStatus();
        break;
      case 'journal':
        this.showJournal();
        break;
      case 'settings':
        // Settings handled externally
        break;
      case 'debug':
        this.toggleDebug();
        break;
      case 'undo':
        if (this.state.canUndo()) {
          this.state.undo();
          this.emitMessage('Undone.');
        }
        break;
    }
  }

  private showInventory(): void {
    const player = this.state.getPlayer();
    if (!player) return;
    const items = player.inventory.map((i) => `${i.name}${i.equipped ? ' (equipped)' : ''}`);
    this.emitMessage(`Inventory: ${items.join(', ') || 'Empty'}`);
  }

  private showStatus(): void {
    const player = this.state.getPlayer();
    if (!player) return;
    this.emitMessage(
      `HP: ${player.hp}/${player.maxHp} | ` +
      `Conditions: ${player.conditions.map((c) => c.type).join(', ') || 'None'} | ` +
      `Day: ${this.state.getWorldState().day} Hour: ${this.state.getWorldState().hour}`
    );
  }

  private showJournal(): void {
    const journal = this.state.getJournal();
    const recent = journal.slice(-5);
    for (const entry of recent) {
      this.emitMessage(`Day ${entry.day}: ${entry.text.substring(0, 100)}...`);
    }
  }

  // =============================================================================
  // SAVE / LOAD
  // =============================================================================

  /** Create a save snapshot */
  save(): SaveSnapshot {
    return this.state.createSnapshot();
  }

  /** Load from a save snapshot */
  load(snapshot: SaveSnapshot): void {
    this.loadGame(snapshot);
    this.emitMessage('Game loaded.');
  }

  /** Auto-save to localStorage (if available) */
  autoSave(): void {
    try {
      const snapshot = this.state.createSnapshot();
      const data = JSON.stringify(snapshot);
      // In browser environment, use localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('the_first_perception_save', data);
      }
    } catch {
      // Auto-save failure is non-fatal
    }
  }

  /** Check for auto-save in localStorage */
  checkAutoSave(): SaveSnapshot | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem('the_first_perception_save');
        if (data) {
          return JSON.parse(data) as SaveSnapshot;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }

  // =============================================================================
  // SETTINGS
  // =============================================================================

  /** Get current settings */
  getSettings(): GameSettings {
    return { ...this.controllerState.settings };
  }

  /** Update settings */
  updateSettings(settings: Partial<GameSettings>): void {
    this.controllerState.settings = { ...this.controllerState.settings, ...settings };
  }

  /** Get game config */
  getConfig(): GameConfig {
    return this.state.getConfig();
  }

  /** Update game config */
  updateConfig(config: Partial<GameConfig>): void {
    this.state.updateConfig(config);
  }

  // =============================================================================
  // DEBUG MODE
  // =============================================================================

  /** Toggle debug mode */
  toggleDebug(): void {
    this.controllerState.debug.enabled = !this.controllerState.debug.enabled;
    this.emitMessage(`Debug mode: ${this.controllerState.debug.enabled ? 'ON' : 'OFF'}`);
  }

  /** Get debug info */
  getDebugInfo(): DebugState {
    return { ...this.controllerState.debug };
  }

  /** Set debug log level */
  setDebugLevel(level: 'none' | 'basic' | 'verbose'): void {
    this.controllerState.debug.logLevel = level;
  }

  /** Get last dice rolls for display */
  getLastRolls(): RollResult[] {
    return this.dice.getRecentRolls(10);
  }

  /** Get entity counts for debugging */
  getEntityCounts(): Record<string, number> {
    return this.state.getEntityCounts();
  }

  /** Validate current state */
  validateState(): { valid: boolean; errors: string[] } {
    return this.state.validateState();
  }

  // =============================================================================
  // GETTERS
  // =============================================================================

  /** Get current phase */
  getPhase(): string {
    return this.controllerState.phase;
  }

  /** Get current turn count */
  getTurnCount(): number {
    return this.controllerState.turnCount;
  }

  /** Get last scene */
  getLastScene(): Scene | undefined {
    return this.controllerState.lastScene;
  }

  /** Get player */
  getPlayer(): Player | null {
    return this.state.getPlayer();
  }

  /** Get current location */
  getCurrentLocation(): Location | undefined {
    const player = this.state.getPlayer();
    if (!player) return undefined;
    return this.state.getLocation(player.locationId);
  }

  /** Get all known locations */
  getAllLocations(): Location[] {
    return this.state.getAllLocations();
  }

  /** Get all NPCs */
  getAllNPCs(): NPC[] {
    return this.state.getAllNPCs();
  }

  /** Get all factions */
  getAllFactions(): Faction[] {
    return this.state.getAllFactions();
  }

  /** Get player's journal */
  getJournal(): JournalEntry[] {
    return this.state.getJournal();
  }

  /** Get current world state */
  getWorldStateSummary(): { day: number; hour: number; turn: number } {
    const ws = this.state.getWorldState();
    return {
      day: ws.day,
      hour: ws.hour,
      turn: this.controllerState.turnCount,
    };
  }

  // =============================================================================
  // PRIVATE HELPERS
  // =============================================================================

  private emitMessage(message: string): void {
    if (this.onMessage) this.onMessage(message);
  }

  private logDebug(message: string): void {
    if (this.controllerState.debug.enabled && this.onDebugLog) {
      this.onDebugLog(message);
    }
  }
}
