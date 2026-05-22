/**
 * ============================================================================
 * DICE ENGINE - The First Perception RPG
 * ============================================================================
 * Complete dice resolution system supporting D20 and D100 rolls,
 * DC calculation, 7 result bands, cost severity, and deterministic mode.
 *
 * @module engine/DiceEngine
 * @version 1.0.0
 * ============================================================================
 */

import {
  RollResult,
  DCCalculation,
  CostCalculation,
  CostSeverityLevel,
  ResultBand,
  CoreStat,
  ActionType,
  Condition,
  RuntimePartialStatBlock,
  RuntimeStatBlock,
  DiceFormula,
  DCComponent,
  CostType,
  EntityId,
  COST_SEVERITY,
  RESULT_BANDS,
} from '../engine-types';

// =============================================================================
// SEEDED RNG (Deterministic Mode)
// =============================================================================

/**
 * Simple seeded pseudo-random number generator using Mulberry32 algorithm.
 * Provides deterministic randomness when a seed is set.
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed >>> 0;
  }

  /** Set a new seed, resetting the RNG state */
  setSeed(seed: number): void {
    this.state = seed >>> 0;
  }

  /** Get the current seed state */
  getState(): number {
    return this.state;
  }

  /** Generate next random float in [0, 1) */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const result = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return result;
  }

  /** Roll a die with given faces */
  rollDie(faces: number): number {
    return Math.floor(this.next() * faces) + 1;
  }

  /** Roll multiple dice with given faces */
  rollDice(count: number, faces: number): number[] {
    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      results.push(this.rollDie(faces));
    }
    return results;
  }

  /** Clone this RNG (same state = same sequence) */
  clone(): SeededRNG {
    const cloned = new SeededRNG(this.state);
    return cloned;
  }
}

// =============================================================================
// DICE PARSER
// =============================================================================

/**
 * Parse a dice formula string like "2d6+3" or "1d20-1" into a DiceFormula.
 */
export function parseDiceFormula(formula: string): DiceFormula {
  const normalized = formula.toLowerCase().replace(/\s/g, '');
  const match = normalized.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) {
    throw new Error(`Invalid dice formula: "${formula}". Expected format like "2d6+3" or "1d20"`);
  }
  const count = parseInt(match[1], 10);
  const faces = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  if (count < 1 || count > 100) {
    throw new Error(`Dice count must be 1-100, got ${count}`);
  }
  if (faces < 2 || faces > 1000) {
    throw new Error(`Die faces must be 2-1000, got ${faces}`);
  }

  return { count, faces, modifier };
}

/** Roll from a parsed dice formula */
export function rollFormula(formula: DiceFormula, rng: SeededRNG): { total: number; rolls: number[] } {
  const rolls = rng.rollDice(formula.count, formula.faces);
  const total = rolls.reduce((sum, r) => sum + r, 0) + formula.modifier;
  return { total, rolls };
}

// =============================================================================
// DICE ENGINE
// =============================================================================

/**
 * The DiceEngine handles all randomization in the game.
 * Supports both deterministic (seeded) and non-deterministic modes.
 */
export class DiceEngine {
  private rng: SeededRNG;
  private deterministic: boolean;
  private rollHistory: RollResult[] = [];
  private historyMaxSize: number = 1000;

  /**
   * Create a new DiceEngine.
   * @param seed - RNG seed for deterministic mode
   * @param deterministic - Whether to use seeded RNG
   */
  constructor(seed?: number, deterministic: boolean = false) {
    this.deterministic = deterministic;
    this.rng = new SeededRNG(seed ?? Date.now());
  }

  /** Get the underlying RNG (for advanced use) */
  getRNG(): SeededRNG {
    return this.rng;
  }

  /** Set the RNG seed (resets state) */
  setSeed(seed: number): void {
    this.rng.setSeed(seed);
  }

