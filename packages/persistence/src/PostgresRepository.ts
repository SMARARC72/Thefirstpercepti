import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";
import type { GameRepository } from "./repository.js";
import type {
  AgentLogEntry,
  LegacyRecord,
  NPCMemory,
  Rumor,
  SaveSlot,
  WorldEvent,
} from "./types.js";

export interface PostgresRepositoryOptions {
  /** Pre-built pool. If omitted, one is constructed from connectionString. */
  pool?: Pool;
  /**
   * Connection string. If omitted, reads from POSTGRES_URL_NON_POOLING
   * (preferred) then POSTGRES_URL. Throws if neither is set.
   */
  connectionString?: string;
  /** Forwarded to pg.Pool when constructing internally. */
  poolConfig?: PoolConfig;
}

/**
 * Server-side GameRepository backed by pg.Pool. Safe to share across
 * serverless invocations within the same warm container. Each invocation
 * should call init() — it short-circuits if the pool is already ready.
 *
 * Important: the constructor does NOT open a connection. All connection
 * setup happens lazily so a missing env var doesn't crash module load.
 */
export class PostgresRepository implements GameRepository {
  private pool: Pool | null;
  private readonly connectionString: string | null;
  private readonly poolConfig: PoolConfig | undefined;
  private initialized = false;

