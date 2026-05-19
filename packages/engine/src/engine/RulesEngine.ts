/**
 * ============================================================================
 * RULES ENGINE - The First Perception RPG
 * ============================================================================
 * Rules resolution: DC calculation, stakes determination, risk assessment,
 * hidden roll triggers, lethal stakes detection, cost calculation, scale
 * determination, result band calculation, consequence generation, death checks.
 *
 * @module engine/RulesEngine
 * @version 1.0.0
 * ============================================================================
 */

import {
  RollResult,
  DCCalculation,
  CostCalculation,
  ResultBand,
  CoreStat,
  ActionType,
  Condition,
  StatBlock,
  Consequence,
  ConsequenceTrigger,
  ConsequenceEffect,
  Player,
  Location,
  NPC,
  Faction,
  Region,
  DeathVector,
  EVENT_SEVERITY,
  RESULT_BANDS,
  COST_SEVERITY,
  GameEngineError,
  NPCMemory,
  Item,
  PartialStatBlock,
} from '../engine-types';
import { DiceEngine } from './DiceEngine';

// =============================================================================
// STAKES DEFINITION
// =============================================================================

/** The 6 possible outcomes for any action */
export interface Stakes {
  /** What happens on critical failure */
  criticalFailure: string;
  /** What happens on failure */
  failure: string;
  /** What happens on partial failure */
  partialFailure: string;
  /** What happens on success with cost */
  successWithCost: string;
  /** What happens on clean success */
  cleanSuccess: string;
  /** What happens on strong/critical success */
  strongSuccess: string;
  /** Whether any outcome is lethal */
  hasLethalOutcome: boolean;
  /** Which outcomes are lethal */
  lethalOutcomes: ResultBand[];
  /** Risk level (1-10) */
  riskLevel: number;
}

/** Context for stakes determination */
export interface StakesContext {
  player: Player;
  actionType: ActionType;
  target?: NPC | Location | Faction;
  currentLocation: Location;
  region: Region;
  conditions: Condition[];
  description: string;
}

// =============================================================================
// RULES ENGINE
// =============================================================================

/**
 * The RulesEngine handles all game rule resolution.
 * It calculates DCs, determines stakes, assesses risk, and generates consequences.
 */
export class RulesEngine {
  private dice: DiceEngine;

  constructor(diceEngine: DiceEngine) {
    this.dice = diceEngine;
  }

  // =============================================================================
  // DC CALCULATION
  // =============================================================================

  /**
   * Calculate the full DC for an action.
   * Formula: base_dc + complexity + resistance + instability + environmental
   */
  calculateFullDC(context: {
    /** Base difficulty of the action (0-20) */
    baseDC: number;
    /** How complex the action is (0-5) */
    complexity?: number;
    /** Opposition resistance (0-10) */
    resistance?: number;
    /** Environmental instability (0-5) */
    instability?: number;
    /** Player conditions affecting the roll */
    conditions?: Condition[];
    /** Current location safety level */
    locationSafety?: number;
    /** Target's relevant stat if opposed */
    targetStat?: number;
    /** Whether the action is rushed */
    rushed?: boolean;
  }): DCCalculation {
    const {
      baseDC,
      complexity = 0,
      resistance = 0,
      instability = 0,
      conditions = [],
      locationSafety = 5,
      targetStat,
      rushed = false,
    } = context;

    // Location safety modifies DC (safer = easier)
    const safetyModifier = Math.max(-2, Math.min(2, 5 - locationSafety));

    // Conditions add instability
    const conditionPenalty = conditions.reduce((sum, c) => {
      if (c.type === 'exhausted') return sum + 1;
      if (c.type === 'injured') return sum + 1;
      if (c.type === 'wounded') return sum + 2;
      if (c.type === 'frightened') return sum + 1;
      if (c.type === 'cursed') return sum + 2;
      return sum;
    }, 0);

    // Rushed actions are harder
    const rushPenalty = rushed ? 3 : 0;

    // Opposed actions use target stat
    const opposedModifier = targetStat ? Math.floor(targetStat / 2) : 0;

    const totalInstability = instability + conditionPenalty;

    return this.dice.calculateDC({
      targetScale: baseDC,
      complexity,
      resistance: resistance + opposedModifier + rushPenalty,
      instability: totalInstability,
      customComponents: [
        { name: 'Location Safety', value: safetyModifier, description: 'Environmental ease/difficulty' },
      ],
    });
  }