  /** Enable/disable deterministic mode */
  setDeterministic(deterministic: boolean, seed?: number): void {
    this.deterministic = deterministic;
    if (deterministic && seed !== undefined) {
      this.rng.setSeed(seed);
    }
  }

  /** Check if running in deterministic mode */
  isDeterministic(): boolean {
    return this.deterministic;
  }

  /** Generate a unique roll ID */
  private generateRollId(): EntityId {
    return `roll_${Date.now()}_${Math.floor(this.rng.next() * 1000000)}`;
  }

  /**
   * ==========================================================================
   * D20 ROLL
   * ==========================================================================
   * Formula: d20 + stat + authority/ruin/creation + modifiers - conditions
   *
   * The D20 is the primary resolution die. The result is compared against
   * a DC to determine which of the 7 result bands applies.
   */
  rollD20(params: {
    /** The actor's relevant stat value (0-10 typically) */
    statValue: number;
    /** Which stat is being used */
    statName: CoreStat;
    /** Authority value (for social/leadership rolls) */
    authority?: number;
    /** Ruin value (for destructive rolls) */
    ruin?: number;
    /** Creation value (for creative/restorative rolls) */
    creation?: number;
    /** Additional flat modifiers */
    modifiers?: number;
    /** Conditions affecting the actor (negative modifiers) */
    conditions?: Condition[];
    /** The target DC */
    dc: number;
    /** Action type for context */
    actionType: ActionType;
    /** Description of what is being attempted */
    description: string;
    /** Whether the player sees this roll */
    visible?: boolean;
  }): RollResult {
    const {
      statValue,
      statName,
      authority = 0,
      ruin = 0,
      creation = 0,
      modifiers = 0,
      conditions = [],
      dc,
      actionType,
      description,
      visible = true,
    } = params;

    // Roll d20
    const rawRoll = this.rng.rollDie(20);
    const dice = [rawRoll];

    // Calculate condition penalty
    const conditionPenalty = this.calculateConditionPenalty(conditions, statName);

    // Determine which special stat applies
    const specialStat = this.selectSpecialStat(actionType, { authority, ruin, creation });

    // Calculate total modifier
    const totalModifier = statValue + specialStat + modifiers - conditionPenalty;

    // Final result
    const finalResult = rawRoll + totalModifier;

    // Determine result band
    const band = this.determineResultBand(finalResult, dc);

    // Calculate cost if success_with_cost
    let cost: CostCalculation | undefined;
    if (band === RESULT_BANDS.SUCCESS_WITH_COST) {
      cost = this.calculateCost({
        actionScale: this.estimateActionScale(dc),
        powerGap: Math.max(0, dc - finalResult),
        instability: this.countUnstableConditions(conditions),
        corruption: this.calculateCorruption(conditions),
        control: Math.max(0, authority + creation),
      });
    }

    const result: RollResult = {
      id: this.generateRollId(),
      timestamp: Date.now(),
      rawRoll,
      dice,
      totalModifier,
      finalResult,
      dc,
      band,
      visible,
      actionType,
      statUsed: statName,
      description,
      cost,
    };

    this.addToHistory(result);
    return result;
  }

