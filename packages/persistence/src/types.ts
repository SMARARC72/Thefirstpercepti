/**
 * Persistence layer types aligned with database/schema.sql
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
  timestamp: number;
}

export interface NPCMemory {
  memoryId: string;
  campaignId: string;
  npcId: string;
  memoryType: "event" | "meeting" | "place" | "item" | "conversation" | "trauma" | "triumph" | "lesson" | "rumor";
  description: string;
  sourceEventId?: string;
  sourceRumorId?: string;
  emotionalValence: number;
  emotionalIntensity: number;
  importanceScore: number;
  decayRate: number;
  timesRecalled: number;
  isForgotten: boolean;
  isCoreMemory: boolean;
  aboutEntityType?: "player" | "npc" | "faction" | "location" | "item";
  aboutEntityId?: string;
  formedTurn: number;
  lastRecalledTurn?: number;
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
  importance: number;
  narrativeTags?: string[];
  turnNumber: number;
  timestamp: number;
}

export interface Rumor {
  rumorId: string;
  campaignId: string;
  sourceEventId?: string;
  content: string;
  truthLevel: number;
  rumorStatusId: string;
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
  worldStateBlob: string;
  checksum?: string;
  playTimeSeconds: number;
  inGameDate?: string;
  isAutoSave: boolean;
  isCheckpoint: boolean;
  timestamp: number;
}

export interface StateDiff {
  diffId: string;
  campaignId: string;
  targetTable: string;
  targetId: string;
  targetColumn: string;
  oldValue?: string;
  newValue: string;
  causeEventId?: string;
  causeType: "simulation" | "player_action" | "npc_action" | "consequence" | "manual";
  isValidated: boolean;
  isApplied: boolean;
  validationNotes?: string;
  turnNumber: number;
  timestamp: number;
}