  // =============================================================================
  // STAKES DETERMINATION
  // =============================================================================

  /**
   * Determine the stakes for an action.
   * What happens on each of the 6 possible outcomes?
   */
  determineStakes(context: StakesContext): Stakes {
    const { player, actionType, target, currentLocation, region, conditions } = context;

    const stakes: Stakes = {
      criticalFailure: '',
      failure: '',
      partialFailure: '',
      successWithCost: '',
      cleanSuccess: '',
      strongSuccess: '',
      hasLethalOutcome: false,
      lethalOutcomes: [],
      riskLevel: 1,
    };

    // Generate stakes based on action type and context
    switch (actionType) {
      case 'attack':
        this.generateCombatStakes(stakes, player, target as NPC, currentLocation);
        break;
      case 'destroy':
        this.generateDestroyStakes(stakes, player, target, currentLocation);
        break;
      case 'create':
        this.generateCreateStakes(stakes, player, target, currentLocation);
        break;
      case 'persuade':
        this.generatePersuasionStakes(stakes, player, target as NPC, currentLocation);
        break;
      case 'investigate':
        this.generateInvestigationStakes(stakes, player, currentLocation);
        break;
      case 'flee':
        this.generateFleeStakes(stakes, player, target as NPC, currentLocation);
        break;
      case 'speak':
        this.generateSpeechStakes(stakes, player, target as NPC, currentLocation);
        break;
      case 'examine':
        this.generateExamineStakes(stakes, player, currentLocation);
        break;
      case 'go':
        this.generateTravelStakes(stakes, player, currentLocation);
        break;
      case 'help':
        this.generateHelpStakes(stakes, player, target as NPC, currentLocation);
        break;
      case 'bargain':
        this.generateBargainStakes(stakes, player, target as NPC, currentLocation);
        break;
      case 'use':
        this.generateUseStakes(stakes, player, target, currentLocation);
        break;
      case 'ritual':
        this.generateRitualStakes(stakes, player, currentLocation);
        break;
      case 'defend':
        this.generateDefendStakes(stakes, player, target as NPC, currentLocation);
        break;
      default:
        this.generateGenericStakes(stakes, player, actionType, currentLocation);
    }

    // Calculate risk level
    stakes.riskLevel = this.calculateRiskLevel(stakes, player, conditions);

    return stakes;
  }

  // =============================================================================
  // STAKES GENERATORS (by action type)
  // =============================================================================

  private generateCombatStakes(stakes: Stakes, player: Player, target: NPC | undefined, location: Location): void {
    const targetName = target?.name ?? 'the enemy';
    stakes.criticalFailure = `You suffer a devastating counter-attack from ${targetName}. Major injury, weapon dropped.`;
    stakes.failure = `${targetName} evades and retaliates. You take damage and lose ground.`;
    stakes.partialFailure = `You trade blows with ${targetName}. Both take minor damage.`;
    stakes.successWithCost = `You wound ${targetName} but suffer a counter-strike in the process.`;
    stakes.cleanSuccess = `You strike ${targetName} decisively. They are wounded and falter.`;
    stakes.strongSuccess = `A devastating blow! ${targetName} is critically wounded or slain.`;
    stakes.hasLethalOutcome = true;
    stakes.lethalOutcomes = [RESULT_BANDS.CRITICAL_FAILURE];
  }

  private generateDestroyStakes(stakes: Stakes, player: Player, target: unknown, location: Location): void {
    const targetName = (target as NPC)?.name ?? 'the target';
    stakes.criticalFailure = `Your attempt backfires catastrophically. You are caught in the destruction.`;
    stakes.failure = `You fail to destroy ${targetName}. Your effort is wasted and you are exposed.`;
    stakes.partialFailure = `Partial success. ${targetName} is damaged but functional. Collateral damage to surroundings.`;
    stakes.successWithCost = `${targetName} is destroyed, but the process exhausts you or damages something nearby.`;
    stakes.cleanSuccess = `${targetName} is destroyed cleanly. Nothing else is harmed.`;
    stakes.strongSuccess = `${targetName} is annihilated. The destruction reveals something hidden within.`;
    stakes.hasLethalOutcome = location.safetyLevel < 3;
    if (stakes.hasLethalOutcome) stakes.lethalOutcomes = [RESULT_BANDS.CRITICAL_FAILURE];
  }

