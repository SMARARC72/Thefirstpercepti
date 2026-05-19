/**
 * ============================================================================
 * THE FIRST PERCEPTION - Complete Type Definitions
 * ============================================================================
 * A solo text-based living-world RPG engine type system.
 * All game entities, enums, interfaces, and type utilities.
 *
 * @module types
 * @version 1.0.0
 * ============================================================================
 */

// =============================================================================
// ENUM CONSTANTS - All game enumerations as const objects for type safety
// =============================================================================

/** Core stats that define every entity's capabilities */
export const CORE_STATS = {
  BODY: 'body',         // Physical power, endurance, constitution
  GRACE: 'grace',       // Agility, dexterity, coordination
  SENSE: 'sense',       // Perception, awareness, intuition
  MIND: 'mind',         // Intellect, reasoning, knowledge
  WILL: 'will',         // Determination, mental fortitude, focus
  PRESENCE: 'presence', // Charisma, bearing, social force
  AUTHORITY: 'authority', // Command, leadership, dominance
  RUIN: 'ruin',         // Destructive capacity, entropy
  CREATION: 'creation', // Creative force, restoration, growth
} as const;

export type CoreStat = (typeof CORE_STATS)[keyof typeof CORE_STATS];

/** Primary domains for action classification */
export const DOMAINS = {
  PHYSICAL: 'physical',
  SOCIAL: 'social',
  METAPHYSICAL: 'metaphysical',
  COMBAT: 'combat',
  CRAFT: 'craft',
  STEALTH: 'stealth',
  LORE: 'lore',
  WILDERNESS: 'wilderness',
  INTRIGUE: 'intrigue',
} as const;

export type Domain = (typeof DOMAINS)[keyof typeof DOMAINS];

/** Types of actions players can attempt */
export const ACTION_TYPES = {
  DESTROY: 'destroy',
  CREATE: 'create',
  PERSUADE: 'persuade',
  INVESTIGATE: 'investigate',
  FLEE: 'flee',
  BARGAIN: 'bargain',
  SPEAK: 'speak',
  EXAMINE: 'examine',
  USE: 'use',
  GO: 'go',
  HELP: 'help',
  ATTACK: 'attack',
  DEFEND: 'defend',
  EVADE: 'evade',
  MANIPULATE: 'manipulate',
  PERCEIVE: 'perceive',
  CRAFT_ACTION: 'craft_action',
  RITUAL: 'ritual',
  REST: 'rest',
  WAIT: 'wait',
  UNKNOWN: 'unknown',
} as const;

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

/** Faction stance toward other entities */
export const STANCES = {
  HOSTILE: 'hostile',
  SUSPICIOUS: 'suspicious',
  CAUTIOUS: 'cautious',
  NEUTRAL: 'neutral',
  FRIENDLY: 'friendly',
  ALLIED: 'allied',
  SUBSERVIENT: 'subservient',
  DOMINANT: 'dominant',
} as const;

export type Stance = (typeof STANCES)[keyof typeof STANCES];

/** Faction goal types */
export const GOAL_TYPES = {
  EXPAND: 'expand',
  DEFEND: 'defend',
  DESTROY_GOAL: 'destroy_goal',
  CONTROL: 'control',
  SURVIVE: 'survive',
  PROSPER: 'prosper',
  CONVERT: 'convert',
  SECRET: 'secret',
} as const;

export type GoalType = (typeof GOAL_TYPES)[keyof typeof GOAL_TYPES];

/** NPC emotional states */
export const EMOTIONAL_STATES = {
  TERRIFIED: 'terrified',
  FEARFUL: 'fearful',
  ANXIOUS: 'anxious',
  UNCERTAIN: 'uncertain',
  CALM: 'calm',
  CONFIDENT: 'confident',
  HOPEFUL: 'hopeful',
  EAGER: 'eager',
  ANGRY: 'angry',
  RESIGNED: 'resigned',
  OBSESSIVE: 'obsessive',
  ECSTATIC: 'ecstatic',
} as const;

export type EmotionalState = (typeof EMOTIONAL_STATES)[keyof typeof EMOTIONAL_STATES];

/** NPC disposition toward the player */
export const DISPOSITIONS = {
  HATEFUL: 'hateful',
  UNFRIENDLY: 'unfriendly',
  WARY: 'wary',
  INDIFFERENT: 'indifferent',
  CURIOUS: 'curious',
  FRIENDLY_NPC: 'friendly',
  LOYAL: 'loyal',
  DEVOTED: 'devoted',
} as const;

export type Disposition = (typeof DISPOSITIONS)[keyof typeof DISPOSITIONS];

/** Weather states */
export const WEATHER_STATES = {
  CLEAR: 'clear',
  OVERCAST: 'overcast',
  LIGHT_RAIN: 'light_rain',
  HEAVY_RAIN: 'heavy_rain',
  STORM: 'storm',
  FOG: 'fog',
  SNOW: 'snow',
  BLIZZARD: 'blizzard',
  DROUGHT: 'drought',
  HAZE: 'haze',
  BLOOD_RAIN: 'blood_rain',
  STILLNESS: 'stillness',
} as const;

export type WeatherState = (typeof WEATHER_STATES)[keyof typeof WEATHER_STATES];

/** Disease severity levels */
export const DISEASE_LEVELS = {
  NONE: 'none',
  RUMORED: 'rumored',
  CONTAINED: 'contained',
  SPREADING: 'spreading',
  EPIDEMIC: 'epidemic',
  PANDEMIC: 'pandemic',
} as const;

export type DiseaseLevel = (typeof DISEASE_LEVELS)[keyof typeof DISEASE_LEVELS];

/** Roll result bands - the 7 outcomes of any roll */
export const RESULT_BANDS = {
  CRITICAL_FAILURE: 'critical_failure',
  FAILURE: 'failure',
  PARTIAL_FAILURE: 'partial_failure',
  SUCCESS_WITH_COST: 'success_with_cost',
  CLEAN_SUCCESS: 'clean_success',
  STRONG_SUCCESS: 'strong_success',
  CRITICAL_SUCCESS: 'critical_success',
} as const;

