export const SAVE_KEY = "the-first-perception.save.v1";

import { loadWorldData, pickStartLocation } from "./data/worldLoader";

export type { Screen, GameTab } from "@first-perception/types";
export type CreationStepIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type CharacterForm =
  | "human"
  | "half_blood"
  | "warped"
  | "formless"
  | "construct"
  | "spirit_bound";

export type KnowledgePosture = "seeker" | "guardian" | "destroyer" | "maker" | "witness" | "trickster";
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

export type Stats = Record<CoreStat, number>;

export interface Option<T extends string = string> {
  value: T;
  label: string;
  description: string;
}

export const FORM_OPTIONS: Option<CharacterForm>[] = [
  { value: "human", label: "Human", description: "Unchanged by the Shattering. Fragile, adaptable, hard to read." },
  { value: "half_blood", label: "Half-Blood", description: "Old powers surface in the pulse, the voice, and the blood." },
  { value: "warped", label: "Warped", description: "Your body remembers the Shattering in ways others cannot ignore." },
  { value: "formless", label: "Formless", description: "Your outline negotiates with the world before it settles." },
  { value: "construct", label: "Construct", description: "Built, rebuilt, or repaired with materials that still dream." },
  { value: "spirit_bound", label: "Spirit-Bound", description: "A second will rides close enough to answer before you do." },
];

export const POSTURE_OPTIONS: Option<KnowledgePosture>[] = [
  { value: "seeker", label: "Seeker", description: "Knowledge must be found, whatever the cost." },
  { value: "guardian", label: "Guardian", description: "Some truths must be kept behind a locked door." },
  { value: "destroyer", label: "Destroyer", description: "Certain truths should not be allowed to survive." },
  { value: "maker", label: "Maker", description: "Knowledge is material. Shape it into something useful." },
  { value: "witness", label: "Witness", description: "Observe. Record. Intervene only when silence becomes a choice." },
  { value: "trickster", label: "Trickster", description: "Truth is a tool, and tools have many handles." },
];

export const DOMAIN_OPTIONS: Option<Domain>[] = [
  { value: "physical", label: "Physical", description: "Endure, climb, carry, break, and survive." },
  { value: "social", label: "Social", description: "Read people, persuade, comfort, or threaten." },
  { value: "metaphysical", label: "Metaphysical", description: "Touch what leaks through the wound in reality." },
  { value: "combat", label: "Combat", description: "Fight cleanly enough to still be standing afterward." },
  { value: "craft", label: "Craft", description: "Repair, improvise, build, and make use of ruins." },
  { value: "stealth", label: "Stealth", description: "Move where attention fails to fasten." },
  { value: "lore", label: "Lore", description: "Name old things and survive the naming." },
  { value: "wilderness", label: "Wilderness", description: "Follow weather, tracks, hunger, and bad ground." },
  { value: "intrigue", label: "Intrigue", description: "Trade favors, secrets, debts, and blame." },
];

export const SENSE_OPTIONS = ["sight", "sound", "touch", "smell", "taste", "memory"] as const;

export const CREATION_STEPS = [
  "Name",
  "Physical Form",
  "First Perception",
  "Capability Claim",
  "Knowledge Posture",
  "Optional Details",
] as const;

