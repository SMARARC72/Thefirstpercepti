import type {
  LocationNode,
  Region,
  FactionState,
  NpcState,
  Exit,
  POI,
  Condition,
  ConditionEffect,
  Item,
  LockRequirement,
  SkillCheck,
} from "@first-perception/types";
import locationsData from "./locations.json";
import factionsData from "./factions.json";
import npcsData from "./npcs.json";
import conditionsData from "./conditions.json";
import itemsData from "./items.json";

export interface WorldData {
  locations: LocationNode[];
  regions: Region[];
  factions: FactionState[];
  npcs: NpcState[];
  conditions: Condition[];
  items: Item[];
}

// Raw JSON shapes — fields match the on-disk content/world-data/*.json files.
// Everything optional here is filled with a default by the mappers below.
// Raw locked shape mirrors LockRequirement; skillCheck must use CoreStat
// since the runtime engine indexes player.stats[skillCheck.stat].
interface RawLocked extends Partial<LockRequirement> {
  description: string;
  skillCheck?: SkillCheck;
}

interface RawExit {
  toLocationId: string;
  label: string;
  visible?: boolean;
  travelRisk?: number;
  locked?: RawLocked;
  hiddenDescription?: string;
}

interface RawPoi {
  id: string;
  name: string;
  description: string;
  investigated?: boolean;
  tags?: string[];
}

interface RawLocation {
  id: string;
  name: string;
  description: string;
  regionId: string;
  exits?: RawExit[];
  pointsOfInterest?: RawPoi[];
  dangerBase?: number;
  discovered?: boolean;
  investigated?: boolean;
  tags?: string[];
}

interface RawFaction {
  id: string;
  name: string;
  stance?: FactionState["stance"];
  trust?: number;
  fear?: number;
  need?: string;
  plan?: { description?: string };
  knownSecrets?: string[];
  npcs?: string[];
}

interface RawSecret {
  id: string;
  content: string;
  revealed?: boolean;
  topicId?: string;
  difficulty?: number;
}

interface RawNpc {
  id: string;
  name: string;
  role: string;
  disposition?: string;
  wants?: string;
  locationId?: string;
  factionId?: string;
  description?: string;
  secrets?: RawSecret[];
  tags?: string[];
  alive?: boolean;
  dialogueState?: Record<string, number>;
  stats?: NpcState["stats"];
  hp?: number;
  maxHp?: number;
}

interface RawConditionEffect extends Partial<ConditionEffect> {
  // Authored content effects use the same shape as runtime ConditionEffect.
  // Every field is optional in JSON; runtime defaults are applied below.
}

interface RawCondition {
  id: string;
  typeId: string;
  name: string;
  description: string;
  category?: Condition["category"];
  isHarmful?: boolean;
  turnsRemaining?: number | null;
  stacks?: number;
  maxStacks?: number;
  effects?: RawConditionEffect[];
}

interface RawItem {
  id: string;
  name: string;
  type?: Item["type"];
  description?: string;
  durability?: number;
  maxDurability?: number;
  charges?: number;
  maxCharges?: number;
  effects?: Item["effects"];
  equipSlot?: Item["equipSlot"];
}

function mapExits(raw: RawExit[]): Exit[] {
  return raw.map((e) => ({
    toLocationId: e.toLocationId,
    visible: e.visible ?? true,
    label: e.label,
    travelRisk: e.travelRisk ?? 10,
    locked: e.locked
      ? {
          description: e.locked.description,
          keyItemId: e.locked.keyItemId,
          skillCheck: e.locked.skillCheck,
        }
      : undefined,
    hiddenDescription: e.hiddenDescription,
  }));
}

function mapPois(raw: RawPoi[]): POI[] {
  return raw.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    investigated: p.investigated ?? false,
    tags: p.tags ?? [],
  }));
}

