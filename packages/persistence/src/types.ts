/**
 * Persistence-layer wire types. These mirror database/schema.postgres.sql.
 * They are sent across HTTP as JSON, so they must remain primitive-only
 * (no Date instances — use ISO strings or `number` for ms-since-epoch).
 */

export interface AgentLogEntry {
  agentLogId: string;
  campaignId: string;
  agentType: "npc_ai" | "faction_ai" | "world_sim" | "gm_narrator";
  agentId: string;
  actionTaken: string;
  reasoning?: string;
  inputContext?: string;
  outputResult?: string;
  tokensUsed?: number;
  latencyMs?: number;
  llmContextHash?: string;
  /** Milliseconds since epoch. */
  timestamp: number;
}

export interface NPCMemory {
  memoryId: string;
  campaignId: string;
  npcId: string;
  memoryType:
    | "event"
    | "meeting"
    | "place"
    | "item"
    | "conversation"
    | "trauma"
    | "triumph"
    | "lesson"
    | "rumor";
  description: string;
  sourceEventId?: string;
  sourceRumorId?: string;
  /** -1.0..1.0 negative/positive feeling */
  emotionalValence: number;
  /** 0.0..1.0 how strongly it's felt */
  emotionalIntensity: number;
  /** 0.0..1.0 resists decay */
  importanceScore: number;
  decayRate: number;
  timesRecalled: number;
  isForgotten: boolean;
  isCoreMemory: boolean;
  aboutEntityType?: "player" | "npc" | "faction" | "location" | "item";
  aboutEntityId?: string;
  formedTurn: number;
  lastRecalledTurn?: number;
  /** Milliseconds since epoch. */
  timestamp: number;
}

export interface WorldEvent {
  eventId: string;
  campaignId: string;
  eventTypeId: string;
  actorType: "player" | "npc" | "faction" | "system" | "environment" | "divine";
  actorId?: string;
  actorName?: string;
  verb: string;
  description: string;
  targetType?: "player" | "npc" | "faction" | "location" | "item" | "region" | "none";
  targetId?: string;
  targetName?: string;
  locationId?: string;
  regionId?: string;
  isPublic: boolean;
  isPlayerFacing: boolean;
  witnesses?: string[];
  rollResult?: string;
  statUsed?: string;
  difficulty?: number;
  /** 1..10 narrative weight, controls retention and recall priority. */
  importance: number;
  narrativeTags?: string[];
  turnNumber: number;
  /** Milliseconds since epoch. */
  timestamp: number;
}

export interface Rumor {
  rumorId: string;
  campaignId: string;
  sourceEventId?: string;
  content: string;
  /** 0.0 (lie) .. 1.0 (truth) */
  truthLevel: number;
  rumorStatusId: string;
  /** 1..10 how far this has spread */
  spreadLevel: number;
  originLocationId?: string;
  originNpcId?: string;
  knownByFactionIds?: string[];
  knownByNpcIds?: string[];
  isKnownToPlayer: boolean;
  spreadRate: number;
  decayRate: number;
  narrativeHook?: string;
  associatedFactionId?: string;
  createdTurn: number;
  lastSpreadTurn?: number;
  /** Milliseconds since epoch. */
  timestamp: number;
}

export interface SaveSlot {
  saveId: string;
  campaignId: string;
  slotNumber?: number;
  saveName?: string;
  playerId: string;
  currentSceneId?: string;
  currentLocationId?: string;
  /** Stringified GameState (the canonical save payload). */
  worldStateBlob: string;
  checksum?: string;
  playTimeSeconds: number;
  inGameDate?: string;
  isAutoSave: boolean;
  isCheckpoint: boolean;
  /** Milliseconds since epoch. */
  timestamp: number;
}

export interface LegacyRecord {
  legacyId: string;
  campaignId?: string;
  characterName: string;
  vector: string;
  epitaph: string;
  turnsSurvived: number;
  finalLocationId?: string;
  /** Stringified WorldSnapshot from death. */
  worldSnapshot: string;
  /** Stringified inheritance bundle (item, advantage, etc.). */
  inheritance?: string;
  /** Milliseconds since epoch. */
  timestamp: number;
}
