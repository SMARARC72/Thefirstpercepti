import type {
  AgentLogEntry,
  LegacyRecord,
  NPCMemory,
  Rumor,
  SaveSlot,
  WorldEvent,
} from "./types.js";

/**
 * Storage contract used by the narrative + LLM stack and the web client.
 * Three implementations live in this package:
 *   - PostgresRepository    (server-side, exported from /server)
 *   - HttpRepository        (browser, calls /api/* serverless functions)
 *   - LocalStorageRepository (browser fallback for save snapshots only)
 *   - MemoryRepository      (tests; non-persistent)
 */
export interface GameRepository {
  /** Establish connection / ensure schema. Idempotent. */
  init(): Promise<void>;
  /** Close pooled connections; safe to call multiple times. */
  close(): Promise<void>;

  // ── Agent logging ─────────────────────────────────────────────
  logAgentAction(log: AgentLogEntry): Promise<void>;
  getAgentLogs(
    campaignId: string,
    options?: { agentType?: string; limit?: number },
  ): Promise<AgentLogEntry[]>;

  // ── NPC memory ────────────────────────────────────────────────
  getNPCMemories(
    npcId: string,
    options?: { includeForgotten?: boolean; limit?: number; minImportance?: number },
  ): Promise<NPCMemory[]>;
  addNPCMemory(memory: NPCMemory): Promise<void>;
  updateMemoryRecall(memoryId: string, turn: number): Promise<void>;
  forgetOldMemories(
    npcId: string,
    beforeTurn: number,
    threshold: number,
  ): Promise<number>;
  getMemoriesAboutEntity(
    npcId: string,
    entityType: string,
    entityId: string,
  ): Promise<NPCMemory[]>;

  // ── World events ──────────────────────────────────────────────
  recordEvent(event: WorldEvent): Promise<void>;
  getRecentEvents(campaignId: string, turns: number): Promise<WorldEvent[]>;
  getEventsAtLocation(locationId: string, turns: number): Promise<WorldEvent[]>;

  // ── Rumors ────────────────────────────────────────────────────
  addRumor(rumor: Rumor): Promise<void>;
  getRumorsKnownToPlayer(campaignId: string): Promise<Rumor[]>;
  markRumorKnownToPlayer(rumorId: string): Promise<void>;
  propagateRumors(campaignId: string): Promise<number>;

  // ── Saves ─────────────────────────────────────────────────────
  saveSnapshot(slot: SaveSlot): Promise<void>;
  loadSnapshot(campaignId: string, slotNumber: number): Promise<SaveSlot | null>;
  listSnapshots(campaignId: string): Promise<SaveSlot[]>;
  deleteSnapshot(saveId: string): Promise<void>;

  // ── Legacy ────────────────────────────────────────────────────
  recordLegacy(legacy: LegacyRecord): Promise<void>;
  listLegacies(limit?: number): Promise<LegacyRecord[]>;
}