export type ResultBand = (typeof RESULT_BANDS)[keyof typeof RESULT_BANDS];

/** Cost severity levels */
export const COST_SEVERITY = {
  NONE: 'none',
  TRIVIAL: 'trivial',
  MINOR: 'minor',
  MODERATE: 'moderate',
  MAJOR: 'major',
  SEVERE: 'severe',
  CATASTROPHIC: 'catastrophic',
} as const;

export type CostSeverityLevel = (typeof COST_SEVERITY)[keyof typeof COST_SEVERITY];

/** Item categories */
export const ITEM_CATEGORIES = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  TOOL: 'tool',
  CONSUMABLE: 'consumable',
  MATERIAL: 'material',
  LORE: 'lore',
  CURRENCY: 'currency',
  KEY: 'key',
  CLOTHING: 'clothing',
  JEWELRY: 'jewelry',
  ANOMALY: 'anomaly',
} as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[keyof typeof ITEM_CATEGORIES];

/** Condition types that affect entities */
export const CONDITION_TYPES = {
  INJURED: 'injured',
  WOUNDED: 'wounded',
  CRITICAL: 'critical',
  DYING: 'dying',
  POISONED: 'poisoned',
  DISEASED: 'diseased',
  CURSED: 'cursed',
  BLESSED: 'blessed',
  EXHAUSTED: 'exhausted',
  INSPIRED: 'inspired',
  FRIGHTENED: 'frightened',
  HIDDEN: 'hidden',
  EXPOSED: 'exposed',
  RESTRAINED: 'restrained',
  EMPOWERED: 'empowered',
  MARKED: 'marked',
  HAUNTED: 'haunted',
  OBSESSED: 'obsessed',
} as const;

export type ConditionType = (typeof CONDITION_TYPES)[keyof typeof CONDITION_TYPES];

/** Knowledge posture - how the character relates to knowledge */
export const KNOWLEDGE_POSTURES = {
  SEEKER: 'seeker',
  GUARDIAN: 'guardian',
  DESTROYER: 'destroyer',
  MAKER: 'maker',
  WITNESS: 'witness',
  TRICKSTER: 'trickster',
} as const;

export type KnowledgePosture = (typeof KNOWLEDGE_POSTURES)[keyof typeof KNOWLEDGE_POSTURES];

/** Character forms (body types) */
export const CHARACTER_FORMS = {
  HUMAN: 'human',
  HALF_BLOOD: 'half_blood',
  WARPED: 'warped',
  FORMLESS: 'formless',
  CONSTRUCT: 'construct',
  SPIRIT_BOUND: 'spirit_bound',
} as const;

export type CharacterForm = (typeof CHARACTER_FORMS)[keyof typeof CHARACTER_FORMS];

/** Death vector types - how death can claim the player */
export const DEATH_VECTORS = {
  VIOLENCE: 'violence',
  DISEASE: 'disease',
  STARVATION: 'starvation',
  MADNESS: 'madness',
  BETRAYAL: 'betrayal',
  RITUAL: 'ritual',
  TIME: 'time',
  AUTHORITY_COLLAPSE: 'authority_collapse',
} as const;

export type DeathVector = (typeof DEATH_VECTORS)[keyof typeof DEATH_VECTORS];

/** Legacy types - what survives death */
export const LEGACY_TYPES = {
  NAME: 'name',
  TEACHING: 'teaching',
  TERRIFYING: 'terrifying',
  NOTHING: 'nothing',
  RUMOR: 'rumor',
  LINEAGE: 'lineage',
  CURSE: 'curse',
} as const;

export type LegacyType = (typeof LEGACY_TYPES)[keyof typeof LEGACY_TYPES];

/** Event severity */
export const EVENT_SEVERITY = {
  TRIVIAL: 'trivial',
  MINOR: 'minor',
  MODERATE: 'moderate',
  MAJOR: 'major',
  CATASTROPHIC: 'catastrophic',
  WORLD_CHANGING: 'world_changing',
} as const;

export type EventSeverity = (typeof EVENT_SEVERITY)[keyof typeof EVENT_SEVERITY];

/** Belief confidence levels */
export const CONFIDENCE_LEVELS = {
  RUMOR: 'rumor',
  LIKELY: 'likely',
  CERTAIN: 'certain',
  PROVEN: 'proven',
  FORGOTTEN: 'forgotten',
} as const;

export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[keyof typeof CONFIDENCE_LEVELS];

/** Scene types */
export const SCENE_TYPES = {
  EXPLORATION: 'exploration',
  DIALOGUE: 'dialogue',
  COMBAT: 'combat',
  INVESTIGATION: 'investigation',
  RITUAL: 'ritual',
  TRAVEL: 'travel',
  REST_SCENE: 'rest',
  DEATH_SCENE: 'death',
  TRANSITION: 'transition',
} as const;

export type SceneType = (typeof SCENE_TYPES)[keyof typeof SCENE_TYPES];

/** Game modes */
export const GAME_MODES = {
  IRONMAN: 'ironman',
  STANDARD: 'standard',
  SANDBOX: 'sandbox',
} as const;

export type GameMode = (typeof GAME_MODES)[keyof typeof GAME_MODES];

/** Content depiction modes */
export const DEPICTION_MODES = {
  IMPLICIT: 'implicit',
  EXPLICIT: 'explicit',
  OFF_SCREEN: 'off_screen',
} as const;

export type DepictionMode = (typeof DEPICTION_MODES)[keyof typeof DEPICTION_MODES];

/** Content severity categories */
export const CONTENT_CATEGORIES = {
  VIOLENCE: 'violence',
  HORROR: 'horror',
  GORE: 'gore',
  DISEASE_CONTENT: 'disease',
  BODY_HORROR: 'body_horror',
  PSYCHOLOGICAL: 'psychological',
  SOCIAL: 'social',
  POLITICAL: 'political',
} as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[keyof typeof CONTENT_CATEGORIES];

// =============================================================================
// UTILITY TYPES
// =============================================================================