  private generateCreateStakes(stakes: Stakes, player: Player, target: unknown, location: Location): void {
    stakes.criticalFailure = `Your creation is flawed and dangerous. It may harm you or others.`;
    stakes.failure = `The attempt fails. Materials are wasted and you learn nothing.`;
    stakes.partialFailure = `A partial success. The creation works but has notable flaws or limitations.`;
    stakes.successWithCost = `You succeed, but the effort exhausts you or uses more resources than expected.`;
    stakes.cleanSuccess = `Your creation is solid and functional. Exactly what you intended.`;
    stakes.strongSuccess = `An exceptional creation! It exceeds your expectations in quality or function.`;
    stakes.hasLethalOutcome = false;
  }

  private generatePersuasionStakes(stakes: Stakes, player: Player, target: NPC | undefined, location: Location): void {
    const targetName = target?.name ?? 'them';
    stakes.criticalFailure = `${targetName} is deeply offended. They become hostile or spread word against you.`;
    stakes.failure = `${targetName} is unmoved. They dismiss your words and may remember your attempt.`;
    stakes.partialFailure = `${targetName} is partially convinced but needs more persuasion or proof.`;
    stakes.successWithCost = `${targetName} agrees, but asks a favor or price in return.`;
    stakes.cleanSuccess = `${targetName} is convinced. They agree to your proposal willingly.`;
    stakes.strongSuccess = `${targetName} is fully won over. They become an ally and may offer more help.`;
    stakes.hasLethalOutcome = false;
  }

  private generateInvestigationStakes(stakes: Stakes, player: Player, location: Location): void {
    stakes.criticalFailure = `Your investigation triggers a hidden trap or alerts a dangerous entity.`;
    stakes.failure = `You find nothing of value. The answer remains hidden.`;
    stakes.partialFailure = `You find a clue, but it raises more questions than it answers.`;
    stakes.successWithCost = `You discover important information, but the search takes time or draws attention.`;
    stakes.cleanSuccess = `You find clear and useful information that advances your understanding.`;
    stakes.strongSuccess = `A breakthrough! You uncover hidden truths and possibly secrets meant to stay buried.`;
    stakes.hasLethalOutcome = location.safetyLevel < 2;
    if (stakes.hasLethalOutcome) stakes.lethalOutcomes = [RESULT_BANDS.CRITICAL_FAILURE];
  }

  private generateFleeStakes(stakes: Stakes, player: Player, pursuer: NPC | undefined, location: Location): void {
    const pursuerName = pursuer?.name ?? 'your pursuer';
    stakes.criticalFailure = `${pursuerName} catches you. You are trapped and at their mercy.`;
    stakes.failure = `You fail to escape. ${pursuerName} closes the distance.`;
    stakes.partialFailure = `You gain some distance but ${pursuerName} is still following. The chase continues.`;
    stakes.successWithCost = `You escape, but leave something behind or arrive exhausted and exposed elsewhere.`;
    stakes.cleanSuccess = `You slip away cleanly. ${pursuerName} loses your trail.`;
    stakes.strongSuccess = `You vanish completely. ${pursuerName} has no idea where you went, and you find a safer path.`;
    stakes.hasLethalOutcome = pursuer !== undefined && location.safetyLevel < 2;
    if (stakes.hasLethalOutcome) stakes.lethalOutcomes = [RESULT_BANDS.CRITICAL_FAILURE, RESULT_BANDS.FAILURE];
  }

  private generateSpeechStakes(stakes: Stakes, player: Player, target: NPC | undefined, location: Location): void {
    const targetName = target?.name ?? 'them';
    stakes.criticalFailure = `You say exactly the wrong thing. ${targetName} is deeply offended.`;
    stakes.failure = `${targetName} is unresponsive or confused by your words.`;
    stakes.partialFailure = `${targetName} responds cautiously. More conversation needed.`;
    stakes.successWithCost = `${targetName} engages, but the conversation costs time or reveals something about you.`;
    stakes.cleanSuccess = `A productive conversation. ${targetName} shares useful information or agrees to help.`;
    stakes.strongSuccess = `${targetName} opens up completely. You gain a trusted confidant or valuable ally.`;
    stakes.hasLethalOutcome = false;
  }