  /**
   * ==========================================================================
   * D100 ROLL
   * ==========================================================================
   * Roll d100 against domain thresholds.
   * Lower is better. Compare result against thresholds.
   */
  rollD100(params: {
    /** The actor's skill/domain value (0-100) */
    skillValue: number;
    /** Domain being rolled */
    domain: string;
    /** Modifiers to the skill value */
    modifiers?: number;
    /** Conditions affecting the roll */
    conditions?: Condition[];
    /** Action type for context */
    actionType: ActionType;
    /** Description */
    description: string;
    /** Whether the player sees this roll */
    visible?: boolean;
  }): RollResult {
    const {
      skillValue,
      modifiers = 0,
      conditions = [],
      actionType,
      description,
      visible = true,
    } = params;

    // Roll d100
    const rawRoll = this.rng.rollDie(100);
    const dice = [rawRoll];

    // Condition penalty
    const conditionPenalty = conditions.reduce(
      (sum, c) => sum + (c.severity > 5 ? 10 : c.severity > 2 ? 5 : 0),
      0
    );

    // Effective skill
    const effectiveSkill = Math.max(0, skillValue + modifiers - conditionPenalty);

    // For D100, the "DC" concept is inverted - we check if roll <= skill
    // But for consistency with the result band system, we map it:
    // The "final result" represents how much margin we have
    const margin = effectiveSkill - rawRoll;

    // Determine band based on the raw roll relative to skill
    const band = this.determineD100Band(rawRoll, effectiveSkill);

    // DC is the skill value for reference
    const dc = effectiveSkill;

    // Total modifier for display
    const totalModifier = modifiers - conditionPenalty;

    // Calculate cost for success_with_cost
    let cost: CostCalculation | undefined;
    if (band === RESULT_BANDS.SUCCESS_WITH_COST) {
      cost = this.calculateCost({
        actionScale: Math.floor(effectiveSkill / 10),
        powerGap: Math.max(0, -margin),
        instability: this.countUnstableConditions(conditions),
        corruption: this.calculateCorruption(conditions),
        control: 0,
      });
    }

    const result: RollResult = {
      id: this.generateRollId(),
      timestamp: Date.now(),
      rawRoll,
      dice,
      totalModifier,
      finalResult: margin, // margin of success/failure
      dc,
      band,
      visible,
      actionType,
      statUsed: 'sense', // default for d100
      description,
      cost,
    };

    this.addToHistory(result);
    return result;
  }

  /**
   * ==========================================================================
   * DC CALCULATION
   * ==========================================================================
   * Formula: target_scale + complexity + resistance + instability
   */
  calculateDC(params: {
    /** Base difficulty from the action's inherent scale (0-20) */
    targetScale: number;
    /** Complexity modifier (0-10) */
    complexity?: number;
    /** Resistance from opposition (0-10) */
    resistance?: number;
    /** Environmental/situational instability (0-10) */
    instability?: number;
    /** Custom components for the breakdown */
    customComponents?: DCComponent[];
  }): DCCalculation {
    const {
      targetScale,
      complexity = 0,
      resistance = 0,
      instability = 0,
      customComponents = [],
    } = params;

    const breakdown: DCComponent[] = [
      { name: 'Target Scale', value: targetScale, description: 'Base difficulty of the action' },
      { name: 'Complexity', value: complexity, description: 'How complex the action is' },
      { name: 'Resistance', value: resistance, description: 'Opposition to the action' },
      { name: 'Instability', value: instability, description: 'Environmental uncertainty' },
      ...customComponents,
    ];

    const finalDC = breakdown.reduce((sum, comp) => sum + comp.value, 0);

    return {
      targetScale,
      complexity,
      resistance,
      instability,
      finalDC: Math.max(0, finalDC),
      breakdown,
    };
  }

  /**
   * ==========================================================================
   * COST SEVERITY CALCULATION
   * ==========================================================================
   * Formula: action_scale + power_gap + instability + corruption - control
   */
  calculateCost(params: {
    /** Scale of the action (0-20) */
    actionScale: number;
    /** Difference between DC and roll (how close to failure) */
    powerGap: number;
    /** Instability from conditions/environment */
    instability: number;
    /** Corruption from cursed/haunted conditions */
    corruption: number;
    /** Control from authority/creation (reduces cost) */
    control: number;
  }): CostCalculation {
    const { actionScale, powerGap, instability, corruption, control } = params;

    const rawValue = actionScale + powerGap + instability + corruption - control;
    const value = Math.max(0, rawValue);

    const severity = this.valueToCostSeverity(value);

    return {
      severity,
      value,
      description: this.describeCost(severity, value),
      costTypes: this.generateCostTypes(severity, value),
    };
  }