/** A dice formula like "2d6+3" or "1d20" */
export interface DiceFormula {
  /** Number of dice to roll */
  count: number;
  /** Number of faces per die */
  faces: number;
  /** Static modifier added after rolling */
  modifier: number;
}

/** UUID string for entity identification */
export type EntityId = string;

/** Timestamp in milliseconds since epoch */
export type Timestamp = number;

/** A stat block mapping core stats to numeric values */
export interface StatBlock {
  body: number;
  grace: number;
  sense: number;
  mind: number;
  will: number;
  presence: number;
  authority: number;
  ruin: number;
  creation: number;
}

/** Partial stat block for modifiers/differences */
export interface PartialStatBlock {
  body?: number;
  grace?: number;
  sense?: number;
  mind?: number;
  will?: number;
  presence?: number;
  authority?: number;
  ruin?: number;
  creation?: number;
}

// =============================================================================
// ROLL SYSTEM TYPES
// =============================================================================

/** The complete result of a dice roll */
export interface RollResult {
  /** Unique ID for this roll */
  id: EntityId;
  /** Timestamp when the roll was made */
  timestamp: Timestamp;
  /** Raw die result (before modifiers) */
  rawRoll: number;
  /** All dice that were rolled with individual results */
  dice: number[];
  /** Total modifier applied */
  totalModifier: number;
  /** Final result after all modifiers */
  finalResult: number;
  /** The DC/target number */
  dc: number;
  /** Which result band this falls into */
  band: ResultBand;
  /** Whether this roll was visible to the player */
  visible: boolean;
  /** What action this roll was for */
  actionType: ActionType;
  /** Which stat was used */
  statUsed: CoreStat;
  /** Description of the roll context */
  description: string;
  /** Calculated cost if success_with_cost */
  cost?: CostCalculation;
}

/** Cost calculation for success-with-cost results */
export interface CostCalculation {
  /** Severity level of the cost */
  severity: CostSeverityLevel;
  /** Numeric cost value */
  value: number;
  /** Description of what the cost entails */
  description: string;
  /** Categories of cost (hp, resources, conditions, etc.) */
  costTypes: CostType[];
}

/** Individual cost component */
export interface CostType {
  /** What is being lost or spent */
  resource: string;
  /** How much */
  amount: number;
  /** Whether this is permanent */
  permanent: boolean;
}

/** DC calculation breakdown */
export interface DCCalculation {
  /** Base DC from action scale */
  targetScale: number;
  /** Complexity modifier */
  complexity: number;
  /** Resistance from opposition */
  resistance: number;
  /** Instability modifier */
  instability: number;
  /** Final calculated DC */
  finalDC: number;
  /** Explanation of each component */
  breakdown: DCComponent[];
}

/** Individual DC component */
export interface DCComponent {
  name: string;
  value: number;
  description: string;
}

// =============================================================================
// ENTITY TYPES
// =============================================================================

/** A player character */
export interface Player {
  /** Unique entity ID */
  id: EntityId;
  /** Character name */
  name: string;
  /** Physical form */
  form: CharacterForm;
  /** First perception - what they first noticed about the world */
  firstPerception: string;
  /** How they see themselves */
  capabilityClaim: string;
  /** Knowledge posture */
  knowledgePosture: KnowledgePosture;
  /** Optional details/backstory */
  optionalDetails: string;
  /** Core stats */
  stats: StatBlock;
  /** Current health/hit points */
  hp: number;
  /** Maximum health */
  maxHp: number;
  /** Current conditions affecting the player */
  conditions: Condition[];
  /** Inventory items */
  inventory: Item[];
  /** Known abilities */
  abilities: Ability[];
  /** Traits possessed */
  traits: Trait[];
  /** Current location ID */
  locationId: EntityId;
  /** Known rumors */
  knownRumors: EntityId[];
  /** Known beliefs */
  knownBeliefs: EntityId[];
  /** Faction standing: factionId -> numeric value */
  factionStanding: Record<EntityId, number>;
  /** NPC relationships: npcId -> numeric disposition */
  relationships: Record<EntityId, number>;
  /** Journal entries */
  journal: JournalEntry[];
  /** Whether the character is alive */
  alive: boolean;
  /** Death vector if dead */
  deathVector?: DeathVector;
  /** Legacy left behind */
  legacy?: Legacy;
  /** Character creation timestamp */
  createdAt: Timestamp;
  /** Number of actions taken */
  actionsTaken: number;
  /** Total time played in ms */
  timePlayed: number;
}

/** A non-player character */
export interface NPC {
  /** Unique entity ID */
  id: EntityId;
  /** Display name */
  name: string;
  /** Physical description */
  description: string;
  /** Role in the world */
  role: string;
  /** Which faction they belong to (if any) */
  factionId?: EntityId;
  /** Current location ID */
  locationId: EntityId;
  /** Core stats */
  stats: StatBlock;
  /** Current HP */
  hp: number;
  /** Max HP */
  maxHp: number;
  /** Emotional state */
  emotionalState: EmotionalState;
  /** Disposition toward player */
  disposition: Disposition;
  /** What this NPC desires */
  desires: string[];
  /** What this NPC fears */
  fears: string[];
  /** What the NPC knows (beliefs they hold) */
  knowledge: EntityId[];
  /** Secrets the NPC holds */
  secrets: string[];
  /** NPC memories of player interactions */
  memories: NPCMemory[];
  /** Current conditions */
  conditions: Condition[];
  /** Inventory */
  inventory: Item[];
  /** Whether NPC is alive */
  alive: boolean;
  /** Whether this NPC is an anomaly (strange/otherworldly) */
  isAnomaly: boolean;
  /** Daily routine/schedule */
  schedule?: NPCSchedule;
  /** Dialogue topics this NPC can discuss */
  dialogueTopics: DialogueTopic[];
  /** Unique voice/diction description */
  voice: string;
}