  private generateExamineStakes(stakes: Stakes, player: Player, location: Location): void {
    stakes.criticalFailure = `While examining closely, you trigger a trap or attract unwanted attention.`;
    stakes.failure = `You observe nothing unusual. Whatever is here remains hidden.`;
    stakes.partialFailure = `You notice something odd but cannot determine its significance.`;
    stakes.successWithCost = `You find something of interest, but the examination takes significant time.`;
    stakes.cleanSuccess = `Your examination reveals useful details about your surroundings.`;
    stakes.strongSuccess = `You notice hidden details, concealed features, and subtle clues others would miss.`;
    stakes.hasLethalOutcome = location.safetyLevel < 2;
    if (stakes.hasLethalOutcome) stakes.lethalOutcomes = [RESULT_BANDS.CRITICAL_FAILURE];
  }

  private generateTravelStakes(stakes: Stakes, player: Player, location: Location): void {
    stakes.criticalFailure = `You become lost or wander into a deadly area. Danger surrounds you.`;
    stakes.failure = `You lose your way. The destination remains distant.`;
    stakes.partialFailure = `You make progress but the route is difficult and slow.`;
    stakes.successWithCost = `You arrive, but the journey was tiring or dangerous.`;
    stakes.cleanSuccess = `You travel safely and efficiently to your destination.`;
    stakes.strongSuccess = `You find a shortcut or safe path. The journey was easier than expected and you notice something along the way.`;
    stakes.hasLethalOutcome = location.safetyLevel < 3;
    if (stakes.hasLethalOutcome) stakes.lethalOutcomes = [RESULT_BANDS.CRITICAL_FAILURE];
  }

  private generateHelpStakes(stakes: Stakes, player: Player, target: NPC | undefined, location: Location): void {
    const targetName = target?.name ?? 'them';
    stakes.criticalFailure = `Your help makes things worse. ${targetName} is harmed by your intervention.`;
    stakes.failure = `Your assistance is ineffective. ${targetName} gains no benefit.`;
    stakes.partialFailure = `You provide some help, but it is not enough to fully resolve the situation.`;
    stakes.successWithCost = `You help ${targetName}, but the effort costs you in stamina, resources, or safety.`;
    stakes.cleanSuccess = `${targetName} benefits from your aid. The situation improves.`;
    stakes.strongSuccess = `Your help is transformative. ${targetName} is deeply grateful and the problem is fully resolved.`;
    stakes.hasLethalOutcome = false;
  }

  private generateBargainStakes(stakes: Stakes, player: Player, target: NPC | undefined, location: Location): void {
    const targetName = target?.name ?? 'the merchant';
    stakes.criticalFailure = `${targetName} takes offense at your offer. Prices double, or they refuse to deal with you.`;
    stakes.failure = `No deal. ${targetName} rejects your terms outright.`;
    stakes.partialFailure = `${targetName} counters with terms significantly worse than expected.`;
    stakes.successWithCost = `A deal is struck, but you pay more than you wanted or accept unfavorable terms.`;
    stakes.cleanSuccess = `Fair deal. Both parties are satisfied with the exchange.`;
    stakes.strongSuccess = `Excellent terms! You secure a bargain that favors you significantly.`;
    stakes.hasLethalOutcome = false;
  }

  private generateUseStakes(stakes: Stakes, player: Player, target: unknown, location: Location): void {
    const targetName = (target as Item)?.name ?? 'the item';
    stakes.criticalFailure = `The item malfunctions or breaks catastrophically. You are harmed.`;
    stakes.failure = `Nothing happens. The item does not respond as expected.`;
    stakes.partialFailure = `Partial effect. The item works but not as intended or with reduced efficacy.`;
    stakes.successWithCost = `The item works, but consumes a charge or degrades in the process.`;
    stakes.cleanSuccess = `The item functions as intended. Desired effect achieved.`;
    stakes.strongSuccess = `Exceptional result! The item works better than expected or reveals a hidden function.`;
    stakes.hasLethalOutcome = false;
  }

  private generateRitualStakes(stakes: Stakes, player: Player, location: Location): void {
    stakes.criticalFailure = `The ritual backfires violently. You suffer major harm and possibly attract unwelcome attention.`;
    stakes.failure = `The ritual fizzles. Nothing happens, and your preparation is wasted.`;
    stakes.partialFailure = `The ritual partially succeeds but with unpredictable side effects.`;
    stakes.successWithCost = `The ritual works, but drains your vitality or attracts metaphysical attention.`;
    stakes.cleanSuccess = `The ritual succeeds as intended. The desired metaphysical effect occurs.`;
    stakes.strongSuccess = `The ritual exceeds expectations. The effect is amplified and precisely controlled.`;
    stakes.hasLethalOutcome = true;
    stakes.lethalOutcomes = [RESULT_BANDS.CRITICAL_FAILURE];
  }

