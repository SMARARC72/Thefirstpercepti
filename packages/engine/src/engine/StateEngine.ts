/**
 * ============================================================================
 * STATE ENGINE - The First Perception RPG
 * ============================================================================
 * Complete state management: CRUD operations, state diff generation,
 * event logging, consequence queue processing, save/load snapshots,
 * validation, Ironman mode, legacy tracking, truth/belief/rumor separation.
 *
 * @module engine/StateEngine
 * @version 1.0.0
 * ============================================================================
 */

import {
  EntityId,
  Player,
  Location,
  Region,
  Faction,
  NPC,
  Event,
  Rumor,
  Belief,
  Consequence,
  SaveSnapshot,
  StateDiff,
  WorldState,
  GameConfig,
  DeathRecord,
  JournalEntry,
  WorldPulse,
  Condition,
  Item,
  Legacy,
  GameEngineError,
  ValidationError,
  StateError,
  DEFAULT_GAME_CONFIG,
  IRONMAN_CONFIG,
  GAME_MODES,
  EntityAddition,
  EntityRemoval,
  EntityChanges,
  ConsequenceEffect,
  RuntimePartialStatBlock,
  CoreStat,
  ActionType,
} from '../engine-types';

// =============================================================================
// VALIDATORS
// =============================================================================

/** Validate that an entity ID is valid */
function isValidId(id: unknown): id is EntityId {
  return typeof id === 'string' && id.length > 0;
}

/** Validate a stat block */
function isValidStatBlock(stats: unknown): stats is Record<string, number> {
  if (typeof stats !== 'object' || stats === null) return false;
  const required = ['body', 'grace', 'sense', 'mind', 'will', 'presence', 'authority', 'ruin', 'creation'];
  return required.every((key) => typeof (stats as Record<string, unknown>)[key] === 'number');
}

// =============================================================================
// STATE ENGINE
// =============================================================================

/**
 * The StateEngine manages all game state CRUD operations, diff tracking,
 * event logging, consequence processing, save/load, and validation.
 */
