/**
 * Shared GameState fixtures for reducer tests. Builders return deep
 * copies so a test that mutates state can't leak into the next one.
 * `seed` defaults to 12345 — every test that needs deterministic
 * rolls overrides it.
 */
import type {
  GameState,
  LocationNode,
  NpcState,
  Player,
  Region,
  FactionState,
  CoreStat,
  Stats,
} from "@first-perception/types";

export function makeStats(overrides: Partial<Stats> = {}): Stats {
  return {
    body: 3,
    grace: 3,
    sense: 3,
    mind: 3,
    will: 3,
    presence: 3,
    authority: 1,
    ruin: 1,
    creation: 1,
    ...overrides,
  };
}

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "player",
    name: "Test",
    form: "human",
    formLabel: "Human",
    posture: "seeker",
    postureLabel: "Seeker",
    domain: "lore",
    stats: makeStats(),
    hp: 10,
    maxHp: 10,
    focus: 6,
    maxFocus: 6,
    tags: ["Human", "Seeker"],
    inventory: [
      { id: "item-token", name: "iron token", type: "misc", description: "" },
    ],
    conditions: [],
    ...overrides,
  };
}

export function makeRegion(overrides: Partial<Region> = {}): Region {
  return {
    id: "reg-greywake",
    name: "Greywake",
    description: "",
    dangerModifier: 0,
    weatherPatterns: ["mist"],
    factions: [],
    ...overrides,
  };
}

export function makeLocation(overrides: Partial<LocationNode> = {}): LocationNode {
  return {
    id: "loc-fountain",
    name: "The Sunken Fountain",
    description: "A fountain underwater for years.",
    regionId: "reg-greywake",
    exits: [
      {
        toLocationId: "loc-market",
        visible: true,
        label: "To Greywake Market",
        travelRisk: 20,
      },
      {
        toLocationId: "loc-breach",
        visible: false,
        label: "To the Old Breach",
        travelRisk: 60,
        hiddenDescription: "Only visible at Deep Night.",
      },
    ],
    pointsOfInterest: [],
    dangerBase: 20,
    discovered: true,
    investigated: false,
    tags: ["water"],
    ...overrides,
  };
}

export function makeNpc(overrides: Partial<NpcState> = {}): NpcState {
  return {
    id: "npc-mourn",
    name: "Sister Mourn",
    role: "field archivist",
    disposition: "curious",
    wants: "proof the fountain remembers names",
    lastSeen: "The Sunken Fountain",
    locationId: "loc-fountain",
    stats: makeStats({ body: 2, grace: 2 }),
    hp: 8,
    maxHp: 8,
    dialogueState: { body: 2, grace: 2, ruin: 0, hp: 8 },
    alive: true,
    secrets: [],
    ...overrides,
  };
}

export function makeFaction(overrides: Partial<FactionState> = {}): FactionState {
  return {
    id: "fac-archive",
    name: "The Luminous Archive",
    stance: "neutral",
    trust: 0,
    fear: 10,
    need: "preserve records",
    plan: "observe",
    knownSecrets: [],
    npcs: [],
    ...overrides,
  };
}

export interface GameFixtureOptions {
  player?: Partial<Player>;
  locations?: LocationNode[];
  npcs?: NpcState[];
  factions?: FactionState[];
  seed?: number;
  turnCount?: number;
  currentLocationId?: string;
}

export function makeGameState(options: GameFixtureOptions = {}): GameState {
  const fountain = makeLocation();
  const market = makeLocation({
    id: "loc-market",
    name: "Greywake Market",
    discovered: false,
    exits: [
      {
        toLocationId: "loc-fountain",
        visible: true,
        label: "Back to the Sunken Fountain",
        travelRisk: 20,
      },
    ],
  });
  const breach = makeLocation({
    id: "loc-breach",
    name: "The Old Breach",
    discovered: false,
    dangerBase: 80,
    exits: [],
  });
  const region = makeRegion();
  const npcMourn = makeNpc();
  const npcFennick = makeNpc({
    id: "npc-fennick",
    name: "Fennick the Tongue",
    disposition: "wary",
    dialogueState: { body: 1, grace: 3, ruin: 0, hp: 6 },
  });

  return {
    seed: options.seed ?? 12345,
    turnCount: options.turnCount ?? 0,
    day: 1,
    phaseIndex: 0,
    phaseName: "The Waking Hour",
    player: makePlayer(options.player),
    currentLocationId: options.currentLocationId ?? "loc-fountain",
    locations: options.locations ?? [fountain, market, breach],
    regions: [region],
    world: {
      day: 1,
      phaseIndex: 0,
      phaseName: "The Waking Hour",
      location: fountain.name,
      region: region.name,
      weather: "thick mist",
      danger: 20,
      pulse: "A bell rings under the stones, then denies it.",
      crisis: "The lower cistern has turned black.",
      seed: options.seed ?? 12345,
      map: [],
    },
    tale: [],
    fate: [],
    journal: [],
    factions: options.factions ?? [makeFaction()],
    npcs: options.npcs ?? [npcMourn, npcFennick],
    consequences: [],
    rumors: [],
    suggestedActions: [],
    lastFeedback: "",
    onboardingDismissed: false,
    gameOver: false,
  };
}

export const STATS: CoreStat[] = [
  "body",
  "grace",
  "sense",
  "mind",
  "will",
  "presence",
  "authority",
  "ruin",
  "creation",
];