  private generateDefendStakes(stakes: Stakes, player: Player, attacker: NPC | undefined, location: Location): void {
    const attackerName = attacker?.name ?? 'the attacker';
    stakes.criticalFailure = `Your defense fails completely. You take devastating damage.`;
    stakes.failure = `You fail to fully block the attack. You take significant damage.`;
    stakes.partialFailure = `You partially block the attack but still take some damage and are pushed back.`;
    stakes.successWithCost = `You defend successfully but are pushed back or your guard is temporarily weakened.`;
    stakes.cleanSuccess = `You block or evade the attack cleanly. No harm comes to you.`;
    stakes.strongSuccess = `You not only defend but create an opening. The attacker is left vulnerable.`;
    stakes.hasLethalOutcome = true;
    stakes.lethalOutcomes = [RESULT_BANDS.CRITICAL_FAILURE];
  }

  private generateGenericStakes(stakes: Stakes, player: Player, action: ActionType, location: Location): void {
    stakes.criticalFailure = `Catastrophic failure. The worst possible outcome occurs.`;
    stakes.failure = `You fail. Nothing is accomplished and the situation may worsen slightly.`;
    stakes.partialFailure = `Partial success. You achieve part of your goal but not all of it.`;
    stakes.successWithCost = `You succeed but pay a price - fatigue, resources, or complications.`;
    stakes.cleanSuccess = `Clean success. You achieve your goal without complications.`;
    stakes.strongSuccess = `Exceptional success! You achieve more than you aimed for.`;
    stakes.hasLethalOutcome = location.safetyLevel < 2;
    if (stakes.hasLethalOutcome) stakes.lethalOutcomes = [RESULT_BANDS.CRITICAL_FAILURE];
  }

  // =============================================================================
  // RISK ASSESSMENT
  // =============================================================================

  /** Calculate overall risk level (1-10) for an action */
  calculateRiskLevel(stakes: Stakes, player: Player, conditions: Condition[]): number {
    let risk = 1;

    // Lethal outcomes add significant risk
    if (stakes.hasLethalOutcome) risk += 4;
    risk += stakes.lethalOutcomes.length;

    // Player health affects risk (lower HP = higher risk)
    const hpPercent = player.hp / player.maxHp;
    if (hpPercent < 0.25) risk += 3;
    else if (hpPercent < 0.5) risk += 2;
    else if (hpPercent < 0.75) risk += 1;

    // Conditions increase risk
    const dangerousConditions = ['wounded', 'critical', 'dying', 'poisoned', 'cursed', 'exhausted'];
    for (const cond of conditions) {
      if (dangerousConditions.includes(cond.type)) risk += 1;
    }

    return Math.min(10, risk);
  }

  /** Check if an action should use hidden rolls */
  shouldHideRoll(context: {
    actionType: ActionType;
    playerConditions: Condition[];
    locationSafety: number;
    hasLethalStakes: boolean;
  }): boolean {
    const { actionType, playerConditions, locationSafety, hasLethalStakes } = context;

    // Hide rolls for perception/investigation (player shouldn't know if they failed to notice)
    if (actionType === 'investigate' || actionType === 'perceive' || actionType === 'examine') {
      return true;
    }

    // Hide rolls when player is cursed or haunted
    if (playerConditions.some((c) => c.type === 'cursed' || c.type === 'haunted')) {
      return true;
    }

    // Hide rolls in very dangerous locations
    if (locationSafety < 2) return true;

    // Hide rolls for lethal stakes (tension preservation)
    if (hasLethalStakes) return true;

    return false;
  }

  // =============================================================================
  // LETHAL STAKES DETECTION
  // =============================================================================

  /** Check if current stakes include lethal outcomes */
  hasLethalStakes(stakes: Stakes): boolean {
    return stakes.hasLethalOutcome;
  }

  /** Get which result bands are lethal */
  getLethalBands(stakes: Stakes): ResultBand[] {
    return [...stakes.lethalOutcomes];
  }

  // =============================================================================
  // COST CALCULATION
  // =============================================================================

