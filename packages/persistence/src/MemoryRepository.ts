import type { GameRepository } from "./repository.js";
import type {
  AgentLogEntry,
  LegacyRecord,
  NPCMemory,
  Rumor,
  SaveSlot,
  WorldEvent,
} from "./types.js";

/**
 * In-memory implementation. Used by unit tests and as the absolute
 * fallback when neither HTTP nor localStorage is available (e.g. SSR).
 * Data is lost when the instance is discarded.
 */
export class MemoryRepository implements GameRepository {
  private events: WorldEvent[] = [];
  private memories: NPCMemory[] = [];
  private rumors: Rumor[] = [];
  private agentLogs: AgentLogEntry[] = [];
  private saves: SaveSlot[] = [];
  private legacies: LegacyRecord[] = [];

  async init(): Promise<void> {}
  async close(): Promise<void> {}

  async logAgentAction(log: AgentLogEntry): Promise<void> {
    this.agentLogs.unshift(log);
    if (this.agentLogs.length > 2000) this.agentLogs.length = 2000;
  }

  async getAgentLogs(
    campaignId: string,
    options: { agentType?: string; limit?: number } = {},
  ): Promise<AgentLogEntry[]> {
    const filtered = this.agentLogs.filter(
      (l) =>
        l.campaignId === campaignId &&
        (options.agentType === undefined || l.agentType === options.agentType),
    );
    return filtered.slice(0, options.limit ?? 100);
  }

  async getNPCMemories(
    npcId: string,
    options: { includeForgotten?: boolean; limit?: number; minImportance?: number } = {},
  ): Promise<NPCMemory[]> {
    const min = options.minImportance ?? 0;
    const filtered = this.memories
      .filter(
        (m) =>
          m.npcId === npcId &&
          (options.includeForgotten || !m.isForgotten) &&
          m.importanceScore >= min,
      )
      .sort((a, b) => b.importanceScore - a.importanceScore);
    return filtered.slice(0, options.limit ?? 50);
  }

  async addNPCMemory(memory: NPCMemory): Promise<void> {
    this.memories.unshift(memory);
    if (this.memories.length > 5000) this.memories.length = 5000;
  }

  async updateMemoryRecall(memoryId: string, turn: number): Promise<void> {
    const target = this.memories.find((m) => m.memoryId === memoryId);
    if (target) {
      target.timesRecalled += 1;
      target.lastRecalledTurn = turn;
    }
  }

  async forgetOldMemories(
    npcId: string,
    beforeTurn: number,
    threshold: number,
  ): Promise<number> {
    let count = 0;
    for (const m of this.memories) {
      if (
        m.npcId === npcId &&
        !m.isCoreMemory &&
        m.formedTurn < beforeTurn &&
        m.importanceScore < threshold
      ) {
        m.isForgotten = true;
        count += 1;
      }
    }
    return count;
  }

  async getMemoriesAboutEntity(
    npcId: string,
    entityType: string,
    entityId: string,
  ): Promise<NPCMemory[]> {
    return this.memories.filter(
      (m) =>
        m.npcId === npcId &&
        !m.isForgotten &&
        m.aboutEntityType === entityType &&
        m.aboutEntityId === entityId,
    );
  }

  async recordEvent(event: WorldEvent): Promise<void> {
    this.events.unshift(event);
    if (this.events.length > 10000) this.events.length = 10000;
  }

  async getRecentEvents(campaignId: string, turns: number): Promise<WorldEvent[]> {
    return this.events
      .filter((e) => e.campaignId === campaignId)
      .sort((a, b) => b.turnNumber - a.turnNumber)
      .slice(0, turns);
  }

  async getEventsAtLocation(locationId: string, turns: number): Promise<WorldEvent[]> {
    return this.events
      .filter((e) => e.locationId === locationId)
      .sort((a, b) => b.turnNumber - a.turnNumber)
      .slice(0, turns);
  }

  async addRumor(rumor: Rumor): Promise<void> {
    this.rumors.unshift(rumor);
  }

  async getRumorsKnownToPlayer(campaignId: string): Promise<Rumor[]> {
    return this.rumors.filter((r) => r.campaignId === campaignId && r.isKnownToPlayer);
  }

  async markRumorKnownToPlayer(rumorId: string): Promise<void> {
    const target = this.rumors.find((r) => r.rumorId === rumorId);
    if (target) target.isKnownToPlayer = true;
  }

  async propagateRumors(_campaignId: string): Promise<number> {
    return 0;
  }

  async saveSnapshot(slot: SaveSlot): Promise<void> {
    const existingIdx = this.saves.findIndex((s) => s.saveId === slot.saveId);
    if (existingIdx >= 0) this.saves[existingIdx] = slot;
    else this.saves.unshift(slot);
  }

  async loadSnapshot(campaignId: string, slotNumber: number): Promise<SaveSlot | null> {
    return (
      this.saves.find((s) => s.campaignId === campaignId && s.slotNumber === slotNumber) ??
      null
    );
  }

  async listSnapshots(campaignId: string): Promise<SaveSlot[]> {
    return this.saves
      .filter((s) => s.campaignId === campaignId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async deleteSnapshot(saveId: string): Promise<void> {
    this.saves = this.saves.filter((s) => s.saveId !== saveId);
  }

  async recordLegacy(legacy: LegacyRecord): Promise<void> {
    this.legacies.unshift(legacy);
    if (this.legacies.length > 200) this.legacies.length = 200;
  }

  async listLegacies(limit = 20): Promise<LegacyRecord[]> {
    return this.legacies.slice(0, limit);
  }
}
