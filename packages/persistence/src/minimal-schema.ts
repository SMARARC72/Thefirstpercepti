/**
 * Minimal SQLite schema for browser runtime.
 * Only includes tables actively used by SqliteRepository methods.
 * Foreign keys reference stub tables to keep integrity checks happy.
 */

export const MINIMAL_SCHEMA = `
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS campaign (
    campaign_id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Campaign',
    description TEXT,
    world_gen_seed TEXT,
    difficulty TEXT DEFAULT 'normal',
    game_mode TEXT DEFAULT 'living_world',
    current_turn INTEGER DEFAULT 0,
    in_game_date TEXT DEFAULT 'Year 1, Spring, Day 1',
    world_age_years REAL DEFAULT 0.0,
    is_active INTEGER DEFAULT 1,
    is_paused INTEGER DEFAULT 0,
    current_chapter TEXT DEFAULT 'Prologue',
    story_summary TEXT,
    themes TEXT,
    sim_economy INTEGER DEFAULT 1,
    sim_ecology INTEGER DEFAULT 1,
    sim_disease INTEGER DEFAULT 1,
    sim_weather INTEGER DEFAULT 1,
    permadeath_enabled INTEGER DEFAULT 0,
    legacy_mode INTEGER DEFAULT 0,
    auto_save_interval INTEGER DEFAULT 10,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_played_at INTEGER
);

CREATE TABLE IF NOT EXISTS player (
    player_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'No One',
    epithet TEXT,
    description TEXT,
    backstory TEXT,
    stat_body INTEGER DEFAULT 10,
    stat_grace INTEGER DEFAULT 10,
    stat_sense INTEGER DEFAULT 10,
    stat_mind INTEGER DEFAULT 10,
    stat_will INTEGER DEFAULT 10,
    stat_presence INTEGER DEFAULT 10,
    stat_authority INTEGER DEFAULT 10,
    stat_ruin INTEGER DEFAULT 10,
    stat_creation INTEGER DEFAULT 10,
    hp_current INTEGER DEFAULT 100,
    hp_max INTEGER DEFAULT 100,
    stamina_current INTEGER DEFAULT 50,
    stamina_max INTEGER DEFAULT 50,
    willpower_current INTEGER DEFAULT 30,
    willpower_max INTEGER DEFAULT 30,
    corruption REAL DEFAULT 0.0,
    divinity REAL DEFAULT 0.0,
    fame REAL DEFAULT 0.0,
    is_alive INTEGER DEFAULT 1,
    death_type_id TEXT,
    death_description TEXT,
    cause_of_death TEXT,
    current_location_id TEXT,
    current_region_id TEXT,
    experience INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    skill_points INTEGER DEFAULT 0,
    equipped_weapon_id TEXT,
    equipped_armor_id TEXT,
    equipped_trinket_id TEXT,
    inventory_gold INTEGER DEFAULT 0,
    is_legacy_character INTEGER DEFAULT 0,
    predecessor_id TEXT,
    legacy_notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS location (
    location_id TEXT PRIMARY KEY,
    region_id TEXT,
    parent_location_id TEXT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT,
    location_type TEXT DEFAULT 'district',
    is_discovered INTEGER DEFAULT 0,
    discovered_by_player INTEGER DEFAULT 0,
    discovery_turn INTEGER,
    danger_level INTEGER DEFAULT 1,
    prosperity_level REAL DEFAULT 5.0,
    population_count INTEGER DEFAULT 0,
    is_indoors INTEGER DEFAULT 0,
    has_lighting INTEGER DEFAULT 1,
    connected_location_ids TEXT,
    npc_ids_present TEXT,
    item_ids_here TEXT,
    atmosphere_tags TEXT,
    ambient_sound TEXT,
    ambient_smell TEXT,
    map_x REAL,
    map_y REAL,
    map_z REAL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS region (
    region_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    region_type TEXT DEFAULT 'urban',
    climate TEXT DEFAULT 'temperate',
    terrain TEXT,
    size_km2 REAL,
    stability REAL DEFAULT 5.0,
    prosperity REAL DEFAULT 5.0,
    population_total INTEGER DEFAULT 0,
    danger_level INTEGER DEFAULT 1,
    corruption_level REAL DEFAULT 0.0,
    is_known_to_player INTEGER DEFAULT 0,
    neighboring_region_ids TEXT,
    dominant_faction_id TEXT,
    lore TEXT,
    rumors_known TEXT,
    world_map_x REAL,
    world_map_y REAL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS faction (
    faction_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    faction_type TEXT DEFAULT 'political',
    founding_story TEXT,
    primary_goal TEXT,
    secondary_goals TEXT,
    methods TEXT,
    core_values TEXT,
    power_level INTEGER DEFAULT 5,
    wealth_level REAL DEFAULT 5.0,
    influence_level REAL DEFAULT 5.0,
    member_count INTEGER DEFAULT 0,
    territory_control TEXT,
    is_secret INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    allied_faction_ids TEXT,
    enemy_faction_ids TEXT,
    headquarters_id TEXT,
    leader_npc_id TEXT,
    player_reputation REAL DEFAULT 0.0,
    player_known INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS npc (
    npc_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
    description TEXT NOT NULL,
    stat_body INTEGER DEFAULT 10,
    stat_grace INTEGER DEFAULT 10,
    stat_sense INTEGER DEFAULT 10,
    stat_mind INTEGER DEFAULT 10,
    stat_will INTEGER DEFAULT 10,
    stat_presence INTEGER DEFAULT 10,
    stat_authority INTEGER DEFAULT 10,
    stat_ruin INTEGER DEFAULT 10,
    stat_creation INTEGER DEFAULT 10,
    hp_current INTEGER DEFAULT 100,
    hp_max INTEGER DEFAULT 100,
    stamina_current INTEGER DEFAULT 50,
    stamina_max INTEGER DEFAULT 50,
    willpower_current INTEGER DEFAULT 30,
    willpower_max INTEGER DEFAULT 30,
    corruption REAL DEFAULT 0.0,
    occupation TEXT,
    race TEXT DEFAULT 'human',
    age INTEGER,
    personality_traits TEXT,
    secrets TEXT,
    is_alive INTEGER DEFAULT 1,
    death_type_id TEXT,
    death_turn INTEGER,
    death_description TEXT,
    current_location_id TEXT,
    home_location_id TEXT,
    primary_faction_id TEXT,
    faction_rank TEXT,
    current_goal TEXT,
    emotional_state TEXT DEFAULT 'neutral',
    schedule TEXT,
    player_reputation REAL DEFAULT 0.0,
    player_relationship TEXT DEFAULT 'stranger',
    last_met_turn INTEGER,
    knows_player_name INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS enum_event_type (
    event_type_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    color_code TEXT DEFAULT '#FFFFFF',
    is_player_facing INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS enum_death_type (
    death_type_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    has_aftermath INTEGER DEFAULT 0,
    is_permanent INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS enum_rumor_status (
    rumor_status_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    spread_rate_mod REAL DEFAULT 1.0,
    belief_decay_mod REAL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS enum_consequence_trigger (
    trigger_type_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    requires_target INTEGER DEFAULT 0,
    param_schema TEXT
);

CREATE TABLE IF NOT EXISTS agent_log (
    agent_log_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    agent_id TEXT,
    action_taken TEXT NOT NULL,
    reasoning TEXT,
    input_context TEXT,
    output_result TEXT,
    tokens_used INTEGER,
    latency_ms INTEGER,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS npc_memory (
    memory_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    npc_id TEXT NOT NULL,
    memory_type TEXT NOT NULL,
    description TEXT NOT NULL,
    source_event_id TEXT,
    source_rumor_id TEXT,
    emotional_valence REAL DEFAULT 0.0,
    emotional_intensity REAL DEFAULT 0.5,
    importance_score REAL DEFAULT 0.5,
    decay_rate REAL DEFAULT 0.01,
    times_recalled INTEGER DEFAULT 0,
    is_forgotten INTEGER DEFAULT 0,
    is_core_memory INTEGER DEFAULT 0,
    about_entity_type TEXT,
    about_entity_id TEXT,
    formed_turn INTEGER NOT NULL,
    last_recalled_turn INTEGER,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS event (
    event_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    event_type_id TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id TEXT,
    actor_name TEXT,
    verb TEXT NOT NULL,
    description TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    target_name TEXT,
    location_id TEXT,
    region_id TEXT,
    is_public INTEGER DEFAULT 1,
    is_player_facing INTEGER DEFAULT 1,
    witnesses TEXT,
    roll_result TEXT,
    stat_used TEXT,
    difficulty INTEGER,
    importance INTEGER DEFAULT 1,
    narrative_tags TEXT,
    turn_number INTEGER NOT NULL,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS rumor (
    rumor_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    source_event_id TEXT,
    content TEXT NOT NULL,
    truth_level REAL DEFAULT 0.5,
    rumor_status_id TEXT NOT NULL DEFAULT 'nascent',
    spread_level INTEGER DEFAULT 1,
    origin_location_id TEXT,
    origin_npc_id TEXT,
    known_by_faction_ids TEXT,
    known_by_npc_ids TEXT,
    is_known_to_player INTEGER DEFAULT 0,
    spread_rate REAL DEFAULT 1.0,
    decay_rate REAL DEFAULT 0.1,
    narrative_hook TEXT,
    associated_faction_id TEXT,
    created_turn INTEGER NOT NULL,
    last_spread_turn INTEGER,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS save_snapshot (
    save_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    slot_number INTEGER,
    save_name TEXT,
    player_id TEXT NOT NULL,
    current_scene_id TEXT,
    current_location_id TEXT,
    world_state_blob TEXT NOT NULL,
    checksum TEXT,
    play_time_seconds INTEGER DEFAULT 0,
    in_game_date TEXT,
    is_auto_save INTEGER DEFAULT 0,
    is_checkpoint INTEGER DEFAULT 0,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS state_diff (
    diff_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_column TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    cause_event_id TEXT,
    cause_type TEXT DEFAULT 'simulation',
    is_validated INTEGER DEFAULT 0,
    is_applied INTEGER DEFAULT 0,
    validation_notes TEXT,
    turn_number INTEGER NOT NULL,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS world_pulse (
    pulse_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    pulse_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_region_id TEXT,
    source_faction_id TEXT,
    intensity INTEGER DEFAULT 1,
    reach_distance INTEGER DEFAULT 0,
    is_read INTEGER DEFAULT 0,
    player_response TEXT,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_npc_memory_npc ON npc_memory(npc_id);
CREATE INDEX IF NOT EXISTS idx_npc_memory_importance ON npc_memory(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_event_campaign ON event(campaign_id, turn_number DESC);
CREATE INDEX IF NOT EXISTS idx_rumor_campaign ON rumor(campaign_id);
CREATE INDEX IF NOT EXISTS idx_agent_log_campaign ON agent_log(campaign_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_state_diff_campaign ON state_diff(campaign_id, is_applied);
`;