  /** Calculate cost for a success-with-cost result */
  calculateActionCost(params: {
    actionScale: number;
    powerGap: number;
    conditions: Condition[];
    playerAuthority: number;
    playerCreation: number;
  }): CostCalculation {
    const { actionScale, powerGap, conditions, playerAuthority, playerCreation } = params;

    const instability = conditions.filter(
      (c) => c.type === 'cursed' || c.type === 'haunted' || c.type === 'obsessed'
    ).length;

    const corruption = conditions.reduce((sum, c) => {
      if (c.type === 'cursed') return sum + c.severity;
      if (c.type === 'haunted') return sum + Math.floor(c.severity / 2);
      return sum;
    }, 0);

    return this.dice.calculateCost({
      actionScale,
      powerGap,
      instability,
      corruption,
      control: Math.max(0, playerAuthority + playerCreation),
    });
  }

  // =============================================================================
  // SCALE DETERMINATION
  // =============================================================================

  /** Determine the scale of an action (0-20) */
  determineScale(context: {
    actionType: ActionType;
    target?: NPC | Location | Faction;
    description: string;
  }): number {
    const { actionType, target, description } = context;
    let scale = 5; // Default

    // Adjust by action type
    const scaleMap: Partial<Record<ActionType, number>> = {
      attack: 7,
      destroy: 8,
      create: 6,
      persuade: 5,
      investigate: 4,
      flee: 6,
      speak: 2,
      examine: 3,
      go: 4,
      help: 4,
      bargain: 5,
      use: 4,
      ritual: 9,
      defend: 6,
    };
    scale = scaleMap[actionType] ?? 5;

    // Adjust by target significance
    if (target && 'power' in target && typeof target.power === 'number') {
      scale += Math.floor(target.power / 3);
    }

    // Description keywords
    const desc = description.toLowerCase();
    if (desc.includes('desperate') || desc.includes('last chance')) scale += 3;
    if (desc.includes('carefully') || desc.includes('cautious')) scale -= 1;
    if (desc.includes('reckless') || desc.includes('all out')) scale += 2;

    return Math.max(1, Math.min(20, scale));
  }

  // =============================================================================
  // RESULT BAND CALCULATION
  // =============================================================================

  /**
   * Calculate the final result band after applying all modifiers.
   * Returns the band and a narrative description.
   */
  calculateResult(context: {
    rollResult: RollResult;
    stakes: Stakes;
    player: Player;
  }): { band: ResultBand; narrative: string; requiresConsequence: boolean } {
    const { rollResult, stakes, player } = context;
    const band = rollResult.band;

    let narrative = '';
    switch (band) {
      case RESULT_BANDS.CRITICAL_FAILURE:
        narrative = stakes.criticalFailure;
        break;
      case RESULT_BANDS.FAILURE:
        narrative = stakes.failure;
        break;
      case RESULT_BANDS.PARTIAL_FAILURE:
        narrative = stakes.partialFailure;
        break;
      case RESULT_BANDS.SUCCESS_WITH_COST:
        narrative = stakes.successWithCost;
        break;
      case RESULT_BANDS.CLEAN_SUCCESS:
        narrative = stakes.cleanSuccess;
        break;
      case RESULT_BANDS.STRONG_SUCCESS:
      case RESULT_BANDS.CRITICAL_SUCCESS:
        narrative = stakes.strongSuccess;
        break;
    }

    const requiresConsequence =
      band === RESULT_BANDS.CRITICAL_FAILURE ||
      band === RESULT_BANDS.FAILURE ||
      band === RESULT_BANDS.SUCCESS_WITH_COST;

    return { band, narrative, requiresConsequence };
  }

  // =============================================================================
  // CONSEQUENCE GENERATION
  // =============================================================================

  /**
   * Generate consequences from a roll result.
   * These are queued in the state engine for future resolution.
   */
  generateConsequences(context: {
    rollResult: RollResult;
    stakes: Stakes;
    player: Player;
    actionType: ActionType;
    target?: NPC | Location;
  }): Consequence[] {
    const { rollResult, stakes, player, actionType, target } = context;
    const consequences: Consequence[] = [];

    // Critical failure always generates consequences
    if (rollResult.band === RESULT_BANDS.CRITICAL_FAILURE) {
      consequences.push(this.createConsequenceFromBand(rollResult.band, player, actionType, target));
    }

    // Failure generates minor consequences
    if (rollResult.band === RESULT_BANDS.FAILURE) {
      consequences.push(this.createConsequenceFromBand(rollResult.band, player, actionType, target));
    }

    // Success with cost generates cost-based consequences
    if (rollResult.band === RESULT_BANDS.SUCCESS_WITH_COST && rollResult.cost) {
      consequences.push(this.createCostConsequence(rollResult.cost, player, actionType));
    }

    // Lethal outcomes generate death-check consequences
    if (stakes.lethalOutcomes.includes(rollResult.band)) {
      consequences.push(this.createDeathCheckConsequence(player, stakes));
    }

    return consequences;
  }

