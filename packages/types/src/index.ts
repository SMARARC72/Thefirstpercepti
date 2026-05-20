/**
 * ============================================================================
 * SHARED TYPES — The First Perception
 * ============================================================================
 * Canonical type definitions used across engine, narrative, UI, and audio.
 * @module @first-perception/types
 * @version 2.0.0
 * ============================================================================
 */

import type { RarityTierId, AttunementRequirement } from './items-5e.js';

// =============================================================================
// PRIMITIVES
// =============================================================================

export type UUID = string;

export type ResultBand =
  | "critical_failure"
  | "failure"
  | "partial_failure"
  | "success_with_cost"
  | "clean_success"
  | "strong_success"
  | "critical_success";

export const RESULT_BANDS = [
  "critical_failure",
  "failure",
  "partial_failure",
  "success_with_cost",
  "clean_success",
  "strong_success",
  "critical_success",
] as const;

/**
 * Coarse 4-band roll classification. Maps to TaleTone via rollBandToTaleTone
 * and from the finer-grained 7-band ResultBand via resultBandToRollBand.
 *
 * Phase 8d introduces this as the consistency layer between mechanical
 * outcomes and narrative tone. Phase 9 will adopt it as the return type
 * from rollD20 in the combat rewrite.
 */
export type RollBand = "disaster" | "failure" | "success" | "triumph";

/**
 * Map a coarse RollBand to its canonical narrative TaleTone.
 *
 * Note: TaleTone has 5 values (quiet | warning | danger | success | cosmic)
 * but only 4 of them have a mechanical outcome (RollBand) counterpart.
 * 'quiet' is reserved for passive / non-roll tale entries.
 */
export function rollBandToTaleTone(band: RollBand): TaleTone {
  switch (band) {
    case "disaster":
      return "danger";
    case "failure":
      return "warning";
    case "success":
      return "success";
    case "triumph":
      return "cosmic";
  }
}

/**
 * Collapse the 7-band ResultBand into the coarse 4-band RollBand:
 *   critical_failure | failure          -> disaster
 *   partial_failure  | success_with_cost -> failure
 *   clean_success    | strong_success   -> success
 *   critical_success                    -> triumph
 */
export function resultBandToRollBand(r: ResultBand): RollBand {
  if (r === "critical_failure" || r === "failure") return "disaster";
  if (r === "partial_failure" || r === "success_with_cost") return "failure";
  if (r === "clean_success" || r === "strong_success") return "success";
  return "triumph"; // critical_success
}

export type Severity = "implicit" | "explicit" | "off_screen";

export const SEVERITY_LEVELS = ["implicit", "explicit", "off_screen"] as const;

// =============================================================================
// CHARACTER
// =============================================================================

export type CharacterForm =
  | "human"
  | "half_blood"
  | "warped"
  | "formless"
  | "construct"
  | "spirit_bound";

export type KnowledgePosture =
  | "seeker"
  | "guardian"
  | "destroyer"
  | "maker"
  | "witness"
  | "trickster";

export type Domain =
  | "physical"
  | "social"
  | "metaphysical"
  | "combat"
  | "craft"
  | "stealth"
  | "lore"
  | "wilderness"
  | "intrigue";

export type CoreStat =
  | "body"
  | "grace"
  | "sense"
  | "mind"
  | "will"
  | "presence"
  | "authority"
  | "ruin"
  | "creation";

export const CORE_STATS = [
  "body",
  "grace",
  "sense",
  "mind",
  "will",
  "presence",
  "authority",
  "ruin",
  "creation",
] as const;

export interface Stats extends Record<CoreStat, number> {}

export type HitDie = 'd6' | 'd8' | 'd10' | 'd12';

export interface HitDicePool {
  current: number;
  max: number;
  die: HitDie;
}

export interface AttunementSlots {
  used: number;
  max: number;
}

export interface SpellSlotLevel {
  current: number;
  max: number;
}

