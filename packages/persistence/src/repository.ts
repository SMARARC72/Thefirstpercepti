import type {
  AgentLogEntry,
  NPCMemory,
  WorldEvent,
  Rumor,
  SaveSlot,
  StateDiff,
} from "./types.js";

export interface GameRepository {
  // Campaign lifecycle
  init(): Promise<void>;
  close(): Promise<void>;

  // Agent logging
  logAgentAction(log: AgentLogEntry): Promise<void>;
  getAgentLogs(campaignId: string, options?: { agentType?: string; limit?: number }): Promise<AgentLogEntry[]>;

  // NPC Memory
  getNPCMemories(npcId: string, options?: { includeForgotten?: boolean; limit?: number; minImportance?: number }): Promise<NPCMemory[]>;
  addNPCMemory(memory: NPCMemory): Promise<void>;
  updateMemoryRecall(memoryId: string, turn: number): Promise<void>;
  forgetOldMemories(npcId: string, beforeTurn: number, threshold: number): Promise<number>;
  getMemoriesAboutEntity(npcId: string, entityType: string, entityId: string): Promise<NPCMemory[]>;

  // Events
  recordEvent(event: WorldEvent): Promise<void>;
  getRecentEvents(campaignId: string, turns: number): Promise<WorldEvent[]>;
  getEventsAtLocation(locationId: string, turns: number): Promise<WorldEvent[]>;

  // Rumors
  addRumor(rumor: Rumor): Promise<void>;
  getRumorsKnownToPlayer(campaignId: string): Promise<Rumor[]>;
  propagateRumors(campaignId: string): Promise<number>;
  markRumorKnownToPlayer(rumorId: string): Promise<void>;

  // Save/Load
  saveSnapshot(slot: SaveSlot): Promise<void>;
  loadSnapshot(campaignId: string, slotNumber: number): Promise<SaveSlot | null>;
  listSnapshots(campaignId: string): Promise<SaveSlot[]>;
  deleteSnapshot(saveId: string): Promise<void>;

  // State diffs
  recordStateDiff(diff: StateDiff): Promise<void>;
  getPendingDiffs(campaignId: string): Promise<StateDiff[]>;
  applyDiff(diffId: string): Promise<void>;

  // Schema
  runSchema(sql: string): Promise<void>;
}