/** A memory of player interaction stored by an NPC */
export interface NPCMemory {
  /** Unique memory ID */
  id: EntityId;
  /** Timestamp of the interaction */
  timestamp: Timestamp;
  /** What happened */
  description: string;
  /** How the NPC felt about it (-10 to +10) */
  emotionalImpact: number;
  /** What the player did */
  playerAction: string;
  /** Whether this memory is significant */
  significant: boolean;
}

/** NPC daily schedule entry */
export interface NPCSchedule {
  /** Time of day (0-23) -> activity */
  entries: Record<number, string>;
  /** Default activity if no entry matches */
  defaultActivity: string;
}

/** A dialogue topic an NPC can discuss */
export interface DialogueTopic {
  /** Topic keyword */
  topic: string;
  /** NPC's response */
  response: string;
  /** Whether this requires a disposition threshold */
  requiredDisposition?: Disposition;
  /** Whether this topic is secret */
  isSecret: boolean;
}

/** A location in the world */
export interface Location {
  /** Unique entity ID */
  id: EntityId;
  /** Display name */
  name: string;
  /** Detailed description */
  description: string;
  /** Short summary for navigation */
  summary: string;
  /** Which region this belongs to */
  regionId: EntityId;
  /** Connected location IDs with travel descriptions */
  connections: LocationConnection[];
  /** Items present in this location */
  items: Item[];
  /** NPCs currently here */
  npcIds: EntityId[];
  /** Environmental conditions */
  environment: EnvironmentState;
  /** Whether this location has been discovered */
  discovered: boolean;
  /** Whether this location has been fully explored */
  explored: boolean;
  /** Hidden features not immediately visible */
  hiddenFeatures: HiddenFeature[];
  /** Safety level (0 = deadly, 10 = sanctuary) */
  safetyLevel: number;
  /** Notable landmarks */
  landmarks: string[];
}

/** Connection between locations */
export interface LocationConnection {
  /** Target location ID */
  targetId: EntityId;
  /** Description of the path/connection */
  description: string;
  /** Whether this connection is hidden */
  hidden: boolean;
  /** Travel difficulty (0-10) */
  difficulty: number;
  /** Conditions required to use this connection */
  requiredConditions?: ConditionType[];
}

/** Environmental state at a location */
export interface EnvironmentState {
  /** Lighting conditions */
  lighting: string;
  /** Temperature description */
  temperature: string;
  /** Atmospheric conditions */
  atmosphere: string;
  /** Sounds audible */
  sounds: string[];
  /** Smells present */
  smells: string[];
  /** Ongoing environmental effects */
  effects: string[];
}

/** A hidden feature that can be discovered */
export interface HiddenFeature {
  /** What the feature is */
  description: string;
  /** What sense or action reveals it */
  revealMethod: string;
  /** Required stat check to reveal */
  revealStat?: CoreStat;
  /** DC for revelation */
  revealDC: number;
  /** Whether it has been found */
  found: boolean;
}

/** A geographic region */
export interface Region {
  /** Unique entity ID */
  id: EntityId;
  /** Display name */
  name: string;
  /** Region description */
  description: string;
  /** Location IDs in this region */
  locationIds: EntityId[];
  /** Current weather */
  weather: WeatherState;
  /** Weather intensity (0-10) */
  weatherIntensity: number;
  /** Temperature in arbitrary units (-10 to 10) */
  temperature: number;
  /** Faction presence: factionId -> influence (0-10) */
  factionInfluence: Record<EntityId, number>;
  /** Current disease level */
  diseaseLevel: DiseaseLevel;
  /** Population estimate */
  population: number;
  /** Economic health (0-10) */
  economicHealth: number;
  /** Danger level (0-10) */
  dangerLevel: number;
  /** Notable characteristics */
  characteristics: string[];
}

/** A faction in the world */
export interface Faction {
  /** Unique entity ID */
  id: EntityId;
  /** Display name */
  name: string;
  /** Faction description */
  description: string;
  /** What type of faction (law, faith, economy, etc.) */
  category: string;
  /** Primary domain */
  domain: Domain;
  /** Current goals */
  goals: FactionGoal[];
  /** Resources held (0-10 each) */
  resources: FactionResources;
  /** Stance toward player */
  playerStance: Stance;
  /** Stance toward other factions: factionId -> stance */
  factionStances: Record<EntityId, Stance>;
  /** Known members */
  memberIds: EntityId[];
  /** Controlled location IDs */
  controlledLocations: EntityId[];
  /** Territory influence by region: regionId -> (0-10) */
  territoryInfluence: Record<EntityId, number>;
  /** Current power level (0-10) */
  power: number;
  /** Whether the faction is active or destroyed */
  active: boolean;
  /** Faction secrets */
  secrets: string[];
  /** Public face/description */
  publicFace: string;
}

/** A faction's goal */
export interface FactionGoal {
  /** Goal ID */
  id: EntityId;
  /** Goal type */
  type: GoalType;
  /** Description */
  description: string;
  /** Progress (0-10) */
  progress: number;
  /** Target entity ID (if applicable) */
  targetId?: EntityId;
  /** Whether this goal is secret */
  secret: boolean;
  /** Priority (1-10) */
  priority: number;
}

/** Faction resource pools */
export interface FactionResources {
  wealth: number;
  influence: number;
  military: number;
  knowledge: number;
  faith: number;
  territory: number;
}

// =============================================================================
// ITEM / ABILITY / TRAIT / CONDITION
// =============================================================================

/** An item in the game world */
export interface Item {
  /** Unique entity ID */
  id: EntityId;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Item category */
  category: ItemCategory;
  /** Stat modifiers when equipped/used */
  statModifiers: PartialStatBlock;
  /** Special effects this item grants */
  effects: ItemEffect[];
  /** Whether this item is equippable */
  equippable: boolean;
  /** Whether this item is equipped */
  equipped: boolean;
  /** Slot this item occupies if equipped */
  slot?: string;
  /** Monetary value */
  value: number;
  /** Weight (arbitrary units) */
  weight: number;
  /** Maximum uses (-1 for unlimited) */
  maxUses: number;
  /** Remaining uses */
  usesRemaining: number;
  /** Whether this item is unique/quest-related */
  unique: boolean;
  /** Tags for interaction */
  tags: string[];
}

