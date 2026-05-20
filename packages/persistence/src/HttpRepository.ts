import type { GameRepository } from "./repository.js";
import type {
  AgentLogEntry,
  LegacyRecord,
  NPCMemory,
  Rumor,
  SaveSlot,
  WorldEvent,
} from "./types.js";
import type { ApiResponse } from "./wire.js";

export interface HttpRepositoryOptions {
  /** Defaults to "" (same-origin). Set to e.g. "https://api.example.com" in tests. */
  baseUrl?: string;
  /** Default request timeout in ms. */
  timeoutMs?: number;
  /** Custom fetch (test injection). Defaults to globalThis.fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * Browser-side GameRepository that talks to the /api/* serverless functions.
 * Throws on transport / 5xx failures so the caller can swap to a fallback
 * (e.g. LocalStorageRepository). Reads are not retried — callers either
 * tolerate empty arrays or use a wrapper that catches and falls through.
 */
export class HttpRepository implements GameRepository {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpRepositoryOptions = {}) {
    this.baseUrl = options.baseUrl ?? "";
    this.timeoutMs = options.timeoutMs ?? 8000;
    const f = options.fetchImpl ?? globalThis.fetch;
    if (!f) {
      throw new Error("HttpRepository: no fetch implementation available");
    }
    this.fetchImpl = f.bind(globalThis);
  }

  async init(): Promise<void> {
    // Smoke-ping the API. If the route is missing or DB is down the
    // caller should swap to a fallback.
    await this.request<{ ok: true }>("GET", "/api/health");
  }

  async close(): Promise<void> {
    /* HTTP client is stateless. */
  }

  // ── Saves ─────────────────────────────────────────────────────

  async saveSnapshot(slot: SaveSlot): Promise<void> {
    await this.request<{ saveId: string }>("POST", "/api/saves", slot);
  }

  async loadSnapshot(campaignId: string, slotNumber: number): Promise<SaveSlot | null> {
    const slots = await this.listSnapshots(campaignId);
    return slots.find((s) => s.slotNumber === slotNumber) ?? null;
  }

  async listSnapshots(campaignId: string): Promise<SaveSlot[]> {
    return this.request<SaveSlot[]>(
      "GET",
      `/api/saves?campaignId=${encodeURIComponent(campaignId)}`,
    );
  }

  async deleteSnapshot(saveId: string): Promise<void> {
    await this.request<{ saveId: string }>(
      "DELETE",
      `/api/saves/${encodeURIComponent(saveId)}`,
    );
  }

  // ── World events ──────────────────────────────────────────────

  async recordEvent(event: WorldEvent): Promise<void> {
    await this.request<{ eventId: string }>("POST", "/api/world-events", event);
  }

  async getRecentEvents(campaignId: string, turns: number): Promise<WorldEvent[]> {
    return this.request<WorldEvent[]>(
      "GET",
      `/api/world-events?campaignId=${encodeURIComponent(campaignId)}&limit=${turns}`,
    );
  }

  async getEventsAtLocation(locationId: string, turns: number): Promise<WorldEvent[]> {
    return this.request<WorldEvent[]>(
      "GET",
      `/api/world-events?locationId=${encodeURIComponent(locationId)}&limit=${turns}`,
    );
  }

  // ── NPC memory ────────────────────────────────────────────────

  async getNPCMemories(
    npcId: string,
    options: { includeForgotten?: boolean; limit?: number; minImportance?: number } = {},
  ): Promise<NPCMemory[]> {
    const params = new URLSearchParams({ npcId });
    if (options.includeForgotten) params.set("includeForgotten", "1");
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.minImportance !== undefined) {
      params.set("minImportance", String(options.minImportance));
    }
    return this.request<NPCMemory[]>("GET", `/api/npc-memories?${params.toString()}`);
  }

  async addNPCMemory(memory: NPCMemory): Promise<void> {
    await this.request<{ memoryId: string }>("POST", "/api/npc-memories", memory);
  }

  async updateMemoryRecall(memoryId: string, turn: number): Promise<void> {
    await this.request<{ memoryId: string }>(
      "POST",
      `/api/npc-memories/${encodeURIComponent(memoryId)}/recall`,
      { turn },
    );
  }

  async forgetOldMemories(
    npcId: string,
    beforeTurn: number,
    threshold: number,
  ): Promise<number> {
    const { forgotten } = await this.request<{ forgotten: number }>(
      "POST",
      "/api/npc-memories/forget",
      { npcId, beforeTurn, threshold },
    );
    return forgotten;
  }

  async getMemoriesAboutEntity(
    npcId: string,
    entityType: string,
    entityId: string,
  ): Promise<NPCMemory[]> {
    const params = new URLSearchParams({
      npcId,
      aboutEntityType: entityType,
      aboutEntityId: entityId,
    });
    return this.request<NPCMemory[]>("GET", `/api/npc-memories?${params.toString()}`);
  }

  // ── Rumors ────────────────────────────────────────────────────

  async addRumor(rumor: Rumor): Promise<void> {
    await this.request<{ rumorId: string }>("POST", "/api/rumors", rumor);
  }

  async getRumorsKnownToPlayer(campaignId: string): Promise<Rumor[]> {
    return this.request<Rumor[]>(
      "GET",
      `/api/rumors?campaignId=${encodeURIComponent(campaignId)}&knownToPlayer=1`,
    );
  }

  async markRumorKnownToPlayer(rumorId: string): Promise<void> {
    await this.request<{ rumorId: string }>(
      "POST",
      `/api/rumors/${encodeURIComponent(rumorId)}/known`,
      {},
    );
  }

  async propagateRumors(campaignId: string): Promise<number> {
    const { propagated } = await this.request<{ propagated: number }>(
      "POST",
      "/api/rumors/propagate",
      { campaignId },
    );
    return propagated;
  }

  // ── Agent log ─────────────────────────────────────────────────

  async logAgentAction(log: AgentLogEntry): Promise<void> {
    await this.request<{ agentLogId: string }>("POST", "/api/agent-logs", log);
  }

  async getAgentLogs(
    campaignId: string,
    options: { agentType?: string; limit?: number } = {},
  ): Promise<AgentLogEntry[]> {
    const params = new URLSearchParams({ campaignId });
    if (options.agentType) params.set("agentType", options.agentType);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    return this.request<AgentLogEntry[]>("GET", `/api/agent-logs?${params.toString()}`);
  }

  // ── Legacy ────────────────────────────────────────────────────

  async recordLegacy(legacy: LegacyRecord): Promise<void> {
    await this.request<{ legacyId: string }>("POST", "/api/legacies", legacy);
  }

  async listLegacies(limit = 20): Promise<LegacyRecord[]> {
    return this.request<LegacyRecord[]>("GET", `/api/legacies?limit=${limit}`);
  }

  // ── Internals ─────────────────────────────────────────────────

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method,
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await response.text();
      let payload: ApiResponse<T> | undefined;
      try {
        payload = text ? (JSON.parse(text) as ApiResponse<T>) : undefined;
      } catch {
        // fall through to status-based error
      }
      if (!response.ok || !payload || payload.ok === false) {
        const message =
          payload && payload.ok === false
            ? payload.error
            : `HTTP ${response.status} ${response.statusText} on ${method} ${path}`;
        const code =
          payload && payload.ok === false ? payload.code ?? "internal" : "internal";
        const err = new HttpRepositoryError(message, response.status, code);
        throw err;
      }
      return payload.data;
    } finally {
      clearTimeout(timer);
    }
  }
}

export class HttpRepositoryError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "HttpRepositoryError";
  }
}