  /**
   * ==========================================================================
   * RESULT BAND DETERMINATION (D20)
   * ==========================================================================
   * Compare final result against DC to determine the 7 outcome bands.
   */
  determineResultBand(finalResult: number, dc: number): ResultBand {
    const margin = finalResult - dc;

    if (margin <= -10) return RESULT_BANDS.CRITICAL_FAILURE;
    if (margin <= -5) return RESULT_BANDS.FAILURE;
    if (margin < 0) return RESULT_BANDS.PARTIAL_FAILURE;
    if (margin === 0) return RESULT_BANDS.SUCCESS_WITH_COST;
    if (margin <= 4) return RESULT_BANDS.CLEAN_SUCCESS;
    if (margin <= 9) return RESULT_BANDS.STRONG_SUCCESS;
    return RESULT_BANDS.CRITICAL_SUCCESS;
  }

  /**
   * Result band for D100 rolls (lower is better).
   */
  determineD100Band(rawRoll: number, skillValue: number): ResultBand {
    if (rawRoll >= 96) return RESULT_BANDS.CRITICAL_FAILURE;
    if (rawRoll > skillValue + 20) return RESULT_BANDS.FAILURE;
    if (rawRoll > skillValue) return RESULT_BANDS.PARTIAL_FAILURE;
    if (rawRoll === skillValue) return RESULT_BANDS.SUCCESS_WITH_COST;
    if (rawRoll > skillValue - 10) return RESULT_BANDS.CLEAN_SUCCESS;
    if (rawRoll > skillValue - 25) return RESULT_BANDS.STRONG_SUCCESS;
    return RESULT_BANDS.CRITICAL_SUCCESS;
  }

  // =============================================================================
  // ROLL HISTORY
  // =============================================================================

  /** Add a roll result to history, maintaining max size */
  private addToHistory(result: RollResult): void {
    this.rollHistory.push(result);
    if (this.rollHistory.length > this.historyMaxSize) {
      this.rollHistory = this.rollHistory.slice(-this.historyMaxSize);
    }
  }

  /** Get full roll history */
  getRollHistory(): RollResult[] {
    return [...this.rollHistory];
  }

  /** Get visible roll history (player-facing rolls only) */
  getVisibleRollHistory(): RollResult[] {
    return this.rollHistory.filter((r) => r.visible);
  }

  /** Get recent rolls (last N) */
  getRecentRolls(count: number): RollResult[] {
    return this.rollHistory.slice(-count);
  }

  /** Get rolls for a specific action type */
  getRollsByAction(actionType: ActionType): RollResult[] {
    return this.rollHistory.filter((r) => r.actionType === actionType);
  }

  /** Clear roll history */
  clearHistory(): void {
    this.rollHistory = [];
  }

  /** Get history size limit */
  getHistoryMaxSize(): number {
    return this.historyMaxSize;
  }

  /** Set history size limit */
  setHistoryMaxSize(size: number): void {
    this.historyMaxSize = Math.max(10, size);
    if (this.rollHistory.length > this.historyMaxSize) {
      this.rollHistory = this.rollHistory.slice(-this.historyMaxSize);
    }
  }

  // =============================================================================
  // UTILITY ROLLS
  // =============================================================================

  /** Roll a die with arbitrary faces */
  roll(faces: number): number {
    return this.rng.rollDie(faces);
  }

  /** Roll multiple dice */
  rollMultiple(count: number, faces: number): number[] {
    return this.rng.rollDice(count, faces);
  }

  /** Roll for chance (returns true if roll <= threshold) */
  chance(threshold: number, max: number = 100): boolean {
    return this.rng.rollDie(max) <= threshold;
  }