export class StateEngine {
  private player: Player | null = null;
  private locations: Map<EntityId, Location> = new Map();
  private regions: Map<EntityId, Region> = new Map();
  private factions: Map<EntityId, Faction> = new Map();
  private npcs: Map<EntityId, NPC> = new Map();
  private events: Map<EntityId, Event> = new Map();
  private rumors: Map<EntityId, Rumor> = new Map();
  private beliefs: Map<EntityId, Belief> = new Map();
  private consequences: Map<EntityId, Consequence> = new Map();
  private worldState: WorldState;
  private config: GameConfig;
  private deathRecords: DeathRecord[] = [];
  private stateDiffs: StateDiff[] = [];
  private undoStack: StateDiff[] = [];
  private redoStack: StateDiff[] = [];
  private maxUndoDepth: number = 50;
  private turnNumber: number = 0;
  private onStateChange?: (diff: StateDiff) => void;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.worldState = this.createInitialWorldState();
  }

  /** Merge provided config with defaults */
  private mergeConfig(overrides: Partial<GameConfig>): GameConfig {
    const isIronman = overrides.mode === GAME_MODES.IRONMAN;
    return {
      ...DEFAULT_GAME_CONFIG,
      ...overrides,
      ...(isIronman ? IRONMAN_CONFIG : {}),
    };
  }

  /** Create initial empty world state */
  private createInitialWorldState(): WorldState {
    return {
      day: 1,
      hour: 8,
      eventQueue: [],
      consequenceQueue: [],
      recentPulses: [],
      globalModifiers: [],
      history: [],
      timeFrozen: false,
    };
  }

  // =============================================================================
  // CALLBACKS
  // =============================================================================

  /** Set a callback to be invoked on every state change */
  setOnStateChange(callback: (diff: StateDiff) => void): void {
    this.onStateChange = callback;
  }

  // =============================================================================
  // CONFIG ACCESS
  // =============================================================================

  /** Get current game config */
  getConfig(): GameConfig {
    return { ...this.config };
  }

  /** Update game config */
  updateConfig(updates: Partial<GameConfig>): void {
    if (this.config.ironman && updates.mode && updates.mode !== GAME_MODES.IRONMAN) {
      throw new ValidationError('Cannot change mode in Ironman game');
    }
    this.config = { ...this.config, ...updates };
  }

  // =============================================================================
  // PLAYER CRUD
  // =============================================================================

  /** Set the player (character creation) */
  setPlayer(player: Player): void {
    const diff = this.createDiff('player', player.id, null, player);
    this.player = player;
    this.applyDiff(diff);
  }

  /** Get the player */
  getPlayer(): Player | null {
    return this.player ? this.deepClone(this.player) : null;
  }

  /** Update player fields */
  updatePlayer(updates: Partial<Player>): Player {
    if (!this.player) {
      throw new StateError('No player exists', undefined, 'player');
    }
    const oldPlayer = this.deepClone(this.player);
    this.player = { ...this.player, ...updates };
    const diff = this.createDiff('player', this.player.id, oldPlayer, this.player);
    this.applyDiff(diff);
    return this.deepClone(this.player);
  }

  /** Apply condition to player */
  applyPlayerCondition(condition: Condition): Player {
    if (!this.player) throw new StateError('No player exists');
    const oldPlayer = this.deepClone(this.player);
    // Prevent duplicate conditions of same type
    const existingIndex = this.player.conditions.findIndex((c) => c.type === condition.type);
    if (existingIndex >= 0) {
      // Replace with more severe version
      if (condition.severity > this.player.conditions[existingIndex].severity) {
        this.player.conditions[existingIndex] = condition;
      }
    } else {
      this.player.conditions.push(condition);
    }
    const diff = this.createDiff('player', this.player.id, oldPlayer, this.player);
    this.applyDiff(diff);
    return this.deepClone(this.player);
  }

  /** Remove condition from player */
  removePlayerCondition(conditionType: string): Player {
    if (!this.player) throw new StateError('No player exists');
    const oldPlayer = this.deepClone(this.player);
    this.player.conditions = this.player.conditions.filter((c) => c.type !== conditionType);
    const diff = this.createDiff('player', this.player.id, oldPlayer, this.player);
    this.applyDiff(diff);
    return this.deepClone(this.player);
  }

  /** Add item to player inventory */
  addPlayerItem(item: Item): Player {
    if (!this.player) throw new StateError('No player exists');
    const oldPlayer = this.deepClone(this.player);
    this.player.inventory.push(item);
    const diff = this.createDiff('player', this.player.id, oldPlayer, this.player);
    this.applyDiff(diff);
    return this.deepClone(this.player);
  }

  /** Remove item from player inventory */
  removePlayerItem(itemId: EntityId): Player {
    if (!this.player) throw new StateError('No player exists');
    const oldPlayer = this.deepClone(this.player);
    this.player.inventory = this.player.inventory.filter((i) => i.id !== itemId);
    const diff = this.createDiff('player', this.player.id, oldPlayer, this.player);
    this.applyDiff(diff);
    return this.deepClone(this.player);
  }

  /** Mark player as dead */
  killPlayer(deathVector: string, description: string): DeathRecord {
    if (!this.player) throw new StateError('No player exists');
    const oldPlayer = this.deepClone(this.player);

    this.player.alive = false;
    this.player.deathVector = deathVector as any;

    const record: DeathRecord = {
      characterId: this.player.id,
      characterName: this.player.name,
      deathVector: deathVector as any,
      description,
      timestamp: Date.now(),
      day: this.worldState.day,
      legacy: this.player.legacy ?? {
        type: 'nothing',
        description: 'They left nothing behind.',
        mechanicalEffect: 'No legacy effect.',
        active: false,
      },
      finalStats: { ...this.player.stats },
      actionsTaken: this.player.actionsTaken,
    };

    this.deathRecords.push(record);

    const diff = this.createDiff('player', this.player.id, oldPlayer, this.player);
    this.applyDiff(diff);
    return record;
  }

  /** Set player legacy */
  setPlayerLegacy(legacy: Legacy): Player {
    if (!this.player) throw new StateError('No player exists');
    const oldPlayer = this.deepClone(this.player);
    this.player.legacy = legacy;
    const diff = this.createDiff('player', this.player.id, oldPlayer, this.player);
    this.applyDiff(diff);
    return this.deepClone(this.player);
  }

  // =============================================================================
  // LOCATION CRUD
  // =============================================================================

  addLocation(location: Location): Location {
    const cloned = this.deepClone(location);
    this.locations.set(location.id, cloned);
    const diff = this.createDiff('location', location.id, null, cloned);
    this.applyDiff(diff);
    return cloned;
  }

  getLocation(id: EntityId): Location | undefined {
    return this.locations.has(id) ? this.deepClone(this.locations.get(id)!) : undefined;
  }

  getAllLocations(): Location[] {
    return Array.from(this.locations.values()).map((l) => this.deepClone(l));
  }

  updateLocation(id: EntityId, updates: Partial<Location>): Location {
    const existing = this.locations.get(id);
    if (!existing) throw new StateError(`Location ${id} not found`, id, 'location');
    const oldLoc = this.deepClone(existing);
    const updated = { ...existing, ...updates };
    this.locations.set(id, updated);
    const diff = this.createDiff('location', id, oldLoc, updated);
    this.applyDiff(diff);
    return this.deepClone(updated);
  }

  removeLocation(id: EntityId): void {
    const oldLoc = this.locations.get(id);
    if (!oldLoc) return;
    this.locations.delete(id);
    const diff = this.createDiff('location', id, oldLoc, null);
    this.applyDiff(diff);
  }

  // =============================================================================
  // REGION CRUD
  // =============================================================================

  addRegion(region: Region): Region {
    const cloned = this.deepClone(region);
    this.regions.set(region.id, cloned);
    const diff = this.createDiff('region', region.id, null, cloned);
    this.applyDiff(diff);
    return cloned;
  }

  getRegion(id: EntityId): Region | undefined {
    return this.regions.has(id) ? this.deepClone(this.regions.get(id)!) : undefined;
  }

  getAllRegions(): Region[] {
    return Array.from(this.regions.values()).map((r) => this.deepClone(r));
  }

  updateRegion(id: EntityId, updates: Partial<Region>): Region {
    const existing = this.regions.get(id);
    if (!existing) throw new StateError(`Region ${id} not found`, id, 'region');
    const oldRegion = this.deepClone(existing);
    const updated = { ...existing, ...updates };
    this.regions.set(id, updated);
    const diff = this.createDiff('region', id, oldRegion, updated);
    this.applyDiff(diff);
    return this.deepClone(updated);
  }

  // =============================================================================
  // FACTION CRUD
  // =============================================================================

  addFaction(faction: Faction): Faction {
    const cloned = this.deepClone(faction);
    this.factions.set(faction.id, cloned);
    const diff = this.createDiff('faction', faction.id, null, cloned);
    this.applyDiff(diff);
    return cloned;
  }

  getFaction(id: EntityId): Faction | undefined {
    return this.factions.has(id) ? this.deepClone(this.factions.get(id)!) : undefined;
  }

  getAllFactions(): Faction[] {
    return Array.from(this.factions.values()).map((f) => this.deepClone(f));
  }

  updateFaction(id: EntityId, updates: Partial<Faction>): Faction {
    const existing = this.factions.get(id);
    if (!existing) throw new StateError(`Faction ${id} not found`, id, 'faction');
    const oldFaction = this.deepClone(existing);
    const updated = { ...existing, ...updates };
    this.factions.set(id, updated);
    const diff = this.createDiff('faction', id, oldFaction, updated);
    this.applyDiff(diff);
    return this.deepClone(updated);
  }

  // =============================================================================
  // NPC CRUD
  // =============================================================================

  addNPC(npc: NPC): NPC {
    const cloned = this.deepClone(npc);
    this.npcs.set(npc.id, cloned);
    const diff = this.createDiff('npc', npc.id, null, cloned);
    this.applyDiff(diff);
    return cloned;
  }

  getNPC(id: EntityId): NPC | undefined {
    return this.npcs.has(id) ? this.deepClone(this.npcs.get(id)!) : undefined;
  }

  getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values()).map((n) => this.deepClone(n));
  }

  getNPCsInLocation(locationId: EntityId): NPC[] {
    return this.getAllNPCs().filter((n) => n.locationId === locationId);
  }

  getNPCsByFaction(factionId: EntityId): NPC[] {
    return this.getAllNPCs().filter((n) => n.factionId === factionId);
  }

  updateNPC(id: EntityId, updates: Partial<NPC>): NPC {
    const existing = this.npcs.get(id);
    if (!existing) throw new StateError(`NPC ${id} not found`, id, 'npc');
    const oldNPC = this.deepClone(existing);
    const updated = { ...existing, ...updates };
    this.npcs.set(id, updated);
    const diff = this.createDiff('npc', id, oldNPC, updated);
    this.applyDiff(diff);
    return this.deepClone(updated);
  }

  removeNPC(id: EntityId): void {
    const oldNPC = this.npcs.get(id);
    if (!oldNPC) return;
    this.npcs.delete(id);
    const diff = this.createDiff('npc', id, oldNPC, null);
    this.applyDiff(diff);
  }

  // =============================================================================
  // EVENT CRUD
  // =============================================================================

  addEvent(event: Event): Event {
    const cloned = this.deepClone(event);
    this.events.set(event.id, cloned);
    this.worldState.eventQueue.push(event.id);
    this.worldState.history.push({
      day: this.worldState.day,
      summary: event.description,
      severity: event.severity,
    });
    const diff = this.createDiff('event', event.id, null, cloned);
    this.applyDiff(diff);
    return cloned;
  }

  getEvent(id: EntityId): Event | undefined {
    return this.events.has(id) ? this.deepClone(this.events.get(id)!) : undefined;
  }

  getAllEvents(): Event[] {
    return Array.from(this.events.values()).map((e) => this.deepClone(e));
  }

  getEventsForLocation(locationId: EntityId): Event[] {
    return this.getAllEvents().filter((e) => e.locationId === locationId);
  }

  markEventWitnessed(eventId: EntityId): void {
    const event = this.events.get(eventId);
    if (event) {
      const oldEvent = this.deepClone(event);
      event.witnessed = true;
      event.knownToPlayer = true;
      const diff = this.createDiff('event', eventId, oldEvent, event);
      this.applyDiff(diff);
    }
  }

  // =============================================================================
  // RUMOR CRUD
  // =============================================================================

  addRumor(rumor: Rumor): Rumor {
    const cloned = this.deepClone(rumor);
    this.rumors.set(rumor.id, cloned);
    const diff = this.createDiff('rumor', rumor.id, null, cloned);
    this.applyDiff(diff);
    return cloned;
  }

  getRumor(id: EntityId): Rumor | undefined {
    return this.rumors.has(id) ? this.deepClone(this.rumors.get(id)!) : undefined;
  }

  getAllRumors(): Rumor[] {
    return Array.from(this.rumors.values()).map((r) => this.deepClone(r));
  }

  getRumorsKnownToPlayer(): Rumor[] {
    return this.getAllRumors().filter((r) => r.knownToPlayer);
  }

  getRumorsInRegion(regionId: EntityId): Rumor[] {
    return this.getAllRumors().filter((r) => r.circulationRegionIds.includes(regionId));
  }

  updateRumor(id: EntityId, updates: Partial<Rumor>): Rumor {
    const existing = this.rumors.get(id);
    if (!existing) throw new StateError(`Rumor ${id} not found`, id, 'rumor');
    const oldRumor = this.deepClone(existing);
    const updated = { ...existing, ...updates };
    this.rumors.set(id, updated);
    const diff = this.createDiff('rumor', id, oldRumor, updated);
    this.applyDiff(diff);
    return this.deepClone(updated);
  }

  /** Player learns a rumor */
  playerLearnsRumor(rumorId: EntityId, learnedFrom: string): void {
    const rumor = this.rumors.get(rumorId);
    if (!rumor) return;
    const oldRumor = this.deepClone(rumor);
    rumor.knownToPlayer = true;
    rumor.learnedFrom = learnedFrom;
    this.rumors.set(rumorId, rumor);

    if (this.player) {
      if (!this.player.knownRumors.includes(rumorId)) {
        const oldPlayer = this.deepClone(this.player);
        this.player.knownRumors.push(rumorId);
        this.applyDiff(this.createDiff('player', this.player.id, oldPlayer, this.player));
      }
    }
    this.applyDiff(this.createDiff('rumor', rumorId, oldRumor, rumor));
  }

  // =============================================================================
  // BELIEF CRUD
  // =============================================================================

  addBelief(belief: Belief): Belief {
    const cloned = this.deepClone(belief);
    this.beliefs.set(belief.id, cloned);
    const diff = this.createDiff('belief', belief.id, null, cloned);
    this.applyDiff(diff);
    return cloned;
  }

  getBelief(id: EntityId): Belief | undefined {
    return this.beliefs.has(id) ? this.deepClone(this.beliefs.get(id)!) : undefined;
  }

  getAllBeliefs(): Belief[] {
    return Array.from(this.beliefs.values()).map((b) => this.deepClone(b));
  }

  getBeliefsHeldByPlayer(): Belief[] {
    return this.getAllBeliefs().filter((b) => b.heldByPlayer);
  }

  updateBelief(id: EntityId, updates: Partial<Belief>): Belief {
    const existing = this.beliefs.get(id);
    if (!existing) throw new StateError(`Belief ${id} not found`, id, 'belief');
    const oldBelief = this.deepClone(existing);
    const updated = { ...existing, ...updates };
    this.beliefs.set(id, updated);
    const diff = this.createDiff('belief', id, oldBelief, updated);
    this.applyDiff(diff);
    return this.deepClone(updated);
  }

  /** Player adopts a belief */
  playerAdoptsBelief(beliefId: EntityId): void {
    const belief = this.beliefs.get(beliefId);
    if (!belief) return;
    const oldBelief = this.deepClone(belief);
    belief.heldByPlayer = true;
    this.beliefs.set(beliefId, belief);

    if (this.player) {
      if (!this.player.knownBeliefs.includes(beliefId)) {
        const oldPlayer = this.deepClone(this.player);
        this.player.knownBeliefs.push(beliefId);
        this.applyDiff(this.createDiff('player', this.player.id, oldPlayer, this.player));
      }
    }
    this.applyDiff(this.createDiff('belief', beliefId, oldBelief, belief));
  }

  // =============================================================================
  // CONSEQUENCE QUEUE
  // =============================================================================

  queueConsequence(consequence: Consequence): Consequence {
    const cloned = this.deepClone(consequence);
    this.consequences.set(consequence.id, cloned);
    this.worldState.consequenceQueue.push(consequence.id);
    const diff = this.createDiff('consequence', consequence.id, null, cloned);
    this.applyDiff(diff);
    return cloned;
  }

  getConsequence(id: EntityId): Consequence | undefined {
    return this.consequences.has(id) ? this.deepClone(this.consequences.get(id)!) : undefined;
  }

  getAllConsequences(): Consequence[] {
    return Array.from(this.consequences.values()).map((c) => this.deepClone(c));
  }

  getPendingConsequences(): Consequence[] {
    return this.getAllConsequences().filter((c) => !c.processed);
  }

  /** Process all pending consequences */
  processConsequences(context: {
    actionType?: ActionType;
    locationId?: EntityId;
    conditionTypes?: string[];
  } = {}): { processed: Consequence[]; effects: ConsequenceEffect[] } {
    const pending = Array.from(this.consequences.values()).filter((c) => !c.processed);
    const processed: Consequence[] = [];
    const effects: ConsequenceEffect[] = [];

    for (const consequence of pending) {
      const shouldTrigger = this.checkConsequenceTrigger(consequence, context);
      if (shouldTrigger) {
        const stored = this.consequences.get(consequence.id);
        if (stored) {
          stored.processed = true;
          processed.push(this.deepClone(stored));
          if (stored.effect) {
            effects.push(stored.effect);
            this.applyConsequenceEffect(stored.effect);
          }
        }
      }
    }

    // Remove processed from queue
    this.worldState.consequenceQueue = this.worldState.consequenceQueue.filter(
      (id) => !this.consequences.get(id)?.processed
    );

    return { processed, effects };
  }

  /** Check if a consequence should trigger */
  private checkConsequenceTrigger(
    consequence: Consequence,
    context: { actionType?: ActionType; locationId?: EntityId; conditionTypes?: string[] }
  ): boolean {
    const trigger = consequence.trigger;

    switch (trigger.type) {
      case 'time':
        if (trigger.turnsRemaining !== undefined) {
          trigger.turnsRemaining--;
          return trigger.turnsRemaining <= 0;
        }
        return true;
      case 'action':
        return trigger.condition === '*' || trigger.condition === context.actionType;
      case 'condition':
        return context.conditionTypes?.includes(trigger.condition) ?? false;
      case 'location':
        return trigger.condition === context.locationId;
      case 'random':
        return trigger.chancePerTurn
          ? this.nextConsequenceChance(consequence.id) * 100 < trigger.chancePerTurn
          : false;
      default:
        return false;
    }
  }

  /** Apply a consequence effect to the game state */
  private applyConsequenceEffect(effect: ConsequenceEffect): void {
    // Apply stat changes to player
    if (effect.statChanges && this.player) {
      const oldPlayer = this.deepClone(this.player);
      const changes = effect.statChanges as RuntimePartialStatBlock;
      for (const [stat, delta] of Object.entries(changes)) {
        if (delta !== undefined && stat in this.player.stats) {
          this.player.stats[stat as CoreStat] += delta as number;
        }
      }
      this.applyDiff(this.createDiff('player', this.player.id, oldPlayer, this.player));
    }

    // Apply conditions to player
    if (effect.conditions && this.player) {
      for (const conditionType of effect.conditions) {
        this.applyPlayerCondition({
          type: conditionType,
          description: `From consequence: ${conditionType}`,
          severity: 3,
          appliedAt: Date.now(),
          duration: -1,
          remaining: -1,
          source: 'consequence',
          statModifiers: {},
        });
      }
    }

    if (effect.itemChanges && this.player) {
      const oldPlayer = this.deepClone(this.player);
      for (const change of effect.itemChanges) {
        if (change.action === 'remove') {
          this.player.inventory = this.player.inventory.filter((item) => item.id !== change.itemId);
        }
      }
      this.applyDiff(this.createDiff('player', this.player.id, oldPlayer, this.player));
    }

    if (effect.npcChanges) {
      for (const change of effect.npcChanges) {
        const npc = this.npcs.get(change.npcId);
        if (!npc) continue;
        const updates: Partial<NPC> = {};
        if (change.locationChange) updates.locationId = change.locationChange;
        if (change.alive !== undefined) updates.alive = change.alive;
        if (change.condition) {
          updates.conditions = [
            ...npc.conditions,
            {
              type: change.condition,
              description: `From consequence: ${change.condition}`,
              severity: 3,
              appliedAt: Date.now(),
              duration: -1,
              remaining: -1,
              source: 'consequence',
              statModifiers: {},
            },
          ];
        }
        if (Object.keys(updates).length > 0) this.updateNPC(change.npcId, updates);
      }
    }

    if (effect.factionChanges) {
      for (const change of effect.factionChanges) {
        const faction = this.factions.get(change.factionId);
        if (!faction) continue;
        const updates: Partial<Faction> = {};
        if (change.powerChange !== undefined) {
          updates.power = Math.max(0, Math.min(10, faction.power + change.powerChange));
        }
        if (change.resourceChanges) {
          const resources = { ...faction.resources };
          for (const [key, delta] of Object.entries(change.resourceChanges)) {
            if (delta !== undefined && key in resources) {
              (resources as Record<string, number>)[key] = Math.max(
                0,
                Math.min(10, (resources as Record<string, number>)[key] + delta)
              );
            }
          }
          updates.resources = resources;
        }
        if (Object.keys(updates).length > 0) this.updateFaction(change.factionId, updates);
      }
    }

    if (effect.locationChanges) {
      for (const change of effect.locationChanges) {
        const location = this.locations.get(change.locationId);
        if (!location) continue;
        const updates: Partial<Location> = {};
        if (change.safetyChange !== undefined) {
          updates.safetyLevel = Math.max(0, Math.min(10, location.safetyLevel + change.safetyChange));
        }
        if (change.descriptionAddition) {
          updates.description = `${location.description}\n\n${change.descriptionAddition}`;
        }
        if (change.itemAdditions?.length) {
          updates.items = [...location.items, ...change.itemAdditions];
        }
        if (Object.keys(updates).length > 0) this.updateLocation(change.locationId, updates);
      }
    }
  }

  private nextConsequenceChance(consequenceId: EntityId): number {
    if (!this.config.deterministic) {
      return Math.random();
    }

    let hash = this.config.seed ^ this.turnNumber;
    for (let i = 0; i < consequenceId.length; i++) {
      hash = Math.imul(hash ^ consequenceId.charCodeAt(i), 2654435761);
    }
    return ((hash >>> 0) % 1000000) / 1000000;
  }

  // =============================================================================
  // WORLD STATE
  // =============================================================================

  getWorldState(): WorldState {
    return this.deepClone(this.worldState);
  }

  advanceTime(hours: number = 1): WorldState {
    if (this.worldState.timeFrozen) return this.deepClone(this.worldState);

    const oldWorld = this.deepClone(this.worldState);
    this.worldState.hour += hours;
    while (this.worldState.hour >= 24) {
      this.worldState.hour -= 24;
      this.worldState.day++;
    }
    this.turnNumber++;
    const diff = this.createDiff('world', 'world', oldWorld, this.worldState);
    this.applyDiff(diff);
    return this.deepClone(this.worldState);
  }

  setTime(day: number, hour: number): WorldState {
    const oldWorld = this.deepClone(this.worldState);
    this.worldState.day = Math.max(1, day);
    this.worldState.hour = Math.max(0, Math.min(23, hour));
    const diff = this.createDiff('world', 'world', oldWorld, this.worldState);
    this.applyDiff(diff);
    return this.deepClone(this.worldState);
  }

  freezeTime(): void {
    this.worldState.timeFrozen = true;
  }

  unfreezeTime(): void {
    this.worldState.timeFrozen = false;
  }

  getTurnNumber(): number {
    return this.turnNumber;
  }

  // =============================================================================
  // DEATH RECORDS
  // =============================================================================

  getDeathRecords(): DeathRecord[] {
    return this.deepClone(this.deathRecords);
  }

  addDeathRecord(record: DeathRecord): void {
    this.deathRecords.push(this.deepClone(record));
  }

  // =============================================================================
  // STATE DIFF / UNDO / REDO
  // =============================================================================

  /** Create a state diff by comparing old and new values */
  private createDiff(
    entityType: string,
    entityId: EntityId,
    oldValue: unknown,
    newValue: unknown
  ): StateDiff {
    const changes: EntityChanges = {};
    if (!changes[entityType]) changes[entityType] = {};

    if (oldValue && newValue && typeof oldValue === 'object' && typeof newValue === 'object') {
      const changedFields: Record<string, { old: unknown; new: unknown }> = {};
      const allKeys = new Set([
        ...Object.keys(oldValue as object),
        ...Object.keys(newValue as object),
      ]);
      for (const key of allKeys) {
        const oldV = (oldValue as Record<string, unknown>)[key];
        const newV = (newValue as Record<string, unknown>)[key];
        if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
          changedFields[key] = { old: oldV, new: newV };
        }
      }
      changes[entityType][entityId] = changedFields;
    } else if (oldValue === null && newValue !== null) {
      // Addition
      changes[entityType][entityId] = { _added: { old: null, new: true } };
    } else if (oldValue !== null && newValue === null) {
      // Removal
      changes[entityType][entityId] = { _removed: { old: true, new: null } };
    }

    const diff: StateDiff = {
      id: `diff_${Date.now()}_${this.stateDiffs.length + 1}`,
      turn: this.turnNumber,
      timestamp: Date.now(),
      changes,
      additions: [],
      removals: [],
    };

    return diff;
  }

  /** Apply a diff: add to history, call callback, manage undo */
  private applyDiff(diff: StateDiff): void {
    this.stateDiffs.push(diff);
    this.undoStack.push(diff);
    if (this.undoStack.length > this.maxUndoDepth) {
      this.undoStack.shift();
    }
    // Clear redo stack on new change
    this.redoStack = [];

    if (this.onStateChange) {
      try {
        this.onStateChange(diff);
      } catch {
        // Callback errors should not break state
      }
    }
  }

  /** Get all state diffs */
  getStateDiffs(): StateDiff[] {
    return this.deepClone(this.stateDiffs);
  }

  /** Check if undo is available */
  canUndo(): boolean {
    return this.undoStack.length > 0 && !this.config.ironman;
  }

  /** Undo the last state change */
  undo(): StateDiff | null {
    if (!this.canUndo()) return null;
    const diff = this.undoStack.pop()!;
    this.redoStack.push(diff);
    return diff;
  }

  /** Check if redo is available */
  canRedo(): boolean {
    return this.redoStack.length > 0 && !this.config.ironman;
  }

  /** Redo the last undone change */
  redo(): StateDiff | null {
    if (!this.canRedo()) return null;
    const diff = this.redoStack.pop()!;
    this.undoStack.push(diff);
    return diff;
  }

  // =============================================================================
  // SAVE / LOAD SNAPSHOTS
  // =============================================================================

  /** Create a full save snapshot of the current state */
  createSnapshot(): SaveSnapshot {
    if (!this.player) {
      throw new StateError('Cannot save: no player exists');
    }
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      player: this.deepClone(this.player),
      locations: this.getAllLocations(),
      regions: this.getAllRegions(),
      factions: this.getAllFactions(),
      npcs: this.getAllNPCs(),
      events: this.getAllEvents(),
      rumors: this.getAllRumors(),
      beliefs: this.getAllBeliefs(),
      consequences: this.getAllConsequences(),
      worldState: this.deepClone(this.worldState),
      config: this.deepClone(this.config),
      deathRecords: this.deepClone(this.deathRecords),
      journalEntries: this.deepClone(this.player.journal),
      rngSeed: this.config.seed,
      turnNumber: this.turnNumber,
      currentDay: this.worldState.day,
      currentHour: this.worldState.hour,
    };
  }

  /** Load state from a snapshot */
  loadSnapshot(snapshot: SaveSnapshot): void {
    // Validation
    if (!snapshot.player) throw new ValidationError('Snapshot missing player');

    this.player = this.deepClone(snapshot.player);

    this.locations = new Map();
    for (const loc of snapshot.locations) this.locations.set(loc.id, this.deepClone(loc));

    this.regions = new Map();
    for (const reg of snapshot.regions) this.regions.set(reg.id, this.deepClone(reg));

    this.factions = new Map();
    for (const fac of snapshot.factions) this.factions.set(fac.id, this.deepClone(fac));

    this.npcs = new Map();
    for (const npc of snapshot.npcs) this.npcs.set(npc.id, this.deepClone(npc));

    this.events = new Map();
    for (const evt of snapshot.events) this.events.set(evt.id, this.deepClone(evt));

    this.rumors = new Map();
    for (const rum of snapshot.rumors) this.rumors.set(rum.id, this.deepClone(rum));

    this.beliefs = new Map();
    for (const bel of snapshot.beliefs) this.beliefs.set(bel.id, this.deepClone(bel));

    this.consequences = new Map();
    for (const con of snapshot.consequences) this.consequences.set(con.id, this.deepClone(con));

    this.worldState = this.deepClone(snapshot.worldState);
    this.config = { ...DEFAULT_GAME_CONFIG, ...snapshot.config };
    this.deathRecords = this.deepClone(snapshot.deathRecords);
    this.turnNumber = snapshot.turnNumber ?? 0;
    this.undoStack = [];
    this.redoStack = [];
  }

  /** Export snapshot as JSON string */
  exportToJSON(): string {
    const snapshot = this.createSnapshot();
    return JSON.stringify(snapshot, null, 2);
  }

  /** Import from JSON string */
  importFromJSON(json: string): void {
    let snapshot: SaveSnapshot;
    try {
      snapshot = JSON.parse(json);
    } catch {
      throw new ValidationError('Invalid JSON format');
    }
    this.loadSnapshot(snapshot);
  }

  // =============================================================================
  // VALIDATION
  // =============================================================================

  /** Validate the current game state for consistency */
  validateState(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Player must exist
    if (!this.player) {
      errors.push('No player exists');
      return { valid: false, errors };
    }

    // Player location must exist
    if (!this.locations.has(this.player.locationId)) {
      errors.push(`Player location ${this.player.locationId} does not exist`);
    }

    // All NPC locations must exist
    for (const npc of this.npcs.values()) {
      if (!this.locations.has(npc.locationId)) {
        errors.push(`NPC ${npc.id} (${npc.name}) is in nonexistent location ${npc.locationId}`);
      }
      // NPC faction must exist if set
      if (npc.factionId && !this.factions.has(npc.factionId)) {
        errors.push(`NPC ${npc.id} references nonexistent faction ${npc.factionId}`);
      }
    }

    // All location regions must exist
    for (const loc of this.locations.values()) {
      if (!this.regions.has(loc.regionId)) {
        errors.push(`Location ${loc.id} references nonexistent region ${loc.regionId}`);
      }
    }

    // Faction stances must reference existing factions
    for (const faction of this.factions.values()) {
      for (const otherId of Object.keys(faction.factionStances)) {
        if (!this.factions.has(otherId)) {
          errors.push(
            `Faction ${faction.id} has stance toward nonexistent faction ${otherId}`
          );
        }
      }
    }

    // Event locations/regions must exist if set
    for (const event of this.events.values()) {
      if (event.locationId && !this.locations.has(event.locationId)) {
        errors.push(`Event ${event.id} references nonexistent location ${event.locationId}`);
      }
      if (event.regionId && !this.regions.has(event.regionId)) {
        errors.push(`Event ${event.id} references nonexistent region ${event.regionId}`);
      }
    }

    // Rumor circulation regions must exist
    for (const rumor of this.rumors.values()) {
      for (const regionId of rumor.circulationRegionIds) {
        if (!this.regions.has(regionId)) {
          errors.push(`Rumor ${rumor.id} circulates in nonexistent region ${regionId}`);
        }
      }
    }

    // HP validation
    if (this.player.hp > this.player.maxHp) {
      errors.push(`Player HP (${this.player.hp}) exceeds max HP (${this.player.maxHp})`);
    }
    if (this.player.hp < 0) {
      errors.push(`Player HP is negative (${this.player.hp})`);
    }

    // Stat validation
    for (const [stat, value] of Object.entries(this.player.stats)) {
      if (value < 0 || value > 20) {
        errors.push(`Player stat ${stat} has invalid value ${value}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // =============================================================================
  // IRONMAN MODE
  // =============================================================================

  /** Check if ironman mode is active */
  isIronman(): boolean {
    return this.config.ironman;
  }

  /** Enforce ironman restrictions */
  enforceIronman(): void {
    if (!this.config.ironman) return;
    // Ironman: no manual save, auto-save every turn
    // These are enforced at the controller level
  }

  // =============================================================================
  // LEGACY STATE TRACKING
  // =============================================================================

  /** Get active legacies from past characters */
  getActiveLegacies(): Legacy[] {
    return this.deathRecords
      .filter((r) => r.legacy.active)
      .map((r) => r.legacy);
  }

  /** Apply legacy effects to current character */
  applyLegacyEffects(): void {
    if (!this.player) return;
    const legacies = this.getActiveLegacies();
    for (const legacy of legacies) {
      // Legacy effects are narrative/mechanical modifiers
      // applied at character creation or at runtime
      // Implementation depends on legacy type
      switch (legacy.type) {
        case 'teaching':
          // Could grant bonus to a stat
          break;
        case 'curse':
          // Could apply a permanent condition
          break;
        case 'rumor':
          // Player starts knowing certain rumors
          break;
        // Other legacy types have narrative effects
      }
    }
  }

  // =============================================================================
  // TRUTH / BELIEF / RUMOR SEPARATION
  // =============================================================================

  /** Get truths - beliefs that are actually true */
  getTruths(): Belief[] {
    return this.getAllBeliefs().filter((b) => b.isTrue);
  }

  /** Get false beliefs */
  getFalseBeliefs(): Belief[] {
    return this.getAllBeliefs().filter((b) => !b.isTrue);
  }

  /** Get confirmed truths (player knows they are true) */
  getConfirmedTruths(): Belief[] {
    return this.getAllBeliefs().filter(
      (b) => b.isTrue && (b.confidence === 'certain' || b.confidence === 'proven')
    );
  }

  /** Get unverified rumors (player knows them but truth unknown) */
  getUnverifiedRumors(): Rumor[] {
    const knownRumors = this.getRumorsKnownToPlayer();
    return knownRumors.filter((r) => {
      const relatedBeliefs = r.relatedBeliefIds
        .map((bid) => this.beliefs.get(bid))
        .filter(Boolean);
      return relatedBeliefs.some((b) => b!.confidence === 'rumor' || b!.confidence === 'likely');
    });
  }

  // =============================================================================
  // EVENT LOGGING
  // =============================================================================

  /** Add a journal entry to the player */
  addJournalEntry(entry: JournalEntry): void {
    if (!this.player) return;
    this.player.journal.push(this.deepClone(entry));
  }

  /** Get player journal */
  getJournal(): JournalEntry[] {
    if (!this.player) return [];
    return this.deepClone(this.player.journal);
  }

  /** Log a world event */
  logWorldEvent(summary: string, severity: any): void {
    this.worldState.history.push({
      day: this.worldState.day,
      summary,
      severity,
    });
    // Trim history
    if (this.worldState.history.length > 1000) {
      this.worldState.history = this.worldState.history.slice(-500);
    }
  }

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================

  /** Get complete game state as a snapshot without saving */
  getCurrentState(): Omit<SaveSnapshot, 'version' | 'timestamp' | 'rngSeed'> {
    if (!this.player) throw new StateError('No player exists');
    return {
      player: this.deepClone(this.player),
      locations: this.getAllLocations(),
      regions: this.getAllRegions(),
      factions: this.getAllFactions(),
      npcs: this.getAllNPCs(),
      events: this.getAllEvents(),
      rumors: this.getAllRumors(),
      beliefs: this.getAllBeliefs(),
      consequences: this.getAllConsequences(),
      worldState: this.deepClone(this.worldState),
      config: this.deepClone(this.config),
      deathRecords: this.deepClone(this.deathRecords),
      journalEntries: this.deepClone(this.player.journal),
      turnNumber: this.turnNumber,
      currentDay: this.worldState.day,
      currentHour: this.worldState.hour,
    };
  }

  /** Get entity counts for debugging */
  getEntityCounts(): Record<string, number> {
    return {
      player: this.player ? 1 : 0,
      locations: this.locations.size,
      regions: this.regions.size,
      factions: this.factions.size,
      npcs: this.npcs.size,
      events: this.events.size,
      rumors: this.rumors.size,
      beliefs: this.beliefs.size,
      consequences: this.consequences.size,
      deathRecords: this.deathRecords.length,
      stateDiffs: this.stateDiffs.length,
    };
  }

  /** Clear all state (for reset/testing) */
  clearAll(): void {
    this.player = null;
    this.locations.clear();
    this.regions.clear();
    this.factions.clear();
    this.npcs.clear();
    this.events.clear();
    this.rumors.clear();
    this.beliefs.clear();
    this.consequences.clear();
    this.worldState = this.createInitialWorldState();
    this.deathRecords = [];
    this.stateDiffs = [];
    this.undoStack = [];
    this.redoStack = [];
    this.turnNumber = 0;
  }

  // =============================================================================
  // DEEP CLONE HELPER
  // =============================================================================

  /** Deep clone any serializable object */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

// =============================================================================
// STATICS
// =============================================================================

/** Current snapshot version for migration support */
export const SNAPSHOT_VERSION = '1.0.0';

/** Validate a snapshot before loading */
export function validateSnapshot(snapshot: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!snapshot || typeof snapshot !== 'object') {
    errors.push('Snapshot must be an object');
    return { valid: false, errors };
  }

  const s = snapshot as Record<string, unknown>;

  if (!s.player) errors.push('Missing player');
  if (!Array.isArray(s.locations)) errors.push('Missing or invalid locations array');
  if (!Array.isArray(s.regions)) errors.push('Missing or invalid regions array');
  if (!Array.isArray(s.factions)) errors.push('Missing or invalid factions array');
  if (!Array.isArray(s.npcs)) errors.push('Missing or invalid npcs array');
  if (!Array.isArray(s.events)) errors.push('Missing or invalid events array');
  if (!Array.isArray(s.rumors)) errors.push('Missing or invalid rumors array');
  if (!Array.isArray(s.beliefs)) errors.push('Missing or invalid beliefs array');
  if (!Array.isArray(s.consequences)) errors.push('Missing or invalid consequences array');
  if (!s.worldState) errors.push('Missing worldState');

  return { valid: errors.length === 0, errors };
}