export interface GameSettings {
  textSpeed: number;
  showRolls: boolean;
  autoSave: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  animationEnabled: boolean;
  reducedMotion: boolean;
  fontSize: "small" | "medium" | "large";
  highContrast: boolean;
  llmEnabled: boolean;
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

export interface SaveSlot {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
  characterName: string;
  data?: string;
}

export interface CreationState {
  step: CreationStepIndex;
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

import type {
  Player,
  FactionState,
  NpcState,
  TaleEntry,
  FateRecord,
  JournalEntry,
  MapPoint,
  WorldState,
  GameState,
  AppState,
  SuggestedAction,
  Item,
  Condition,
  LocationNode,
  Region,
  Consequence,
  Rumor,
} from "@first-perception/types";

export type { Player as PlayerState, FactionState, NpcState, TaleEntry, FateRecord, JournalEntry, MapPoint, WorldState, GameState, AppState, SuggestedAction, Item, Condition, LocationNode, Region, Consequence, Rumor };

interface SavedPayload {
  version: 1;
  savedAt: string;
  state: Omit<AppState, "hasSave" | "commandDraft" | "feedback">;
}

const DEFAULT_STATS: Stats = {
  body: 1,
  grace: 1,
  sense: 1,
  mind: 1,
  will: 1,
  presence: 1,
  authority: 0,
  ruin: 0,
  creation: 0,
};

const TIME_PHASES = [
  "The Waking Hour",
  "The Ash Hour",
  "The Weeping Hour",
  "The Pale Market",
  "The Bell Without Sound",
  "Deep Night",
];

const PULSE_LINES = [
  "A bell rings under the stones, then denies it.",
  "Fog gathers in doorways that were open a moment ago.",
  "Someone nearby says your name as if reading it from a ledger.",
  "The sunken water climbs one finger-width and stops.",
  "A rumor crosses the district faster than any runner.",
  "The old brickwork exhales warm air and a mineral taste.",
];

const QUICK_ACTIONS = ["Look around", "Listen for trouble", "Approach the fountain", "Speak to the nearest witness", "Wait and watch"];

export function blankCreation(): CreationState {
  return {
    step: 0,
    name: "",
    form: "",
    formDescription: "",
    perception: "",
    dominantSense: "sight",
    capabilityClaim: "",
    primaryDomain: "",
    posture: "",
    postureDescription: "",
    optionalDetails: "",
    desiredItem: "",
    fear: "",
    leftBehind: "",
  };
}

export function createInitialState(): AppState {
  return {
    screen: "title",
    creation: blankCreation(),
    game: null,
    activeTab: "tale",
    commandDraft: "",
    feedback: "",
    hasSave: hasSavedGame(),
    elapsedMs: 0,
    settings: { ...DEFAULT_SETTINGS },
    saveSlots: [],
  };
}

export function hasSavedGame(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveAppState(state: AppState): string {
  const payload: SavedPayload = {
    version: 1,
    savedAt: new Date().toISOString(),
    state: {
      screen: state.screen,
      creation: state.creation,
      game: state.game,
      activeTab: state.activeTab,
      elapsedMs: state.elapsedMs,
      settings: state.settings,
      saveSlots: state.saveSlots,
    },
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  return payload.savedAt;
}

export function loadAppState(): AppState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedPayload>;
    if (parsed.version !== 1 || !parsed.state) return null;
    return {
      screen: parsed.state.screen ?? "title",
      creation: { ...blankCreation(), ...parsed.state.creation },
      game: parsed.state.game ?? null,
      activeTab: parsed.state.activeTab ?? "tale",
      commandDraft: "",
      feedback: "Loaded the last local save.",
      hasSave: true,
      elapsedMs: parsed.state.elapsedMs ?? 0,
      settings: { ...DEFAULT_SETTINGS, ...parsed.state.settings },
      saveSlots: parsed.state.saveSlots ?? [],
    };
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function updateDocumentTitle(state: AppState): void {
  if (state.screen === "creation") {
    document.title = `The First Perception - Creation ${state.creation.step + 1}/6`;
    return;
  }

  if (state.screen === "gameplay" && state.game) {
    document.title = `The First Perception - ${state.game.player.name}, Day ${state.game.world.day}`;
    return;
  }

  document.title = "The First Perception";
}

export function validateCreationStep(creation: CreationState): string | null {
  switch (creation.step) {
    case 0:
      return creation.name.trim().length >= 2 ? null : "Enter a name with at least two characters.";
    case 1:
      return creation.form ? null : "Choose a physical form.";
    case 2:
      return creation.perception.trim().length >= 8 ? null : "Describe the first perception in at least eight characters.";
    case 3:
      if (creation.capabilityClaim.trim().length < 8) return "Describe a capability claim in at least eight characters.";
      return creation.primaryDomain ? null : "Choose the claim's primary domain.";
    case 4:
      return creation.posture ? null : "Choose a knowledge posture.";
    case 5:
      return null;
  }
}

export function createGameFromCreation(creation: CreationState): GameState {
  const form = creation.form || "human";
  const posture = creation.posture || "seeker";
  const domain = creation.primaryDomain || "lore";
  const name = creation.name.trim() || "No One";
  const seed = hashString(`${name}:${form}:${creation.perception}:${domain}:${posture}`);
  const stats = buildStats(form, domain, creation.capabilityClaim);
  const maxHp = 10 + stats.body * 3;
  const maxFocus = 7 + stats.will * 2 + stats.mind;
  const formLabel = optionLabel(FORM_OPTIONS, form);
  const postureLabel = optionLabel(POSTURE_OPTIONS, posture);
  const pulse = pickBySeed(PULSE_LINES, seed + 31);
  const crisis = buildCrisis(creation, seed);

  const worldData = loadWorldData();
  const startLoc = pickStartLocation(seed, worldData.locations);
  const location = startLoc.name;
  const region = worldData.regions.find((r) => r.id === startLoc.regionId)?.name ?? "Unknown";

  // Mark starting location as discovered
  const locations = worldData.locations.map((l) =>
    l.id === startLoc.id ? { ...l, discovered: true } : l
  );

  return {
    seed,
    turnCount: 0,
    day: 1,
    phaseIndex: 0,
    phaseName: TIME_PHASES[0],
    player: {
      id: "player",
      name,
      form,
      formLabel,
      posture,
      postureLabel,
      domain,
      stats,
      hp: maxHp,
      maxHp,
      focus: maxFocus,
      maxFocus,
      tags: [formLabel, postureLabel, domainLabel(domain)],
      inventory: [
        { id: "item-start", name: creation.desiredItem.trim() || "a dull iron token", type: "misc", description: "", rarity: "common" },
        { id: "item-matches", name: "three dry matches", type: "tool", description: "", rarity: "common" },
        { id: "item-testimony", name: "a sealed scrap of testimony", type: "document", description: "", rarity: "common" },
      ],
      conditions: worldData.conditions.filter((c) => c.typeId === "salt_touched"),
      proficiencyBonus: 2,
      hitDice: { current: 1, max: 1, die: "d8" },
      savingThrowProficiencies: [],
      attunementSlots: { used: 0, max: 3 },
      spellSlots: posture === "witness" ? { 1: { current: 2, max: 2 } } : undefined,
    },
    currentLocationId: startLoc.id,
    locations,
    regions: worldData.regions,
    world: {
      day: 1,
      phaseIndex: 0,
      phaseName: TIME_PHASES[0],
      location,
      region,
      weather: pickBySeed(["thick mist", "cold drizzle", "powdered ash", "still air"], seed + 43),
      danger: startLoc.dangerBase,
      pulse,
      crisis,
      seed,
      map: buildMap(location),
    },
    tale: [
      {
        id: "entry-0",
        turn: 0,
        title: "First Arrival",
        body: openingScene(creation, location, region),
        tone: "quiet",
        tags: [],
      },
    ],
    fate: [],
    journal: [
      {
        id: "journal-0",
        turn: 0,
        label: "First perception",
        detail: creation.perception.trim() || "The world arrived as a pressure behind the eyes.",
        category: "perception",
      },
      {
        id: "journal-1",
        turn: 0,
        label: "Starting crisis",
        detail: crisis,
        category: "world",
      },
    ],
    factions: worldData.factions,
    npcs: worldData.npcs,
    consequences: [],
    rumors: [],
    suggestedActions: QUICK_ACTIONS.map((label) => ({ label, command: label.toLowerCase(), domain: "physical" as const })),
    lastFeedback: "World generated. Choose a suggested action or type your own command.",
    onboardingDismissed: false,
    gameOver: false,
  };
}

export function submitCommand(game: GameState, rawCommand: string): GameState {
  const command = rawCommand.trim();
  if (!command) {
    return { ...game, lastFeedback: "Type a command before submitting." };
  }

  const lower = command.toLowerCase();
  if (lower === "help" || lower === "?") {
    return {
      ...game,
      lastFeedback: "Try verbs like look, listen, speak, approach, rest, wait, flee, or attack.",
      suggestedActions: [
        { label: "Look around", command: "look around", domain: "physical" },
        { label: "Speak to the nearest witness", command: "speak to the nearest witness", domain: "social" },
        { label: "Rest in a covered doorway", command: "rest", domain: "physical" },
        { label: "Flee toward the market", command: "flee toward the market", domain: "stealth" },
      ],
    };
  }

  const next = structuredClone(game);
  const domain = inferDomain(lower, game.player.domain);
  const fate = rollFate(game, command, domain);
  const outcome = resolveOutcome(next, command, lower, fate);
  next.turnCount += 1;
  next.world.phaseIndex = (next.world.phaseIndex + 1) % TIME_PHASES.length;
  next.world.phaseName = TIME_PHASES[next.world.phaseIndex];
  if (next.world.phaseIndex === 0) next.world.day += 1;
  next.world.pulse = PULSE_LINES[(game.turnCount + fate.total) % PULSE_LINES.length];
  next.fate = [fate, ...next.fate].slice(0, 12);
  next.tale = [outcome.entry, ...next.tale].slice(0, 20);
  next.lastFeedback = outcome.feedback;
  next.suggestedActions = outcome.suggestions;
  next.onboardingDismissed = true;

  if (outcome.journal) {
    next.journal = [outcome.journal, ...next.journal].slice(0, 16);
  }

  return next;
}

export function advanceAmbientTime(state: AppState, ms: number): AppState {
  const bounded = Number.isFinite(ms) ? Math.max(0, Math.min(ms, 60 * 60 * 1000)) : 0;
  return { ...state, elapsedMs: state.elapsedMs + bounded };
}

export function timeLabel(game: GameState): string {
  return `Day ${game.world.day} — ${game.world.phaseName}`;
}

export function domainLabel(domain: Domain): string {
  const labels: Record<Domain, string> = {
    physical: "Physical", social: "Social", metaphysical: "Metaphysical",
    combat: "Combat", craft: "Craft", stealth: "Stealth",
    lore: "Lore", wilderness: "Wilderness", intrigue: "Intrigue",
  };
  return labels[domain] ?? domain;
}

export function renderStateToText(state: AppState): string {
  const payload = {
    mode: state.screen,
    activeTab: state.activeTab,
    documentTitle: typeof document === "undefined" ? "" : document.title,
    elapsedMs: state.elapsedMs,
    saveAvailable: state.hasSave,
    creation:
      state.screen === "creation"
        ? {
            step: state.creation.step + 1,
            totalSteps: CREATION_STEPS.length,
            stepName: CREATION_STEPS[state.creation.step],
            canContinue: validateCreationStep(state.creation) === null,
            name: state.creation.name || null,
            form: state.creation.form || null,
            posture: state.creation.posture || null,
          }
        : null,
    game: state.game
      ? {
          turn: state.game.turnCount,
          time: `Day ${state.game.world.day} - ${TIME_PHASES[state.game.world.phaseIndex]}`,
          coordinateSystem: "Perception map uses normalized x/y percentages from top-left; x increases right, y increases down.",
          player: {
            name: state.game.player.name,
            hp: state.game.player.hp,
            maxHp: state.game.player.maxHp,
            focus: state.game.player.focus,
            maxFocus: state.game.player.maxFocus,
            form: state.game.player.form,
            posture: state.game.player.posture,
            conditions: state.game.player.conditions,
          },
          world: {
            location: state.game.world.location,
            region: state.game.world.region,
            weather: state.game.world.weather,
            danger: state.game.world.danger,
            pulse: state.game.world.pulse,
            crisis: state.game.world.crisis,
            map: state.game.world.map,
          },
          latestTale: state.game.tale[0] ?? null,
          latestFate: state.game.fate[0] ?? null,
          suggestedActions: state.game.suggestedActions,
          onboardingVisible: !state.game.onboardingDismissed && state.game.turnCount === 0,
          lastFeedback: state.game.lastFeedback,
        }
      : null,
  };

  return JSON.stringify(payload);
}

function optionLabel<T extends string>(options: Option<T>[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function buildStats(form: CharacterForm, domain: Domain, claim: string): Stats {
  const stats: Stats = { ...DEFAULT_STATS };
  const bump = (stat: CoreStat, amount: number) => {
    stats[stat] = clamp(stats[stat] + amount, 0, 5);
  };

  switch (form) {
    case "human":
      bump("mind", 1);
      bump("presence", 1);
      break;
    case "half_blood":
      bump("body", 1);
      bump("sense", 1);
      break;
    case "warped":
      bump("ruin", 2);
      bump("body", 1);
      stats.presence = 0;
      break;
    case "formless":
      bump("grace", 2);
      bump("sense", 1);
      stats.body = 0;
      break;
    case "construct":
      bump("body", 2);
      bump("will", 1);
      stats.grace = 0;
      break;
    case "spirit_bound":
      bump("will", 2);
      bump("sense", 1);
      stats.body = 0;
      break;
  }

  const domainStat: Record<Domain, CoreStat> = {
    physical: "body",
    social: "presence",
    metaphysical: "will",
    combat: "ruin",
    craft: "creation",
    stealth: "grace",
    lore: "mind",
    wilderness: "sense",
    intrigue: "authority",
  };
  bump(domainStat[domain], 2);

  const lowerClaim = claim.toLowerCase();
  if (lowerClaim.includes("fight") || lowerClaim.includes("blade") || lowerClaim.includes("war")) bump("ruin", 1);
  if (lowerClaim.includes("listen") || lowerClaim.includes("see") || lowerClaim.includes("notice")) bump("sense", 1);
  if (lowerClaim.includes("remember") || lowerClaim.includes("know") || lowerClaim.includes("learn")) bump("mind", 1);
  if (lowerClaim.includes("make") || lowerClaim.includes("repair") || lowerClaim.includes("build")) bump("creation", 1);
  if (lowerClaim.includes("lie") || lowerClaim.includes("command") || lowerClaim.includes("lead")) bump("authority", 1);

  return stats;
}

function buildCrisis(creation: CreationState, seed: number): string {
  const fear = creation.fear.trim();
  const leftBehind = creation.leftBehind.trim();
  const base = [
    "The lower cistern has turned black, and the market guards are hiding the sick.",
    "A debt court has opened in the street, judging people by memories they never confessed.",
    "A procession of silent children is walking toward the old breach.",
    "The archive bells are ringing for a keeper who was buried three days ago.",
  ];
  const crisis = pickBySeed(base, seed + 59);
  if (fear) return `${crisis} Your fear of ${fear.toLowerCase()} makes the warning feel personal.`;
  if (leftBehind) return `${crisis} Whatever you left behind - ${leftBehind} - may already be part of it.`;
  return crisis;
}

function openingScene(creation: CreationState, location: string, region: string): string {
  const sense = creation.dominantSense || "sight";
  const perception = trimTerminalPunctuation(creation.perception.trim() || "a broken line of light crossing wet stone");
  return `${location} waits inside ${region}. Your first true perception arrives through ${sense}: ${perception}. People keep their distance, not because they know what you are, but because the world seems to notice you first.`;
}

function buildFactions(seed: number): FactionState[] {
  const names = [
    ["The Drowned Court", "A faction drawn to drowned law and failed vessels."],
    ["The Luminous Archive", "Keepers of bright records in a city that rewrites itself."],
    ["The Umbral Covenant", "Operators who move where public memory thins."],
    ["Azure Merchants' Guild", "Ledger-holders who can buy passage through most locked doors."],
  ];

  return names.map(([name, need], index) => {
    const trust = clamp(((seed >> (index + 2)) % 61) - 20, -50, 50);
    const fear = clamp(15 + ((seed >> (index + 4)) % 66), 0, 100);
    return {
      id: `fac-${index + 1}`,
      name,
      stance: trust > 18 ? "friendly" : trust < -22 ? "hostile" : trust < -5 ? "wary" : "neutral",
      trust,
      fear,
      need,
      plan: ["Observe the newcomer", "Protect the records", "Gather rumors", "Trade with outsiders"][index],
    };
  });
}

function buildNpcs(seed: number, location: string): NpcState[] {
  const suffix = Math.abs(seed % 7);
  const locId = location.toLowerCase().replace(/\s+/g, "_");
  return [
    {
      id: "npc-1",
      name: "Sister Mourn",
      role: "field archivist",
      disposition: "curious",
      wants: "proof that the fountain is remembering names",
      lastSeen: location,
      locationId: locId,
      stats: { body: 2, grace: 2, sense: 3, mind: 3, will: 2, presence: 2, authority: 1, ruin: 0, creation: 1 },
      hp: 8, maxHp: 8,
      dialogueState: { body: 2, grace: 2, ruin: 0, hp: 8 },
      alive: true,
      secrets: [],
    },
    {
      id: "npc-2",
      name: "Fennick the Tongue",
      role: "broker of harmful information",
      disposition: "wary",
      wants: "a secret he can sell twice",
      lastSeen: "under the awning with no rain on it",
      locationId: locId,
      stats: { body: 1, grace: 3, sense: 3, mind: 2, will: 2, presence: 3, authority: 2, ruin: 0, creation: 0 },
      hp: 6, maxHp: 6,
      dialogueState: { body: 1, grace: 3, ruin: 0, hp: 6 },
      alive: true,
      secrets: [],
    },
    {
      id: "npc-3",
      name: `The Foundling ${suffix}`,
      role: "unclaimed witness",
      disposition: "afraid",
      wants: "someone to believe what followed them home",
      lastSeen: "near the locked pump house",
      locationId: locId,
      stats: { body: 1, grace: 2, sense: 2, mind: 1, will: 1, presence: 1, authority: 0, ruin: 0, creation: 0 },
      hp: 5, maxHp: 5,
      dialogueState: { body: 1, grace: 2, ruin: 0, hp: 5 },
      alive: true,
      secrets: [],
    },
  ];
}

function buildMap(location: string): MapPoint[] {
  return [
    { id: "player", label: "You", x: 48, y: 58, kind: "player" },
    { id: "loc-1", label: location, x: 28, y: 35, kind: "anomaly" },
    { id: "npc-1", label: "Witness cluster", x: 64, y: 44, kind: "npc" },
    { id: "haz-1", label: "Thin veil", x: 72, y: 22, kind: "hazard" },
    { id: "safe-1", label: "Covered arcade", x: 37, y: 76, kind: "sanctuary" },
  ];
}

function inferDomain(command: string, fallback: Domain): Domain {
  if (command.includes("attack") || command.includes("fight") || command.includes("strike")) return "combat";
  if (command.includes("speak") || command.includes("ask") || command.includes("bargain")) return "social";
  if (command.includes("hide") || command.includes("sneak") || command.includes("flee")) return "stealth";
  if (command.includes("repair") || command.includes("make") || command.includes("use")) return "craft";
  if (command.includes("read") || command.includes("study") || command.includes("remember")) return "lore";
  if (command.includes("listen") || command.includes("look") || command.includes("examine")) return "wilderness";
  if (command.includes("ritual") || command.includes("spirit") || command.includes("veil")) return "metaphysical";
  if (command.includes("order") || command.includes("threaten") || command.includes("command")) return "intrigue";
  if (command.includes("rest") || command.includes("climb") || command.includes("carry")) return "physical";
  return fallback;
}

function rollFate(game: GameState, command: string, domain: Domain): FateRecord {
  const statByDomain: Record<Domain, CoreStat> = {
    physical: "body",
    social: "presence",
    metaphysical: "will",
    combat: "ruin",
    craft: "creation",
    stealth: "grace",
    lore: "mind",
    wilderness: "sense",
    intrigue: "authority",
  };
  const rng = mulberry32(hashString(`${game.seed}:${game.turnCount}:${command}`));
  const die = Math.floor(rng() * 20) + 1;
  const stat = game.player.stats[statByDomain[domain]];
  const modifier = clamp(stat - 1, -2, 4);
  const total = die + modifier;
  const band =
    total <= 4
      ? "critical failure"
      : total <= 8
        ? "failure"
        : total <= 11
          ? "partial failure"
          : total <= 14
            ? "success with cost"
            : total <= 17
              ? "clean success"
              : total <= 21
                ? "strong success"
                : "critical success";

  return {
    turn: game.turnCount + 1,
    command,
    domain,
    total,
    modifier,
    band,
    detail: `d20 ${die}${modifier >= 0 ? " +" : " "}${modifier} using ${domainLabel(domain)}`,
  };
}

function resolveOutcome(
  game: GameState,
  command: string,
  lower: string,
  fate: FateRecord,
): { entry: TaleEntry; feedback: string; suggestions: SuggestedAction[]; journal?: JournalEntry } {
  const success = fate.total >= 12;
  const dangerShift = fate.total <= 8 ? 8 : fate.total >= 18 ? -5 : 2;
  game.world.danger = clamp(game.world.danger + dangerShift, 0, 100);

  if (lower.includes("rest")) {
    game.player.hp = clamp(game.player.hp + (success ? 3 : 1), 0, game.player.maxHp);
    game.player.focus = clamp(game.player.focus + (success ? 3 : 1), 0, game.player.maxFocus);
    return makeOutcome(
      game,
      fate,
      "A Narrow Shelter",
      success
        ? "You find a dry angle beneath collapsed stone. Your breathing steadies, and the district briefly forgets to punish stillness."
        : "You rest, but not cleanly. Every closed eye contains a street you have not walked yet.",
      ["Look around", "Check inventory", "Listen for trouble", "Speak to the nearest witness"],
      "Rest resolved.",
    );
  }

  if (lower.includes("wait") || lower.includes("listen")) {
    return makeOutcome(
      game,
      fate,
      "The World Moves First",
      success
        ? "You let the hour pass through you. Beneath the public noise, a second rhythm appears: three knocks, a breath, then water moving uphill."
        : "Waiting gives the street permission to change. A shutter opens where there was no window.",
      ["Follow the sound", "Question Sister Mourn", "Approach the fountain", "Flee toward the market"],
      "Time advanced.",
      {
        turn: game.turnCount + 1,
        label: "World pulse",
        detail: game.world.pulse,
      },
    );
  }

  if (lower.includes("speak") || lower.includes("ask") || lower.includes("talk") || lower.includes("bargain")) {
    game.factions[0].trust = clamp(game.factions[0].trust + (success ? 4 : -3), -100, 100);
    return makeOutcome(
      game,
      fate,
      "A Witness Answers",
      success
        ? "The nearest witness gives you a true thing wrapped in a lie: the fountain repeats names only after someone has paid to erase them."
        : "Your question lands badly. The crowd closes around its silence, and someone marks your face into a little book.",
      ["Ask who paid", "Offer a trade", "Examine the book", "Withdraw quietly"],
      "Conversation resolved.",
      {
        turn: game.turnCount + 1,
        label: "Witness statement",
        detail: "The fountain repeats names only after someone has paid to erase them.",
      },
    );
  }

  if (lower.includes("approach") || lower.includes("go") || lower.includes("move") || lower.includes("follow")) {
    game.world.map = game.world.map.map((point) => (point.id === "player" ? { ...point, x: 34, y: 41 } : point));
    return makeOutcome(
      game,
      fate,
      "Closer To The Breach",
      success
        ? "You cross the open stones before the fountain can decide whether you belong. Its water reflects a ceiling that is not above you."
        : "Halfway there, the paving flexes like skin. You reach the fountain, but it has noticed your hesitation.",
      ["Touch the water", "Read the carved names", "Step back", "Call for Sister Mourn"],
      "Movement resolved.",
    );
  }

  if (lower.includes("attack") || lower.includes("fight") || lower.includes("strike")) {
    game.player.hp = clamp(game.player.hp - (success ? 1 : 4), 0, game.player.maxHp);
    if (game.player.hp <= Math.ceil(game.player.maxHp * 0.35) && !game.player.conditions.some((c) => c.name === "Wounded")) {
      game.player.conditions = [
        { id: "cond-wounded", typeId: "wounded", name: "Wounded", description: "Injured in combat.", category: "physical", isHarmful: true, turnsRemaining: null, stacks: 1, maxStacks: 10, effects: [] },
        ...game.player.conditions,
      ];
    }
    return makeOutcome(
      game,
      fate,
      "Violence Answers Violence",
      success
        ? "You act before the threat finishes becoming a shape. It breaks apart into wet ash and a smell like old coins."
        : "The thing you strike learns the shape of your arm. Pain arrives with a precise memory of your childhood door.",
      ["Defend and breathe", "Flee toward the market", "Search the ash", "Call the crowd for help"],
      "Combat resolved.",
    );
  }

  if (lower.includes("flee") || lower.includes("hide") || lower.includes("sneak")) {
    game.world.danger = clamp(game.world.danger + (success ? -10 : 6), 0, 100);
    return makeOutcome(
      game,
      fate,
      "A Smaller Shadow",
      success
        ? "You leave through the moment no one was watching. The district loses you for the length of one held breath."
        : "You run, but the sound of pursuit keeps pace from inside your own chest.",
      ["Catch your breath", "Check who followed", "Look for a safer route", "Wait and watch"],
      "Escape attempt resolved.",
    );
  }

  if (lower.includes("look") || lower.includes("examine") || lower.includes("perceive") || lower.includes("read")) {
    return makeOutcome(
      game,
      fate,
      "A Detail Becomes A Door",
      success
        ? "The scene sharpens: a drain clogged with violet thread, a court seal scratched into the fountain lip, and one dry footprint pointing away."
        : "You find details, but they arrange themselves into the wrong conclusion before you can stop them.",
      ["Follow the dry footprint", "Inspect the court seal", "Pull the violet thread", "Ask who carved the names"],
      "Investigation resolved.",
      {
        turn: game.turnCount + 1,
        label: "Perceived evidence",
        detail: "Violet thread, a scratched court seal, and a dry footprint near the fountain.",
      },
    );
  }

  return makeOutcome(
    game,
    fate,
    "An Unusual Attempt",
    success
      ? `You try to ${command}. The world does not understand at first, which gives you just enough room to make the attempt real.`
      : `You try to ${command}. The intent is clear, but the district extracts a cost before allowing it to matter.`,
    ["Look around", "Try a simpler version", "Ask for help", "Wait and watch"],
    "Command resolved.",
  );
}

function makeOutcome(
  game: GameState,
  fate: FateRecord,
  title: string,
  body: string,
  suggestions: string[],
  feedback: string,
  journal?: Omit<JournalEntry, "id" | "category"> & { category?: JournalEntry["category"] },
): { entry: TaleEntry; feedback: string; suggestions: SuggestedAction[]; journal?: JournalEntry } {
  const tone: TaleEntry["tone"] = fate.total <= 8 ? "danger" : fate.total <= 11 ? "warning" : fate.total >= 18 ? "success" : "quiet";
  const entry: TaleEntry = {
    id: `entry-${game.turnCount + 1}-${Date.now()}`,
    turn: game.turnCount + 1,
    title,
    body: `${body} (${fate.band}; ${fate.detail}.)`,
    tone,
    tags: [],
  };
  const mappedSuggestions: SuggestedAction[] = suggestions.map((label) => ({
    label,
    command: label.toLowerCase(),
    domain: "physical",
  }));
  const mappedJournal: JournalEntry | undefined = journal
    ? { ...journal, id: `journal-${game.turnCount + 1}-${Date.now()}`, category: journal.category ?? "world" }
    : undefined;
  return {
    entry,
    feedback: `${feedback} ${fate.band}, total ${fate.total}.`,
    suggestions: mappedSuggestions,
    journal: mappedJournal,
  };
}

function pickBySeed<T>(values: T[], seed: number): T {
  return values[Math.abs(seed) % values.length];
}

function hashString(value: string): number {
  let hash = 1779033703 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return Math.abs(hash >>> 0);
}

function mulberry32(seed: number): () => number {
  let current = seed >>> 0;
  return () => {
    current += 0x6d2b79f5;
    let next = current;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function trimTerminalPunctuation(value: string): string {
  return value.replace(/[.!?]+$/g, "");
}
