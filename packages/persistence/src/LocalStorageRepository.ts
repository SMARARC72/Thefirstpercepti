import type { GameRepository } from "./repository.js";
import type {
  AgentLogEntry,
  LegacyRecord,
  NPCMemory,
  Rumor,
  SaveSlot,
  WorldEvent,
} from "./types.js";

const SAVES_KEY = "tfp.persistence.saves.v1";
const LEGACIES_KEY = "tfp.persistence.legacies.v1";

/**
 * Browser-only fallback used when the HTTP API is unreachable.
 *
 * Saves and legacy records persist across reloads. Everything else
 * (world events, NPC memories, rumors, agent logs) lives in-memory
 * for the session only — cross-run living-world memory genuinely
 * requires the server. Callers should warn the player that offline
 * runs won't compound across sessions.
 */
export class LocalStorageRepository implements GameRepository {
  private events: WorldEvent[] = [];
  private memories: NPCMemory[] = [];
  private rumors: Rumor[] = [];
  private agentLogs: AgentLogEntry[] = [];

  async init(): Promise<void> {
    if (typeof localStorage === "undefined") {
      throw new Error("LocalStorageRepository requires a browser environment");
    }
  }

  async close(): Promise<void> {}

  // ── Saves ─────────────────────────────────────────────────────

  async saveSnapshot(slot: SaveSlot): Promise<void> {
    const all = this.readSaves();
    const idx = all.findIndex((s) => s.saveId === slot.saveId);
    if (idx >= 0) all[idx] = slot;
    else all.unshift(slot);
    this.writeSaves(all);
  }

  async loadSnapshot(campaignId: string, slotNumber: number): Promise<SaveSlot | null> {
    return (
      this.readSaves().find(
        (s) => s.campaignId === campaignId && s.slotNumber === slotNumber,
      ) ?? null
    );
  }

  async listSnapshots(campaignId: string): Promise<SaveSlot[]> {
    return this.readSaves()
      .filter((s) => s.campaignId === campaignId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async deleteSnapshot(saveId: string): Promise<void> {
    const all = this.readSaves().filter((s) => s.saveId !== saveId);
    this.writeSaves(all);
  }

  // ── Legacy ────────────────────────────────────────────────────

  async recordLegacy(legacy: LegacyRecord): Promise<void> {
    const all = this.readLegacies();
    all.unshift(legacy);
    this.writeLegacies(all.slice(0, 50));
  }

  async listLegacies(limit = 20): Promise<LegacyRecord[]> {
    return this.readLegacies().slice(0, limit);
  }

  // ── World events (session-scoped) ─────────────────────────────

  async recordEvent(event: WorldEvent): Promise<void> {
    this.events.unshift(event);
    if (this.events.length > 500) this.events.length = 500;
  }

  async getRecentEvents(campaignId: string, turns: number): Promise<WorldEvent[]> {
    return this.events
      .filter((e) => e.campaignId === campaignId)
      .slice(0, turns);
  }

  async getEventsAtLocation(locationId: string, turns: number): Promise<WorldEvent[]> {
    return this.events.filter((e) => e.locationId === locationId).slice(0, turns);
  }

  // ── NPC memory (session-scoped) ───────────────────────────────

  async getNPCMemories(
    npcId: string,
    options: { includeForgotten?: boolean; limit?: number; minImportance?: number } = {},
  ): Promise<NPCMemory[]> {
    const min = options.minImportance ?? 0;
    return this.memories
      .filter(
        (m) =>
          m.npcId === npcId &&
          (options.includeForgotten || !m.isForgotten) &&
          m.importanceScore >= min,
      )
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, options.limit ?? 50);
  }

  async addNPCMemory(memory: NPCMemory): Promise<void> {
    this.memories.unshift(memory);
    if (this.memories.length > 500) this.memories.length = 500;
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

  // ── Rumors (session-scoped) ───────────────────────────────────

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

  // ── Agent log (session-scoped) ────────────────────────────────

  async logAgentAction(log: AgentLogEntry): Promise<void> {
    this.agentLogs.unshift(log);
    if (this.agentLogs.length > 500) this.agentLogs.length = 500;
  }

  async getAgentLogs(
    campaignId: string,
    options: { agentType?: string; limit?: number } = {},
  ): Promise<AgentLogEntry[]> {
    return this.agentLogs
      .filter(
        (l) =>
          l.campaignId === campaignId &&
          (options.agentType === undefined || l.agentType === options.agentType),
      )
      .slice(0, options.limit ?? 100);
  }

  // ── Internals ─────────────────────────────────────────────────

  private readSaves(): SaveSlot[] {
    try {
      const raw = localStorage.getItem(SAVES_KEY);
      return raw ? (JSON.parse(raw) as SaveSlot[]) : [];
    } catch {
      return [];
    }
  }

  private writeSaves(slots: SaveSlot[]): void {
    try {
      localStorage.setItem(SAVES_KEY, JSON.stringify(slots));
    } catch {
      // Quota exceeded or storage disabled. Silent.
    }
  }

  private readLegacies(): LegacyRecord[] {
    try {
      const raw = localStorage.getItem(LEGACIES_KEY);
      return raw ? (JSON.parse(raw) as LegacyRecord[]) : [];
    } catch {
      return [];
    }
  }

  private writeLegacies(legacies: LegacyRecord[]): void {
    try {
      localStorage.setItem(LEGACIES_KEY, JSON.stringify(legacies));
    } catch {
      // ignore
    }
  }
}
