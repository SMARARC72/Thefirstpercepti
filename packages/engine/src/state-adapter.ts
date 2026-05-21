/**
 * State adapter: bridge between old StateEngine and new GameState.
 */
import type {
  GameState,
  Player,
  LocationNode,
  Exit,
  RegionState,
  FactionState,
  NpcState,
  ConditionInstance,
  Item,
  ConsequenceState,
  Trigger,
  Effect,
  TaleEntry,
  JournalEntry,
  SuggestedAction,
  RollResult,
  StatePatch,
  WeatherPattern,
} from '@first-perception/types';
import type {
  Player as OldPlayer,
  Location as OldLocation,
  Region as OldRegion,
  Faction as OldFaction,
  NPC as OldNPC,
  Condition as OldCondition,
  Item as OldItem,
  Consequence as OldConsequence,
  Scene as OldScene,
  GameConfig as OldGameConfig,
  RollResult as OldRollResult,
  JournalEntry as OldJournalEntry,
  SuggestedAction as OldSuggestedAction,
  WorldState as OldWorldState,
} from './engine-types';
import { StateEngine } from './engine/StateEngine';

let _idCounter = 0;
function uuid(): string {
  _idCounter++;
  return `uuid-${_idCounter}`;
}

export function resetUuidCounter(): void {
  _idCounter = 0;
}

function oldConditionToNew(old: OldCondition): ConditionInstance {
  const categoryMap: Record<string, ConditionInstance['category']> = {
    injured: 'physical',
    wounded: 'physical',
    critical: 'physical',
    dying: 'physical',
    poisoned: 'physical',
    diseased: 'physical',
    cursed: 'magical',
    blessed: 'divine',
    exhausted: 'physical',
    inspired: 'mental',
    frightened: 'mental',
    hidden: 'environmental',
    exposed: 'environmental',
    restrained: 'physical',
    empowered: 'magical',
    marked: 'magical',
    haunted: 'magical',
    obsessed: 'mental',
  };
  return {
    id: uuid(),
    typeId: old.type,
    name: old.type,
    description: old.description,
    category: categoryMap[old.type] ?? 'physical',
    isHarmful: old.type !== 'blessed' && old.type !== 'inspired' && old.type !== 'empowered' && old.type !== 'hidden',
    turnsRemaining: old.remaining === -1 ? null : old.remaining,
    stacks: old.severity,
    maxStacks: 10,
    effects: Object.entries(old.statModifiers).map(([stat, value]) => ({
      stat: stat as ConditionInstance['effects'][number]['stat'],
      modifier: value,
    })),
  };
}

function newConditionToOld(n: ConditionInstance): OldCondition {
  const statModifiers: Record<string, number> = {};
  for (const eff of n.effects) {
    if (eff.stat) statModifiers[eff.stat] = (statModifiers[eff.stat] ?? 0) + (eff.modifier ?? 0);
  }
  return {
    type: n.typeId as OldCondition['type'],
    description: n.description,
    severity: n.stacks,
    appliedAt: Date.now(),
    duration: n.turnsRemaining ?? -1,
    remaining: n.turnsRemaining ?? -1,
    source: 'adapter',
    statModifiers,
  };
}

function oldItemToNew(old: OldItem): Item {
  // v0.6 subtype enum drops "misc"/"document"; map legacy categories to the
  // closest v0.6 equivalent. "trinket" is the catch-all for non-functional
  // unique objects; "book" replaces "document" for written matter.
  const typeMap: Record<string, Item['type']> = {
    weapon: 'weapon',
    armor: 'armor',
    tool: 'tool',
    consumable: 'consumable',
    material: 'trinket',
    lore: 'book',
    currency: 'currency_token',
    key: 'key',
    clothing: 'armor',
    jewelry: 'trinket',
    anomaly: 'trinket',
  };
  const charges = old.maxUses > 0
    ? { current: old.usesRemaining, max: old.maxUses }
    : undefined;
  // v0.6 BaseItem has no description / durability / structured-effects fields;
  // those live on either the per-subtype interface or are encoded as plain
  // English in effects_on_*. The adapter intentionally drops them on conversion.
  return {
    item_id: old.id,
    name: old.name,
    type: typeMap[old.category] ?? 'trinket',
    rarity: 'common',
    charges,
    equip_slot: old.slot as Item['equip_slot'],
  } as Item;
}