/**
 * 5e action economy — what slots remain available this turn.
 *
 * Each turn the player has up to one action, one bonus action, and one
 * reaction. Combat verbs consume a slot; turn-end restores them. Optional
 * on the canonical type so older fixtures and snapshots remain valid;
 * reducers treat a missing field as "all slots available".
 */
export interface ActionEconomy {
  action: boolean;
  bonusAction: boolean;
  reaction: boolean;
}

export interface Player {
  id: UUID;
  name: string;
  form: CharacterForm;
  formLabel: string;
  posture: KnowledgePosture;
  postureLabel: string;
  domain: Domain;
  stats: Stats;
  hp: number;
  maxHp: number;
  focus: number;
  maxFocus: number;
  conditions: Condition[];
  inventory: Item[];
  tags: string[];
  proficiencyBonus: number;
  hitDice: HitDicePool;
  savingThrowProficiencies: ReadonlyArray<CoreStat>;
  attunementSlots: AttunementSlots;
  spellSlots?: Record<number, SpellSlotLevel>;
  actionEconomy?: ActionEconomy;
}

// =============================================================================
// ITEMS
// =============================================================================

export type ItemType = "weapon" | "armor" | "consumable" | "tool" | "key" | "document" | "misc";

export interface ItemRequirements {
  form?: CharacterForm;
  posture?: KnowledgePosture;
  domain?: Domain;
}

export interface Item {
  id: UUID;
  name: string;
  type: ItemType;
  description: string;
  rarity: RarityTierId;
  durability?: number;
  maxDurability?: number;
  charges?: number;
  maxCharges?: number;
  effects?: ItemEffect[];
  equipSlot?: "hand" | "body" | "head" | "accessory";
  magical?: boolean;
  attunement?: AttunementRequirement;
  requires?: ItemRequirements;
}

export interface ItemEffect {
  type: "stat_boost" | "heal" | "damage" | "condition" | "unlock" | "reveal";
  target: string;
  value: number;
  duration?: number;
}

// =============================================================================
// CONDITIONS
// =============================================================================

export type ConditionCategory = "physical" | "mental" | "social" | "magical" | "divine" | "environmental";

export interface Condition {
  id: UUID;
  typeId: string;
  name: string;
  description: string;
  category: ConditionCategory;
  isHarmful: boolean;
  turnsRemaining: number | null; // null = permanent
  stacks: number;
  maxStacks: number;
  effects: ConditionEffect[];
}

export interface ConditionEffect {
  stat?: CoreStat;
  hpPerTurn?: number;
  focusPerTurn?: number;
  modifier?: number;
}

// =============================================================================
// WORLD — LOCATIONS
// =============================================================================

export interface LocationNode {
  id: UUID;
  name: string;
  description: string;
  regionId: UUID;
  exits: Exit[];
  pointsOfInterest: POI[];
  dangerBase: number;
  discovered: boolean;
  investigated: boolean;
  tags: string[];
}

export interface Exit {
  toLocationId: UUID;
  visible: boolean;
  locked?: LockRequirement;
  hiddenDescription?: string;
  travelRisk: number;
  label: string;
}

export interface LockRequirement {
  keyItemId?: UUID;
  skillCheck?: SkillCheck;
  description: string;
}

export interface SkillCheck {
  stat: CoreStat;
  dc: number;
}

export interface POI {
  id: UUID;
  name: string;
  description: string;
  investigated: boolean;
  tags: string[];
}

// =============================================================================
// WORLD — REGION & WEATHER
// =============================================================================

export interface Region {
  id: UUID;
  name: string;
  description: string;
  dangerModifier: number;
  weatherPatterns: WeatherPattern[];
  factions: UUID[]; // faction IDs present
}

export interface WeatherPattern {
  type: string;
  description: string;
  visibilityModifier: number;
  dangerModifier: number;
  durationRange: [number, number]; // min, max turns
}

// =============================================================================
// FACTIONS
// =============================================================================

export type FactionStance = "friendly" | "neutral" | "wary" | "hostile";