/** An item's special effect */
export interface ItemEffect {
  /** Effect description */
  description: string;
  /** Trigger condition */
  trigger: string;
  /** Mechanical effect description */
  mechanicalEffect: string;
}

/** An ability the player can use */
export interface Ability {
  /** Unique entity ID */
  id: EntityId;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Primary stat used */
  primaryStat: CoreStat;
  /** Domain this ability belongs to */
  domain: Domain;
  /** Whether this is a passive ability */
  passive: boolean;
  /** Cost to use */
  cost?: AbilityCost;
  /** Cooldown in turns */
  cooldown: number;
  /** Current cooldown remaining */
  cooldownRemaining: number;
  /** Tags */
  tags: string[];
}

/** Cost to use an ability */
export interface AbilityCost {
  /** HP cost */
  hp?: number;
  /** Specific item required */
  itemRequired?: string;
  /** Condition inflicted on use */
  conditionInflicted?: ConditionType;
}

/** A character trait */
export interface Trait {
  /** Unique entity ID */
  id: EntityId;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Stat modifiers */
  statModifiers: PartialStatBlock;
  /** Special effects */
  specialEffects: string[];
  /** Whether this is a flaw (negative) */
  isFlaw: boolean;
}

/** A condition affecting an entity */
export interface Condition {
  /** Condition type */
  type: ConditionType;
  /** Description of this specific instance */
  description: string;
  /** Severity (1-10) */
  severity: number;
  /** When the condition was applied */
  appliedAt: Timestamp;
  /** Duration in turns (-1 for permanent) */
  duration: number;
  /** Turns remaining */
  remaining: number;
  /** Source of the condition */
  source: string;
  /** Stat modifiers from this condition */
  statModifiers: PartialStatBlock;
}

// =============================================================================
// RUMOR / BELIEF / CONSEQUENCE
// =============================================================================

/** A rumor circulating in the world */
export interface Rumor {
  /** Unique entity ID */
  id: EntityId;
  /** Rumor text */
  text: string;
  /** Where this rumor circulates */
  circulationRegionIds: EntityId[];
  /** How widespread (0-10) */
  spread: number;
  /** Whether this is true */
  isTrue: boolean;
  /** What belief this relates to */
  relatedBeliefIds: EntityId[];
  /** When this rumor started */
  startedAt: Timestamp;
  /** Who started it */
  source: string;
  /** Whether the player knows this rumor */
  knownToPlayer: boolean;
  /** How the player learned it */
  learnedFrom?: string;
}

/** A belief about how the world works */
export interface Belief {
  /** Unique entity ID */
  id: EntityId;
  /** Belief statement */
  statement: string;
  /** Confidence in this belief */
  confidence: ConfidenceLevel;
  /** Whether this belief is actually true */
  isTrue: boolean;
  /** What supports this belief */
  supportingEvidence: string[];
  /** What contradicts this belief */
  contradictingEvidence: string[];
  /** Impact on gameplay if believed/disbelieved */
  gameplayImpact: string;
  /** Whether the player holds this belief */
  heldByPlayer: boolean;
}

/** A consequence waiting to be resolved */
export interface Consequence {
  /** Unique entity ID */
  id: EntityId;
  /** Description */
  description: string;
  /** When this triggers */
  trigger: ConsequenceTrigger;
  /** What happens when triggered */
  effect: ConsequenceEffect;
  /** Severity */
  severity: EventSeverity;
  /** Whether this has been processed */
  processed: boolean;
  /** When it was queued */
  queuedAt: Timestamp;
  /** Source event/action */
  source: string;
}

/** What triggers a consequence */
export interface ConsequenceTrigger {
  /** Type of trigger */
  type: 'time' | 'action' | 'condition' | 'location' | 'random';
  /** Specific trigger condition */
  condition: string;
  /** Turns remaining before trigger (if time-based) */
  turnsRemaining?: number;
  /** Chance per turn to trigger (if random) */
  chancePerTurn?: number;
}

/** The effect of a consequence */
export interface ConsequenceEffect {
  /** Description of the effect */
  description: string;
  /** Stat changes */
  statChanges?: PartialStatBlock;
  /** Conditions to apply */
  conditions?: ConditionType[];
  /** Items to add/remove */
  itemChanges?: ItemChange[];
  /** NPC changes */
  npcChanges?: NPCEffect[];
  /** Faction changes */
  factionChanges?: FactionEffect[];
  /** Location changes */
  locationChanges?: LocationEffect[];
}

/** Item modification from consequence */
export interface ItemChange {
  itemId: EntityId;
  action: 'add' | 'remove' | 'modify';
  quantity?: number;
}

/** NPC effect from consequence */
export interface NPCEffect {
  npcId: EntityId;
  dispositionChange?: number;
  condition?: ConditionType;
  locationChange?: EntityId;
  alive?: boolean;
}

/** Faction effect from consequence */
export interface FactionEffect {
  factionId: EntityId;
  stanceChange?: number;
  powerChange?: number;
  resourceChanges?: Partial<FactionResources>;
}

/** Location effect from consequence */
export interface LocationEffect {
  locationId: EntityId;
  safetyChange?: number;
  descriptionAddition?: string;
  itemAdditions?: Item[];
}

// =============================================================================
// EVENT / SCENE / JOURNAL
// =============================================================================

/** A world event */
export interface Event {
  /** Unique entity ID */
  id: EntityId;
  /** Event title */
  title: string;
  /** Detailed description */
  description: string;
  /** When it happened */
  timestamp: Timestamp;
  /** Where it happened */
  locationId?: EntityId;
  /** Which region */
  regionId?: EntityId;
  /** Severity */
  severity: EventSeverity;
  /** Type of event */
  type: string;
  /** Immediate effects */
  immediateEffects?: ConsequenceEffect;
  /** Consequences that will follow */
  pendingConsequences: EntityId[];
  /** Whether player witnessed this */
  witnessed: boolean;
  /** Whether this is known to the player */
  knownToPlayer: boolean;
  /** Related entity IDs */
  relatedEntityIds: EntityId[];
  /** Tags for categorization */
  tags: string[];
}

