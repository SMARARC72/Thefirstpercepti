import initSqlJs from "sql.js";
import type { GameRepository } from "./repository.js";
import type {
  AgentLogEntry,
  NPCMemory,
  WorldEvent,
  Rumor,
  SaveSlot,
  StateDiff,
} from "./types.js";

export class SqliteRepository implements GameRepository {
  private db: any = null;
  private SQL: any = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.SQL = await initSqlJs({
      locateFile: (file: string) => `/${file}`,
    });
    this.db = new this.SQL.Database();
    this.initialized = true;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initialized = false;
  }

  async runSchema(sql: string): Promise<void> {
    this._ensureInit();
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      this.db.exec(stmt + ";");
    }
  }

  // ── Agent Logging ──

  async logAgentAction(log: AgentLogEntry): Promise<void> {
    this._ensureInit();
    this.db.run(
      `INSERT INTO agent_log (agent_log_id, campaign_id, agent_type, agent_id, action_taken, reasoning, input_context, output_result, tokens_used, latency_ms, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        log.timestamp,
      ]
    );
  }

  async getAgentLogs(campaignId: string, options?: { agentType?: string; limit?: number }): Promise<AgentLogEntry[]> {
    this._ensureInit();
    let sql = `SELECT * FROM agent_log WHERE campaign_id = ?`;
    const params: (string | number)[] = [campaignId];

    if (options?.agentType) {
      sql += ` AND agent_type = ?`;
      params.push(options.agentType);
    }
    sql += ` ORDER BY timestamp DESC`;
    if (options?.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    const result = this.db.exec(sql, params);
    return this._parseRows(result);
  }

  // ── NPC Memory ──

  async getNPCMemories(
    npcId: string,
    options?: { includeForgotten?: boolean; limit?: number; minImportance?: number }
  ): Promise<NPCMemory[]> {
    this._ensureInit();
    let sql = `SELECT * FROM npc_memory WHERE npc_id = ?`;
    const params: (string | number)[] = [npcId];

    if (!options?.includeForgotten) {
      sql += ` AND is_forgotten = 0`;
    }
    if (options?.minImportance) {
      sql += ` AND importance_score >= ?`;
      params.push(options.minImportance);
    }
    sql += ` ORDER BY importance_score DESC, formed_turn DESC`;
    if (options?.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    const result = this.db.exec(sql, params);
    return this._parseRows(result);
  }

  async addNPCMemory(memory: NPCMemory): Promise<void> {
    this._ensureInit();
    this.db.run(
      `INSERT INTO npc_memory (memory_id, campaign_id, npc_id, memory_type, description, source_event_id, source_rumor_id, emotional_valence, emotional_intensity, importance_score, decay_rate, times_recalled, is_forgotten, is_core_memory, about_entity_type, about_entity_id, formed_turn, last_recalled_turn, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        memory.isForgotten ? 1 : 0,
        memory.isCoreMemory ? 1 : 0,
        memory.aboutEntityType ?? null,
        memory.aboutEntityId ?? null,
        memory.formedTurn,
        memory.lastRecalledTurn ?? null,
        memory.timestamp,
      ]
    );
  }

  async updateMemoryRecall(memoryId: string, turn: number): Promise<void> {
    this._ensureInit();
    this.db.run(
      `UPDATE npc_memory SET times_recalled = times_recalled + 1, last_recalled_turn = ?, importance_score = min(importance_score + 0.05, 1.0) WHERE memory_id = ?`,
      [turn, memoryId]
    );
  }

  async forgetOldMemories(npcId: string, beforeTurn: number, threshold: number): Promise<number> {
    this._ensureInit();
    this.db.run(
      `UPDATE npc_memory SET is_forgotten = 1 WHERE npc_id = ? AND formed_turn < ? AND is_core_memory = 0 AND importance_score < ?`,
      [npcId, beforeTurn, threshold]
    );
    // sql.js doesn't expose changes directly, so we approximate
    return 0;
  }

  async getMemoriesAboutEntity(npcId: string, entityType: string, entityId: string): Promise<NPCMemory[]> {
    this._ensureInit();
    const result = this.db.exec(
      `SELECT * FROM npc_memory WHERE npc_id = ? AND about_entity_type = ? AND about_entity_id = ? AND is_forgotten = 0 ORDER BY importance_score DESC`,
      [npcId, entityType, entityId]
    );
    return this._parseRows(result);
  }

  // ── Events ──

  async recordEvent(event: WorldEvent): Promise<void> {
    this._ensureInit();
    this.db.run(
      `INSERT INTO event (event_id, campaign_id, event_type_id, actor_type, actor_id, actor_name, verb, description, target_type, target_id, target_name, location_id, region_id, is_public, is_player_facing, witnesses, roll_result, stat_used, difficulty, importance, narrative_tags, turn_number, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        event.isPublic ? 1 : 0,
        event.isPlayerFacing ? 1 : 0,
        event.witnesses ? JSON.stringify(event.witnesses) : null,
        event.rollResult ?? null,
        event.statUsed ?? null,
        event.difficulty ?? null,
        event.importance,
        event.narrativeTags ? JSON.stringify(event.narrativeTags) : null,
        event.turnNumber,
        event.timestamp,
      ]
    );
  }

  async getRecentEvents(campaignId: string, turns: number): Promise<WorldEvent[]> {
    this._ensureInit();
    const result = this.db.exec(
      `SELECT * FROM event WHERE campaign_id = ? ORDER BY turn_number DESC LIMIT ?`,
      [campaignId, turns]
    );
    return this._parseRows(result);
  }

  async getEventsAtLocation(locationId: string, turns: number): Promise<WorldEvent[]> {
    this._ensureInit();
    const result = this.db.exec(
      `SELECT * FROM event WHERE location_id = ? ORDER BY turn_number DESC LIMIT ?`,
      [locationId, turns]
    );
    return this._parseRows(result);
  }

  // ── Rumors ──

  async addRumor(rumor: Rumor): Promise<void> {
    this._ensureInit();
    this.db.run(
      `INSERT INTO rumor (rumor_id, campaign_id, source_event_id, content, truth_level, rumor_status_id, spread_level, origin_location_id, origin_npc_id, known_by_faction_ids, known_by_npc_ids, is_known_to_player, spread_rate, decay_rate, narrative_hook, associated_faction_id, created_turn, last_spread_turn, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        rumor.isKnownToPlayer ? 1 : 0,
        rumor.spreadRate,
        rumor.decayRate,
        rumor.narrativeHook ?? null,
        rumor.associatedFactionId ?? null,
        rumor.createdTurn,
        rumor.lastSpreadTurn ?? null,
        rumor.timestamp,
      ]
    );
  }

  async getRumorsKnownToPlayer(campaignId: string): Promise<Rumor[]> {
    this._ensureInit();
    const result = this.db.exec(
      `SELECT * FROM rumor WHERE campaign_id = ? AND is_known_to_player = 1 ORDER BY created_turn DESC`,
      [campaignId]
    );
    return this._parseRows(result);
  }

  async propagateRumors(campaignId: string): Promise<number> {
    this._ensureInit();
    // Simple propagation: increase spread_level for active rumors
    this.db.run(
      `UPDATE rumor SET spread_level = min(spread_level + 1, 10), last_spread_turn = last_spread_turn + 1 WHERE campaign_id = ? AND rumor_status_id = 'circulating'`,
      [campaignId]
    );
    return 0;
  }

  async markRumorKnownToPlayer(rumorId: string): Promise<void> {
    this._ensureInit();
    this.db.run(
      `UPDATE rumor SET is_known_to_player = 1 WHERE rumor_id = ?`,
      [rumorId]
    );
  }

  // ── Save/Load ──

  async saveSnapshot(slot: SaveSlot): Promise<void> {
    this._ensureInit();
    this.db.run(
      `INSERT OR REPLACE INTO save_snapshot (save_id, campaign_id, slot_number, save_name, player_id, current_scene_id, current_location_id, world_state_blob, checksum, play_time_seconds, in_game_date, is_auto_save, is_checkpoint, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        slot.isAutoSave ? 1 : 0,
        slot.isCheckpoint ? 1 : 0,
        slot.timestamp,
      ]
    );
  }

  async loadSnapshot(campaignId: string, slotNumber: number): Promise<SaveSlot | null> {
    this._ensureInit();
    const result = this.db.exec(
      `SELECT * FROM save_snapshot WHERE campaign_id = ? AND slot_number = ? ORDER BY timestamp DESC LIMIT 1`,
      [campaignId, slotNumber]
    );
    const rows = this._parseRows(result);
    return rows[0] ?? null;
  }

  async listSnapshots(campaignId: string): Promise<SaveSlot[]> {
    this._ensureInit();
    const result = this.db.exec(
      `SELECT * FROM save_snapshot WHERE campaign_id = ? ORDER BY timestamp DESC`,
      [campaignId]
    );
    return this._parseRows(result);
  }

  async deleteSnapshot(saveId: string): Promise<void> {
    this._ensureInit();
    this.db.run(`DELETE FROM save_snapshot WHERE save_id = ?`, [saveId]);
  }

  // ── State Diffs ──

  async recordStateDiff(diff: StateDiff): Promise<void> {
    this._ensureInit();
    this.db.run(
      `INSERT INTO state_diff (diff_id, campaign_id, target_table, target_id, target_column, old_value, new_value, cause_event_id, cause_type, is_validated, is_applied, validation_notes, turn_number, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        diff.diffId,
        diff.campaignId,
        diff.targetTable,
        diff.targetId,
        diff.targetColumn,
        diff.oldValue ?? null,
        diff.newValue,
        diff.causeEventId ?? null,
        diff.causeType,
        diff.isValidated ? 1 : 0,
        diff.isApplied ? 1 : 0,
        diff.validationNotes ?? null,
        diff.turnNumber,
        diff.timestamp,
      ]
    );
  }

  async getPendingDiffs(campaignId: string): Promise<StateDiff[]> {
    this._ensureInit();
    const result = this.db.exec(
      `SELECT * FROM state_diff WHERE campaign_id = ? AND is_applied = 0 ORDER BY turn_number DESC`,
      [campaignId]
    );
    return this._parseRows(result);
  }

  async applyDiff(diffId: string): Promise<void> {
    this._ensureInit();
    this.db.run(
      `UPDATE state_diff SET is_applied = 1, is_validated = 1 WHERE diff_id = ?`,
      [diffId]
    );
  }

  // ── Export/Import ──

  exportDatabase(): Uint8Array {
    this._ensureInit();
    return this.db.export();
  }

  importDatabase(data: Uint8Array): void {
    this.db = new this.SQL.Database(data);
    this.initialized = true;
  }

  // ── Private ──

  private _ensureInit(): void {
    if (!this.initialized || !this.db) {
      throw new Error("Repository not initialized. Call init() first.");
    }
  }

  private _parseRows(result: any[]): any[] {
    if (!result || result.length === 0) return [];
    const [{ columns, values }] = result;
    return values.map((row: any[]) => {
      const obj: Record<string, any> = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }
}