export interface Faction {
  id: UUID;
  name: string;
  description: string;
  stance: FactionStance;
  trust: number; // -100 to 100
  fear: number; // 0 to 100
  need: string;
  plan: FactionPlan;
  knownSecrets: string[];
  npcs: UUID[];
}

export interface FactionPlan {
  description: string;
  turnsRemaining: number;
  targetLocationId?: UUID;
  targetNpcId?: UUID;
  visibleToPlayer: boolean;
}

// =============================================================================
// NPCs
// =============================================================================

export type NpcDisposition = "friendly" | "curious" | "neutral" | "wary" | "afraid" | "hostile";

export interface NPC {
  id: UUID;
  name: string;
  role: string;
  description: string;
  disposition: NpcDisposition;
  wants: string;
  secrets: Secret[];
  locationId: UUID;
  factionId?: UUID;
  tags: string[];
  alive: boolean;
  dialogueState: Record<string, unknown>;
}

export interface Secret {
  id: UUID;
  content: string;
  revealed: boolean;
  topicId: string;
  difficulty: number; // DC to discover
}

// =============================================================================
// DICE & ROLLS
// =============================================================================

export interface RollResult {
  id: UUID;
  turn: number;
  command: string;
  domain: Domain;
  dice: number[];
  modifier: number;
  total: number;
  band: ResultBand;
  detail: string;
  seed: number;
}

export interface DiceFormula {
  count: number;
  sides: number;
  modifier: number;
}

// =============================================================================
// NARRATIVE
// =============================================================================

export type TaleTone = "quiet" | "warning" | "danger" | "success" | "cosmic";

export interface TaleEntry {
  id: UUID;
  turn: number;
  title: string;
  body: string;
  tone: TaleTone;
  tags: string[];
}

export interface JournalEntry {
  id: UUID;
  turn: number;
  label: string;
  detail: string;
  category: "perception" | "evidence" | "rumor" | "world" | "npc" | "faction" | "legacy";
}

export interface SuggestedAction {
  label: string;
  command: string;
  domain: Domain;
  riskHint?: string;
  requires?: string;
}

// =============================================================================
// CONSEQUENCES
// =============================================================================

export type ConsequenceType =
  | "damage"
  | "heal"
  | "condition"
  | "faction_shift"
  | "world_event"
  | "death_check"
  | "reveal_exit"
  | "spawn_npc"
  | "move_npc";

export type TriggerKind =
  | "immediate"
  | "turns_remaining"
  | "condition"
  | "location"
  | "action"
  | "random";

export interface Trigger {
  kind: TriggerKind;
  count?: number;
  conditionId?: string;
  locationId?: UUID;
  actionType?: string;
  chance?: number;
  seedOffset?: number;
}

export interface Effect {
  type: ConsequenceType;
  targetId?: UUID;
  value?: number;
  conditionTypeId?: string;
  duration?: number;
  description: string;
}

export interface Consequence {
  id: UUID;
  type: ConsequenceType;
  trigger: Trigger;
  effects: Effect[];
  source: { turn: number; action: string };
  resolved: boolean;
  narrative?: string;
}

// =============================================================================
// STATE PATCHES
// =============================================================================

export type PatchOp = "add" | "remove" | "replace" | "increment" | "append";

export interface StatePatch {
  path: string; // JSON pointer style: /player/hp, /world/danger
  op: PatchOp;
  value?: unknown;
  amount?: number; // for increment
  item?: unknown; // for append
}

// =============================================================================
// DEATH & LEGACY
// =============================================================================

export type DeathVector =
  | "combat"
  | "disease"
  | "exposure"
  | "divine"
  | "betrayal"
  | "suicide"
  | "unknown";

export interface DeathRecord {
  id: UUID;
  characterName: string;
  vector: DeathVector;
  epitaph: string;
  turnsSurvived: number;
  finalLocationId: UUID;
  worldSnapshot: WorldSnapshot;
}

export interface Legacy {
  id: UUID;
  deadCharacter: DeathRecord;
  worldChanges: WorldMutation;
  inheritance: Inheritance;
  createdAt: string;
}