/** A scene - the current narrative moment */
export interface Scene {
  /** Unique entity ID */
  id: EntityId;
  /** Scene type */
  type: SceneType;
  /** Location where this scene takes place */
  locationId: EntityId;
  /** Narrative description */
  narrative: string;
  /** What just happened (context) */
  context: string;
  /** Present NPCs */
  presentNPCs: EntityId[];
  /** Available actions */
  availableActions: SuggestedAction[];
  /** Environmental conditions */
  environment: EnvironmentState;
  /** Time of day (0-23) */
  timeOfDay: number;
  /** Day number */
  day: number;
  /** Weather */
  weather: WeatherState;
  /** Ongoing conditions */
  ongoingConditions: Condition[];
  /** Suggested responses */
  suggestedResponses: string[];
}

/** A suggested action in a scene */
export interface SuggestedAction {
  /** Action description */
  description: string;
  /** Action type */
  actionType: ActionType;
  /** Target (if applicable) */
  target?: string;
  /** Difficulty estimate */
  estimatedDifficulty?: string;
  /** Potential consequences hint */
  consequenceHint?: string;
}

/** A journal entry */
export interface JournalEntry {
  /** Unique entity ID */
  id: EntityId;
  /** Timestamp */
  timestamp: Timestamp;
  /** Entry text */
  text: string;
  /** Day number */
  day: number;
  /** Time of day */
  timeOfDay: number;
  /** Type of entry */
  entryType: 'action' | 'event' | 'discovery' | 'death' | 'legacy' | 'dream' | 'rumor';
  /** Related entity IDs */
  relatedEntityIds: EntityId[];
  /** Whether this was written by the player */
  isPlayerWritten: boolean;
}

// =============================================================================
// WORLD PULSE / DEATH / LEGACY
// =============================================================================

/** A world pulse - the feeling of the living world */
export interface WorldPulse {
  /** Unique entity ID */
  id: EntityId;
  /** Timestamp */
  timestamp: Timestamp;
  /** Faction movements summary */
  factionMovements: string[];
  /** NPC activities */
  npcActivities: string[];
  /** Economic shifts */
  economicShifts: string[];
  /** Weather changes */
  weatherChanges: string[];
  /** Disease updates */
  diseaseUpdates: string[];
  /** Rumor mill */
  newRumors: string[];
  /** Ecological notes */
  ecologicalNotes: string[];
  /** Consequence warnings */
  consequenceWarnings: string[];
  /** Overall mood */
  overallMood: string;
  /** Day number */
  day: number;
}

/** A death record */
export interface DeathRecord {
  /** Which character died */
  characterId: EntityId;
  /** Character name */
  characterName: string;
  /** How they died */
  deathVector: DeathVector;
  /** Description of death */
  description: string;
  /** Timestamp */
  timestamp: Timestamp;
  /** Day number */
  day: number;
  /** Legacy left */
  legacy: Legacy;
  /** Final stats */
  finalStats: StatBlock;
  /** Total actions taken */
  actionsTaken: number;
}

/** A legacy - what survives death */
export interface Legacy {
  /** Legacy type */
  type: LegacyType;
  /** Description of the legacy */
  description: string;
  /** How it affects the next character/world */
  mechanicalEffect: string;
  /** Whether this is active */
  active: boolean;
}

// =============================================================================
// INTENT / INTERPRETATION
// =============================================================================

/** Parsed player intent from freeform input */
export interface Intent {
  /** Original input text */
  originalText: string;
  /** Primary action type */
  primaryAction: ActionType;
  /** Secondary action (for compound inputs) */
  secondaryAction?: ActionType;
  /** What the action targets */
  target?: string;
  /** Resolved target entity ID (if found) */
  targetId?: EntityId;
  /** Domain of the action */
  domain: Domain;
  /** Suggested stat for resolution */
  suggestedStat: CoreStat;
  /** How confident the parser is (0-1) */
  confidence: number;
  /** Whether input was ambiguous */
  ambiguous: boolean;
  /** Alternative interpretations */
  alternatives: AlternativeIntent[];
  /** Whether input contained negation */
  negated: boolean;
  /** Items mentioned */
  mentionedItems: string[];
  /** NPCs mentioned */
  mentionedNPCs: string[];
  /** Locations mentioned */
  mentionedLocations: string[];
  /** Extracted modifiers (carefully, quickly, etc.) */
  modifiers: string[];
  /** Emotional tone detected */
  emotionalTone: string;
}

