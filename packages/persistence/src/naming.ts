/**
 * Naming translation layer between engine runtime shapes (camelCase) and
 * schema persistence shapes (snake_case) — Phase 24c §Session 5b / Phase 5b.5.
 *
 * Per `engine_types_deprecation_map.md` Category T (TRANSLATION LAYER) and
 * `translation_rules_v0.8.md` §2 (snake_case schema ↔ camelCase runtime).
 *
 * The engine reads via `toCamel<EngineShape>(schemaRow)` at repository load and
 * writes via `toSnake<SchemaRow>(engineShape)` at repository save. The two-body
 * problem (engine shape ≠ schema shape) is resolved here: each entity gets a
 * dedicated handler pair that knows the field-mapping AND any type/shape
 * adapters (e.g. Belief.confidence integer↔enum, NPC.hp number↔hp_block).
 *
 * Status:
 *   - PASS 1 (this commit): scaffolding + Category T entities the addendum
 *     already classified — WorldPulse, Intent, AlternativeIntent, TurnResponse,
 *     AgentPhaseResult, StateDiff, EntityChanges, EntityAddition, EntityRemoval
 *   - PASS 2 (post-ratification): Category T entries promoted from Category 1
 *     (Player, NPC, Location, Region, Faction, Item, Rumor, Belief, Consequence,
 *     Event, Campaign) per SESSION_5B_PREFLIGHT_FINDINGS.md
 *
 * Handler contract:
 *   - `toSnake(engineShape)` returns the schema-conformant shape (snake_case keys,
 *     translated values). Throws on missing required fields.
 *   - `toCamel(schemaRow)` returns the engine-conformant shape (camelCase keys,
 *     translated values). Provides sensible defaults for engine-only fields.
 *   - Both are pure functions; no I/O, no side effects.
 *
 * Tests at `naming.test.ts` exercise per-entity round-trip discipline:
 *   engineShape → toSnake → toCamel → engineShape should equal the input.
 *
 * The handler registry below is intentionally typed as `unknown` for now; per-
 * entity strict typing lands as each Category T entry is fully wired.
 */

// ============================================================================
// SHARED HELPERS — used by per-entity handlers below
// ============================================================================

/**
 * Convert a camelCase string to snake_case.
 * Used by handlers that map arbitrary engine shapes; per-entity handlers should
 * prefer explicit field maps for clarity + type safety.
 */
export function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}

/**
 * Convert a snake_case string to camelCase.
 */
export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Generic shallow key remap helper. Per-entity handlers can use this for the
 * simple cases; complex cases (Belief.confidence enum↔integer, NPC.hp
 * number↔hp_block) need bespoke logic.
 */
export function remapKeys<T extends Record<string, unknown>>(
  source: T,
  mapper: (key: string) => string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(source)) {
    out[mapper(k)] = v;
  }
  return out;
}

// ============================================================================
// CATEGORY T HANDLERS — Pass 1 (addendum-classified entries)
// ============================================================================

/**
 * WorldPulse → world_pulse_ticker_item ($def in schema_pack v0.7).
 * Engine produces WorldPulse runtime objects; persistence writes them as
 * world_pulse_ticker_item rows in save_snapshot.world_state_blob (ARD-016
 * dual-write phase A).
 *
 * Pass 1 stub: shallow camel↔snake remap. Pass 2 wires the full shape
 * after the engine-types Pass 2 ratification settles WorldPulse's runtime fields.
 */
export const worldPulseHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * Intent + AlternativeIntent → agent_envelope ($def in schema_pack v0.7).
 * Engine produces Intent shapes during agent dispatch; persistence stores
 * them as agent_envelope JSONB.
 *
 * Pass 1 stub. Pass 2 wires the Intent's action_type / target_type / etc fields.
 */
export const intentHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * TurnResponse — engine-only; translator at api/_lib/repo boundary.
 * Engine returns TurnResponse; API serializes to JSON for the client.
 * Pass 1 stub.
 */
export const turnResponseHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * AgentPhaseResult — engine-only; logged to agent_log (v0.7 entity).
 * Pass 1 stub.
 */
export const agentPhaseResultHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * StateDiff → state_diff (v0.7 entity).
 * Engine produces StateDiff; translator writes to persisted shape.
 * Pass 1 stub.
 */
export const stateDiffHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * EntityChanges / EntityAddition / EntityRemoval — StateDiff sub-shapes.
 * Same pattern as StateDiff. Pass 1 stub.
 */
export const entityChangesHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

export const entityAdditionHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

export const entityRemovalHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

// ============================================================================
// REGISTRY — single source of truth for which entities translate via this layer
// ============================================================================

export const NAMING_HANDLERS = {
  worldPulse: worldPulseHandler,
  intent: intentHandler,
  alternativeIntent: intentHandler,
  turnResponse: turnResponseHandler,
  agentPhaseResult: agentPhaseResultHandler,
  stateDiff: stateDiffHandler,
  entityChanges: entityChangesHandler,
  entityAddition: entityAdditionHandler,
  entityRemoval: entityRemovalHandler,
} as const;

export type NamingHandlerKey = keyof typeof NAMING_HANDLERS;
