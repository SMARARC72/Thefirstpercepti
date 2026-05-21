-- ============================================================================
-- Phase 22.5 / PHASE-22.5: game-state persistence schema for Supabase.
-- ============================================================================
-- Ports the 6-table runtime persistence schema from
-- database/schema.postgres.sql into Supabase CLI tracking. The canonical
-- file remains in the repo as reference; this is what `supabase db push`
-- actually applies.
--
-- Runtime path: apps/web HttpRepository -> /api/* (Vercel functions) ->
--               api/_lib/repo.ts (PostgresRepository singleton via `pg`) ->
--               Supabase Postgres (POSTGRES_URL_NON_POOLING || POSTGRES_URL).
--
-- Tables:
--   save_snapshot   full GameState JSONB, one row per slot, upserted on save
--   world_event     append-only living-world memory; Ink recall() + LLM context
--   npc_memory      per-NPC structured memory with emotional weight + decay
--   rumor           spreading information the LLM may surface
--   agent_log       observability for TurnOrchestrator + subagents
--   legacy_record   death registry powering the Legacy screen
--
-- All tables are in the public schema and have RLS ENABLED. No policies
-- are created -> only service_role (used server-side by Vercel functions
-- via SUPABASE_SERVICE_ROLE_KEY, or by `pg` Pool with the postgres user)
-- can access them. anon and authenticated have no access. If a future
-- public-facing read surface is needed (e.g. shared legacy gallery), add
-- a narrow SELECT policy at that time.
-- ============================================================================

SET search_path = public;

-- ----------------------------------------------------------------------------
-- save_snapshot: serialized GameState JSON for a single save slot.
-- save_id is canonical; one row per slot, upserted on save.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS save_snapshot (
    save_id             TEXT PRIMARY KEY,
    campaign_id         TEXT NOT NULL,
    slot_number         INT,
    save_name           TEXT,
    player_id           TEXT NOT NULL,
    current_scene_id    TEXT,
    current_location_id TEXT,
    world_state_blob    JSONB NOT NULL,
    checksum            TEXT,
    play_time_seconds   INT NOT NULL DEFAULT 0,
    in_game_date        TEXT,
    is_auto_save        BOOLEAN NOT NULL DEFAULT FALSE,
    is_checkpoint       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_save_snapshot_campaign
    ON save_snapshot (campaign_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_save_snapshot_slot
    ON save_snapshot (campaign_id, slot_number);

-- ----------------------------------------------------------------------------
-- world_event: append-only log of things that happened in the world.
-- Used by Ink recall(location_id) and the LLM WorldContextAssembler.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS world_event (
    event_id          TEXT PRIMARY KEY,
    campaign_id       TEXT NOT NULL,
    event_type_id     TEXT NOT NULL,
    actor_type        TEXT NOT NULL CHECK (actor_type IN ('player','npc','faction','system','environment','divine')),
    actor_id          TEXT,
    actor_name        TEXT,
    verb              TEXT NOT NULL,
    description       TEXT NOT NULL,
    target_type       TEXT CHECK (target_type IS NULL OR target_type IN ('player','npc','faction','location','item','region','none')),
    target_id         TEXT,
    target_name       TEXT,
    location_id       TEXT,
    region_id         TEXT,
    is_public         BOOLEAN NOT NULL DEFAULT TRUE,
    is_player_facing  BOOLEAN NOT NULL DEFAULT TRUE,
    witnesses         JSONB,
    roll_result       JSONB,
    stat_used         TEXT,
    difficulty        INT,
    importance        INT NOT NULL DEFAULT 1 CHECK (importance BETWEEN 1 AND 10),
    narrative_tags    JSONB,
    turn_number       INT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_world_event_campaign
    ON world_event (campaign_id, turn_number DESC);
CREATE INDEX IF NOT EXISTS idx_world_event_location
    ON world_event (location_id, created_at DESC) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_world_event_importance
    ON world_event (campaign_id, importance DESC, turn_number DESC);

-- ----------------------------------------------------------------------------
-- npc_memory: per-NPC structured memory with emotional weight and decay.
-- Read by NPCSubagent.decide() and WorldContextAssembler.assemble().
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS npc_memory (
    memory_id            TEXT PRIMARY KEY,
    campaign_id          TEXT NOT NULL,
    npc_id               TEXT NOT NULL,
    memory_type          TEXT NOT NULL CHECK (memory_type IN ('event','meeting','place','item','conversation','trauma','triumph','lesson','rumor')),
    description          TEXT NOT NULL,
    source_event_id      TEXT,
    source_rumor_id      TEXT,
    emotional_valence    REAL NOT NULL DEFAULT 0.0 CHECK (emotional_valence BETWEEN -1.0 AND 1.0),
    emotional_intensity  REAL NOT NULL DEFAULT 0.5 CHECK (emotional_intensity BETWEEN 0.0 AND 1.0),
    importance_score     REAL NOT NULL DEFAULT 0.5 CHECK (importance_score BETWEEN 0.0 AND 1.0),
    decay_rate           REAL NOT NULL DEFAULT 0.01,
    times_recalled       INT NOT NULL DEFAULT 0,
    is_forgotten         BOOLEAN NOT NULL DEFAULT FALSE,
    is_core_memory       BOOLEAN NOT NULL DEFAULT FALSE,
    about_entity_type    TEXT CHECK (about_entity_type IS NULL OR about_entity_type IN ('player','npc','faction','location','item')),
    about_entity_id      TEXT,
    formed_turn          INT NOT NULL,
    last_recalled_turn   INT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_npc_memory_npc
    ON npc_memory (npc_id, importance_score DESC) WHERE is_forgotten = FALSE;
CREATE INDEX IF NOT EXISTS idx_npc_memory_entity
    ON npc_memory (npc_id, about_entity_type, about_entity_id) WHERE about_entity_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- rumor: information spreading through the world; the LLM may surface these.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rumor (
    rumor_id              TEXT PRIMARY KEY,
    campaign_id           TEXT NOT NULL,
    source_event_id       TEXT,
    content               TEXT NOT NULL,
    truth_level           REAL NOT NULL DEFAULT 0.5 CHECK (truth_level BETWEEN 0.0 AND 1.0),
    rumor_status_id       TEXT NOT NULL DEFAULT 'nascent',
    spread_level          INT NOT NULL DEFAULT 1 CHECK (spread_level BETWEEN 1 AND 10),
    origin_location_id    TEXT,
    origin_npc_id         TEXT,
    known_by_faction_ids  JSONB,
    known_by_npc_ids      JSONB,
    is_known_to_player    BOOLEAN NOT NULL DEFAULT FALSE,
    spread_rate           REAL NOT NULL DEFAULT 1.0,
    decay_rate            REAL NOT NULL DEFAULT 0.1,
    narrative_hook        TEXT,
    associated_faction_id TEXT,
    created_turn          INT NOT NULL,
    last_spread_turn      INT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rumor_campaign
    ON rumor (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rumor_player_known
    ON rumor (campaign_id, is_known_to_player) WHERE is_known_to_player = TRUE;

-- ----------------------------------------------------------------------------
-- agent_log: observability for TurnOrchestrator + NPC/Faction subagents.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_log (
    agent_log_id    TEXT PRIMARY KEY,
    campaign_id     TEXT NOT NULL,
    agent_type      TEXT NOT NULL,
    agent_id        TEXT,
    action_taken    TEXT NOT NULL,
    reasoning       TEXT,
    input_context   JSONB,
    output_result   JSONB,
    tokens_used     INT,
    latency_ms      INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_log_campaign
    ON agent_log (campaign_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- legacy_record: one row per dead character. Powers the Legacy screen and
-- the next-run inheritance read on the death screen.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legacy_record (
    legacy_id           TEXT PRIMARY KEY,
    campaign_id         TEXT,
    character_name      TEXT NOT NULL,
    vector              TEXT NOT NULL,
    epitaph             TEXT NOT NULL,
    turns_survived      INT NOT NULL,
    final_location_id   TEXT,
    world_snapshot      JSONB NOT NULL,
    inheritance         JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_created
    ON legacy_record (created_at DESC);

-- ----------------------------------------------------------------------------
-- Enable RLS on all six tables. No policies are created — service_role
-- bypasses RLS so the Vercel server functions continue to read/write
-- normally. anon and authenticated have zero access, which matches the
-- contract these tables need. Same pattern as the opex_* tables
-- (see 20260521032521_opex_enable_rls.sql).
-- ----------------------------------------------------------------------------
ALTER TABLE public.save_snapshot  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_event    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npc_memory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rumor          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_record  ENABLE ROW LEVEL SECURITY;