function newItemToOld(n: Item): OldItem {
  return {
    id: n.item_id,
    name: n.name,
    description: n.name,
    category: 'tool' as OldItem['category'],
    statModifiers: {},
    effects: [],
    equippable: Boolean(n.equip_slot),
    equipped: false,
    slot: n.equip_slot ?? undefined,
    value: 0,
    weight: 1,
    maxUses: n.charges?.max ?? -1,
    usesRemaining: n.charges?.current ?? -1,
    unique: false,
    tags: n.type ? [n.type] : [],
  };
}

export function oldPlayerToNewPlayer(old: OldPlayer): Player {
  // The engine-internal Player now carries the 5e schema fields directly,
  // so the converter passes them through. Older snapshots that pre-date
  // the bridge growth may arrive without them; fall back to the same
  // defaults CharacterCreation seeds.
  return {
    id: old.id,
    name: old.name,
    form: old.form,
    formLabel: old.form,
    posture: old.knowledgePosture,
    postureLabel: old.knowledgePosture,
    domain: 'physical',
    stats: old.stats,
    hp: old.hp,
    maxHp: old.maxHp,
    focus: old.maxHp,
    maxFocus: old.maxHp,
    conditions: old.conditions.map(oldConditionToNew),
    inventory: old.inventory.map(oldItemToNew),
    tags: [],
    proficiencyBonus: old.proficiencyBonus ?? 2,
    hitDice: old.hitDice ?? { current: 1, max: 1, die: 'd8' },
    savingThrowProficiencies: old.savingThrowProficiencies ?? [],
    attunementSlots: old.attunementSlots ?? { used: 0, max: 3 },
    spellSlots: old.spellSlots,
    actionEconomy: old.actionEconomy ?? { action: true, bonusAction: true, reaction: true },
  };
}

export function newPlayerToOldPartial(n: Player): Partial<OldPlayer> {
  return {
    hp: n.hp,
    maxHp: n.maxHp,
    conditions: n.conditions.map(newConditionToOld),
    inventory: n.inventory.map(newItemToOld),
  };
}

function oldLocationToNew(old: OldLocation): LocationNode {
  return {
    id: old.id,
    name: old.name,
    description: old.description,
    regionId: old.regionId,
    exits: old.connections.map((c): Exit => ({
      toLocationId: c.targetId,
      visible: !c.hidden,
      travelRisk: c.difficulty * 10,
      label: c.description,
      locked: c.requiredConditions ? {
        description: `Requires: ${c.requiredConditions.join(', ')}`,
      } : undefined,
    })),
    pointsOfInterest: old.hiddenFeatures.map((hf) => ({
      id: uuid(),
      name: 'Hidden Feature',
      description: hf.description,
      investigated: hf.found,
      tags: [],
    })),
    dangerBase: (10 - old.safetyLevel) * 10,
    discovered: old.discovered,
    investigated: old.explored,
    tags: old.landmarks,
  };
}

export function newLocationToOldPartial(n: LocationNode): Partial<OldLocation> {
  return {
    discovered: n.discovered,
    explored: n.investigated,
    connections: n.exits.map((e) => ({
      targetId: e.toLocationId,
      description: e.label,
      hidden: !e.visible,
      difficulty: Math.round(e.travelRisk / 10),
    })),
  };
}

function oldRegionToNew(old: OldRegion): RegionState {
  const weatherPattern: WeatherPattern = {
    type: old.weather,
    description: `Current weather: ${old.weather}`,
    visibilityModifier: old.weatherIntensity > 5 ? -2 : 0,
    dangerModifier: old.weatherIntensity > 7 ? 2 : 0,
    durationRange: [2, 5],
  };
  return {
    id: old.id,
    name: old.name,
    description: old.description,
    dangerModifier: old.dangerLevel,
    weatherPatterns: [weatherPattern],
    factions: Object.entries(old.factionInfluence)
      .filter(([, v]) => v > 0)
      .map(([id]) => id),
  };
}

