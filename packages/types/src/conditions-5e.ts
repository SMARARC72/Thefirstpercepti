/**
 * ============================================================================
 * 5e CONDITION CATALOG — Shared Types
 * ============================================================================
 * Canonical SRD condition definitions. Coexists with the cosmic-horror
 * `Condition` set in this package — neither replaces the other.
 *
 * The engine package owns the resolver (`evaluateConditions5e`) and the
 * loader (`loadConditions5e`); this module owns the shape contracts.
 *
 * @module @first-perception/types/conditions-5e
 * ============================================================================
 */

export type Condition5eId =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'exhaustion'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious';

export type Condition5eCategory = 'sensory' | 'mental' | 'physical' | 'metaphysical';

export type SaveAbility =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma';

export interface Condition5eEffectsAtLevel {
  level?: number;
  attackRollAdvantageAgainst?: boolean;
  attackRollDisadvantageFor?: boolean;
  abilityChecksDisadvantage?: 'all' | 'strength' | 'dexterity' | 'none';
  savingThrowsDisadvantage?: SaveAbility[];
  speedReducedToZero?: boolean;
  speedHalved?: boolean;
  cantTakeActions?: boolean;
  cantTakeReactions?: boolean;
  autoFailStrengthDexSaves?: boolean;
  hpMaxReducedHalf?: boolean;
  speedReducedZeroLevel?: boolean;
  death?: boolean;
  narrative: string;
}

export interface Condition5eDef {
  id: Condition5eId;
  label: string;
  category: Condition5eCategory;
  hasLevels: boolean;
  maxLevel?: number;
  description: string;
  effects: Condition5eEffectsAtLevel[];
  recoveryVector: string;
}

export interface ActiveCondition5e {
  id: Condition5eId;
  level?: number;
  source?: string;
  rounds?: number;
}

export interface ResolvedConditionEffects {
  hasAdvantage: Set<string>;
  hasDisadvantage: Set<string>;
  savingThrowDisadvantage: Set<SaveAbility>;
  speedMultiplier: 0 | 0.5 | 1;
  cantTakeActions: boolean;
  cantTakeReactions: boolean;
  autoFailStrengthDexSaves: boolean;
  hpMaxMultiplier: 0.5 | 1;
  unconscious: boolean;
}