  /** Pick a random element from an array */
  pickRandom<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;
    return arr[Math.floor(this.rng.next() * arr.length)];
  }

  /** Shuffle an array in-place using Fisher-Yates */
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /** Roll on a table with weighted entries */
  rollWeightedTable<T>(entries: { item: T; weight: number }[]): T | undefined {
    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
    if (totalWeight <= 0) return undefined;

    let roll = this.rng.next() * totalWeight;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll <= 0) return entry.item;
    }
    return entries[entries.length - 1]?.item;
  }

  // =============================================================================
  // PRIVATE HELPERS
  // =============================================================================

  /** Calculate penalty from conditions for a given stat */
  private calculateConditionPenalty(conditions: Condition[], statUsed: CoreStat): number {
    return conditions.reduce((penalty, condition) => {
      const mod = condition.statModifiers[statUsed];
      if (mod && mod < 0) {
        return penalty + Math.abs(mod);
      }
      // Generic debilitating conditions
      if (
        condition.type === 'exhausted' ||
        condition.type === 'injured' ||
        condition.type === 'wounded'
      ) {
        return penalty + Math.ceil(condition.severity / 2);
      }
      return penalty;
    }, 0);
  }

  /** Select which special stat (authority/ruin/creation) applies */
  private selectSpecialStat(
    actionType: ActionType,
    stats: { authority: number; ruin: number; creation: number }
  ): number {
    switch (actionType) {
      case 'persuade':
      case 'speak':
      case 'help':
        return stats.authority;
      case 'destroy':
      case 'attack':
        return stats.ruin;
      case 'create':
      case 'craft_action':
      case 'ritual':
        return stats.creation;
      default:
        // For mixed actions, use the highest
        return Math.max(stats.authority, stats.ruin, stats.creation);
    }
  }

  /** Estimate action scale from DC for cost calculation */
  private estimateActionScale(dc: number): number {
    return Math.min(20, Math.max(1, Math.floor(dc / 2)));
  }

  /** Count conditions that cause instability */
  private countUnstableConditions(conditions: Condition[]): number {
    return conditions.filter(
      (c) =>
        c.type === 'cursed' ||
        c.type === 'haunted' ||
        c.type === 'obsessed' ||
        c.type === 'frightened'
    ).length;
  }

  /** Calculate corruption score from conditions */
  private calculateCorruption(conditions: Condition[]): number {
    return conditions.reduce((total, c) => {
      if (c.type === 'cursed') return total + c.severity;
      if (c.type === 'haunted') return total + Math.floor(c.severity / 2);
      if (c.type === 'marked') return total + 1;
      return total;
    }, 0);
  }

  /** Convert a cost value to severity level */
  private valueToCostSeverity(value: number): CostSeverityLevel {
    if (value < 2) return COST_SEVERITY.NONE;
    if (value < 5) return COST_SEVERITY.TRIVIAL;
    if (value < 8) return COST_SEVERITY.MINOR;
    if (value < 12) return COST_SEVERITY.MODERATE;
    if (value < 16) return COST_SEVERITY.MAJOR;
    if (value < 20) return COST_SEVERITY.SEVERE;
    return COST_SEVERITY.CATASTROPHIC;
  }

  /** Generate human-readable cost description */
  private describeCost(severity: CostSeverityLevel, value: number): string {
    switch (severity) {
      case COST_SEVERITY.NONE:
        return 'No cost.';
      case COST_SEVERITY.TRIVIAL:
        return `Minor inconvenience (${value}). A fleeting discomfort.`;
      case COST_SEVERITY.MINOR:
        return `Small price (${value}). Fatigue or minor resource loss.`;
      case COST_SEVERITY.MODERATE:
        return `Notable cost (${value}). Significant fatigue, resource drain, or minor injury.`;
      case COST_SEVERITY.MAJOR:
        return `Heavy price (${value}). Serious injury, major resource loss, or lasting consequence.`;
      case COST_SEVERITY.SEVERE:
        return `Grave cost (${value}). Severe injury, substantial resource depletion, permanent mark.`;
      case COST_SEVERITY.CATASTROPHIC:
        return `Devastating cost (${value}). Near-fatal consequences, massive loss, irreversible damage.`;
      default:
        return `Unknown severity (${value}).`;
    }
  }

  /** Generate specific cost types based on severity */
  private generateCostTypes(severity: CostSeverityLevel, value: number): CostType[] {
    const costs: CostType[] = [];

    switch (severity) {
      case COST_SEVERITY.NONE:
        break;
      case COST_SEVERITY.TRIVIAL:
        costs.push({ resource: 'stamina', amount: 1, permanent: false });
        break;
      case COST_SEVERITY.MINOR:
        costs.push(
          { resource: 'stamina', amount: Math.ceil(value / 3), permanent: false },
          { resource: 'stress', amount: 1, permanent: false }
        );
        break;
      case COST_SEVERITY.MODERATE:
        costs.push(
          { resource: 'stamina', amount: Math.ceil(value / 2), permanent: false },
          { resource: 'stress', amount: 2, permanent: false },
          { resource: 'minor_resource', amount: 1, permanent: false }
        );
        break;
      case COST_SEVERITY.MAJOR:
        costs.push(
          { resource: 'hp', amount: Math.ceil(value / 3), permanent: false },
          { resource: 'stamina', amount: value, permanent: false },
          { resource: 'stress', amount: 3, permanent: false },
          { resource: 'significant_resource', amount: 1, permanent: false }
        );
        break;
      case COST_SEVERITY.SEVERE:
        costs.push(
          { resource: 'hp', amount: Math.ceil(value / 2), permanent: false },
          { resource: 'stamina', amount: value * 2, permanent: false },
          { resource: 'permanent_condition', amount: 1, permanent: true },
          { resource: 'major_resource', amount: 2, permanent: false }
        );
        break;
      case COST_SEVERITY.CATASTROPHIC:
        costs.push(
          { resource: 'hp', amount: value, permanent: false },
          { resource: 'permanent_stat_loss', amount: 1, permanent: true },
          { resource: 'permanent_condition', amount: 2, permanent: true },
          { resource: 'irreversible_consequence', amount: 1, permanent: true }
        );
        break;
    }

    return costs;
  }

  // =============================================================================
  // BATCH ROLLING
  // =============================================================================

  /**
   * Roll multiple checks at once (for contested actions with multiple participants).
   */
  rollContested(participants: {
    id: string;
    statValue: number;
    statName: CoreStat;
    modifiers?: number;
    conditions?: Condition[];
  }[], dc: number, actionType: ActionType, description: string): RollResult[] {
    return participants.map((p) =>
      this.rollD20({
        statValue: p.statValue,
        statName: p.statName,
        modifiers: p.modifiers ?? 0,
        conditions: p.conditions ?? [],
        dc,
        actionType,
        description: `${description} [${p.id}]`,
      })
    );
  }

  /**
   * Roll a skill check with automatic stat selection based on domain.
   */
  rollSkillCheck(params: {
    stats: RuntimeStatBlock;
    domain: string;
    dc: number;
    actionType: ActionType;
    description: string;
    conditions?: Condition[];
    visible?: boolean;
  }): RollResult {
    const { stats, domain, dc, actionType, description, conditions, visible } = params;
    const statName = this.mapDomainToStat(domain);
    const statValue = stats[statName];

    return this.rollD20({
      statValue,
      statName,
      authority: stats.authority,
      ruin: stats.ruin,
      creation: stats.creation,
      conditions,
      dc,
      actionType,
      description,
      visible,
    });
  }

  /** Map a domain to its primary stat */
  mapDomainToStat(domain: string): CoreStat {
    const mapping: Record<string, CoreStat> = {
      physical: 'body',
      social: 'presence',
      metaphysical: 'will',
      combat: 'body',
      craft: 'creation',
      stealth: 'grace',
      lore: 'mind',
      wilderness: 'sense',
      intrigue: 'mind',
    };
    return mapping[domain.toLowerCase()] ?? 'sense';
  }

  // =============================================================================
  // STATISTICAL HELPERS
  // =============================================================================

  /** Calculate probability of meeting or exceeding a DC */
  static probabilityOfSuccess(dc: number, modifier: number): number {
    // d20 average is 10.5. P(roll + modifier >= dc) = P(roll >= dc - modifier)
    const needed = dc - modifier;
    if (needed <= 1) return 1.0;
    if (needed > 20) return 0.0;
    return (21 - needed) / 20;
  }

  /** Calculate probability of each result band */
  static probabilityBands(dc: number, modifier: number): Record<ResultBand, number> {
    const bands: Record<string, number> = {};

    // For each possible d20 roll (1-20), determine the band
    for (let roll = 1; roll <= 20; roll++) {
      const margin = roll + modifier - dc;
      let band: ResultBand;

      if (margin <= -10) band = RESULT_BANDS.CRITICAL_FAILURE;
      else if (margin <= -5) band = RESULT_BANDS.FAILURE;
      else if (margin < 0) band = RESULT_BANDS.PARTIAL_FAILURE;
      else if (margin === 0) band = RESULT_BANDS.SUCCESS_WITH_COST;
      else if (margin <= 4) band = RESULT_BANDS.CLEAN_SUCCESS;
      else if (margin <= 9) band = RESULT_BANDS.STRONG_SUCCESS;
      else band = RESULT_BANDS.CRITICAL_SUCCESS;

      bands[band] = (bands[band] || 0) + 1 / 20;
    }

    // Ensure all bands have a value
    const allBands = Object.values(RESULT_BANDS) as ResultBand[];
    for (const b of allBands) {
      if (bands[b] === undefined) bands[b] = 0;
    }

    return bands as Record<ResultBand, number>;
  }

  /** Expected value of a d20 roll */
  static expectedD20(): number {
    return 10.5;
  }

  /** Expected value of a d100 roll */
  static expectedD100(): number {
    return 50.5;
  }

  /** Expected value of a dice formula */
  static expectedFormula(formula: DiceFormula): number {
    return formula.count * ((formula.faces + 1) / 2) + formula.modifier;
  }
}

