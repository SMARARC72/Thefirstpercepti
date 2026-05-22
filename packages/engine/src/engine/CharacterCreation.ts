/**
 * ============================================================================
 * CHARACTER CREATION ENGINE - The First Perception RPG
 * ============================================================================
 * 6-step character creation flow that doubles as world genesis.
 * Creates the player character AND generates the starting world:
 * location, 3 factions, 5 NPCs, starting crisis, hidden pressures,
 * rumors, and death vectors.
 *
 * @module engine/CharacterCreation
 * @version 1.0.0
 * ============================================================================
 */

import {
  Player,
  Location,
  Region,
  Faction,
  NPC,
  Rumor,
  Belief,
  Consequence,
  Item,
  Ability,
  Trait,
  Condition,
  RuntimeStatBlock,
  EntityId,
  CHARACTER_FORMS,
  KNOWLEDGE_POSTURES,
  DEATH_VECTORS,
  STANCES,
  EMOTIONAL_STATES,
  DISPOSITIONS,
  WEATHER_STATES,
  DISEASE_LEVELS,
  ITEM_CATEGORIES,
  GOAL_TYPES,
  DOMAINS,
  DEFAULT_NPC_SCHEDULE,
  GameConfig,
  KnowledgePosture,
  CharacterForm,
  DeathVector,
} from '../engine-types';
import { SeededRNG } from './DiceEngine';
import { DiceEngine } from './DiceEngine';

// =============================================================================
// CREATION STEP INPUTS
// =============================================================================

/** Input for Step 1: Name */
export interface NameInput {
  name: string;
}

/** Input for Step 2: Physical Form */
export interface FormInput {
  form: CharacterForm;
  formDescription?: string;
}

/** Input for Step 3: First Perception */
export interface FirstPerceptionInput {
  /** What the character first noticed about the world - shapes starting location */
  perception: string;
  /** Which sense was dominant */
  dominantSense: string;
}

/** Input for Step 4: Capability Claim */
export interface CapabilityInput {
  /** How the character sees themselves */
  claim: string;
  /** Primary domain of capability */
  primaryDomain: string;
}

/** Input for Step 5: Knowledge Posture */
export interface KnowledgePostureInput {
  posture: KnowledgePosture;
  postureDescription?: string;
}

/** Input for Step 6: Optional Details */
export interface OptionalDetailsInput {
  details: string;
  /** Specific items the player wants to start with */
  desiredItems?: string[];
  /** Specific fears */
  fears?: string[];
  /** What they left behind */
  leftBehind?: string;
}

/** Complete character creation inputs */
export interface CreationInputs {
  name: NameInput;
  form: FormInput;
  firstPerception: FirstPerceptionInput;
  capability: CapabilityInput;
  knowledgePosture: KnowledgePostureInput;
  optionalDetails: OptionalDetailsInput;
}

/** Result of character creation - the generated world */
export interface CreationResult {
  player: Player;
  startingLocation: Location;
  region: Region;
  factions: Faction[];
  npcs: NPC[];
  startingCrisis: Consequence;
  deathVectors: DeathVector[];
  startingRumors: Rumor[];
  startingBeliefs: Belief[];
  startingItems: Item[];
  startingAbilities: Ability[];
  seed: number;
}

// =============================================================================
// STAT GENERATION
// =============================================================================

/** Point-buy stat assignment */
export interface StatAssignment {
  /** Remaining points */
  remaining: number;
  /** Current stat values */
  stats: Partial<RuntimeStatBlock>;
}

/** Default stat costs for point-buy */
const STAT_COSTS: Record<number, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 11,
};

/** Calculate cost for a stat value */
export function getStatCost(value: number): number {
  return STAT_COSTS[value] ?? 99;
}

/** Get available stat range based on remaining points */
export function getAvailableStatValues(statName: string, remainingPoints: number, maxStat: number): number[] {
  const values: number[] = [];
  for (let v = 0; v <= maxStat; v++) {
    if (STAT_COSTS[v] !== undefined && STAT_COSTS[v] <= remainingPoints) {
      values.push(v);
    }
  }
  return values;
}

// =============================================================================
// SPELL SLOTS — POSTURE GATING (Phase 10)
// =============================================================================

/**
 * Posture-driven spell slot allocation at character creation.
 *
 * The 'witness' posture is the cosmic-horror seer archetype — the only
 * posture that opens with metaphysical-access "spell slots" (renamed
 * downstream as "Glimpses" in UI copy; the canonical schema field stays
 * `spellSlots` to match 5e nomenclature). Other postures may unlock
 * casting later through encounters, but at character creation only
 * witness grants slots.
 *
 * Minimal scope per the Phase 10 directive: one posture, one slot level,
 * two slots. Phase 11 or later can grow the table to cover other
 * postures and higher-level slots.
 */
export function spellSlotsForPosture(
  posture: KnowledgePosture
): Record<number, { current: number; max: number }> | undefined {
  if (posture === 'witness') {
    return { 1: { current: 2, max: 2 } };
  }
  return undefined;
}

// =============================================================================
// CHARACTER CREATION ENGINE
// =============================================================================

/**
 * The CharacterCreationEngine handles the 6-step character creation flow
 * and generates the entire starting world from the player's inputs.
 */
export class CharacterCreationEngine {
  private dice: DiceEngine;
  private rng: SeededRNG;
  private config: GameConfig;
  private currentStep: number = 0;
  private inputs: Partial<CreationInputs> = {};

  constructor(config: GameConfig) {
    this.config = config;
    this.dice = new DiceEngine(config.seed, config.deterministic);
    this.rng = this.dice.getRNG();
  }

  /** Get the current creation step (0-5) */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /** Get total number of steps */
  getTotalSteps(): number {
    return 6;
  }

  /** Get step name by index */
  getStepName(step: number): string {
    const names = ['Name', 'Form', 'First Perception', 'Capability Claim', 'Knowledge Posture', 'Optional Details'];
    return names[step] ?? 'Unknown';
  }

  // =============================================================================
  // STEP 1: NAME
  // =============================================================================