  private createConsequenceFromBand(
    band: ResultBand,
    player: Player,
    actionType: ActionType,
    target?: NPC | Location
  ): Consequence {
    const descriptions: Record<ResultBand, string> = {
      [RESULT_BANDS.CRITICAL_FAILURE]: `The ${actionType} goes catastrophically wrong. Repercussions will follow.`,
      [RESULT_BANDS.FAILURE]: `The ${actionType} fails. The situation has shifted subtly against you.`,
      [RESULT_BANDS.PARTIAL_FAILURE]: `Partial results of your ${actionType} create unforeseen complications.`,
      [RESULT_BANDS.SUCCESS_WITH_COST]: `The cost of your ${actionType} manifests over time.`,
      [RESULT_BANDS.CLEAN_SUCCESS]: ``, // No consequence
      [RESULT_BANDS.STRONG_SUCCESS]: ``, // No consequence
      [RESULT_BANDS.CRITICAL_SUCCESS]: ``, // No consequence
    };

    return {
      id: this.generateConsequenceId(),
      description: descriptions[band] || 'Unresolved consequence.',
      trigger: { type: 'time', condition: 'delayed_effect', turnsRemaining: this.dice.roll(3) },
      effect: { description: descriptions[band] || 'Something shifts in the world.' },
      severity: band === RESULT_BANDS.CRITICAL_FAILURE ? 'catastrophic' : band === RESULT_BANDS.FAILURE ? 'major' : 'moderate',
      processed: false,
      queuedAt: Date.now(),
      source: `action_${actionType}`,
    };
  }

  private createCostConsequence(cost: CostCalculation, player: Player, actionType: ActionType): Consequence {
    return {
      id: this.generateConsequenceId(),
      description: cost.description,
      trigger: { type: 'time', condition: 'cost_manifestation', turnsRemaining: 1 },
      effect: {
        description: cost.description,
        statChanges: this.costToStatChanges(cost),
      },
      severity: this.costSeverityToEventSeverity(cost.severity),
      processed: false,
      queuedAt: Date.now(),
      source: `action_${actionType}`,
    };
  }

  private createDeathCheckConsequence(player: Player, stakes: Stakes): Consequence {
    return {
      id: `conseq_${Date.now()}_deathcheck`,
      description: 'A lethal outcome requires a death check.',
      trigger: { type: 'condition', condition: 'death_check_required' },
      effect: { description: 'Death check: d20 + will vs death DC.' },
      severity: 'catastrophic',
      processed: false,
      queuedAt: Date.now(),
      source: 'lethal_stakes',
    };
  }

  private costToStatChanges(cost: CostCalculation): PartialStatBlock {
    const changes: PartialStatBlock = {};

    for (const costType of cost.costTypes) {
      if (costType.resource === 'hp' && costType.amount > 0) {
        // HP reduction is handled separately
      }
      if (costType.resource === 'stamina') {
        changes.will = -(costType.amount > 5 ? 1 : 0);
      }
    }

    return changes;
  }

  private costSeverityToEventSeverity(severity: string): any {
    const mapping: Record<string, any> = {
      none: 'trivial',
      trivial: 'minor',
      minor: 'minor',
      moderate: 'moderate',
      major: 'major',
      severe: 'catastrophic',
      catastrophic: 'catastrophic',
    };
    return mapping[severity] ?? 'moderate';
  }

  private generateConsequenceId(): string {
    return `conseq_${Date.now()}_${this.dice.roll(1000000)}`;
  }

  // =============================================================================
  // DEATH CHECK
  // =============================================================================