export interface WorldMutation {
  factionShifts: { factionId: UUID; trustDelta: number; fearDelta: number }[];
  rumors: Rumor[];
  locationChanges: { locationId: UUID; tagsAdded: string[]; tagsRemoved: string[] }[];
}

export interface Inheritance {
  item?: Item;
  curse?: Condition;
  reputation?: Record<UUID, number>;
  alteredFactions?: UUID[];
  startingAdvantage?: string;
}

// =============================================================================
// RUMORS
// =============================================================================

export interface Rumor {
  id: UUID;
  content: string;
  sourceNpcId?: UUID;
  sourceFactionId?: UUID;
  belief: number; // 0-100, how widely believed
  truthValue: number; // 0-100, how true it is
  locationsReached: UUID[];
  createdTurn: number;
}

// =============================================================================
// WORLD SNAPSHOT
// =============================================================================

export interface WorldSnapshot {
  seed: number;
  turnCount: number;
  day: number;
  phaseIndex: number;
  locationId: UUID;
  regionId: UUID;
  weather: string;
  danger: number;
  pulse: string;
  crisis: string;
}

// =============================================================================
// SAVE / LOAD
// =============================================================================

export interface SaveSlot {
  id: UUID;
  name: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
  characterName: string;
  thumbnail?: string; // base64 data URI
  data?: string; // serialized save payload
}

export interface SaveSnapshot {
  version: number;
  savedAt: string;
  rngState: number;
  player: Player;
  locations: LocationNode[];
  regions: Region[];
  factions: Faction[];
  npcs: NPC[];
  tale: TaleEntry[];
  journal: JournalEntry[];
  consequences: Consequence[];
  world: WorldSnapshot;
  legacy?: Legacy;
  settings: GameSettings;
}

// =============================================================================
// SETTINGS
// =============================================================================

export interface GameSettings {
  textSpeed: number; // ms per character, 0 = instant
  showRolls: boolean;
  autoSave: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  animationEnabled: boolean;
  reducedMotion: boolean;
  fontSize: "small" | "medium" | "large";
  highContrast: boolean;
  llmEnabled: boolean; // Living World: dynamic NPCs, factions, narrative
}

export const DEFAULT_SETTINGS: GameSettings = {
  textSpeed: 16,
  showRolls: true,
  autoSave: true,
  soundEnabled: true,
  musicEnabled: true,
  animationEnabled: true,
  reducedMotion: false,
  fontSize: "medium",
  highContrast: false,
  llmEnabled: false,
};

// =============================================================================
// GAME STATE
// =============================================================================

export interface WorldState {
  day: number;
  phaseIndex: number;
  location: string;
  region: string;
  weather: string;
  danger: number;
  pulse: string;
  crisis: string;
  seed: number;
  map: MapPoint[];
  phaseName: string;
}

export interface FateRecord {
  turn: number;
  command: string;
  domain: Domain;
  total: number;
  modifier: number;
  band: string;
  detail: string;
}

export interface FactionState {
  id: string;
  name: string;
  stance: "friendly" | "neutral" | "wary" | "hostile";
  trust: number;
  fear: number;
  need: string;
  plan: string;
  // Engine-compatible optional fields
  description?: string;
  category?: string;
  domain?: Domain;
  goals?: unknown[];
  resources?: unknown;
  playerStance?: string;
  factionStances?: Record<string, string>;
  memberIds?: string[];
  controlledLocations?: string[];
  territoryInfluence?: Record<string, number>;
  power?: number;
  active?: boolean;
  publicFace?: string;
  knownSecrets?: string[];
  npcs?: string[];
}

export interface NpcState {
  id: string;
  name: string;
  role: string;
  disposition: string;
  wants: string;
  lastSeen: string;
  // Engine-compatible optional fields
  description?: string;
  factionId?: string;
  locationId?: string;
  stats?: Stats;
  hp?: number;
  maxHp?: number;
  emotionalState?: string;
  desires?: string[];
  fears?: string[];
  knowledge?: string[];
  secrets?: Secret[];
  memories?: unknown[];
  conditions?: Condition[];
  inventory?: Item[];
  alive?: boolean;
  isAnomaly?: boolean;
  schedule?: unknown;
  dialogueTopics?: unknown[];
  voice?: string;
  dialogueState?: Record<string, unknown>;
  tags?: string[];
}

