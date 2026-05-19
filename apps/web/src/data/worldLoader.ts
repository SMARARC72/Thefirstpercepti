import type {
  LocationNode,
  Region,
  FactionState,
  NpcState,
  Exit,
  POI,
  Condition,
  Item,
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

function mapExits(raw: any[]): Exit[] {
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

function mapPois(raw: any[]): POI[] {
  return raw.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    investigated: p.investigated ?? false,
    tags: p.tags ?? [],
  }));
}

function mapLocations(raw: any[]): LocationNode[] {
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

function mapFactions(raw: any[]): FactionState[] {
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

function mapNpcs(raw: any[]): NpcState[] {
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
    secrets: (n.secrets ?? []).map((s: any) => ({
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

function mapConditions(raw: any[]): Condition[] {
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
    effects: (c.effects ?? []).map((e: any) => ({
      stat: e.stat,
      modifier: e.modifier ?? 0,
      hpPerTurn: e.hpPerTurn,
      focusPerTurn: e.focusPerTurn,
    })),
  }));
}

function mapItems(raw: any[]): Item[] {
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
  const locations = mapLocations(locationsData as any[]);
  const regions = mapRegionsFromLocations(locations);
  const factions = mapFactions(factionsData as any[]);
  const npcs = mapNpcs(npcsData as any[]);
  const conditions = mapConditions(conditionsData as any[]);
  const items = mapItems(itemsData as any[]);
  return { locations, regions, factions, npcs, conditions, items };
}

export function pickStartLocation(seed: number, locations: LocationNode[]): LocationNode {
  const starters = locations.filter((l) => l.discovered);
  if (starters.length > 0) {
    return starters[Math.abs(seed) % starters.length];
  }
  return locations[0];
}