  constructor(options: PostgresRepositoryOptions = {}) {
    this.pool = options.pool ?? null;
    this.poolConfig = options.poolConfig;
    this.connectionString =
      options.connectionString ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.POSTGRES_URL ??
      null;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (!this.pool) {
      if (!this.connectionString) {
        throw new Error(
          "PostgresRepository: no connection string available (set POSTGRES_URL_NON_POOLING or POSTGRES_URL)",
        );
      }
      // Vercel↔Supabase auto-sets POSTGRES_URL with ?sslmode=require, which
      // some `pg` versions hand off to a TLS context built from the URL —
      // bypassing the Pool's explicit ssl config. The symptom is
      // "self-signed certificate in certificate chain" on the AWS pooler
      // host despite our Pool config saying rejectUnauthorized:false.
      // Strip sslmode from the URL so the Pool's ssl option is the single
      // source of truth.
      const cleanedConnectionString = this.connectionString.replace(
        /([?&])sslmode=[^&]*(&|$)/,
        (_match, prefix, suffix) => (suffix === "&" ? prefix : ""),
      );
      this.pool = new Pool({
        connectionString: cleanedConnectionString,
        max: 5,
        idleTimeoutMillis: 30_000,
        ssl: { rejectUnauthorized: false },
        ...this.poolConfig,
      });
    }
    // Cheap connectivity probe so init() rejects when the DB is unreachable.
    const client = await this.pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
    }
    this.initialized = true;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
    }
  }

  // ── Saves ─────────────────────────────────────────────────────

  async saveSnapshot(slot: SaveSlot): Promise<void> {
    await this.run(async (client) => {
      await client.query(
        `INSERT INTO save_snapshot (
            save_id, campaign_id, slot_number, save_name, player_id,
            current_scene_id, current_location_id, world_state_blob,
            checksum, play_time_seconds, in_game_date,
            is_auto_save, is_checkpoint, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13, NOW())
         ON CONFLICT (save_id) DO UPDATE SET
            slot_number = EXCLUDED.slot_number,
            save_name = EXCLUDED.save_name,
            player_id = EXCLUDED.player_id,
            current_scene_id = EXCLUDED.current_scene_id,
            current_location_id = EXCLUDED.current_location_id,
            world_state_blob = EXCLUDED.world_state_blob,
            checksum = EXCLUDED.checksum,
            play_time_seconds = EXCLUDED.play_time_seconds,
            in_game_date = EXCLUDED.in_game_date,
            is_auto_save = EXCLUDED.is_auto_save,
            is_checkpoint = EXCLUDED.is_checkpoint,
            updated_at = NOW()`,
        [
          slot.saveId,
          slot.campaignId,
          slot.slotNumber ?? null,
          slot.saveName ?? null,
          slot.playerId,
          slot.currentSceneId ?? null,
          slot.currentLocationId ?? null,
          slot.worldStateBlob,
          slot.checksum ?? null,
          slot.playTimeSeconds,
          slot.inGameDate ?? null,
          slot.isAutoSave,
          slot.isCheckpoint,
        ],
      );
    });
  }

  async loadSnapshot(campaignId: string, slotNumber: number): Promise<SaveSlot | null> {
    const rows = await this.queryRows<SaveSnapshotRow>(
      `SELECT * FROM save_snapshot WHERE campaign_id = $1 AND slot_number = $2 LIMIT 1`,
      [campaignId, slotNumber],
    );
    return rows.length === 0 ? null : rowToSaveSlot(rows[0]);
  }

  async listSnapshots(campaignId: string): Promise<SaveSlot[]> {
    const rows = await this.queryRows<SaveSnapshotRow>(
      `SELECT * FROM save_snapshot WHERE campaign_id = $1 ORDER BY updated_at DESC`,
      [campaignId],
    );
    return rows.map(rowToSaveSlot);
  }

  async deleteSnapshot(saveId: string): Promise<void> {
    await this.run((client) => client.query(`DELETE FROM save_snapshot WHERE save_id = $1`, [saveId]));
  }

  // ── World events ──────────────────────────────────────────────

  async recordEvent(event: WorldEvent): Promise<void> {
    await this.run((client) =>
      client.query(
        `INSERT INTO world_event (
           event_id, campaign_id, event_type_id, actor_type, actor_id, actor_name,
           verb, description, target_type, target_id, target_name,
           location_id, region_id, is_public, is_player_facing,
           witnesses, roll_result, stat_used, difficulty,
           importance, narrative_tags, turn_number
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19,$20,$21::jsonb,$22)
         ON CONFLICT (event_id) DO NOTHING`,
        [
          event.eventId,
          event.campaignId,
          event.eventTypeId,
          event.actorType,
          event.actorId ?? null,
          event.actorName ?? null,
          event.verb,
          event.description,
          event.targetType ?? null,
          event.targetId ?? null,
          event.targetName ?? null,
          event.locationId ?? null,
          event.regionId ?? null,
          event.isPublic,
          event.isPlayerFacing,
          event.witnesses ? JSON.stringify(event.witnesses) : null,
          event.rollResult ?? null,
          event.statUsed ?? null,
          event.difficulty ?? null,
          event.importance,
          event.narrativeTags ? JSON.stringify(event.narrativeTags) : null,
          event.turnNumber,
        ],
      ),
    );
  }

  async getRecentEvents(campaignId: string, turns: number): Promise<WorldEvent[]> {
    const rows = await this.queryRows<WorldEventRow>(
      `SELECT * FROM world_event WHERE campaign_id = $1
         ORDER BY turn_number DESC, created_at DESC LIMIT $2`,
      [campaignId, turns],
    );
    return rows.map(rowToWorldEvent);
  }

  async getEventsAtLocation(locationId: string, turns: number): Promise<WorldEvent[]> {
    const rows = await this.queryRows<WorldEventRow>(
      `SELECT * FROM world_event WHERE location_id = $1
         ORDER BY created_at DESC LIMIT $2`,
      [locationId, turns],
    );
    return rows.map(rowToWorldEvent);
  }

  // ── NPC memory ────────────────────────────────────────────────

  async getNPCMemories(
    npcId: string,
    options: { includeForgotten?: boolean; limit?: number; minImportance?: number } = {},
  ): Promise<NPCMemory[]> {
    const conditions: string[] = ["npc_id = $1"];
    const params: unknown[] = [npcId];
    if (!options.includeForgotten) conditions.push("is_forgotten = FALSE");
    if (options.minImportance !== undefined) {
      params.push(options.minImportance);
      conditions.push(`importance_score >= $${params.length}`);
    }
    params.push(options.limit ?? 50);
    const limitParam = `$${params.length}`;
    const rows = await this.queryRows<NPCMemoryRow>(
      `SELECT * FROM npc_memory WHERE ${conditions.join(" AND ")}
         ORDER BY importance_score DESC, created_at DESC LIMIT ${limitParam}`,
      params,
    );
    return rows.map(rowToNPCMemory);
  }

  async addNPCMemory(memory: NPCMemory): Promise<void> {
    await this.run((client) =>
      client.query(
        `INSERT INTO npc_memory (
           memory_id, campaign_id, npc_id, memory_type, description,
           source_event_id, source_rumor_id, emotional_valence, emotional_intensity,
           importance_score, decay_rate, times_recalled, is_forgotten, is_core_memory,
           about_entity_type, about_entity_id, formed_turn, last_recalled_turn
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (memory_id) DO NOTHING`,
        [
          memory.memoryId,
          memory.campaignId,
          memory.npcId,
          memory.memoryType,
          memory.description,
          memory.sourceEventId ?? null,
          memory.sourceRumorId ?? null,
          memory.emotionalValence,
          memory.emotionalIntensity,
          memory.importanceScore,
          memory.decayRate,
          memory.timesRecalled,
          memory.isForgotten,
          memory.isCoreMemory,
          memory.aboutEntityType ?? null,
          memory.aboutEntityId ?? null,
          memory.formedTurn,
          memory.lastRecalledTurn ?? null,
        ],
      ),
    );
  }

  async updateMemoryRecall(memoryId: string, turn: number): Promise<void> {
    await this.run((client) =>
      client.query(
        `UPDATE npc_memory SET times_recalled = times_recalled + 1, last_recalled_turn = $2
           WHERE memory_id = $1`,
        [memoryId, turn],
      ),
    );
  }

  async forgetOldMemories(
    npcId: string,
    beforeTurn: number,
    threshold: number,
  ): Promise<number> {
    const result = await this.runReturning((client) =>
      client.query(
        `UPDATE npc_memory SET is_forgotten = TRUE
           WHERE npc_id = $1 AND is_core_memory = FALSE
             AND formed_turn < $2 AND importance_score < $3 AND is_forgotten = FALSE`,
        [npcId, beforeTurn, threshold],
      ),
    );
    return result.rowCount ?? 0;
  }

  async getMemoriesAboutEntity(
    npcId: string,
    entityType: string,
    entityId: string,
  ): Promise<NPCMemory[]> {
    const rows = await this.queryRows<NPCMemoryRow>(
      `SELECT * FROM npc_memory
         WHERE npc_id = $1 AND is_forgotten = FALSE
           AND about_entity_type = $2 AND about_entity_id = $3
         ORDER BY importance_score DESC LIMIT 50`,
      [npcId, entityType, entityId],
    );
    return rows.map(rowToNPCMemory);
  }

  // ── Rumors ────────────────────────────────────────────────────

  async addRumor(rumor: Rumor): Promise<void> {
    await this.run((client) =>
      client.query(
        `INSERT INTO rumor (
           rumor_id, campaign_id, source_event_id, content, truth_level,
           rumor_status_id, spread_level, origin_location_id, origin_npc_id,
           known_by_faction_ids, known_by_npc_ids, is_known_to_player,
           spread_rate, decay_rate, narrative_hook, associated_faction_id,
           created_turn, last_spread_turn
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (rumor_id) DO NOTHING`,
        [
          rumor.rumorId,
          rumor.campaignId,
          rumor.sourceEventId ?? null,
          rumor.content,
          rumor.truthLevel,
          rumor.rumorStatusId,
          rumor.spreadLevel,
          rumor.originLocationId ?? null,
          rumor.originNpcId ?? null,
          rumor.knownByFactionIds ? JSON.stringify(rumor.knownByFactionIds) : null,
          rumor.knownByNpcIds ? JSON.stringify(rumor.knownByNpcIds) : null,
          rumor.isKnownToPlayer,
          rumor.spreadRate,
          rumor.decayRate,
          rumor.narrativeHook ?? null,
          rumor.associatedFactionId ?? null,
          rumor.createdTurn,
          rumor.lastSpreadTurn ?? null,
        ],
      ),
    );
  }

  async getRumorsKnownToPlayer(campaignId: string): Promise<Rumor[]> {
    const rows = await this.queryRows<RumorRow>(
      `SELECT * FROM rumor WHERE campaign_id = $1 AND is_known_to_player = TRUE
         ORDER BY created_at DESC LIMIT 50`,
      [campaignId],
    );
    return rows.map(rowToRumor);
  }

  async markRumorKnownToPlayer(rumorId: string): Promise<void> {
    await this.run((client) =>
      client.query(`UPDATE rumor SET is_known_to_player = TRUE WHERE rumor_id = $1`, [rumorId]),
    );
  }

  async propagateRumors(_campaignId: string): Promise<number> {
    // Spreading-rumor simulation lives in the engine layer; the storage
    // tier is a passive store. Hook this when the simulation moves
    // server-side.
    return 0;
  }

  // ── Agent log ─────────────────────────────────────────────────

  async logAgentAction(log: AgentLogEntry): Promise<void> {
    await this.run((client) =>
      client.query(
        `INSERT INTO agent_log (
           agent_log_id, campaign_id, agent_type, agent_id, action_taken, reasoning,
           input_context, output_result, tokens_used, latency_ms
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10)
         ON CONFLICT (agent_log_id) DO NOTHING`,
        [
          log.agentLogId,
          log.campaignId,
          log.agentType,
          log.agentId,
          log.actionTaken,
          log.reasoning ?? null,
          log.inputContext ?? null,
          log.outputResult ?? null,
          log.tokensUsed ?? null,
          log.latencyMs ?? null,
        ],
      ),
    );
  }

  async getAgentLogs(
    campaignId: string,
    options: { agentType?: string; limit?: number } = {},
  ): Promise<AgentLogEntry[]> {
    const conditions: string[] = ["campaign_id = $1"];
    const params: unknown[] = [campaignId];
    if (options.agentType) {
      params.push(options.agentType);
      conditions.push(`agent_type = $${params.length}`);
    }
    params.push(options.limit ?? 100);
    const limitParam = `$${params.length}`;
    const rows = await this.queryRows<AgentLogRow>(
      `SELECT * FROM agent_log WHERE ${conditions.join(" AND ")}
         ORDER BY created_at DESC LIMIT ${limitParam}`,
      params,
    );
    return rows.map(rowToAgentLog);
  }

  // ── Legacy ────────────────────────────────────────────────────

  async recordLegacy(legacy: LegacyRecord): Promise<void> {
    await this.run((client) =>
      client.query(
        `INSERT INTO legacy_record (
           legacy_id, campaign_id, character_name, vector, epitaph,
           turns_survived, final_location_id, world_snapshot, inheritance
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)
         ON CONFLICT (legacy_id) DO NOTHING`,
        [
          legacy.legacyId,
          legacy.campaignId ?? null,
          legacy.characterName,
          legacy.vector,
          legacy.epitaph,
          legacy.turnsSurvived,
          legacy.finalLocationId ?? null,
          legacy.worldSnapshot,
          legacy.inheritance ?? null,
        ],
      ),
    );
  }

  async listLegacies(limit = 20): Promise<LegacyRecord[]> {
    const rows = await this.queryRows<LegacyRow>(
      `SELECT * FROM legacy_record ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return rows.map(rowToLegacy);
  }

  // ── Internals ─────────────────────────────────────────────────

  private async run(work: (client: PoolClient) => Promise<unknown>): Promise<void> {
    await this.runReturning(work);
  }

  private async runReturning<R>(
    work: (client: PoolClient) => Promise<R>,
  ): Promise<R> {
    await this.init();
    const pool = this.pool;
    if (!pool) throw new Error("PostgresRepository: pool not initialized");
    const client = await pool.connect();
    try {
      return await work(client);
    } finally {
      client.release();
    }
  }

  private async queryRows<R extends QueryResultRow>(
    sql: string,
    params: unknown[],
  ): Promise<R[]> {
    return this.runReturning(async (client) => {
      const result = await client.query<R>(sql, params);
      return result.rows;
    });
  }
}

// ── Row shapes mirror schema.postgres.sql columns. ─────────────

interface SaveSnapshotRow {
  save_id: string;
  campaign_id: string;
  slot_number: number | null;
  save_name: string | null;
  player_id: string;
  current_scene_id: string | null;
  current_location_id: string | null;
  world_state_blob: unknown;
  checksum: string | null;
  play_time_seconds: number;
  in_game_date: string | null;
  is_auto_save: boolean;
  is_checkpoint: boolean;
  created_at: Date;
  updated_at: Date;
}

interface WorldEventRow {
  event_id: string;
  campaign_id: string;
  event_type_id: string;
  actor_type: WorldEvent["actorType"];
  actor_id: string | null;
  actor_name: string | null;
  verb: string;
  description: string;
  target_type: WorldEvent["targetType"] | null;
  target_id: string | null;
  target_name: string | null;
  location_id: string | null;
  region_id: string | null;
  is_public: boolean;
  is_player_facing: boolean;
  witnesses: string[] | null;
  roll_result: unknown;
  stat_used: string | null;
  difficulty: number | null;
  importance: number;
  narrative_tags: string[] | null;
  turn_number: number;
  created_at: Date;
}

interface NPCMemoryRow {
  memory_id: string;
  campaign_id: string;
  npc_id: string;
  memory_type: NPCMemory["memoryType"];
  description: string;
  source_event_id: string | null;
  source_rumor_id: string | null;
  emotional_valence: number;
  emotional_intensity: number;
  importance_score: number;
  decay_rate: number;
  times_recalled: number;
  is_forgotten: boolean;
  is_core_memory: boolean;
  about_entity_type: NPCMemory["aboutEntityType"] | null;
  about_entity_id: string | null;
  formed_turn: number;
  last_recalled_turn: number | null;
  created_at: Date;
}

interface RumorRow {
  rumor_id: string;
  campaign_id: string;
  source_event_id: string | null;
  content: string;
  truth_level: number;
  rumor_status_id: string;
  spread_level: number;
  origin_location_id: string | null;
  origin_npc_id: string | null;
  known_by_faction_ids: string[] | null;
  known_by_npc_ids: string[] | null;
  is_known_to_player: boolean;
  spread_rate: number;
  decay_rate: number;
  narrative_hook: string | null;
  associated_faction_id: string | null;
  created_turn: number;
  last_spread_turn: number | null;
  created_at: Date;
}

interface AgentLogRow {
  agent_log_id: string;
  campaign_id: string;
  agent_type: AgentLogEntry["agentType"];
  agent_id: string;
  action_taken: string;
  reasoning: string | null;
  input_context: unknown;
  output_result: unknown;
  tokens_used: number | null;
  latency_ms: number | null;
  created_at: Date;
}

interface LegacyRow {
  legacy_id: string;
  campaign_id: string | null;
  character_name: string;
  vector: string;
  epitaph: string;
  turns_survived: number;
  final_location_id: string | null;
  world_snapshot: unknown;
  inheritance: unknown;
  created_at: Date;
}

function asJsonString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function rowToSaveSlot(row: SaveSnapshotRow): SaveSlot {
  return {
    saveId: row.save_id,
    campaignId: row.campaign_id,
    slotNumber: row.slot_number ?? undefined,
    saveName: row.save_name ?? undefined,
    playerId: row.player_id,
    currentSceneId: row.current_scene_id ?? undefined,
    currentLocationId: row.current_location_id ?? undefined,
    worldStateBlob: asJsonString(row.world_state_blob),
    checksum: row.checksum ?? undefined,
    playTimeSeconds: row.play_time_seconds,
    inGameDate: row.in_game_date ?? undefined,
    isAutoSave: row.is_auto_save,
    isCheckpoint: row.is_checkpoint,
    timestamp: row.updated_at.getTime(),
  };
}

function rowToWorldEvent(row: WorldEventRow): WorldEvent {
  return {
    eventId: row.event_id,
    campaignId: row.campaign_id,
    eventTypeId: row.event_type_id,
    actorType: row.actor_type,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor_name ?? undefined,
    verb: row.verb,
    description: row.description,
    targetType: row.target_type ?? undefined,
    targetId: row.target_id ?? undefined,
    targetName: row.target_name ?? undefined,
    locationId: row.location_id ?? undefined,
    regionId: row.region_id ?? undefined,
    isPublic: row.is_public,
    isPlayerFacing: row.is_player_facing,
    witnesses: row.witnesses ?? undefined,
    rollResult: row.roll_result === null ? undefined : asJsonString(row.roll_result),
    statUsed: row.stat_used ?? undefined,
    difficulty: row.difficulty ?? undefined,
    importance: row.importance,
    narrativeTags: row.narrative_tags ?? undefined,
    turnNumber: row.turn_number,
    timestamp: row.created_at.getTime(),
  };
}

function rowToNPCMemory(row: NPCMemoryRow): NPCMemory {
  return {
    memoryId: row.memory_id,
    campaignId: row.campaign_id,
    npcId: row.npc_id,
    memoryType: row.memory_type,
    description: row.description,
    sourceEventId: row.source_event_id ?? undefined,
    sourceRumorId: row.source_rumor_id ?? undefined,
    emotionalValence: row.emotional_valence,
    emotionalIntensity: row.emotional_intensity,
    importanceScore: row.importance_score,
    decayRate: row.decay_rate,
    timesRecalled: row.times_recalled,
    isForgotten: row.is_forgotten,
    isCoreMemory: row.is_core_memory,
    aboutEntityType: row.about_entity_type ?? undefined,
    aboutEntityId: row.about_entity_id ?? undefined,
    formedTurn: row.formed_turn,
    lastRecalledTurn: row.last_recalled_turn ?? undefined,
    timestamp: row.created_at.getTime(),
  };
}

function rowToRumor(row: RumorRow): Rumor {
  return {
    rumorId: row.rumor_id,
    campaignId: row.campaign_id,
    sourceEventId: row.source_event_id ?? undefined,
    content: row.content,
    truthLevel: row.truth_level,
    rumorStatusId: row.rumor_status_id,
    spreadLevel: row.spread_level,
    originLocationId: row.origin_location_id ?? undefined,
    originNpcId: row.origin_npc_id ?? undefined,
    knownByFactionIds: row.known_by_faction_ids ?? undefined,
    knownByNpcIds: row.known_by_npc_ids ?? undefined,
    isKnownToPlayer: row.is_known_to_player,
    spreadRate: row.spread_rate,
    decayRate: row.decay_rate,
    narrativeHook: row.narrative_hook ?? undefined,
    associatedFactionId: row.associated_faction_id ?? undefined,
    createdTurn: row.created_turn,
    lastSpreadTurn: row.last_spread_turn ?? undefined,
    timestamp: row.created_at.getTime(),
  };
}

function rowToAgentLog(row: AgentLogRow): AgentLogEntry {
  return {
    agentLogId: row.agent_log_id,
    campaignId: row.campaign_id,
    agentType: row.agent_type,
    agentId: row.agent_id,
    actionTaken: row.action_taken,
    reasoning: row.reasoning ?? undefined,
    inputContext: row.input_context === null ? undefined : asJsonString(row.input_context),
    outputResult: row.output_result === null ? undefined : asJsonString(row.output_result),
    tokensUsed: row.tokens_used ?? undefined,
    latencyMs: row.latency_ms ?? undefined,
    timestamp: row.created_at.getTime(),
  };
}

function rowToLegacy(row: LegacyRow): LegacyRecord {
  return {
    legacyId: row.legacy_id,
    campaignId: row.campaign_id ?? undefined,
    characterName: row.character_name,
    vector: row.vector,
    epitaph: row.epitaph,
    turnsSurvived: row.turns_survived,
    finalLocationId: row.final_location_id ?? undefined,
    worldSnapshot: asJsonString(row.world_snapshot),
    inheritance: row.inheritance === null ? undefined : asJsonString(row.inheritance),
    timestamp: row.created_at.getTime(),
  };
}