function oldFactionToNew(old: OldFaction): FactionState {
  return {
    id: old.id,
    name: old.name,
    stance: (old.playerStance === 'hostile' || old.playerStance === 'suspicious')
      ? 'hostile'
      : (old.playerStance === 'friendly' || old.playerStance === 'allied')
        ? 'friendly'
        : 'neutral',
    trust: old.playerStance === 'allied' ? 50 : old.playerStance === 'friendly' ? 20 : old.playerStance === 'hostile' ? -50 : 0,
    fear: old.power > 5 ? 30 : 10,
    need: old.goals.find((g) => !g.secret)?.description ?? 'survive',
    plan: old.goals[0]?.description ?? 'No active plan',
    knownSecrets: old.secrets,
    npcs: old.memberIds,
  };
}

function oldNpcToNew(old: OldNPC): NpcState {
  return {
    id: old.id,
    name: old.name,
    role: old.role,
    disposition: old.disposition === 'friendly' ? 'friendly' : old.disposition === 'curious' ? 'curious' : old.disposition === 'wary' ? 'wary' : old.disposition === 'hateful' || old.disposition === 'unfriendly' ? 'hostile' : 'neutral',
    wants: old.desires[0] ?? 'unknown',
    lastSeen: old.locationId,
    locationId: old.locationId,
    factionId: old.factionId,
    alive: old.alive,
    dialogueState: {},
    description: old.description,
    secrets: old.secrets.map((s, i) => ({
      id: `secret-${old.id}-${i}`,
      content: s,
      revealed: false,
      topicId: 'general',
      difficulty: 10,
    })),
    tags: old.isAnomaly ? ['anomaly'] : [],
  };
}

function oldConsequenceToNew(old: OldConsequence): ConsequenceState {
  const trigger: Trigger = {
    kind: old.trigger.type === 'time' ? 'turns_remaining'
      : old.trigger.type === 'action' ? 'action'
      : old.trigger.type === 'condition' ? 'condition'
      : old.trigger.type === 'location' ? 'location'
      : old.trigger.type === 'random' ? 'random'
      : 'immediate',
    count: old.trigger.turnsRemaining,
    conditionId: old.trigger.type === 'condition' ? old.trigger.condition : undefined,
    locationId: old.trigger.type === 'location' ? old.trigger.condition : undefined,
    actionType: old.trigger.type === 'action' ? old.trigger.condition : undefined,
    chance: old.trigger.chancePerTurn,
  };

  const effects: Effect[] = [];
  if (old.effect.statChanges) {
    effects.push({
      type: 'damage',
      description: old.effect.description,
    });
  }
  if (old.effect.conditions) {
    for (const ct of old.effect.conditions) {
      effects.push({
        type: 'condition',
        conditionTypeId: ct,
        description: `Apply condition: ${ct}`,
      });
    }
  }
  if (effects.length === 0) {
    effects.push({
      type: 'world_event',
      description: old.effect.description,
    });
  }

  return {
    id: old.id,
    type: 'world_event',
    trigger,
    effects,
    source: { turn: 0, action: old.source },
    resolved: old.processed,
    narrative: old.description,
  };
}

function oldRollToNew(old: OldRollResult, turn: number, command: string): RollResult {
  return {
    id: old.id,
    turn,
    command,
    domain: 'physical',
    dice: old.dice,
    modifier: old.totalModifier,
    total: old.finalResult,
    band: old.band,
    detail: old.description,
    seed: 0,
  };
}

function oldJournalToNew(old: OldJournalEntry): JournalEntry {
  return {
    id: old.id,
    turn: old.day,
    label: old.entryType,
    detail: old.text,
    category: 'perception',
  };
}

function oldSuggestedActionToNew(old: OldSuggestedAction): SuggestedAction {
  return {
    label: old.description,
    command: old.target ? `${old.actionType} ${old.target}` : old.actionType,
    domain: 'physical',
    riskHint: old.consequenceHint,
  };
}