  /**
   * Perform a death check when lethal outcomes occur.
   * Returns whether the character survives.
   */
  performDeathCheck(player: Player): { survives: boolean; roll: RollResult; narrative: string } {
    const willStat = player.stats.will;
    const deathDC = 12 + Math.floor((1 - player.hp / player.maxHp) * 10);

    const roll = this.dice.rollD20({
      statValue: willStat,
      statName: 'will',
      modifiers: player.conditions.some((c) => c.type === 'cursed') ? -2 : 0,
      dc: deathDC,
      actionType: 'defend',
      description: 'Death check - clinging to life',
      visible: false,
    });

    const survives =
      roll.band !== RESULT_BANDS.CRITICAL_FAILURE &&
      roll.band !== RESULT_BANDS.FAILURE;

    let narrative = '';
    if (survives) {
      if (roll.band === RESULT_BANDS.SUCCESS_WITH_COST) {
        narrative = 'You cling to life, barely. A permanent scar, physical or otherwise, marks this near-death.';
      } else {
        narrative = 'You refuse to die. Your will is stronger than the wound that sought to end you.';
      }
    } else {
      narrative = 'Your strength fails. The dark rises to claim you.';
    }

    return { survives, roll, narrative };
  }

  // =============================================================================
  // OPPOSITION STAT CALCULATION
  // =============================================================================

  /** Calculate the effective opposition stat for opposed rolls */
  calculateOpposition(opponent: NPC, actionType: ActionType): { stat: CoreStat; value: number } {
    const statMap: Partial<Record<ActionType, CoreStat>> = {
      attack: 'grace',
      persuade: 'presence',
      investigate: 'sense',
      flee: 'grace',
      defend: 'body',
      bargain: 'mind',
    };

    const stat = statMap[actionType] ?? 'grace';
    return { stat, value: opponent.stats[stat] };
  }

  // =============================================================================
  // COMBAT HELPERS
  // =============================================================================

  /** Calculate damage for a successful attack */
  calculateDamage(
    rollResult: RollResult,
    attackerStats: StatBlock,
    defenderStats: StatBlock
  ): { damage: number; critical: boolean; narrative: string } {
    const baseDamage = Math.max(1, attackerStats.body + attackerStats.ruin);
    let multiplier = 1;
    let critical = false;

    switch (rollResult.band) {
      case RESULT_BANDS.CRITICAL_FAILURE:
        return { damage: 0, critical: false, narrative: 'The attack fails completely.' };
      case RESULT_BANDS.FAILURE:
        return { damage: 0, critical: false, narrative: 'The attack misses.' };
      case RESULT_BANDS.PARTIAL_FAILURE:
        multiplier = 0.5;
        break;
      case RESULT_BANDS.SUCCESS_WITH_COST:
        multiplier = 1;
        break;
      case RESULT_BANDS.CLEAN_SUCCESS:
        multiplier = 1;
        break;
      case RESULT_BANDS.STRONG_SUCCESS:
        multiplier = 1.5;
        break;
      case RESULT_BANDS.CRITICAL_SUCCESS:
        multiplier = 2;
        critical = true;
        break;
    }

    const damage = Math.floor(baseDamage * multiplier);
    const narrative = critical
      ? `A devastating blow! ${damage} damage inflicted.`
      : `The attack lands for ${damage} damage.`;

    return { damage, critical, narrative };
  }

  /** Calculate HP thresholds for conditions */
  static getConditionThresholds(maxHp: number): {
    healthy: number;
    injured: number;
    wounded: number;
    critical: number;
    dying: number;
  } {
    return {
      healthy: maxHp * 0.75,
      injured: maxHp * 0.5,
      wounded: maxHp * 0.25,
      critical: maxHp * 0.1,
      dying: 0,
    };
  }

  /** Determine condition from HP level */
  static hpToCondition(currentHp: number, maxHp: number): string {
    const thresholds = RulesEngine.getConditionThresholds(maxHp);
    if (currentHp <= 0) return 'dying';
    if (currentHp <= thresholds.critical) return 'critical';
    if (currentHp <= thresholds.wounded) return 'wounded';
    if (currentHp <= thresholds.injured) return 'injured';
    return 'healthy';
  }
}

// =============================================================================
// STATICS
// =============================================================================

/** Default DCs for common action types */
export const DEFAULT_DCS: Partial<Record<ActionType, number>> = {
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
  evade: 10,
  rest: 4,
  wait: 4,
};

/** Death vector descriptions */
export const DEATH_VECTOR_DESCRIPTIONS: Record<string, string> = {
  violence: 'Death by blade, claw, or brute force.',
  disease: 'The body fails, consumed from within.',
  starvation: 'Slow fading as sustenance runs out.',
  madness: 'The mind breaks, and the body follows.',
  betrayal: 'Trust is the weapon that kills you.',
  ritual: 'Metaphysical forces tear you apart.',
  time: 'Age or decay claims what remains.',
  authority_collapse: 'The weight of command crushes you.',
};