/** An alternative interpretation of player input */
export interface AlternativeIntent {
  /** Action type */
  action: ActionType;
  /** Target */
  target?: string;
  /** Confidence in this alternative */
  confidence: number;
  /** Why this is an alternative */
  reason: string;
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/** A snapshot of the entire game state for saving */
export interface SaveSnapshot {
  /** Snapshot version for migration support */
  version: string;
  /** Timestamp of save */
  timestamp: Timestamp;
  /** Player data */
  player: Player;
  /** All locations */
  locations: Location[];
  /** All regions */
  regions: Region[];
  /** All factions */
  factions: Faction[];
  /** All NPCs */
  npcs: NPC[];
  /** All events */
  events: Event[];
  /** All rumors */
  rumors: Rumor[];
  /** All beliefs */
  beliefs: Belief[];
  /** Pending consequences */
  consequences: Consequence[];
  /** World state */
  worldState: WorldState;
  /** Game configuration */
  config: GameConfig;
  /** Death records */
  deathRecords: DeathRecord[];
  /** Journal entries */
  journalEntries: JournalEntry[];
  /** RNG seed for deterministic replay */
  rngSeed: number;
  /** Current turn number */
  turnNumber: number;
  /** Current day */
  currentDay: number;
  /** Current time of day (0-23) */
  currentHour: number;
}

/** The global world state */
export interface WorldState {
  /** Current day number (starts at 1) */
  day: number;
  /** Current hour (0-23) */
  hour: number;
  /** Global event queue */
  eventQueue: EntityId[];
  /** Global consequence queue */
  consequenceQueue: EntityId[];
  /** Active world pulses */
  recentPulses: WorldPulse[];
  /** Global modifiers */
  globalModifiers: GlobalModifier[];
  /** Historical events summary */
  history: HistoryEntry[];
  /** Whether time is frozen */
  timeFrozen: boolean;
}

/** A global modifier affecting the world */
export interface GlobalModifier {
  /** Modifier name */
  name: string;
  /** Description */
  description: string;
  /** Stat effects */
  statEffects: PartialStatBlock;
  /** Duration in turns (-1 for permanent) */
  duration: number;
  /** Remaining turns */
  remaining: number;
  /** Source */
  source: string;
}

/** A history entry for the world */
export interface HistoryEntry {
  /** Day */
  day: number;
  /** What happened */
  summary: string;
  /** Severity */
  severity: EventSeverity;
}

/** Game configuration */
export interface GameConfig {
  /** Game mode */
  mode: GameMode;
  /** Content depiction mode */
  depictionMode: DepictionMode;
  /** Enable debug features */
  debug: boolean;
  /** Deterministic mode (seeded RNG) */
  deterministic: boolean;
  /** RNG seed */
  seed: number;
  /** Starting stat points */
  startingStatPoints: number;
  /** Max stat value at creation */
  maxStartingStat: number;
  /** HP per body point */
  hpPerBody: number;
  /** Base HP */
  baseHp: number;
  /** Enable ironman (no manual save) */
  ironman: boolean;
  /** Auto-save frequency (turns) */
  autoSaveFrequency: number;
  /** World simulation frequency (turns) */
  simulationFrequency: number;
  /** Starting location description override */
  startingLocationOverride?: string;
  /** Enable auto-save */
  autoSave?: boolean;
}

/** State difference for undo/redo or delta tracking */
export interface StateDiff {
  /** Diff ID */
  id: EntityId;
  /** Which turn this diff applies to */
  turn: number;
  /** Timestamp */
  timestamp: Timestamp;
  /** Entity changes: entityType -> entityId -> field -> {old, new} */
  changes: EntityChanges;
  /** Added entities */
  additions: EntityAddition[];
  /** Removed entities */
  removals: EntityRemoval[];
}

/** Changes to an entity's fields */
export interface EntityChanges {
  [entityType: string]: {
    [entityId: string]: {
      [field: string]: {
        old: unknown;
        new: unknown;
      };
    };
  };
}

/** An entity addition */
export interface EntityAddition {
  entityType: string;
  entityId: EntityId;
  data: unknown;
}

/** An entity removal */
export interface EntityRemoval {
  entityType: string;
  entityId: EntityId;
}

/** Default game configuration */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  mode: GAME_MODES.STANDARD,
  depictionMode: DEPICTION_MODES.IMPLICIT,
  debug: false,
  deterministic: false,
  seed: Math.floor(Math.random() * 1000000),
  startingStatPoints: 27,
  maxStartingStat: 4,
  hpPerBody: 3,
  baseHp: 10,
  ironman: false,
  autoSaveFrequency: 5,
  simulationFrequency: 3,
  autoSave: true,
};

/** Ironman game configuration overrides */
export const IRONMAN_CONFIG: Partial<GameConfig> = {
  mode: GAME_MODES.IRONMAN,
  ironman: true,
  autoSaveFrequency: 1,
  deterministic: true,
};

// =============================================================================
// CAMPAIGN / RESPONSE TYPES
// =============================================================================

/** The campaign/session container */
export interface Campaign {
  /** Campaign ID */
  id: EntityId;
  /** Campaign name (derived from character name) */
  name: string;
  /** Creation timestamp */
  createdAt: Timestamp;
  /** Last played timestamp */
  lastPlayedAt: Timestamp;
  /** Current save snapshot */
  currentState: SaveSnapshot;
  /** Previous states for undo */
  stateHistory: StateDiff[];
  /** Settings */
  config: GameConfig;
  /** Whether this campaign is active */
  active: boolean;
  /** Number of sessions played */
  sessionsPlayed: number;
}

/** The response from processing a turn */
export interface TurnResponse {
  /** Scene to display */
  scene: Scene;
  /** World pulse if applicable */
  worldPulse?: WorldPulse;
  /** Roll results from this turn */
  rolls: RollResult[];
  /** New consequences queued */
  newConsequences: Consequence[];
  /** State changes applied */
  stateChanges: StateDiff;
  /** Whether character died this turn */
  characterDied: boolean;
  /** Death record if applicable */
  deathRecord?: DeathRecord;
  /** Messages for the player */
  messages: string[];
  /** Suggested actions for next turn */
  suggestedActions: SuggestedAction[];
}

/** The 8-phase agent flow result */
export interface AgentPhaseResult {
  /** Which phase (1-8) */
  phase: number;
  /** Phase name */
  phaseName: string;
  /** What this phase produced */
  output: unknown;
  /** Any state changes from this phase */
  stateChanges?: StateDiff;
}

// =============================================================================
// NARRATIVE / CONTENT TYPES
// =============================================================================

/** Style constraints for narrative generation */
export interface StyleConstraints {
  /** Tone descriptors */
  tone: string[];
  /** What to avoid */
  avoid: string[];
  /** What to emphasize */
  emphasize: string[];
  /** Sentence complexity (simple, moderate, complex) */
  sentenceComplexity: string;
  /** Vocabulary level */
  vocabularyLevel: string;
  /** Maximum paragraph length */
  maxParagraphLength: number;
}

/** Content validation result */
export interface ContentValidationResult {
  /** Whether content passes validation */
  passes: boolean;
  /** Issues found */
  issues: ContentIssue[];
  /** Suggested rewrite */
  safeRewrite?: string;
  /** Severity of worst issue */
  maxSeverity: 'none' | 'low' | 'medium' | 'high';
  /** Recommended depiction mode */
  recommendedMode: DepictionMode;
}