// =============================================================================
// STATICS / CONSTANTS
// =============================================================================

/** All result bands in order from worst to best */
export const ALL_RESULT_BANDS: ResultBand[] = [
  RESULT_BANDS.CRITICAL_FAILURE,
  RESULT_BANDS.FAILURE,
  RESULT_BANDS.PARTIAL_FAILURE,
  RESULT_BANDS.SUCCESS_WITH_COST,
  RESULT_BANDS.CLEAN_SUCCESS,
  RESULT_BANDS.STRONG_SUCCESS,
  RESULT_BANDS.CRITICAL_SUCCESS,
];

/** Human-readable names for result bands */
export const RESULT_BAND_NAMES: Record<ResultBand, string> = {
  [RESULT_BANDS.CRITICAL_FAILURE]: 'Critical Failure',
  [RESULT_BANDS.FAILURE]: 'Failure',
  [RESULT_BANDS.PARTIAL_FAILURE]: 'Partial Failure',
  [RESULT_BANDS.SUCCESS_WITH_COST]: 'Success with Cost',
  [RESULT_BANDS.CLEAN_SUCCESS]: 'Clean Success',
  [RESULT_BANDS.STRONG_SUCCESS]: 'Strong Success',
  [RESULT_BANDS.CRITICAL_SUCCESS]: 'Critical Success',
};

/** Emoji/symbol indicators for result bands (for UI) */
export const RESULT_BAND_SYMBOLS: Record<ResultBand, string> = {
  [RESULT_BANDS.CRITICAL_FAILURE]: 'XX',
  [RESULT_BANDS.FAILURE]: 'X',
  [RESULT_BANDS.PARTIAL_FAILURE]: '~',
  [RESULT_BANDS.SUCCESS_WITH_COST]: 'V-',
  [RESULT_BANDS.CLEAN_SUCCESS]: 'V',
  [RESULT_BANDS.STRONG_SUCCESS]: 'V+',
  [RESULT_BANDS.CRITICAL_SUCCESS]: 'VV',
};