export function buildGameState(engine: StateEngine, seed: number, turnCount: number): GameState {
  const oldPlayer = engine.getPlayer();
  const oldLocations = engine.getAllLocations();
  const oldRegions = engine.getAllRegions();
  const oldFactions = engine.getAllFactions();
  const oldNpcs = engine.getAllNPCs();
  const oldConsequences = engine.getAllConsequences();
  const oldWorld = engine.getWorldState();
  const oldJournal = engine.getJournal ? engine.getJournal() : [];

  return {
    seed,
    turnCount,
    day: oldWorld.day,
    phaseIndex: 0,
    phaseName: 'playing',
    player: oldPlayer ? oldPlayerToNewPlayer(oldPlayer) : (null as unknown as Player),
    currentLocationId: oldPlayer?.locationId ?? oldLocations[0]?.id ?? 'loc-none',
    locations: oldLocations.map(oldLocationToNew),
    regions: oldRegions.map(oldRegionToNew),
    factions: oldFactions.map(oldFactionToNew),
    npcs: oldNpcs.map(oldNpcToNew),
    tale: [],
    journal: oldJournal.map(oldJournalToNew),
    fate: [],
    consequences: oldConsequences.map(oldConsequenceToNew),
    rumors: [],
    suggestedActions: [],
    lastFeedback: '',
    onboardingDismissed: true,
    gameOver: false,
    world: {
      day: oldWorld.day,
      phaseIndex: 0,
      location: oldPlayer?.locationId ?? oldLocations[0]?.id ?? 'loc-none',
      region: oldRegions[0]?.name ?? 'Unknown',
      weather: 'clear',
      danger: 0,
      pulse: '',
      crisis: '',
      seed,
      map: [],
      phaseName: 'playing',
    },
  };
}

export function applyPatches(game: GameState, patches: StatePatch[]): GameState {
  const next = structuredClone(game);
  for (const patch of patches) {
    const path = patch.path.split('/').filter((p) => p.length > 0);
    let target: unknown = next;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (Array.isArray(target)) {
        const idx = parseInt(key, 10);
        target = target[idx];
      } else if (target && typeof target === 'object') {
        target = (target as Record<string, unknown>)[key];
      }
    }
    const lastKey = path[path.length - 1];
    if (Array.isArray(target)) {
      const idx = parseInt(lastKey, 10);
      if (patch.op === 'replace') target[idx] = patch.value;
      else if (patch.op === 'add') target.splice(idx, 0, patch.value);
      else if (patch.op === 'remove') target.splice(idx, 1);
      else if (patch.op === 'increment') target[idx] = (target[idx] as number) + (patch.amount ?? 0);
      else if (patch.op === 'append') target.push(patch.item);
    } else if (target && typeof target === 'object') {
      if (patch.op === 'replace') (target as Record<string, unknown>)[lastKey] = patch.value;
      else if (patch.op === 'add') (target as Record<string, unknown>)[lastKey] = patch.value;
      else if (patch.op === 'remove') delete (target as Record<string, unknown>)[lastKey];
      else if (patch.op === 'increment') {
        (target as Record<string, unknown>)[lastKey] = ((target as Record<string, unknown>)[lastKey] as number) + (patch.amount ?? 0);
      }
      else if (patch.op === 'append') {
        const arr = (target as Record<string, unknown>)[lastKey] as unknown[];
        if (Array.isArray(arr)) arr.push(patch.item);
      }
    }
  }
  return next;
}

export function syncGameStateToEngine(engine: StateEngine, game: GameState): void {
  const oldPlayer = engine.getPlayer();
  if (oldPlayer) {
    const partial = newPlayerToOldPartial(game.player);
    engine.updatePlayer(partial);
    engine.updatePlayer({ locationId: game.currentLocationId });
  }
  for (const loc of game.locations) {
    const partial = newLocationToOldPartial(loc);
    engine.updateLocation(loc.id, partial);
  }
}