/** Individual content issue */
export interface ContentIssue {
  /** Category */
  category: ContentCategory;
  /** Description of issue */
  description: string;
  /** Severity */
  severity: 'low' | 'medium' | 'high';
  /** Location in text (character indices) */
  location?: [number, number];
  /** Suggested replacement */
  suggestion?: string;
}

// =============================================================================
// SIMULATION TYPES
// =============================================================================

/** Faction turn decision */
export interface FactionTurn {
  factionId: EntityId;
  actions: FactionAction[];
  stanceChanges: StanceChange[];
  resourceChanges: Partial<FactionResources>;
  goalProgress: GoalProgress[];
}

/** An action taken by a faction */
export interface FactionAction {
  type: string;
  description: string;
  targetId?: EntityId;
  resourcesSpent: Partial<FactionResources>;
  expectedOutcome: string;
}

/** A stance change */
export interface StanceChange {
  targetFactionId: EntityId;
  oldStance: Stance;
  newStance: Stance;
  reason: string;
}

/** Goal progress update */
export interface GoalProgress {
  goalId: EntityId;
  oldProgress: number;
  newProgress: number;
  description: string;
}

/** NPC decision */
export interface NPCDecision {
  npcId: EntityId;
  action: string;
  targetId?: EntityId;
  motivation: string;
  emotionalState: EmotionalState;
  confidence: number;
}

/** Economy tick result */
export interface EconomyTick {
  regionId: EntityId;
  priceChanges: PriceChange[];
  tradeEvents: TradeEvent[];
  overallHealth: number;
}

/** Price change for a commodity */
export interface PriceChange {
  commodity: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
}

/** Trade event */
export interface TradeEvent {
  description: string;
  affectedRegions: EntityId[];
  impact: number;
}

/** Weather tick result */
export interface WeatherTick {
  regionId: EntityId;
  oldWeather: WeatherState;
  newWeather: WeatherState;
  intensity: number;
  temperature: number;
  effects: string[];
}

/** Disease tick result */
export interface DiseaseTick {
  regionId: EntityId;
  oldLevel: DiseaseLevel;
  newLevel: DiseaseLevel;
  spreadToRegions: EntityId[];
  containment: number;
  deaths: number;
}

/** Ecology tick result */
export interface EcologyTick {
  regionId: EntityId;
  populationChange: number;
  wildlifeChanges: string[];
  resourceChanges: string[];
  environmentalEvents: string[];
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/** Game engine error */
export class GameEngineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GameEngineError';
  }
}

/** Validation error */
export class ValidationError extends GameEngineError {
  constructor(
    message: string,
    public readonly field?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

/** State error */
export class StateError extends GameEngineError {
  constructor(
    message: string,
    public readonly entityId?: EntityId,
    public readonly entityType?: string
  ) {
    super(message, 'STATE_ERROR', { entityId, entityType });
    this.name = 'StateError';
  }
}

// =============================================================================
// CONSTANTS / BALANCE NUMBERS
// =============================================================================

/** Human-readable names for result bands */
export const RESULT_BAND_NAMES: Record<string, string> = {
  [RESULT_BANDS.CRITICAL_FAILURE]: 'Critical Failure',
  [RESULT_BANDS.FAILURE]: 'Failure',
  [RESULT_BANDS.PARTIAL_FAILURE]: 'Partial Failure',
  [RESULT_BANDS.SUCCESS_WITH_COST]: 'Success with Cost',
  [RESULT_BANDS.CLEAN_SUCCESS]: 'Clean Success',
  [RESULT_BANDS.STRONG_SUCCESS]: 'Strong Success',
  [RESULT_BANDS.CRITICAL_SUCCESS]: 'Critical Success',
};

/** Result band thresholds for D20 rolls */
export const RESULT_BAND_THRESHOLDS = {
  critical_failure: -Infinity,
  failure: 1,
  partial_failure: 6,
  success_with_cost: 11,
  clean_success: 16,
  strong_success: 21,
  critical_success: 26,
} as const;

/** D100 result thresholds */
export const D100_THRESHOLDS = {
  critical_failure: 96,
  failure: 75,
  partial_failure: 50,
  success_with_cost: 25,
  clean_success: 10,
  strong_success: 5,
  critical_success: 1,
} as const;

/** Cost severity thresholds */
export const COST_SEVERITY_THRESHOLDS = {
  none: -Infinity,
  trivial: 2,
  minor: 5,
  moderate: 8,
  major: 12,
  severe: 16,
  catastrophic: 20,
} as const;

/** Default NPC schedule */
export const DEFAULT_NPC_SCHEDULE: NPCSchedule = {
  entries: {
    6: 'waking up',
    8: 'breakfast and preparations',
    10: 'morning duties',
    12: 'midday meal',
    14: 'afternoon work',
    17: 'evening preparations',
    19: 'evening meal',
    21: 'rest and relaxation',
    23: 'sleeping',
  },
  defaultActivity: 'going about their business',
};

/** Default style constraints */
export const DEFAULT_STYLE_CONSTRAINTS: StyleConstraints = {
  tone: ['dark', 'atmospheric', 'specific', 'grounded'],
  avoid: [
    'purple prose',
    'memes',
    'anachronisms',
    'modern slang',
    'breaking the fourth wall',
    'over-explaining',
  ],
  emphasize: ['sensory details', 'emotional truth', 'physical reality', 'consequences'],
  sentenceComplexity: 'moderate',
  vocabularyLevel: 'elevated but accessible',
  maxParagraphLength: 120,
};

/** Character creation steps */
export const CHARACTER_CREATION_STEPS = [
  'name',
  'form',
  'first_perception',
  'capability_claim',
  'knowledge_posture',
  'optional_details',
] as const;

export type CreationStep = (typeof CHARACTER_CREATION_STEPS)[number];

/** The 8-phase agent flow */
export const AGENT_PHASES = [
  'interpret_input',
  'assess_state',
  'resolve_action',
  'determine_outcome',
  'narrate_result',
  'update_world',
  'check_consequences',
  'generate_scene',
] as const;

export type AgentPhase = (typeof AGENT_PHASES)[number];