function mapLocations(raw: RawLocation[]): LocationNode[] {
  return raw.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    regionId: l.regionId,
    exits: mapExits(l.exits ?? []),
    pointsOfInterest: mapPois(l.pointsOfInterest ?? []),
    dangerBase: l.dangerBase ?? 20,
    discovered: l.discovered ?? false,
    investigated: l.investigated ?? false,
    tags: l.tags ?? [],
  }));
}

function mapRegionsFromLocations(locations: LocationNode[]): Region[] {
  const regionMap = new Map<string, Region>();
  for (const loc of locations) {
    if (!regionMap.has(loc.regionId)) {
      regionMap.set(loc.regionId, {
        id: loc.regionId,
        name: loc.regionId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: "",
        dangerModifier: 0,
        weatherPatterns: [],
        factions: [],
      });
    }
  }
  return Array.from(regionMap.values());
}

function mapFactions(raw: RawFaction[]): FactionState[] {
  return raw.map((f) => ({
    id: f.id,
    name: f.name,
    stance: f.stance ?? "neutral",
    trust: f.trust ?? 0,
    fear: f.fear ?? 0,
    need: f.need ?? "survive",
    plan: f.plan?.description ?? "No active plan",
    knownSecrets: f.knownSecrets ?? [],
    npcs: f.npcs ?? [],
  }));
}

function mapNpcs(raw: RawNpc[]): NpcState[] {
  return raw.map((n) => ({
    id: n.id,
    name: n.name,
    role: n.role,
    disposition: n.disposition ?? "neutral",
    wants: n.wants ?? "unknown",
    lastSeen: n.locationId ?? "unknown",
    locationId: n.locationId,
    factionId: n.factionId,
    description: n.description,
    secrets: (n.secrets ?? []).map((s) => ({
      id: s.id,
      content: s.content,
      revealed: s.revealed ?? false,
      topicId: s.topicId ?? "general",
      difficulty: s.difficulty ?? 10,
    })),
    tags: n.tags ?? [],
    alive: n.alive ?? true,
    dialogueState: n.dialogueState ?? {},
    stats: n.stats,
    hp: n.hp,
    maxHp: n.maxHp,
  }));
}

function mapConditions(raw: RawCondition[]): Condition[] {
  return raw.map((c) => ({
    id: c.id,
    typeId: c.typeId,
    name: c.name,
    description: c.description,
    category: c.category ?? "physical",
    isHarmful: c.isHarmful ?? true,
    turnsRemaining: c.turnsRemaining ?? null,
    stacks: c.stacks ?? 1,
    maxStacks: c.maxStacks ?? 10,
    effects: (c.effects ?? []).map<ConditionEffect>((e) => ({
      stat: e.stat,
      modifier: e.modifier ?? 0,
      hpPerTurn: e.hpPerTurn,
      focusPerTurn: e.focusPerTurn,
    })),
  }));
}

function mapItems(raw: RawItem[]): Item[] {
  return raw.map((i) => ({
    id: i.id,
    name: i.name,
    type: i.type ?? "misc",
    description: i.description ?? "",
    durability: i.durability,
    maxDurability: i.maxDurability,
    charges: i.charges,
    maxCharges: i.maxCharges,
    effects: i.effects,
    equipSlot: i.equipSlot,
  }));
}

export function loadWorldData(): WorldData {
  const locations = mapLocations(locationsData as RawLocation[]);
  const regions = mapRegionsFromLocations(locations);
  const factions = mapFactions(factionsData as RawFaction[]);
  const npcs = mapNpcs(npcsData as RawNpc[]);
  const conditions = mapConditions(conditionsData as RawCondition[]);
  const items = mapItems(itemsData as RawItem[]);
  return { locations, regions, factions, npcs, conditions, items };
}

export function pickStartLocation(seed: number, locations: LocationNode[]): LocationNode {
  const starters = locations.filter((l) => l.discovered);
  if (starters.length > 0) {
    return starters[Math.abs(seed) % starters.length];
  }
  return locations[0];
}