  submitName(input: NameInput): { success: boolean; error?: string } {
    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: 'Name cannot be empty' };
    }
    if (input.name.length > 50) {
      return { success: false, error: 'Name too long (max 50 characters)' };
    }
    this.inputs.name = input;
    this.currentStep = 1;
    return { success: true };
  }

  // =============================================================================
  // STEP 2: PHYSICAL FORM
  // =============================================================================

  submitForm(input: FormInput): { success: boolean; error?: string } {
    const validForms = Object.values(CHARACTER_FORMS);
    if (!validForms.includes(input.form)) {
      return { success: false, error: `Invalid form. Valid: ${validForms.join(', ')}` };
    }
    this.inputs.form = input;
    this.currentStep = 2;
    return { success: true };
  }

  /** Get stat modifiers from chosen form */
  getFormModifiers(form: CharacterForm): Partial<RuntimeStatBlock> {
    switch (form) {
      case 'human':
        return { mind: 1, presence: 1 };
      case 'half_blood':
        return { body: 1, sense: 1 };
      case 'warped':
        return { ruin: 2, body: 1, presence: -1 };
      case 'formless':
        return { grace: 2, sense: 1, body: -1 };
      case 'construct':
        return { body: 2, will: 1, grace: -1 };
      case 'spirit_bound':
        return { will: 2, sense: 1, body: -1 };
      default:
        return {};
    }
  }

  /** Get form description */
  getFormDescription(form: CharacterForm): string {
    const descriptions: Record<CharacterForm, string> = {
      human: 'Unchanged by the Shattering. Fragile but adaptable.',
      half_blood: 'Touched by old powers. Something else runs in your veins.',
      warped: 'The Shattering changed you. Your body bears the marks.',
      formless: 'Boundaries blur. You are not quite solid, not quite real.',
      construct: 'Built or rebuilt. Flesh and something else intertwined.',
      spirit_bound: 'A spirit rides with you. You share flesh, share will.',
    };
    return descriptions[form] ?? 'Unknown form.';
  }

  // =============================================================================
  // STEP 3: FIRST PERCEPTION
  // =============================================================================

  submitFirstPerception(input: FirstPerceptionInput): { success: boolean; error?: string } {
    if (!input.perception || input.perception.trim().length < 3) {
      return { success: false, error: 'Perception must be at least 3 characters' };
    }
    this.inputs.firstPerception = input;
    this.currentStep = 3;
    return { success: true };
  }

  // =============================================================================
  // STEP 4: CAPABILITY CLAIM
  // =============================================================================

  submitCapability(input: CapabilityInput): { success: boolean; error?: string } {
    if (!input.claim || input.claim.trim().length < 3) {
      return { success: false, error: 'Claim must be at least 3 characters' };
    }
    this.inputs.capability = input;
    this.currentStep = 4;
    return { success: true };
  }

  /** Get suggested stats from capability claim */
  getCapabilitySuggestions(claim: string): Partial<RuntimeStatBlock> {
    const claim_lower = claim.toLowerCase();
    const suggestions: Partial<RuntimeStatBlock> = {};

    if (claim_lower.includes('strong') || claim_lower.includes('fight') || claim_lower.includes('war')) {
      suggestions.body = ((suggestions.body ?? 0) + 2);
      suggestions.ruin = ((suggestions.ruin ?? 0) + 1);
    }
    if (claim_lower.includes('fast') || claim_lower.includes('quick') || claim_lower.includes('silent')) {
      suggestions.grace = ((suggestions.grace ?? 0) + 2);
    }
    if (claim_lower.includes('see') || claim_lower.includes('sense') || claim_lower.includes('feel')) {
      suggestions.sense = ((suggestions.sense ?? 0) + 2);
    }
    if (claim_lower.includes('know') || claim_lower.includes('learn') || claim_lower.includes('wise')) {
      suggestions.mind = ((suggestions.mind ?? 0) + 2);
    }
    if (claim_lower.includes('lead') || claim_lower.includes('command') || claim_lower.includes('inspire')) {
      suggestions.authority = ((suggestions.authority ?? 0) + 2);
      suggestions.presence = ((suggestions.presence ?? 0) + 1);
    }
    if (claim_lower.includes('make') || claim_lower.includes('build') || claim_lower.includes('heal')) {
      suggestions.creation = ((suggestions.creation ?? 0) + 2);
    }
    if (claim_lower.includes('break') || claim_lower.includes('destroy') || claim_lower.includes('end')) {
      suggestions.ruin = ((suggestions.ruin ?? 0) + 2);
    }
    if (claim_lower.includes('endure') || claim_lower.includes('survive') || claim_lower.includes('persist')) {
      suggestions.will = ((suggestions.will ?? 0) + 2);
    }

    return suggestions;
  }

  // =============================================================================
  // STEP 5: KNOWLEDGE POSTURE
  // =============================================================================

  submitKnowledgePosture(input: KnowledgePostureInput): { success: boolean; error?: string } {
    const validPostures = Object.values(KNOWLEDGE_POSTURES);
    if (!validPostures.includes(input.posture)) {
      return { success: false, error: `Invalid posture. Valid: ${validPostures.join(', ')}` };
    }
    this.inputs.knowledgePosture = input;
    this.currentStep = 5;
    return { success: true };
  }

  /** Get posture description and stat influence */
  getPostureInfo(posture: KnowledgePosture): { description: string; statBonus: Partial<RuntimeStatBlock> } {
    const info: Record<KnowledgePosture, { description: string; statBonus: Partial<RuntimeStatBlock> }> = {
      seeker: {
        description: 'You believe knowledge must be found, whatever the cost.',
        statBonus: { sense: 1, mind: 1 },
      },
      guardian: {
        description: 'Some knowledge is too dangerous to be free. You keep it safe.',
        statBonus: { will: 1, authority: 1 },
      },
      destroyer: {
        description: 'Certain truths should not exist. You ensure they do not.',
        statBonus: { ruin: 1, will: 1 },
      },
      maker: {
        description: 'Knowledge is meant to be shaped into something new.',
        statBonus: { creation: 1, mind: 1 },
      },
      witness: {
        description: 'You observe. You record. You do not intervene.',
        statBonus: { sense: 2 },
      },
      trickster: {
        description: 'Truth is a tool. You use it as you see fit.',
        statBonus: { grace: 1, presence: 1 },
      },
    };
    return info[posture] ?? { description: 'Unknown posture.', statBonus: {} };
  }

  // =============================================================================
  // STEP 6: OPTIONAL DETAILS
  // =============================================================================

  submitOptionalDetails(input: OptionalDetailsInput): { success: boolean; error?: string } {
    this.inputs.optionalDetails = input;
    this.currentStep = 6;
    return { success: true };
  }

  // =============================================================================
  // STAT ASSIGNMENT (Point Buy)
  // =============================================================================

  /** Create a new stat assignment with full points */
  createStatAssignment(): StatAssignment {
    return {
      remaining: this.config.startingStatPoints,
      stats: {
        body: 1,
        grace: 1,
        sense: 1,
        mind: 1,
        will: 1,
        presence: 1,
        authority: 0,
        ruin: 0,
        creation: 0,
      },
    };
  }

  /** Assign a stat value, returning the updated assignment */
  assignStat(assignment: StatAssignment, stat: keyof RuntimeStatBlock, value: number): StatAssignment {
    const cost = getStatCost(value);
    const currentValue = assignment.stats[stat] ?? 0;
    const currentCost = getStatCost(currentValue);
    const costDifference = cost - currentCost;

    if (costDifference > assignment.remaining) {
      return assignment; // Not enough points
    }
    if (value > this.config.maxStartingStat) {
      return assignment; // Exceeds max
    }

    return {
      remaining: assignment.remaining - costDifference,
      stats: { ...assignment.stats, [stat]: value },
    };
  }

  /** Get auto-suggested stats based on character inputs */
  getSuggestedStats(): Partial<RuntimeStatBlock> {
    const suggestions: Partial<RuntimeStatBlock> = {};

    // Form modifiers
    if (this.inputs.form) {
      Object.assign(suggestions, this.getFormModifiers(this.inputs.form.form));
    }

    // Capability suggestions
    if (this.inputs.capability) {
      Object.assign(suggestions, this.getCapabilitySuggestions(this.inputs.capability.claim));
    }

    // Posture bonuses
    if (this.inputs.knowledgePosture) {
      Object.assign(suggestions, this.getPostureInfo(this.inputs.knowledgePosture.posture).statBonus);
    }

    return suggestions;
  }

  // =============================================================================
  // WORLD GENERATION
  // =============================================================================

  /**
   * Complete character creation and generate the world.
   * Call this after all 6 steps are submitted and stats are assigned.
   */
  completeCreation(statAssignment: StatAssignment): CreationResult {
    if (this.currentStep < 5) {
      throw new Error(`Character creation incomplete. At step ${this.currentStep}, need step 5.`);
    }

    const inputs = this.inputs as CreationInputs;
    const seed = this.config.seed;

    // 1. Build player stats
    const baseStats: RuntimeStatBlock = {
      body: statAssignment.stats.body ?? 1,
      grace: statAssignment.stats.grace ?? 1,
      sense: statAssignment.stats.sense ?? 1,
      mind: statAssignment.stats.mind ?? 1,
      will: statAssignment.stats.will ?? 1,
      presence: statAssignment.stats.presence ?? 1,
      authority: statAssignment.stats.authority ?? 0,
      ruin: statAssignment.stats.ruin ?? 0,
      creation: statAssignment.stats.creation ?? 0,
    };

    // 2. Generate starting location from first perception
    const { location, region } = this.generateStartingLocation(inputs.firstPerception);

    // 3. Generate 3 factions
    const factions = this.generateFactions(inputs);

    // 4. Generate 5 NPCs
    const npcs = this.generateNPCs(factions, location.id, inputs);

    // 5. Build player
    const maxHp = this.config.baseHp + baseStats.body * this.config.hpPerBody;
    const player: Player = {
      id: this.generateId('player'),
      name: inputs.name.name,
      form: inputs.form.form,
      firstPerception: inputs.firstPerception.perception,
      capabilityClaim: inputs.capability.claim,
      knowledgePosture: inputs.knowledgePosture.posture,
      optionalDetails: inputs.optionalDetails.details,
      stats: baseStats,
      hp: maxHp,
      maxHp,
      conditions: [],
      inventory: [],
      abilities: [],
      traits: [],
      locationId: location.id,
      knownRumors: [],
      knownBeliefs: [],
      factionStanding: {},
      relationships: {},
      journal: [],
      alive: true,
      createdAt: Date.now(),
      actionsTaken: 0,
      timePlayed: 0,
      // 5e defaults for a level-1 character. Spell slots are seeded by
      // posture below (Phase 10); combat reducer consumes/resets actionEconomy.
      proficiencyBonus: 2,
      hitDice: { current: 1, max: 1, die: 'd8' },
      savingThrowProficiencies: [],
      attunementSlots: { used: 0, max: 3 },
      actionEconomy: { action: true, bonusAction: true, reaction: true },
      spellSlots: spellSlotsForPosture(inputs.knowledgePosture.posture),
    };

    // 6. Generate starting items
    const startingItems = this.generateStartingItems(inputs);
    player.inventory = [...startingItems];

    // 7. Generate starting abilities
    const startingAbilities = this.generateStartingAbilities(baseStats, inputs);
    player.abilities = [...startingAbilities];

    // 8. Generate starting crisis
    const startingCrisis = this.generateStartingCrisis(player, location, region, factions);

    // 9. Generate death vectors
    const deathVectors = this.generateDeathVectors(player, region, factions);

    // 10. Generate starting rumors
    const startingRumors = this.generateStartingRumors(player, factions, npcs, region);

    // 11. Generate starting beliefs
    const startingBeliefs = this.generateStartingBeliefs(player, factions, npcs, region);

    // Set initial faction standings
    for (const faction of factions) {
      player.factionStanding[faction.id] = 0;
    }

    // Set initial NPC relationships
    for (const npc of npcs) {
      player.relationships[npc.id] = 0;
    }

    return {
      player,
      startingLocation: location,
      region,
      factions,
      npcs,
      startingCrisis,
      deathVectors,
      startingRumors,
      startingBeliefs,
      startingItems,
      startingAbilities,
      seed,
    };
  }

  // =============================================================================
  // LOCATION GENERATION
  // =============================================================================

  private generateStartingLocation(perceptionInput: FirstPerceptionInput): {
    location: Location;
    region: Region;
  } {
    const perception = perceptionInput.perception.toLowerCase();
    const dominantSense = perceptionInput.dominantSense.toLowerCase();

    // Determine location characteristics from perception
    let locationName = 'The Threshold';
    let locationDesc = 'A place where something begins.';
    let atmosphere = 'Uncertain. The air holds its breath.';
    let safetyLevel = 5;

    if (perception.includes('ash') || perception.includes('dust') || perception.includes('grey')) {
      locationName = 'Ashen Crossing';
      locationDesc = 'Grey dust coats every surface. The Shattering left its mark here most deeply.';
      atmosphere = 'Dry. The ash gets in your eyes, your lungs. Everything is the color of old bones.';
      safetyLevel = 3;
    } else if (perception.includes('water') || perception.includes('rain') || perception.includes('wet')) {
      locationName = 'Drowned Shore';
      locationDesc = 'Water has claimed the lower streets. You stand at the high tide line.';
      atmosphere = 'Damp. The sound of dripping water echoes from somewhere below.';
      safetyLevel = 4;
    } else if (perception.includes('light') || perception.includes('bright') || perception.includes('glow')) {
      locationName = 'Luminous Hollow';
      locationDesc = 'Something still glows here, faintly, impossibly. The Shattering left a wound that shines.';
      atmosphere = 'Strange. The light casts no warmth, only visibility.';
      safetyLevel = 4;
    } else if (perception.includes('dark') || perception.includes('shadow') || perception.includes('black')) {
      locationName = 'The Dim';
      locationDesc = 'Light struggles to reach this place. Shadows pool like water in the corners.';
      atmosphere = 'Heavy. Darkness presses against your awareness.';
      safetyLevel = 3;
    } else if (perception.includes('cold') || perception.includes('ice') || perception.includes('frost')) {
      locationName = 'Frost Market';
      locationDesc = 'Once a place of trade and warmth. Now the stalls are frozen, the merchants gone or changed.';
      atmosphere = 'Bitter. Breath clouds. Fingers numb.';
      safetyLevel = 4;
    } else if (perception.includes('hot') || perception.includes('heat') || perception.includes('burn')) {
      locationName = 'Cinder Ward';
      locationDesc = 'Fires burn endlessly here, fed by something that should have exhausted itself long ago.';
      atmosphere = 'Smothering. Heat shimmers distort the air. Ash falls like snow.';
      safetyLevel = 3;
    } else if (perception.includes('market') || perception.includes('trade') || perception.includes('coin')) {
      locationName = 'Greywake Market';
      locationDesc = 'Commerce persists, even after the end. Merchants sell memories, rumors, and necessities.';
      atmosphere = 'Bustling in a hollow way. Too many eyes, too many hands reaching.';
      safetyLevel = 5;
    } else if (perception.includes('tower') || perception.includes('high') || perception.includes('up')) {
      locationName = 'The Watch';
      locationDesc = 'A high place. You can see the shape of what remains from here.';
      atmosphere = 'Exposed. Wind tugs at your clothes. The world spreads below like a broken map.';
      safetyLevel = 6;
    } else if (perception.includes('below') || perception.includes('under') || perception.includes('deep')) {
      locationName = 'The Descent';
      locationDesc = 'Downward, into what was buried. The upper world feels distant already.';
      atmosphere = 'Close. Stone presses in. The air is old, breathed before.';
      safetyLevel = 3;
    } else {
      locationName = 'The Threshold';
      locationDesc = `You remember ${perceptionInput.perception}. It was the first thing that reached you in this new world.`;
      atmosphere = 'Uncertain. This place feels transitional, as if waiting to become something else.';
      safetyLevel = 5;
    }

    const regionId = this.generateId('region');
    const locationId = this.generateId('location');

    const region: Region = {
      id: regionId,
      name: 'The Shattered Reach',
      description: 'A region scarred by the Shattering. What was once whole is now fragments held together by necessity.',
      locationIds: [locationId],
      weather: WEATHER_STATES.OVERCAST,
      weatherIntensity: 3,
      temperature: 0,
      factionInfluence: {},
      diseaseLevel: DISEASE_LEVELS.NONE,
      population: 200 + Math.floor(this.rng.next() * 300),
      economicHealth: 4,
      dangerLevel: 10 - safetyLevel,
      characteristics: ['Shattered architecture', 'Scarce resources', 'Persistent unease'],
    };

    const location: Location = {
      id: locationId,
      name: locationName,
      description: locationDesc,
      summary: `A ${safetyLevel > 4 ? 'relatively safe' : 'dangerous'} starting point in the Shattered Reach.`,
      regionId,
      connections: [],
      items: [],
      npcIds: [],
      environment: {
        lighting: this.getLightingFromPerception(perception),
        temperature: this.getTemperatureFromPerception(perception),
        atmosphere,
        sounds: this.getSoundsFromPerception(perception, dominantSense),
        smells: this.getSmellsFromPerception(perception),
        effects: [],
      },
      discovered: true,
      explored: false,
      hiddenFeatures: this.generateHiddenFeatures(perception),
      safetyLevel,
      landmarks: ['A broken marker', 'Signs of recent habitation'],
    };

    return { location, region };
  }

  private getLightingFromPerception(perception: string): string {
    if (perception.includes('dark')) return 'Deep shadows, minimal light';
    if (perception.includes('light') || perception.includes('bright')) return 'Unnatural glow, source unclear';
    if (perception.includes('fog') || perception.includes('mist')) return 'Diffused, grey';
    return 'Dim, as if the world is holding its breath';
  }

  private getTemperatureFromPerception(perception: string): string {
    if (perception.includes('cold') || perception.includes('ice')) return 'Freezing';
    if (perception.includes('hot') || perception.includes('burn')) return 'Uncomfortably warm';
    if (perception.includes('damp') || perception.includes('wet')) return 'Clammy, chill';
    return 'Cool, indifferent';
  }

  private getSoundsFromPerception(perception: string, sense: string): string[] {
    const sounds: string[] = [];
    if (sense.includes('hear') || perception.includes('sound') || perception.includes('noise')) {
      sounds.push('Distant echoes', 'The sound of something moving nearby');
    } else {
      sounds.push('Strange silence', 'Faint ambient noise');
    }
    return sounds;
  }

  private getSmellsFromPerception(perception: string): string[] {
    if (perception.includes('ash')) return ['Ash', 'Old smoke', 'Dry stone'];
    if (perception.includes('rot') || perception.includes('dead')) return ['Decay', 'Stagnant air'];
    if (perception.includes('flower') || perception.includes('green')) return ['Faint vegetation', 'Damp earth'];
    return ['Dust', 'Something unplaceable'];
  }

  private generateHiddenFeatures(perception: string): Location['hiddenFeatures'] {
    const features: Location['hiddenFeatures'] = [];

    features.push({
      description: 'A mark scratched into the stone, barely visible.',
      revealMethod: 'Close examination of the walls',
      revealStat: 'sense',
      revealDC: 8,
      found: false,
    });

    if (perception.includes('hidden') || perception.includes('secret')) {
      features.push({
        description: 'A narrow gap between two walls, large enough to squeeze through.',
        revealMethod: 'Thorough searching',
        revealStat: 'sense',
        revealDC: 6,
        found: false,
      });
    }

    return features;
  }

  // =============================================================================
  // FACTION GENERATION (3 Factions: Law, Faith, Economy)
  // =============================================================================

  private generateFactions(inputs: CreationInputs): Faction[] {
    const factions: Faction[] = [];

    // Faction 1: Law/Order
    const lawFaction: Faction = {
      id: this.generateId('faction'),
      name: 'The Chain',
      description: 'They keep order in the Shattered Reach. Their methods are severe, but without them, there is only chaos.',
      category: 'law',
      domain: DOMAINS.SOCIAL,
      goals: [
        {
          id: this.generateId('goal'),
          type: GOAL_TYPES.CONTROL,
          description: 'Maintain order in the Shattered Reach',
          progress: 6,
          secret: false,
          priority: 9,
        },
        {
          id: this.generateId('goal'),
          type: GOAL_TYPES.SECRET,
          description: 'Locate and contain the source of the Shattering\'s residual effects',
          progress: 3,
          secret: true,
          priority: 8,
        },
      ],
      resources: {
        wealth: 5,
        influence: 7,
        military: 6,
        knowledge: 4,
        faith: 2,
        territory: 5,
      },
      playerStance: STANCES.CAUTIOUS,
      factionStances: {},
      memberIds: [],
      controlledLocations: [],
      territoryInfluence: {},
      power: 6,
      active: true,
      secrets: ['They have been secretly eliminating witnesses to the Shattering'],
      publicFace: 'Order-keepers. Brutal but necessary.',
    };

    // Faction 2: Faith/Religion
    const faithFaction: Faction = {
      id: this.generateId('faction'),
      name: 'The Chorus',
      description: 'They speak of what came before. They claim the Shattering was a message, a revelation.',
      category: 'faith',
      domain: DOMAINS.METAPHYSICAL,
      goals: [
        {
          id: this.generateId('goal'),
          type: GOAL_TYPES.CONVERT,
          description: 'Spread their interpretation of the Shattering',
          progress: 4,
          secret: false,
          priority: 8,
        },
        {
          id: this.generateId('goal'),
          type: GOAL_TYPES.SECRET,
          description: 'Find the First Witness who saw the Shattering begin',
          progress: 2,
          secret: true,
          priority: 10,
        },
      ],
      resources: {
        wealth: 3,
        influence: 6,
        military: 2,
        knowledge: 7,
        faith: 8,
        territory: 3,
      },
      playerStance: STANCES.CAUTIOUS,
      factionStances: {},
      memberIds: [],
      controlledLocations: [],
      territoryInfluence: {},
      power: 5,
      active: true,
      secrets: ['Their leader claims to hear voices from beyond the Shattering'],
      publicFace: 'Spiritual guides. Seekers of truth.',
    };

    // Faction 3: Economy/Trade
    const economyFaction: Faction = {
      id: this.generateId('faction'),
      name: 'The Ledger',
      description: 'Commerce continues. They ensure goods flow, for a price. Information is their true currency.',
      category: 'economy',
      domain: DOMAINS.SOCIAL,
      goals: [
        {
          id: this.generateId('goal'),
          type: GOAL_TYPES.PROSPER,
          description: 'Control all trade routes in the region',
          progress: 5,
          secret: false,
          priority: 9,
        },
        {
          id: this.generateId('goal'),
          type: GOAL_TYPES.SECRET,
          description: 'Acquire artifacts from before the Shattering',
          progress: 4,
          secret: true,
          priority: 7,
        },
      ],
      resources: {
        wealth: 8,
        influence: 5,
        military: 3,
        knowledge: 5,
        faith: 1,
        territory: 4,
      },
      playerStance: STANCES.NEUTRAL,
      factionStances: {},
      memberIds: [],
      controlledLocations: [],
      territoryInfluence: {},
      power: 5,
      active: true,
      secrets: ['They know who caused the Shattering, or think they do'],
      publicFace: 'Merchants and traders. Neutral ground.',
    };

    // Set faction stances toward each other
    lawFaction.factionStances[faithFaction.id] = STANCES.SUSPICIOUS;
    lawFaction.factionStances[economyFaction.id] = STANCES.NEUTRAL;
    faithFaction.factionStances[lawFaction.id] = STANCES.SUSPICIOUS;
    faithFaction.factionStances[economyFaction.id] = STANCES.CAUTIOUS;
    economyFaction.factionStances[lawFaction.id] = STANCES.NEUTRAL;
    economyFaction.factionStances[faithFaction.id] = STANCES.CAUTIOUS;

    factions.push(lawFaction, faithFaction, economyFaction);
    return factions;
  }

  // =============================================================================
  // NPC GENERATION (5 NPCs)
  // =============================================================================

  private generateNPCs(factions: Faction[], startingLocationId: EntityId, inputs: CreationInputs): NPC[] {
    const npcs: NPC[] = [];
    const perception = inputs.firstPerception.perception.toLowerCase();

    // NPC 1: Law figure
    const lawFigure: NPC = {
      id: this.generateId('npc'),
      name: 'Castellan Vorn',
      description: 'A tall figure in grey-stained armor. Eyes that have seen too much and forgotten how to look away.',
      role: 'Law Enforcer',
      factionId: factions[0].id,
      locationId: startingLocationId,
      stats: {
        body: 3, grace: 2, sense: 3, mind: 2, will: 3,
        presence: 2, authority: 3, ruin: 1, creation: 0,
      },
      hp: 16,
      maxHp: 16,
      emotionalState: EMOTIONAL_STATES.RESIGNED,
      disposition: DISPOSITIONS.WARY,
      desires: ['Maintain order', 'Find someone to trust'],
      fears: ['Chaos returning', 'His own brutality'],
      knowledge: [],
      secrets: ['He killed an innocent man during the Shattering'],
      memories: [],
      conditions: [],
      inventory: [],
      alive: true,
      isAnomaly: false,
      schedule: DEFAULT_NPC_SCHEDULE,
      dialogueTopics: [
        { topic: 'order', response: 'Order is all we have left. Without it, we are beasts.', requiredDisposition: undefined, isSecret: false },
        { topic: 'shattering', response: 'I was there. I saw it begin. I do not speak of it.', requiredDisposition: undefined, isSecret: false },
      ],
      voice: 'Gravel and distance. Words measured, as if each costs something.',
    };

    // NPC 2: Faith figure
    const faithFigure: NPC = {
      id: this.generateId('npc'),
      name: 'Sister Mourn',
      description: 'Her robes are the color of dried blood. She smiles, but it does not reach her eyes.',
      role: 'Chorus Speaker',
      factionId: factions[1].id,
      locationId: startingLocationId,
      stats: {
        body: 1, grace: 2, sense: 4, mind: 3, will: 4,
        presence: 3, authority: 1, ruin: 0, creation: 2,
      },
      hp: 10,
      maxHp: 10,
      emotionalState: EMOTIONAL_STATES.OBSESSIVE,
      disposition: DISPOSITIONS.CURIOUS,
      desires: ['Find the truth of the Shattering', 'Convert the doubtful'],
      fears: ['That the Shattering meant nothing', 'Silence from beyond'],
      knowledge: [],
      secrets: ['She has been touched by something from beyond the Shattering'],
      memories: [],
      conditions: [],
      inventory: [],
      alive: true,
      isAnomaly: false,
      schedule: {
        entries: {
          5: 'morning prayers',
          8: 'sacred readings',
          12: 'midday sermon',
          15: 'counseling the faithful',
          18: 'evening ritual',
          22: 'private meditation',
        },
        defaultActivity: 'whispering prayers under her breath',
      },
      dialogueTopics: [
        { topic: 'faith', response: 'The Shattering spoke. We must learn to listen.', requiredDisposition: undefined, isSecret: false },
        { topic: 'voices', response: '... Have you heard them too?', requiredDisposition: DISPOSITIONS.FRIENDLY_NPC, isSecret: true },
      ],
      voice: 'Soft, with strange cadences. She pauses at odd moments, as if listening.',
    };

    // NPC 3: Market figure
    const marketFigure: NPC = {
      id: this.generateId('npc'),
      name: 'Fennick the Tongue',
      description: 'Small, quick, with fingers that never stop moving. Information is his trade.',
      role: 'Information Broker',
      factionId: factions[2].id,
      locationId: startingLocationId,
      stats: {
        body: 1, grace: 3, sense: 3, mind: 3, will: 2,
        presence: 3, authority: 0, ruin: 0, creation: 1,
      },
      hp: 8,
      maxHp: 8,
      emotionalState: EMOTIONAL_STATES.ANXIOUS,
      disposition: DISPOSITIONS.CURIOUS,
      desires: ['Profit', 'Safety', 'Interesting information'],
      fears: ['Being known', 'Having no value', 'The Chain\'s interrogations'],
      knowledge: [],
      secrets: ['He sold information that got someone killed yesterday'],
      memories: [],
      conditions: [],
      inventory: [],
      alive: true,
      isAnomaly: false,
      schedule: DEFAULT_NPC_SCHEDULE,
      dialogueTopics: [
        { topic: 'rumors', response: 'Rumors cost, friend. What are you buying with?', requiredDisposition: undefined, isSecret: false },
        { topic: 'shattering', response: 'I know a guy who knows a guy. Expensive, that knowledge.', requiredDisposition: DISPOSITIONS.FRIENDLY_NPC, isSecret: false },
      ],
      voice: 'Rapid, slippery. He never quite answers what he is asked.',
    };

    // NPC 4: Vulnerable witness
    const vulnerableNPC: NPC = {
      id: this.generateId('npc'),
      name: 'The Foundling',
      description: 'A child, or something like one. Too thin. Eyes too wide. They have seen something.',
      role: 'Witness',
      factionId: undefined,
      locationId: startingLocationId,
      stats: {
        body: 1, grace: 2, sense: 4, mind: 1, will: 2,
        presence: 2, authority: 0, ruin: 0, creation: 0,
      },
      hp: 6,
      maxHp: 6,
      emotionalState: EMOTIONAL_STATES.TERRIFIED,
      disposition: DISPOSITIONS.WARY,
      desires: ['Safety', 'Someone to trust', 'To forget what they saw'],
      fears: ['Being found', 'The dark', 'Adults asking questions'],
      knowledge: [],
      secrets: ['They saw the Shattering begin from their hiding place'],
      memories: [],
      conditions: [{ type: 'frightened', description: 'Constantly terrified', severity: 7, appliedAt: Date.now(), duration: -1, remaining: -1, source: 'trauma', statModifiers: { will: -1 } }],
      inventory: [],
      alive: true,
      isAnomaly: false,
      dialogueTopics: [
        { topic: 'saw', response: '... I didn\'t see anything. I was hiding. I\'m always hiding.', requiredDisposition: DISPOSITIONS.FRIENDLY_NPC, isSecret: false },
        { topic: 'shattering', response: 'The sky... the sky had a mouth. Please don\'t make me remember.', requiredDisposition: DISPOSITIONS.LOYAL, isSecret: true },
      ],
      voice: 'Small, breathless. Words tumble out then cut off, as if fear swallows them.',
    };

    // NPC 5: Anomaly
    const anomalyNPC: NPC = {
      id: this.generateId('npc'),
      name: 'The Echo',
      description: 'It wears a face, but wrong. Movements slightly delayed, as if consulting something distant. It is fascinated by you.',
      role: 'Anomaly',
      factionId: undefined,
      locationId: startingLocationId,
      stats: {
        body: 2, grace: 4, sense: 5, mind: 4, will: 3,
        presence: 4, authority: 2, ruin: 3, creation: 3,
      },
      hp: 20,
      maxHp: 20,
      emotionalState: EMOTIONAL_STATES.CALM,
      disposition: DISPOSITIONS.CURIOUS,
      desires: ['Understand humanity', 'Remember what it was', 'Help or harm, undecided'],
      fears: ['Being forgotten completely', 'The final dissolution'],
      knowledge: [],
      secrets: ['It remembers the world before the Shattering', 'It may have caused part of it'],
      memories: [],
      conditions: [],
      inventory: [],
      alive: true,
      isAnomaly: true,
      dialogueTopics: [
        { topic: 'what are you', response: 'I am... a remainder. What was left when the division occurred.', requiredDisposition: undefined, isSecret: false },
        { topic: 'before', response: 'It was... whole. I miss wholeness with a grief that has no name.', requiredDisposition: DISPOSITIONS.FRIENDLY_NPC, isSecret: false },
      ],
      voice: 'Resonant, as if two voices speak slightly out of sync. Ancient and childlike together.',
    };

    npcs.push(lawFigure, faithFigure, marketFigure, vulnerableNPC, anomalyNPC);

    // Link NPCs to locations
    for (const npc of npcs) {
      // Note: location needs to be updated with NPC IDs after creation
    }

    return npcs;
  }

  // =============================================================================
  // STARTING ITEMS
  // =============================================================================

  private generateStartingItems(inputs: CreationInputs): Item[] {
    const items: Item[] = [];

    // Everyone gets basic gear
    items.push({
      id: this.generateId('item'),
      name: 'Worn Clothing',
      description: 'What you were wearing when the world changed.',
      category: ITEM_CATEGORIES.CLOTHING,
      statModifiers: {},
      effects: [],
      equippable: true,
      equipped: true,
      slot: 'body',
      value: 0,
      weight: 1,
      maxUses: -1,
      usesRemaining: -1,
      unique: false,
      tags: ['clothing', 'basic'],
    });

    items.push({
      id: this.generateId('item'),
      name: 'Waterskin',
      description: 'A half-full skin of questionable water.',
      category: ITEM_CATEGORIES.CONSUMABLE,
      statModifiers: {},
      effects: [{ description: 'Restores a small amount of stamina', trigger: 'drink', mechanicalEffect: '+1 temporary stamina' }],
      equippable: false,
      equipped: false,
      value: 1,
      weight: 2,
      maxUses: 3,
      usesRemaining: 3,
      unique: false,
      tags: ['consumable', 'water'],
    });

    // Items based on capability claim
    const claim = inputs.capability.claim.toLowerCase();
    if (claim.includes('fight') || claim.includes('war') || claim.includes('blade')) {
      items.push({
        id: this.generateId('item'),
        name: 'Notched Blade',
        description: 'A sword that has seen use. The edge is sharp, the grip familiar.',
        category: ITEM_CATEGORIES.WEAPON,
        statModifiers: { body: 1 },
        effects: [{ description: '+1 to combat rolls', trigger: 'equip', mechanicalEffect: '+1 body for combat actions' }],
        equippable: true,
        equipped: false,
        slot: 'hand',
        value: 5,
        weight: 3,
        maxUses: -1,
        usesRemaining: -1,
        unique: false,
        tags: ['weapon', 'blade', 'combat'],
      });
    }

    if (claim.includes('heal') || claim.includes('mend') || claim.includes('restore')) {
      items.push({
        id: this.generateId('item'),
        name: 'Salve Bundle',
        description: 'Dried herbs and a foul-smelling paste. It works, though the smell lingers.',
        category: ITEM_CATEGORIES.CONSUMABLE,
        statModifiers: {},
        effects: [{ description: 'Heals minor wounds', trigger: 'apply', mechanicalEffect: 'Restore 1d4+1 HP' }],
        equippable: false,
        equipped: false,
        value: 3,
        weight: 1,
        maxUses: 2,
        usesRemaining: 2,
        unique: false,
        tags: ['healing', 'consumable', 'medical'],
      });
    }

    if (claim.includes('sneak') || claim.includes('hide') || claim.includes('shadow')) {
      items.push({
        id: this.generateId('item'),
        name: 'Dark Cloth',
        description: 'Fabric that seems to drink light. Useful for not being seen.',
        category: ITEM_CATEGORIES.CLOTHING,
        statModifiers: { grace: 1 },
        effects: [{ description: '+1 to stealth rolls', trigger: 'equip', mechanicalEffect: '+1 grace for stealth actions' }],
        equippable: true,
        equipped: false,
        slot: 'cloak',
        value: 4,
        weight: 1,
        maxUses: -1,
        usesRemaining: -1,
        unique: false,
        tags: ['stealth', 'clothing'],
      });
    }

    // Add items from optional details
    if (inputs.optionalDetails.desiredItems) {
      for (const itemName of inputs.optionalDetails.desiredItems) {
        items.push({
          id: this.generateId('item'),
          name: itemName,
          description: `Something you brought with you: ${itemName}.`,
          category: ITEM_CATEGORIES.TOOL,
          statModifiers: {},
          effects: [],
          equippable: false,
          equipped: false,
          value: 2,
          weight: 1,
          maxUses: -1,
          usesRemaining: -1,
          unique: true,
          tags: ['personal', 'starting'],
        });
      }
    }

    return items;
  }

  // =============================================================================
  // STARTING ABILITIES
  // =============================================================================

  private generateStartingAbilities(stats: RuntimeStatBlock, inputs: CreationInputs): Ability[] {
    const abilities: Ability[] = [];

    // Everyone gets these basics
    abilities.push({
      id: this.generateId('ability'),
      name: 'Endure',
      description: 'Push through hardship. Ignore pain, fatigue, or fear for a moment.',
      primaryStat: 'will',
      domain: DOMAINS.PHYSICAL,
      passive: false,
      cost: { hp: 0 },
      cooldown: 5,
      cooldownRemaining: 0,
      tags: ['basic', 'endurance'],
    });

    abilities.push({
      id: this.generateId('ability'),
      name: 'Read Situation',
      description: 'Assess the immediate environment for threats, opportunities, and hidden details.',
      primaryStat: 'sense',
      domain: DOMAINS.LORE,
      passive: false,
      cost: undefined,
      cooldown: 3,
      cooldownRemaining: 0,
      tags: ['basic', 'perception'],
    });

    // Posture-based ability
    const postureAbilities: Record<string, Ability> = {
      seeker: {
        id: this.generateId('ability'),
        name: 'Pierce Obscurity',
        description: 'See through deception, illusion, or concealment. The truth wants to be found.',
        primaryStat: 'sense',
        domain: DOMAINS.LORE,
        passive: false,
        cost: undefined,
        cooldown: 8,
        cooldownRemaining: 0,
        tags: ['seeker', 'revelation'],
      },
      guardian: {
        id: this.generateId('ability'),
        name: 'Stand Fast',
        description: 'Protect someone or something. While you stand, it will not fall.',
        primaryStat: 'will',
        domain: DOMAINS.COMBAT,
        passive: false,
        cost: undefined,
        cooldown: 6,
        cooldownRemaining: 0,
        tags: ['guardian', 'protection'],
      },
      destroyer: {
        id: this.generateId('ability'),
        name: 'Unmake',
        description: 'Destroy something, physically or conceptually. What is broken cannot be unbroken.',
        primaryStat: 'ruin',
        domain: DOMAINS.COMBAT,
        passive: false,
        cost: { conditionInflicted: 'exhausted' },
        cooldown: 7,
        cooldownRemaining: 0,
        tags: ['destroyer', 'destruction'],
      },
      maker: {
        id: this.generateId('ability'),
        name: 'Shape',
        description: 'Create or repair. From raw materials, something new.',
        primaryStat: 'creation',
        domain: DOMAINS.CRAFT,
        passive: false,
        cost: undefined,
        cooldown: 6,
        cooldownRemaining: 0,
        tags: ['maker', 'creation'],
      },
      witness: {
        id: this.generateId('ability'),
        name: 'Perfect Recall',
        description: 'Remember every detail of a scene. Nothing escapes true observation.',
        primaryStat: 'sense',
        domain: DOMAINS.LORE,
        passive: true,
        cost: undefined,
        cooldown: 0,
        cooldownRemaining: 0,
        tags: ['witness', 'memory'],
      },
      trickster: {
        id: this.generateId('ability'),
        name: 'Misdirect',
        description: 'Lead attention elsewhere. What they do not see, they cannot stop.',
        primaryStat: 'grace',
        domain: DOMAINS.INTRIGUE,
        passive: false,
        cost: undefined,
        cooldown: 5,
        cooldownRemaining: 0,
        tags: ['trickster', 'deception'],
      },
    };

    const postureAbility = postureAbilities[inputs.knowledgePosture.posture];
    if (postureAbility) {
      abilities.push(postureAbility);
    }

    return abilities;
  }

  // =============================================================================
  // STARTING CRISIS
  // =============================================================================

  private generateStartingCrisis(
    player: Player,
    location: Location,
    region: Region,
    factions: Faction[]
  ): Consequence {
    const crises = [
      {
        description: 'A body has been found nearby. The Chain suspects someone new to the area.',
        type: 'action' as const,
        condition: 'investigate_body',
      },
      {
        description: 'The Chorus is recruiting by force. They are looking for those with "sensitive souls".',
        type: 'time' as const,
        condition: 'chorus_recruitment',
      },
      {
        description: 'A trade dispute has escalated. Violence is imminent in the market.',
        type: 'action' as const,
        condition: 'market_violence',
      },
      {
        description: 'Something is moving in the ruins nearby. It is not human, and it is getting closer.',
        type: 'time' as const,
        condition: 'ruin_creature',
      },
      {
        description: 'The water supply has been poisoned. People are getting sick.',
        type: 'condition' as const,
        condition: 'poisoned_water',
      },
    ];

    const crisis = crises[Math.floor(this.rng.next() * crises.length)];

    return {
      id: this.generateId('consequence'),
      description: crisis.description,
      trigger: {
        type: crisis.type,
        condition: crisis.condition,
        turnsRemaining: 5,
      },
      effect: {
        description: 'The starting crisis unfolds.',
      },
      severity: 'major',
      processed: false,
      queuedAt: Date.now(),
      source: 'character_creation',
    };
  }

  // =============================================================================
  // DEATH VECTORS
  // =============================================================================

  private generateDeathVectors(
    player: Player,
    region: Region,
    factions: Faction[]
  ): DeathVector[] {
    const vectors: DeathVector[] = [];

    // Always add violence
    vectors.push(DEATH_VECTORS.VIOLENCE);

    // Add based on conditions
    if (region.dangerLevel > 5) vectors.push(DEATH_VECTORS.VIOLENCE);
    if (region.diseaseLevel !== DISEASE_LEVELS.NONE) vectors.push(DEATH_VECTORS.DISEASE);

    // Add based on world state
    const hostileFaction = factions.find((f) => f.playerStance === STANCES.HOSTILE);
    if (hostileFaction) vectors.push(DEATH_VECTORS.BETRAYAL);

    // Always add at least 2, at most 4
    while (vectors.length < 2) {
      const allVectors = Object.values(DEATH_VECTORS);
      const random = allVectors[Math.floor(this.rng.next() * allVectors.length)];
      if (!vectors.includes(random)) vectors.push(random);
    }

    return vectors.slice(0, 4);
  }

  // =============================================================================
  // STARTING RUMORS
  // =============================================================================

  private generateStartingRumors(
    player: Player,
    factions: Faction[],
    npcs: NPC[],
    region: Region
  ): Rumor[] {
    const rumors: Rumor[] = [];

    const rumorTexts = [
      {
        text: 'The Chain has been secretly eliminating anyone who saw the Shattering begin.',
        isTrue: true,
        spread: 3,
      },
      {
        text: 'Sister Mourn hears voices that tell her where to find "the worthy".',
        isTrue: true,
        spread: 4,
      },
      {
        text: 'Fennick the Tongue sells the same information to both sides of any dispute.',
        isTrue: true,
        spread: 5,
      },
      {
        text: 'There is a way to undo the Shattering, hidden somewhere in the Shattered Reach.',
        isTrue: false,
        spread: 7,
      },
      {
        text: 'The Echo is not the only one of its kind. More are coming.',
        isTrue: true,
        spread: 2,
      },
      {
        text: 'The Foundling knows the true name of what caused the Shattering.',
        isTrue: false,
        spread: 4,
      },
      {
        text: 'A new faction is forming in the deep ruins, gathering those the Shattering changed most.',
        isTrue: this.rng.next() > 0.5,
        spread: 3,
      },
      {
        text: 'The water in the lower districts is safe to drink now. The purification worked.',
        isTrue: false,
        spread: 6,
      },
    ];

    for (const rt of rumorTexts) {
      rumors.push({
        id: this.generateId('rumor'),
        text: rt.text,
        circulationRegionIds: [region.id],
        spread: rt.spread,
        isTrue: rt.isTrue,
        relatedBeliefIds: [],
        startedAt: Date.now(),
        source: 'starting_world',
        knownToPlayer: false,
      });
    }

    return rumors;
  }

  // =============================================================================
  // STARTING BELIEFS
  // =============================================================================

  private generateStartingBeliefs(
    player: Player,
    factions: Faction[],
    npcs: NPC[],
    region: Region
  ): Belief[] {
    const beliefs: Belief[] = [];

    const beliefStatements = [
      {
        statement: 'The Shattering was caused by human hubris.',
        isTrue: true,
        confidence: 'likely' as const,
      },
      {
        statement: 'The old gods are dead.',
        isTrue: false,
        confidence: 'rumor' as const,
      },
      {
        statement: 'The Chain maintains order through necessary cruelty.',
        isTrue: true,
        confidence: 'certain' as const,
      },
      {
        statement: 'The Chorus knows something about the Shattering that they are not sharing.',
        isTrue: true,
        confidence: 'likely' as const,
      },
      {
        statement: 'The Ledger has a map to somewhere safe.',
        isTrue: false,
        confidence: 'rumor' as const,
      },
      {
        statement: 'The Echo is dangerous.',
        isTrue: false,
        confidence: 'likely' as const,
      },
      {
        statement: 'There are places where the Shattering did not reach.',
        isTrue: false,
        confidence: 'rumor' as const,
      },
      {
        statement: 'The Foundling is not entirely human.',
        isTrue: false,
        confidence: 'rumor' as const,
      },
    ];

    for (const bs of beliefStatements) {
      beliefs.push({
        id: this.generateId('belief'),
        statement: bs.statement,
        confidence: bs.confidence,
        isTrue: bs.isTrue,
        supportingEvidence: [],
        contradictingEvidence: [],
        gameplayImpact: `Believing this affects how you interact with the world.`,
        heldByPlayer: false,
      });
    }

    return beliefs;
  }

  // =============================================================================
  // UTILITY
  // =============================================================================

  private generateId(prefix: string): EntityId {
    return `${prefix}_${Date.now()}_${Math.floor(this.rng.next() * 1000000)}`;
  }
}

