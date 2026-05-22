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
// CATEGORY T HANDLERS — Pass 2 (entries promoted from Category 1 per
// SESSION_5B_PREFLIGHT_FINDINGS.md §3 recategorization)
// ============================================================================
//
// Each handler here represents a runtime/schema two-body case: the engine
// keeps its camelCase shape with engine-only fields; persistence writes via
// toSnake() to the schema-shaped row, reads via toCamel() back to the engine
// shape. Bespoke shape adapters (e.g. Belief.confidence enum↔integer,
// NPC.hp number↔hp_block) land per-entity as the persistence boundary
// concretizes against the live Supabase tables.
//
// Pass 2 uses the same shallow camel↔snake remap stub pattern as Pass 1.
// Bespoke per-field adapters are TODO per entity — to be filled in as
// each entity gets its first read/write call site post-Session 5b.

/**
 * Player → public.player (PlayerSchema).
 *
 * Engine-only fields (no schema home): form, firstPerception, capabilityClaim,
 * knowledgePosture, optionalDetails. These survive the round-trip via the
 * world_state_blob JSONB column (ARD-016 dual-write Phase A).
 *
 * Schema-only fields (engine ignores on read): the 50+ persistence fields the
 * engine doesn't currently model.
 *
 * Bespoke adapters TODO: stats ↔ custom_stats_block (Phase 24a wired);
 * derivedStats ↔ derived_stats_block (Phase 24a wired); knowledgePosture ↔
 * knowledge_posture_history (enum ↔ ledger).
 */
export const playerHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * NPC → public.npc (NpcSchema).
 *
 * Bespoke adapters TODO: hp number ↔ hp_block ($def); Bundle A REQUIRED
 * fields (want_model, knowledge_tri_layer, closing_conditions,
 * memory_archetype, ambition_tick, schedule_nesting) — engine doesn't
 * populate these yet; persistence writes empty defaults; engine reads ignore.
 */
export const npcHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * Location → public.location (LocationSchema).
 *
 * Bespoke adapter TODO: fog_of_knowledge_state ENUM ↔ engine's runtime
 * exploration tracking (currently camelCase + booleans).
 */
export const locationHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * Region → public.region (RegionSchema).
 *
 * Phase 24a RECON-201 already established RegionState (runtime) / Region
 * (schema alias) split. This handler is the persistence bridge between the
 * two. Bespoke adapter TODO: dangerModifier / weatherPatterns / factions
 * (runtime-only fields not in RegionSchema; survive via world_state_blob).
 */
export const regionHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * Faction → public.faction (FactionSchema).
 *
 * Phase 24a RECON-205 established FactionState/FactionSchema coexistence.
 * Bespoke adapter TODO: Bundle C primitives (faction_reach, faction_ledger,
 * faction_tick_resolution) — engine doesn't populate yet; persistence empty
 * defaults; engine read ignores.
 */
export const factionHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * Item → public.item (ItemSchema).
 *
 * ItemSchema is a v0.6 oneOf discriminator (items-v06.ts) — runtime engine
 * uses simpler ItemCategory enum. Bespoke adapter TODO: map engine.Item
 * category to schema's discriminator + back.
 */
export const itemHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * Rumor → public.rumor (RumorSchema) + Bundle G content.information dual-target.
 *
 * Per map: simple rumor → RumorSchema; complex info-flow → content.information.
 * Pass 2 stub uses RumorSchema target; Pass 3 (post-Session 6 seed) routes
 * complex variants to content.information based on info_class.
 */
export const rumorHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * Belief → public.belief (BeliefSchema).
 *
 * Most-divergent case in §2 of SESSION_5B_PREFLIGHT_FINDINGS.md. Bespoke
 * adapters required:
 *   - statement (engine) ↔ claim (schema)
 *   - isTrue: boolean (engine) ↔ truth_status: 5-value enum (schema)
 *   - confidence: ConfidenceLevel (engine 5-value enum) ↔ integer 0-100 (schema)
 *   - supportingEvidence + contradictingEvidence (engine) ↔ source_ids (schema)
 *   - holder_type + holder_id REQUIRED on schema; engine derives from context
 *
 * Pass 2 stub uses shallow remap (loses data fidelity). Bespoke adapter
 * lands when Belief persistence wiring runs first read/write.
 */
export const beliefHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * Consequence → public.consequence (ConsequenceSchema).
 *
 * Phase 24a RECON-203 established ConsequenceState/ConsequenceSchema
 * coexistence. Bespoke adapter TODO: Consequence.trigger ↔ trigger_block $def;
 * Consequence.effect ↔ effect_block $def (Foundation 14 absorbs).
 */
export const consequenceHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * Event → public.event (EventSchema).
 *
 * Schema-richer (actor_type, target_type, narrative_tags, witnesses).
 * Bespoke adapter TODO: engine populates defaults for schema-only fields.
 */
export const eventHandler = {
  toSnake(engineShape: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(engineShape, camelToSnake);
  },
  toCamel(schemaRow: Record<string, unknown>): Record<string, unknown> {
    return remapKeys(schemaRow, snakeToCamel);
  },
};

/**
 * Campaign → public.campaign (CampaignSchema).
 *
 * Smallest engine/schema divergence among Category T entries. Per §3 Question 2
 * of findings doc: moved to T with the others for uniformity rather than
 * pursuing as ABSORB pilot. If future audit shows divergence is truly
 * negligible, can be re-promoted to Category 1 in a v0.9 cleanup pass.
 */
export const campaignHandler = {
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
  // Pass 1 (addendum-classified Category T)
  worldPulse: worldPulseHandler,
  intent: intentHandler,
  alternativeIntent: intentHandler,
  turnResponse: turnResponseHandler,
  agentPhaseResult: agentPhaseResultHandler,
  stateDiff: stateDiffHandler,
  entityChanges: entityChangesHandler,
  entityAddition: entityAdditionHandler,
  entityRemoval: entityRemovalHandler,
  // Pass 2 (promoted from Category 1 per SESSION_5B_PREFLIGHT_FINDINGS.md §3)
  player: playerHandler,
  npc: npcHandler,
  location: locationHandler,
  region: regionHandler,
  faction: factionHandler,
  item: itemHandler,
  rumor: rumorHandler,
  belief: beliefHandler,
  consequence: consequenceHandler,
  event: eventHandler,
  campaign: campaignHandler,
} as const;

export type NamingHandlerKey = keyof typeof NAMING_HANDLERS;