export interface MapPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: "player" | "anomaly" | "npc" | "hazard" | "sanctuary" | "exit" | "poi";
}

export interface CreationState {
  step: 0 | 1 | 2 | 3 | 4 | 5;
  name: string;
  form: CharacterForm | "";
  formDescription: string;
  perception: string;
  dominantSense: string;
  capabilityClaim: string;
  primaryDomain: Domain | "";
  posture: KnowledgePosture | "";
  postureDescription: string;
  optionalDetails: string;
  desiredItem: string;
  fear: string;
  leftBehind: string;
}

export interface GameState {
  seed: number;
  turnCount: number;
  day: number;
  phaseIndex: number;
  phaseName: string;
  player: Player;
  currentLocationId: UUID;
  locations: LocationNode[];
  regions: Region[];
  factions: FactionState[];
  npcs: NpcState[];
  tale: TaleEntry[];
  journal: JournalEntry[];
  fate: FateRecord[];
  consequences: Consequence[];
  rumors: Rumor[];
  suggestedActions: SuggestedAction[];
  lastFeedback: string;
  onboardingDismissed: boolean;
  gameOver: boolean;
  legacy?: Legacy;
  world: WorldState;
}

// =============================================================================
// ACTION RESULT
// =============================================================================

export interface ActionResult {
  patches: StatePatch[];
  rolls: RollResult[];
  narrative: TaleEntry[];
  consequences: Consequence[];
  soundCue?: string;
  animation?: string;
  feedback: string;
  suggestions: SuggestedAction[];
  journal?: JournalEntry;
}

// =============================================================================
// MAP
// =============================================================================

export type MapPointKind = "player" | "anomaly" | "npc" | "hazard" | "sanctuary" | "exit" | "poi";

export interface MapPoint {
  id: UUID;
  label: string;
  x: number; // 0-100 normalized
  y: number;
  kind: MapPointKind;
  targetId?: UUID; // location/npc ID this point represents
}

// =============================================================================
// AUDIO
// =============================================================================

export type AudioLayer = "ambient" | "location" | "weather" | "pulse" | "combat" | "narrative" | "ui";

export interface AudioCue {
  layer: AudioLayer;
  type: "start" | "stop" | "trigger" | "parameter";
  soundId?: string;
  params?: Record<string, number>;
}

// =============================================================================
// UI
// =============================================================================

export type Screen = "title" | "creation" | "gameplay" | "settings" | "legacy" | "game_over";

export type GameTab =
  | "tale"
  | "fate"
  | "sheet"
  | "trove"
  | "status"
  | "world"
  | "factions"
  | "npcs"
  | "codex"
  | "journal";

export interface AppState {
  screen: Screen;
  settings: GameSettings;
  game: GameState | null;
  creation: CreationState;
  activeTab: GameTab;
  commandDraft: string;
  feedback: string;
  hasSave: boolean;
  elapsedMs: number;
  saveSlots: SaveSlot[];
}

// =============================================================================
// LOGGER (re-exported from ./logger)
// =============================================================================
export { getLogger, setLogger, resetLogger } from './logger.js';
export type { Logger, LogLevel, LogContext } from './logger.js';

// =============================================================================
// 5e RULESET (re-exported from ./items-5e, ./conditions-5e)
// =============================================================================
export type {
  RarityTierId,
  RarityTier,
  AttunementRequirement,
  ForgeRecipe,
  ForgeOutcomeKind,
  ForgeOutcome,
} from './items-5e.js';
export type {
  Condition5eId,
  Condition5eCategory,
  SaveAbility,
  Condition5eEffectsAtLevel,
  Condition5eDef,
  ActiveCondition5e,
  ResolvedConditionEffects,
} from './conditions-5e.js';