// =============================================================================
// STATICS
// =============================================================================

/** All valid character forms with descriptions */
export const CHARACTER_FORM_OPTIONS: { value: CharacterForm; label: string; description: string }[] = [
  { value: 'human', label: 'Human', description: 'Unchanged by the Shattering. Fragile but adaptable.' },
  { value: 'half_blood', label: 'Half-Blood', description: 'Touched by old powers. Something runs in your veins.' },
  { value: 'warped', label: 'Warped', description: 'The Shattering changed you physically. You bear the marks.' },
  { value: 'formless', label: 'Formless', description: 'Boundaries blur. Not quite solid, not quite real.' },
  { value: 'construct', label: 'Construct', description: 'Built or rebuilt. Flesh and something else intertwined.' },
  { value: 'spirit_bound', label: 'Spirit-Bound', description: 'A spirit rides with you. You share flesh, share will.' },
];

/** All valid knowledge postures with descriptions */
export const KNOWLEDGE_POSTURE_OPTIONS: { value: KnowledgePosture; label: string; description: string }[] = [
  { value: 'seeker', label: 'Seeker', description: 'Knowledge must be found, whatever the cost.' },
  { value: 'guardian', label: 'Guardian', description: 'Some knowledge is too dangerous to be free.' },
  { value: 'destroyer', label: 'Destroyer', description: 'Certain truths should not exist.' },
  { value: 'maker', label: 'Maker', description: 'Knowledge is meant to be shaped into something new.' },
  { value: 'witness', label: 'Witness', description: 'Observe. Record. Do not intervene.' },
  { value: 'trickster', label: 'Trickster', description: 'Truth is a tool. Use it as you see fit.' },
];
