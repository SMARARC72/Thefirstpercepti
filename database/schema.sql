-- ============================================================================
-- THE FIRST PERCEPTION - Complete Database Schema
-- A solo text-based living-world RPG engine
-- ============================================================================
-- This schema powers a complex simulation featuring:
--   - Character creation that seeds world generation
--   - D20/D100 dice resolution systems
--   - 9 core stats (body, grace, sense, mind, will, presence, authority, ruin, creation)
--   - Factions, NPCs, locations, regions with deep relationships
--   - Economy, ecology, weather, disease simulation
--   - Rumor/belief/consequence systems
--   - Death/legacy mechanics
--   - Memory drift and divine attention systems
-- ============================================================================
-- Version: 1.0.0
-- SQLite Compatible: 3.35+
-- ============================================================================

-- Enable foreign key constraints (critical for data integrity)
PRAGMA foreign_keys = ON;

-- ============================================================================
-- SECTION 1: ENUM LOOKUP TABLES (8 tables)
-- These provide type safety and human-readable categories for the engine.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- enum_event_type: Categories for all events in the event log
-- Events are the atomic unit of state change in the simulation.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enum_event_type (
    event_type_id   TEXT PRIMARY KEY,           -- e.g., 'combat', 'dialogue', 'trade'
    display_name    TEXT NOT NULL,              -- Human-readable name
    description     TEXT,                       -- What this event type represents
    color_code      TEXT DEFAULT '#FFFFFF',     -- UI display color
    is_player_facing INTEGER DEFAULT 0 CHECK (is_player_facing IN (0,1))  -- Shows in journal?
);

-- ----------------------------------------------------------------------------
-- enum_item_type: Classifications for items in the world
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enum_item_type (
    item_type_id    TEXT PRIMARY KEY,           -- e.g., 'weapon', 'armor', 'consumable'
    display_name    TEXT NOT NULL,
    description     TEXT,
    equip_slot      TEXT,                       -- If applicable: 'hand', 'body', 'head', etc.
    stackable       INTEGER DEFAULT 0 CHECK (stackable IN (0,1)),
    has_durability  INTEGER DEFAULT 0 CHECK (has_durability IN (0,1))
);

-- ----------------------------------------------------------------------------
-- enum_condition_type: Types of conditions that can affect entities
-- Conditions represent temporary or persistent states like poisoned, blessed, etc.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enum_condition_type (
    condition_type_id   TEXT PRIMARY KEY,       -- e.g., 'bleeding', 'inspired', 'cursed'
    display_name        TEXT NOT NULL,
    description         TEXT,
    category            TEXT DEFAULT 'physical' CHECK (category IN ('physical','mental','social','magical','divine','environmental')),
    is_harmful          INTEGER DEFAULT 1 CHECK (is_harmful IN (0,1)),
    is_curable          INTEGER DEFAULT 1 CHECK (is_curable IN (0,1)),
    default_duration    INTEGER,                -- Turns. NULL = permanent until cured
    max_stack           INTEGER DEFAULT 1       -- How many times can this stack?
);

-- ----------------------------------------------------------------------------
-- enum_ability_type: Classifications for character abilities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enum_ability_type (
    ability_type_id TEXT PRIMARY KEY,           -- e.g., 'spell', 'skill', 'innate', 'granted'
    display_name    TEXT NOT NULL,
    description     TEXT,
    uses_resource   TEXT,                       -- e.g., 'mana', 'stamina', 'willpower', NULL
    can_be_learned  INTEGER DEFAULT 1 CHECK (can_be_learned IN (0,1))
);

-- ----------------------------------------------------------------------------
-- enum_faction_stance: How factions feel about each other and the player
-- Stance ranges from -100 (mortal enemy) to +100 (sworn ally)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enum_faction_stance (
    stance_id       TEXT PRIMARY KEY,           -- e.g., 'hostile', 'friendly', 'allied'
    display_name    TEXT NOT NULL,
    min_value       INTEGER NOT NULL,           -- Inclusive lower bound
    max_value       INTEGER NOT NULL,           -- Inclusive upper bound
    description     TEXT,
    color_code      TEXT DEFAULT '#FFFFFF'
);

-- ----------------------------------------------------------------------------
-- enum_death_type: Classifications for how entities meet their end
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enum_death_type (
    death_type_id   TEXT PRIMARY KEY,           -- e.g., 'combat', 'disease', 'age', 'divine'
    display_name    TEXT NOT NULL,
    description     TEXT,
    has_aftermath   INTEGER DEFAULT 0 CHECK (has_aftermath IN (0,1)),  -- Creates ripple effects?
    is_permanent    INTEGER DEFAULT 1 CHECK (is_permanent IN (0,1))   -- Can be resurrected?
);

-- ----------------------------------------------------------------------------
-- enum_rumor_status: Lifecycle states for rumors spreading through the world
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enum_rumor_status (
    rumor_status_id TEXT PRIMARY KEY,           -- e.g., 'nascent', 'circulating', 'debunked'
    display_name    TEXT NOT NULL,
    description     TEXT,
    spread_rate_mod REAL DEFAULT 1.0,           -- Multiplier on spread rate
    belief_decay_mod REAL DEFAULT 1.0           -- Multiplier on belief decay
);

-- ----------------------------------------------------------------------------
-- enum_consequence_trigger: What conditions activate a consequence
-- Consequences are delayed/conditional effects that fire when triggers are met.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enum_consequence_trigger (
    trigger_type_id TEXT PRIMARY KEY,           -- e.g., 'on_enter_location', 'on_kill', 'on_time'
    display_name    TEXT NOT NULL,
    description     TEXT,
    requires_target INTEGER DEFAULT 0 CHECK (requires_target IN (0,1)),
    param_schema    TEXT                        -- JSON schema for trigger parameters
);


-- ============================================================================
-- SECTION 2: SYSTEM TABLES (6 tables)
-- These support gameplay systems: dice, logging, saves, and player journal.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- roll_log: Records every dice roll for debugging and narrative callbacks
-- The engine uses D20 for skill checks and D100 for percentile systems.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roll_log (
    roll_id         TEXT PRIMARY KEY,           -- UUID
    campaign_id     TEXT NOT NULL,              -- FK: campaign
    roller_type     TEXT NOT NULL CHECK (roller_type IN ('player','npc','system','gm')),
    roller_id       TEXT,                       -- Which entity rolled (player_id or npc_id)
    roll_type       TEXT NOT NULL,              -- 'skill_check', 'attack', 'save', 'random_table'
    dice_count      INTEGER DEFAULT 1,          -- Number of dice
    dice_sides      INTEGER NOT NULL,           -- 20 for d20, 100 for d100, etc.
    modifier        INTEGER DEFAULT 0,          -- Static modifier applied
    difficulty      INTEGER,                    -- Target number for success
    raw_result      INTEGER NOT NULL,           -- Sum of dice before modifier
    final_result    INTEGER NOT NULL,           -- After modifier
    is_success      INTEGER CHECK (is_success IN (0,1)),  -- NULL if no difficulty set
    critical_type   TEXT CHECK (critical_type IN ('none','critical_success','critical_failure')),
    context         TEXT,                       -- Narrative context for the roll
    related_stat    TEXT,                       -- Which stat was used (if skill check)
    timestamp       INTEGER NOT NULL DEFAULT (unixepoch()),  -- Unix timestamp

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- agent_log: Tracks AI agent execution for debugging and replay
-- Each entry represents one AI reasoning/decision step.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_log (
    agent_log_id    TEXT PRIMARY KEY,           -- UUID
    campaign_id     TEXT NOT NULL,              -- FK: campaign
    agent_type      TEXT NOT NULL,              -- 'npc_ai', 'faction_ai', 'world_sim', 'gm_narrator'
    agent_id        TEXT,                       -- Which entity the AI controls
    action_taken    TEXT NOT NULL,              -- What the AI decided to do
    reasoning       TEXT,                       -- AI's internal reasoning (for debugging)
    input_context   TEXT,                       -- JSON: what the AI was given
    output_result   TEXT,                       -- JSON: what the AI produced
    tokens_used     INTEGER,                    -- LLM token count (if applicable)
    latency_ms      INTEGER,                    -- Response time
    timestamp       INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- journal_entry: The player's personal record of their journey
-- Auto-populated from major events, but player can also write freeform entries.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entry (
    entry_id        TEXT PRIMARY KEY,           -- UUID
    campaign_id     TEXT NOT NULL,              -- FK: campaign
    player_id       TEXT NOT NULL,              -- FK: player
    entry_type      TEXT NOT NULL DEFAULT 'auto' CHECK (entry_type IN ('auto','player_written','gm_note','legacy')),
    title           TEXT,
    body            TEXT NOT NULL,              -- The journal text
    mood            TEXT,                       -- Player's noted mood: 'hopeful','grim','angry',etc.
    related_event_id TEXT,                      -- FK: event that triggered this entry
    related_location_id TEXT,                   -- FK: location
    is_private      INTEGER DEFAULT 0 CHECK (is_private IN (0,1)),  -- Hidden from meta?
    tags            TEXT,                       -- JSON array of tags
    timestamp       INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE,
    FOREIGN KEY (related_event_id) REFERENCES event(event_id) ON DELETE SET NULL,
    FOREIGN KEY (related_location_id) REFERENCES location(location_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- world_pulse: Offscreen event notifications for the player
-- When significant events happen beyond the player's perception, they may
-- receive a "pulse" - a hint that the world has changed.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS world_pulse (
    pulse_id        TEXT PRIMARY KEY,           -- UUID
    campaign_id     TEXT NOT NULL,              -- FK: campaign
    pulse_type      TEXT NOT NULL,              -- 'war','famine','miracle','death','coronation'
    title           TEXT NOT NULL,              -- Short headline
    description     TEXT NOT NULL,              -- What the player perceives
    source_region_id TEXT,                      -- FK: region where it originated
    source_faction_id TEXT,                     -- FK: faction involved
    intensity       INTEGER DEFAULT 1 CHECK (intensity BETWEEN 1 AND 10),  -- How dramatic
    reach_distance  INTEGER DEFAULT 0,          -- How far the news travels (in regions)
    is_read         INTEGER DEFAULT 0 CHECK (is_read IN (0,1)),
    player_response TEXT,                       -- If player reacted to it
    timestamp       INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (source_region_id) REFERENCES region(region_id) ON DELETE SET NULL,
    FOREIGN KEY (source_faction_id) REFERENCES faction(faction_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- contradiction_ledger: Tracks conflicting records and paradoxes
-- When the simulation produces contradictory state, it's logged here for
-- the GM agent to resolve narratively.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contradiction_ledger (
    contradiction_id TEXT PRIMARY KEY,          -- UUID
    campaign_id     TEXT NOT NULL,              -- FK: campaign
    severity        TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor','major','critical','cosmic')),
    description     TEXT NOT NULL,              -- What contradicts
    record_a_id     TEXT,                       -- First conflicting record
    record_a_table  TEXT,                       -- Table of first record
    record_b_id     TEXT,                       -- Second conflicting record
    record_b_table  TEXT,                       -- Table of second record
    detected_by     TEXT,                       -- 'system','gm_agent','player'
    resolution      TEXT,                       -- How it was resolved
    is_resolved     INTEGER DEFAULT 0 CHECK (is_resolved IN (0,1)),
    timestamp       INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- save_snapshot: Save game data with full world state serialization
-- Supports multiple save slots with metadata for the save/load UI.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS save_snapshot (
    save_id         TEXT PRIMARY KEY,           -- UUID
    campaign_id     TEXT NOT NULL,              -- FK: campaign
    slot_number     INTEGER,                    -- Save slot 1-10 (NULL = quicksave)
    save_name       TEXT,                       -- User-given name
    player_id       TEXT NOT NULL,              -- FK: player at time of save
    current_scene_id TEXT,                     -- FK: scene where saved
    current_location_id TEXT,                  -- FK: location where saved
    world_state_blob TEXT NOT NULL,             -- JSON: serialized world state
    checksum        TEXT,                       -- SHA-256 of world_state_blob for integrity
    play_time_seconds INTEGER DEFAULT 0,        -- Cumulative play time
    in_game_date    TEXT,                       -- The simulated date at save time
    screenshot_path TEXT,                       -- Path to preview image
    is_auto_save    INTEGER DEFAULT 0 CHECK (is_auto_save IN (0,1)),
    is_checkpoint   INTEGER DEFAULT 0 CHECK (is_checkpoint IN (0,1)),  -- Story checkpoint
    timestamp       INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE,
    FOREIGN KEY (current_scene_id) REFERENCES scene(scene_id) ON DELETE SET NULL,
    FOREIGN KEY (current_location_id) REFERENCES location(location_id) ON DELETE SET NULL
);


-- ============================================================================
-- SECTION 3: CORE ENTITY TABLES (17 tables)
-- These are the primary data entities that drive the simulation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- campaign: Top-level game container
-- Each campaign is a self-contained world with its own settings and state.
-- Character creation choices seed world generation parameters.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign (
    campaign_id         TEXT PRIMARY KEY,       -- UUID
    name                TEXT NOT NULL,
    description         TEXT,
    -- World generation seeds derived from character creation
    world_gen_seed      TEXT,                   -- Deterministic seed for world gen
    difficulty          TEXT DEFAULT 'normal' CHECK (difficulty IN ('story','normal','hard','permadeath')),
    game_mode           TEXT DEFAULT 'living_world' CHECK (game_mode IN ('living_world','scenario','legacy')),
    -- World state
    current_turn        INTEGER DEFAULT 0,      -- Global turn counter
    in_game_date        TEXT DEFAULT 'Year 1, Spring, Day 1',  -- Flavor date
    world_age_years     REAL DEFAULT 0.0,       -- How long the world has existed
    is_active           INTEGER DEFAULT 1 CHECK (is_active IN (0,1)),
    is_paused           INTEGER DEFAULT 0 CHECK (is_paused IN (0,1)),
    -- Narrative tracking
    current_chapter     TEXT DEFAULT 'Prologue',-- Narrative arc
    story_summary       TEXT,                   -- AI-generated running summary
    themes              TEXT,                   -- JSON: active themes ['decay','redemption']
    -- Simulation toggles
    sim_economy         INTEGER DEFAULT 1 CHECK (sim_economy IN (0,1)),
    sim_ecology         INTEGER DEFAULT 1 CHECK (sim_ecology IN (0,1)),
    sim_disease         INTEGER DEFAULT 1 CHECK (sim_disease IN (0,1)),
    sim_weather         INTEGER DEFAULT 1 CHECK (sim_weather IN (0,1)),
    -- Settings
    permadeath_enabled  INTEGER DEFAULT 0 CHECK (permadeath_enabled IN (0,1)),
    legacy_mode         INTEGER DEFAULT 0 CHECK (legacy_mode IN (0,1)),  -- Heir system
    auto_save_interval  INTEGER DEFAULT 10,    -- Turns between autosaves
    created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at          INTEGER NOT NULL DEFAULT (unixepoch()),
    last_played_at      INTEGER
);

-- ----------------------------------------------------------------------------
-- player: The player character with all 9 core stats and meters
-- "No One" - the paper prototype character begins with average stats.
-- Stats range from 1-20, with 10 being human average.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player (
    player_id           TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    name                TEXT NOT NULL DEFAULT 'No One',
    epithet             TEXT,                   -- Earned title: "the Butcher", "Ghost of Greywake"
    description         TEXT,                   -- Physical/character description
    backstory           TEXT,                   -- Origin narrative
    -- The 9 Core Stats (1-20 scale, 10 = average human)
    stat_body           INTEGER DEFAULT 10 CHECK (stat_body BETWEEN 1 AND 20),      -- Physical power, endurance
    stat_grace          INTEGER DEFAULT 10 CHECK (stat_grace BETWEEN 1 AND 20),     -- Agility, dexterity, reflexes
    stat_sense          INTEGER DEFAULT 10 CHECK (stat_sense BETWEEN 1 AND 20),     -- Perception, intuition, awareness
    stat_mind           INTEGER DEFAULT 10 CHECK (stat_mind BETWEEN 1 AND 20),      -- Intellect, memory, reasoning
    stat_will           INTEGER DEFAULT 10 CHECK (stat_will BETWEEN 1 AND 20),      -- Determination, mental fortitude
    stat_presence       INTEGER DEFAULT 10 CHECK (stat_presence BETWEEN 1 AND 20),  -- Charisma, force of personality
    stat_authority      INTEGER DEFAULT 10 CHECK (stat_authority BETWEEN 1 AND 20), -- Command, leadership, dominance
    stat_ruin           INTEGER DEFAULT 10 CHECK (stat_ruin BETWEEN 1 AND 20),      -- Destruction, entropy, decay
    stat_creation       INTEGER DEFAULT 10 CHECK (stat_creation BETWEEN 1 AND 20),  -- Building, growth, renewal
    -- Vital meters
    hp_current          INTEGER DEFAULT 100,    -- Health points
    hp_max              INTEGER DEFAULT 100,
    stamina_current     INTEGER DEFAULT 50,     -- Physical energy
    stamina_max         INTEGER DEFAULT 50,
    willpower_current   INTEGER DEFAULT 30,     -- Mental/spiritual energy
    willpower_max       INTEGER DEFAULT 30,
    corruption          REAL DEFAULT 0.0,       -- 0.0 to 100.0, cosmic taint
    divinity            REAL DEFAULT 0.0,       -- 0.0 to 100.0, divine attention received
    fame                REAL DEFAULT 0.0,       -- How well-known (can be negative)
    -- State
    is_alive            INTEGER DEFAULT 1 CHECK (is_alive IN (0,1)),
    death_type_id       TEXT,                   -- FK: enum_death_type
    death_description   TEXT,                   -- How they died
    cause_of_death      TEXT,                   -- What killed them
    -- Location
    current_location_id TEXT,                   -- FK: location
    current_region_id   TEXT,                   -- FK: region
    -- Progression
    experience          INTEGER DEFAULT 0,
    level               INTEGER DEFAULT 1,
    skill_points        INTEGER DEFAULT 0,
    -- Inventory references
    equipped_weapon_id  TEXT,                   -- FK: item
    equipped_armor_id   TEXT,                   -- FK: item
    equipped_trinket_id TEXT,                   -- FK: item
    inventory_gold      INTEGER DEFAULT 0,
    -- Legacy
    is_legacy_character INTEGER DEFAULT 0 CHECK (is_legacy_character IN (0,1)),
    predecessor_id      TEXT,                   -- FK: player (previous character)
    legacy_notes        TEXT,                   -- What the predecessor left behind
    -- Metadata
    created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at          INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (death_type_id) REFERENCES enum_death_type(death_type_id) ON DELETE SET NULL,
    FOREIGN KEY (current_location_id) REFERENCES location(location_id) ON DELETE SET NULL,
    FOREIGN KEY (current_region_id) REFERENCES region(region_id) ON DELETE SET NULL,
    FOREIGN KEY (equipped_weapon_id) REFERENCES item(item_id) ON DELETE SET NULL,
    FOREIGN KEY (equipped_armor_id) REFERENCES item(item_id) ON DELETE SET NULL,
    FOREIGN KEY (equipped_trinket_id) REFERENCES item(item_id) ON DELETE SET NULL,
    FOREIGN KEY (predecessor_id) REFERENCES player(player_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- location: Places in the world - from rooms to districts to landmarks
-- Locations are nested: a room is inside a building, which is in a district.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS location (
    location_id         TEXT PRIMARY KEY,       -- UUID
    region_id           TEXT,                   -- FK: region (parent region)
    parent_location_id  TEXT,                   -- FK: location (for nesting)
    name                TEXT NOT NULL,
    description         TEXT NOT NULL,           -- What the player sees
    short_description   TEXT,                   -- Brief room summary
    -- Classification
    location_type       TEXT DEFAULT 'district' CHECK (location_type IN ('room','building','district','landmark','wilderness','dungeon','cosmic')),
    -- Discovery state
    is_discovered       INTEGER DEFAULT 0 CHECK (is_discovered IN (0,1)),
    discovered_by_player INTEGER DEFAULT 0 CHECK (discovered_by_player IN (0,1)),
    discovery_turn      INTEGER,                -- When was it found
    -- Properties
    danger_level        INTEGER DEFAULT 1 CHECK (danger_level BETWEEN 1 AND 10),
    prosperity_level    REAL DEFAULT 5.0,       -- 0.0 to 10.0 economic health
    population_count    INTEGER DEFAULT 0,      -- People present
    is_indoors          INTEGER DEFAULT 0 CHECK (is_indoors IN (0,1)),
    has_lighting        INTEGER DEFAULT 1 CHECK (has_lighting IN (0,1)),
    -- Content references (entities present)
    connected_location_ids TEXT,                -- JSON: ["loc_uuid1","loc_uuid2"] connections
    npc_ids_present     TEXT,                   -- JSON: ["npc_uuid1","npc_uuid2"] NPCs here
    item_ids_here       TEXT,                   -- JSON: items on the ground
    -- Atmosphere
    atmosphere_tags     TEXT,                   -- JSON: ["noisy","smoky","sacred"]
    ambient_sound       TEXT,                   -- Description of sounds
    ambient_smell       TEXT,                   -- Description of smells
    -- Position for mapping (optional grid)
    map_x               REAL,                   -- Coordinate for map rendering
    map_y               REAL,
    map_z               REAL DEFAULT 0,
    -- Timestamps
    created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at          INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (region_id) REFERENCES region(region_id) ON DELETE SET NULL,
    FOREIGN KEY (parent_location_id) REFERENCES location(location_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- region: Larger geographic areas containing multiple locations
-- Regions have their own simulation state for ecology, economy, and weather.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS region (
    region_id           TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    name                TEXT NOT NULL,
    description         TEXT NOT NULL,
    -- Geography
    region_type         TEXT DEFAULT 'urban' CHECK (region_type IN ('urban','rural','wilderness','mountain','coastal','underground','cosmic','political')),
    climate             TEXT DEFAULT 'temperate' CHECK (climate IN ('arctic','temperate','tropical','arid','mystic')),
    terrain             TEXT,                   -- 'rolling_hills','salt_marsh','basalt_columns'
    size_km2            REAL,                   -- Approximate area
    -- State
    stability           REAL DEFAULT 5.0 CHECK (stability BETWEEN 0.0 AND 10.0),  -- Political/social
    prosperity          REAL DEFAULT 5.0 CHECK (prosperity BETWEEN 0.0 AND 10.0),  -- Economic
    population_total    INTEGER DEFAULT 0,      -- Approximate inhabitants
    danger_level        INTEGER DEFAULT 1 CHECK (danger_level BETWEEN 1 AND 10),
    corruption_level    REAL DEFAULT 0.0,       -- Cosmic corruption present
    -- Discovery
    is_known_to_player  INTEGER DEFAULT 0 CHECK (is_known_to_player IN (0,1)),
    -- Relationships
    neighboring_region_ids TEXT,                -- JSON: ["reg_uuid1","reg_uuid2"]
    dominant_faction_id TEXT,                   -- FK: faction
    -- Narrative
    lore                TEXT,                   -- Historical/lore text
    rumors_known        TEXT,                   -- JSON: rumor_ids known about region
    -- Position for world map
    world_map_x         REAL,
    world_map_y         REAL,
    -- Timestamps
    created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at          INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (dominant_faction_id) REFERENCES faction(faction_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- faction: Organizations with goals, methods, and relationships
-- Factions drive the political simulation and generate quests/conflict.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faction (
    faction_id          TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    name                TEXT NOT NULL,
    description         TEXT NOT NULL,
    -- Identity
    faction_type        TEXT DEFAULT 'political' CHECK (faction_type IN ('political','religious','criminal','merchant','military','guild','cult','secret')),
    founding_story      TEXT,                   -- How the faction came to be
    -- Goals and methods
    primary_goal        TEXT,                   -- What they want
    secondary_goals     TEXT,                   -- JSON: ["goal1","goal2"]
    methods             TEXT,                   -- JSON: ["bribery","assassination","diplomacy"]
    core_values         TEXT,                   -- JSON: ["honor","profit","order"]
    -- State
    power_level         INTEGER DEFAULT 5 CHECK (power_level BETWEEN 1 AND 10),
    wealth_level        REAL DEFAULT 5.0 CHECK (wealth_level BETWEEN 0.0 AND 10.0),
    influence_level     REAL DEFAULT 5.0 CHECK (influence_level BETWEEN 0.0 AND 10.0),
    member_count        INTEGER DEFAULT 0,
    territory_control   TEXT,                   -- JSON: ["loc_id1","loc_id2"]
    is_secret           INTEGER DEFAULT 0 CHECK (is_secret IN (0,1)),
    is_active           INTEGER DEFAULT 1 CHECK (is_active IN (0,1)),
    -- Relationships
    allied_faction_ids  TEXT,                   -- JSON: ["fac_id1"]
    enemy_faction_ids   TEXT,                   -- JSON: ["fac_id2"]
    -- Presence
    headquarters_id     TEXT,                   -- FK: location
    leader_npc_id       TEXT,                   -- FK: npc
    -- Player relationship
    player_reputation   REAL DEFAULT 0.0,       -- -100 to +100
    player_known        INTEGER DEFAULT 0 CHECK (player_known IN (0,1)),
    -- Timestamps
    created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at          INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (headquarters_id) REFERENCES location(location_id) ON DELETE SET NULL,
    FOREIGN KEY (leader_npc_id) REFERENCES npc(npc_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- npc: Non-player characters with full stats, memory, and AI state
-- NPCs are fully simulated agents with their own goals and relationships.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS npc (
    npc_id              TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    name                TEXT NOT NULL,
    title               TEXT,                   -- e.g., "Bell-Magistrate", "Marrow-Saint"
    description         TEXT NOT NULL,           -- Physical appearance
    -- The 9 Core Stats (same as player, for NPCs too)
    stat_body           INTEGER DEFAULT 10 CHECK (stat_body BETWEEN 1 AND 20),
    stat_grace          INTEGER DEFAULT 10 CHECK (stat_grace BETWEEN 1 AND 20),
    stat_sense          INTEGER DEFAULT 10 CHECK (stat_sense BETWEEN 1 AND 20),
    stat_mind           INTEGER DEFAULT 10 CHECK (stat_mind BETWEEN 1 AND 20),
    stat_will           INTEGER DEFAULT 10 CHECK (stat_will BETWEEN 1 AND 20),
    stat_presence       INTEGER DEFAULT 10 CHECK (stat_presence BETWEEN 1 AND 20),
    stat_authority      INTEGER DEFAULT 10 CHECK (stat_authority BETWEEN 1 AND 20),
    stat_ruin           INTEGER DEFAULT 10 CHECK (stat_ruin BETWEEN 1 AND 20),
    stat_creation       INTEGER DEFAULT 10 CHECK (stat_creation BETWEEN 1 AND 20),
    -- Vital meters
    hp_current          INTEGER DEFAULT 100,
    hp_max              INTEGER DEFAULT 100,
    stamina_current     INTEGER DEFAULT 50,
    stamina_max         INTEGER DEFAULT 50,
    willpower_current   INTEGER DEFAULT 30,
    willpower_max       INTEGER DEFAULT 30,
    corruption          REAL DEFAULT 0.0,
    -- Identity
    occupation          TEXT,                   -- What they do
    race                TEXT DEFAULT 'human',
    age                 INTEGER,
    personality_traits  TEXT,                   -- JSON: ["paranoid","generous"]
    secrets             TEXT,                   -- JSON: [{"secret":"text","known_by":["npc_id"]}]
    -- State
    is_alive            INTEGER DEFAULT 1 CHECK (is_alive IN (0,1)),
    death_type_id       TEXT,                   -- FK: enum_death_type
    death_turn          INTEGER,
    death_description   TEXT,
    -- Location
    current_location_id TEXT,                   -- FK: location
    home_location_id    TEXT,                   -- FK: location
    -- Faction
    primary_faction_id  TEXT,                   -- FK: faction
    faction_rank        TEXT,                   -- e.g., 'leader', 'officer', 'member', 'spy'
    -- AI State
    current_goal        TEXT,                   -- What they're trying to do right now
    emotional_state     TEXT DEFAULT 'neutral' CHECK (emotional_state IN ('neutral','happy','angry','afraid','sad','disgusted','surprised','trusting')),
    schedule            TEXT,                   -- JSON: daily routine
    -- Relationships
    player_reputation   REAL DEFAULT 0.0,       -- -100 to +100
    player_relationship TEXT DEFAULT 'stranger' CHECK (player_relationship IN ('stranger','acquaintance','friend','rival','enemy','lover','family')),
    last_met_turn       INTEGER,                -- When they last saw the player
    knows_player_name   INTEGER DEFAULT 0 CHECK (knows_player_name IN (0,1)),
    -- Timestamps
    created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at          INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (death_type_id) REFERENCES enum_death_type(death_type_id) ON DELETE SET NULL,
    FOREIGN KEY (current_location_id) REFERENCES location(location_id) ON DELETE SET NULL,
    FOREIGN KEY (home_location_id) REFERENCES location(location_id) ON DELETE SET NULL,
    FOREIGN KEY (primary_faction_id) REFERENCES faction(faction_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- event: Atomic records of state changes in the simulation
-- Every significant action creates an event. Events are the history of the world.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event (
    event_id            TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    event_type_id       TEXT NOT NULL,          -- FK: enum_event_type
    -- Actor
    actor_type          TEXT NOT NULL CHECK (actor_type IN ('player','npc','faction','system','environment','divine')),
    actor_id            TEXT,                   -- UUID of the acting entity
    actor_name          TEXT,                   -- Denormalized for quick display
    -- Action
    verb                TEXT NOT NULL,          -- e.g., 'killed', 'traded', 'discovered'
    description         TEXT NOT NULL,           -- Full narrative description
    -- Target
    target_type         TEXT CHECK (target_type IN ('player','npc','faction','location','item','region','none')),
    target_id           TEXT,                   -- UUID of target entity
    target_name         TEXT,                   -- Denormalized
    -- Location
    location_id         TEXT,                   -- FK: location where it happened
    region_id           TEXT,                   -- FK: region
    -- Visibility
    is_public           INTEGER DEFAULT 1 CHECK (is_public IN (0,1)),  -- Can NPCs hear of it?
    is_player_facing    INTEGER DEFAULT 1 CHECK (is_player_facing IN (0,1)),
    witnesses           TEXT,                   -- JSON: ["npc_id1","npc_id2"]
    -- Mechanical data
    roll_result         TEXT,                   -- JSON: {dice,modifier,result,success}
    stat_used           TEXT,                   -- Which stat was tested
    difficulty          INTEGER,                -- Target number
    -- Narrative weight
    importance          INTEGER DEFAULT 1 CHECK (importance BETWEEN 1 AND 10),  -- How memorable
    narrative_tags      TEXT,                   -- JSON: ["violent","tragic","heroic"]
    -- Metadata
    turn_number         INTEGER NOT NULL,       -- When it happened (game turn)
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),  -- Real time

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (event_type_id) REFERENCES enum_event_type(event_type_id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES location(location_id) ON DELETE SET NULL,
    FOREIGN KEY (region_id) REFERENCES region(region_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- rumor: Information (true, false, or partial) spreading through the world
-- Rumors are how NPCs and the player learn about offscreen events.
-- They mutate as they spread, gaining or losing accuracy.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rumor (
    rumor_id            TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    source_event_id     TEXT,                   -- FK: event (the truth, if any)
    -- The rumor itself
    content             TEXT NOT NULL,           -- What people are saying
    truth_level         REAL DEFAULT 0.5 CHECK (truth_level BETWEEN 0.0 AND 1.0),  -- 0=lie, 1=truth
    -- State
    rumor_status_id     TEXT NOT NULL DEFAULT 'nascent',  -- FK: enum_rumor_status
    spread_level        INTEGER DEFAULT 1 CHECK (spread_level BETWEEN 1 AND 10),  -- How far it's traveled
    -- Spread mechanics
    origin_location_id  TEXT,                   -- FK: location where it started
    origin_npc_id       TEXT,                   -- FK: npc who started it
    known_by_faction_ids TEXT,                  -- JSON: ["fac_id1"] who knows
    known_by_npc_ids    TEXT,                   -- JSON: ["npc_id1"] who knows
    is_known_to_player  INTEGER DEFAULT 0 CHECK (is_known_to_player IN (0,1)),
    spread_rate         REAL DEFAULT 1.0,       -- How fast it moves per turn
    decay_rate          REAL DEFAULT 0.1,       -- How fast it's forgotten
    -- Narrative
    narrative_hook      TEXT,                   -- Why players should care
    associated_faction_id TEXT,                 -- FK: faction (if politically relevant)
    -- Metadata
    created_turn        INTEGER NOT NULL,
    last_spread_turn    INTEGER,
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (source_event_id) REFERENCES event(event_id) ON DELETE SET NULL,
    FOREIGN KEY (rumor_status_id) REFERENCES enum_rumor_status(rumor_status_id) ON DELETE RESTRICT,
    FOREIGN KEY (origin_location_id) REFERENCES location(location_id) ON DELETE SET NULL,
    FOREIGN KEY (origin_npc_id) REFERENCES npc(npc_id) ON DELETE SET NULL,
    FOREIGN KEY (associated_faction_id) REFERENCES faction(faction_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- belief: What entities believe to be true about the world
-- Beliefs can be true or false. They drive NPC decision-making and dialogue.
-- When beliefs contradict reality, interesting narratives emerge.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS belief (
    belief_id           TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    -- Believer
    holder_type         TEXT NOT NULL CHECK (holder_type IN ('npc','faction','player','culture')),
    holder_id           TEXT NOT NULL,          -- UUID of believing entity
    -- The belief
    subject_type        TEXT NOT NULL CHECK (subject_type IN ('player','npc','faction','location','item','event','rumor','concept')),
    subject_id          TEXT,                   -- UUID of subject (NULL for general beliefs)
    subject_name        TEXT,                   -- Denormalized
    belief_statement    TEXT NOT NULL,           -- Natural language: "The Drowned Church has a weapon"
    confidence          REAL DEFAULT 0.5 CHECK (confidence BETWEEN 0.0 AND 1.0),
    is_true             INTEGER CHECK (is_true IN (0,1)),  -- NULL if unknown to system
    -- Source
    source_type         TEXT CHECK (source_type IN ('direct_observation','rumor','told_by_npc','inference','faith','prophecy')),
    source_event_id     TEXT,                   -- FK: event
    source_rumor_id     TEXT,                   -- FK: rumor
    -- State
    is_active           INTEGER DEFAULT 1 CHECK (is_active IN (0,1)),
    -- Emotional weight
    emotional_valence   REAL DEFAULT 0.0 CHECK (emotional_valence BETWEEN -1.0 AND 1.0),  -- -1=feared, +1=loved
    -- Metadata
    formed_turn         INTEGER NOT NULL,
    last_reinforced_turn INTEGER,
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (source_event_id) REFERENCES event(event_id) ON DELETE SET NULL,
    FOREIGN KEY (source_rumor_id) REFERENCES rumor(rumor_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- consequence: Delayed or conditional effects that fire when triggers are met
-- Consequences are the engine's way of making choices matter over time.
-- They can spawn events, create conditions, modify relationships, etc.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consequence (
    consequence_id      TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    -- Source
    source_event_id     TEXT,                   -- FK: event that created this
    source_type         TEXT DEFAULT 'player_choice' CHECK (source_type IN ('player_choice','npc_action','world_event','divine','delayed')),
    -- Trigger condition
    trigger_type_id     TEXT NOT NULL,          -- FK: enum_consequence_trigger
    trigger_params      TEXT,                   -- JSON: parameters for the trigger
    -- Effect
    effect_type         TEXT NOT NULL CHECK (effect_type IN ('spawn_event','modify_stat','create_condition','spawn_npc','move_npc','change_relationship','spawn_item','trigger_scene','kill','corrupt','bless','unlock_location','spawn_quest')),
    effect_params       TEXT NOT NULL,          -- JSON: detailed effect specification
    effect_description  TEXT NOT NULL,          -- Human-readable what will happen
    -- State
    status              TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','triggered','cancelled','expired')),
    -- Timing
    delay_turns         INTEGER,                -- NULL = no delay, 0 = immediate, N = wait N turns
    expires_after_turns INTEGER,                -- NULL = never expires
    created_turn        INTEGER NOT NULL,
    triggered_turn      INTEGER,                -- When it actually fired
    -- Targeting
    target_type         TEXT CHECK (target_type IN ('player','npc','faction','location','region','item')),
    target_id           TEXT,                   -- UUID of primary target
    -- Metadata
    narrative_weight    INTEGER DEFAULT 3 CHECK (narrative_weight BETWEEN 1 AND 10),
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (source_event_id) REFERENCES event(event_id) ON DELETE SET NULL,
    FOREIGN KEY (trigger_type_id) REFERENCES enum_consequence_trigger(trigger_type_id) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- state_diff: Validated state changes awaiting application or review
-- State diffs are produced by the simulation loop and validated before
-- being applied. They provide an audit trail of all world changes.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS state_diff (
    diff_id             TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    -- What changed
    target_table        TEXT NOT NULL,          -- e.g., 'npc', 'location', 'faction'
    target_id           TEXT NOT NULL,          -- UUID of changed entity
    target_column       TEXT NOT NULL,          -- e.g., 'hp_current', 'prosperity'
    old_value           TEXT,                   -- Previous value (as string)
    new_value           TEXT NOT NULL,          -- New value (as string)
    -- Why it changed
    cause_event_id      TEXT,                   -- FK: event that caused this
    cause_type          TEXT DEFAULT 'simulation' CHECK (cause_type IN ('simulation','player_action','npc_action','consequence','manual')),
    -- Validation
    is_validated        INTEGER DEFAULT 0 CHECK (is_validated IN (0,1)),
    is_applied          INTEGER DEFAULT 0 CHECK (is_applied IN (0,1)),
    validation_notes    TEXT,                   -- GM agent review notes
    -- Metadata
    turn_number         INTEGER NOT NULL,
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (cause_event_id) REFERENCES event(event_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- item: Objects in the world with stats, history, and provenance
-- Items can be equipped, carried, traded, dropped, or destroyed.
-- Every item tracks its ownership history for narrative depth.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS item (
    item_id             TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    item_type_id        TEXT NOT NULL,          -- FK: enum_item_type
    name                TEXT NOT NULL,
    description         TEXT NOT NULL,
    -- Stats/properties
    quality             TEXT DEFAULT 'common' CHECK (quality IN ('trash','common','fine','masterwork','legendary','artifact')),
    durability_current  INTEGER,                -- NULL = indestructible
    durability_max      INTEGER,
    -- Stat modifiers (when equipped)
    mod_stat_body       INTEGER DEFAULT 0,
    mod_stat_grace      INTEGER DEFAULT 0,
    mod_stat_sense      INTEGER DEFAULT 0,
    mod_stat_mind       INTEGER DEFAULT 0,
    mod_stat_will       INTEGER DEFAULT 0,
    mod_stat_presence   INTEGER DEFAULT 0,
    mod_stat_authority  INTEGER DEFAULT 0,
    mod_stat_ruin       INTEGER DEFAULT 0,
    mod_stat_creation   INTEGER DEFAULT 0,
    mod_hp_max          INTEGER DEFAULT 0,
    mod_stamina_max     INTEGER DEFAULT 0,
    mod_willpower_max   INTEGER DEFAULT 0,
    -- Combat (if weapon/armor)
    damage_dice         TEXT,                   -- e.g., "2d6+3"
    armor_value         INTEGER DEFAULT 0,
    -- Value
    base_value          INTEGER DEFAULT 0,      -- In gold/currency
    weight              REAL DEFAULT 1.0,       -- In arbitrary units
    -- State
    is_unique           INTEGER DEFAULT 0 CHECK (is_unique IN (0,1)),
    is_quest_item       INTEGER DEFAULT 0 CHECK (is_quest_item IN (0,1)),
    is_cursed           INTEGER DEFAULT 0 CHECK (is_cursed IN (0,1)),
    curse_description   TEXT,
    -- Location
    held_by_type        TEXT CHECK (held_by_type IN ('player','npc','location','ground','destroyed')),
    held_by_id          TEXT,                   -- UUID of holder
    location_id         TEXT,                   -- FK: location (if on ground)
    -- Lore
    provenance          TEXT,                   -- Origin story of the item
    previous_owners     TEXT,                   -- JSON: [{"name":"X","type":"npc","id":"uuid"}]
    -- Metadata
    created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at          INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (item_type_id) REFERENCES enum_item_type(item_type_id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES location(location_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- ability: Character abilities - skills, spells, techniques
-- Abilities are actions a character can take, with costs and effects.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ability (
    ability_id          TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    ability_type_id     TEXT NOT NULL,          -- FK: enum_ability_type
    name                TEXT NOT NULL,
    description         TEXT NOT NULL,
    -- Mechanics
    required_stat       TEXT,                   -- Primary stat used
    required_stat_value INTEGER DEFAULT 0,      -- Minimum stat to use
    cost_stamina        INTEGER DEFAULT 0,
    cost_willpower      INTEGER DEFAULT 0,
    cost_hp             INTEGER DEFAULT 0,
    cost_gold           INTEGER DEFAULT 0,
    cooldown_turns      INTEGER DEFAULT 0,      -- 0 = no cooldown
    -- Effect
    effect_description  TEXT,                   -- What it does narratively
    effect_stat_mods    TEXT,                   -- JSON: {stat: value} temporary mods
    effect_damage       TEXT,                   -- e.g., "3d6"
    effect_healing      INTEGER DEFAULT 0,
    effect_condition_id TEXT,                   -- FK: enum_condition_type (applies condition)
    effect_duration     INTEGER,                -- How long effects last
    -- Requirements
    required_level      INTEGER DEFAULT 1,
    required_traits     TEXT,                   -- JSON: ["trait_id1"] prerequisites
    -- Who has this
    known_by_player_id  TEXT,                   -- FK: player (if player knows it)
    known_by_npc_id     TEXT,                   -- FK: npc (if NPC knows it)
    is_innate           INTEGER DEFAULT 0 CHECK (is_innate IN (0,1)),  -- Doesn't need to be learned
    -- Metadata
    created_at          INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (ability_type_id) REFERENCES enum_ability_type(ability_type_id) ON DELETE RESTRICT,
    FOREIGN KEY (effect_condition_id) REFERENCES enum_condition_type(condition_type_id) ON DELETE SET NULL,
    FOREIGN KEY (known_by_player_id) REFERENCES player(player_id) ON DELETE SET NULL,
    FOREIGN KEY (known_by_npc_id) REFERENCES npc(npc_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- trait: Character traits - permanent modifiers to behavior and stats
-- Traits define who a character is. They can be innate or earned.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trait (
    trait_id            TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    name                TEXT NOT NULL,
    description         TEXT NOT NULL,
    -- Classification
    trait_category      TEXT DEFAULT 'general' CHECK (trait_category IN ('physical','mental','social','background','innate','earned','curse','blessing','flaw')),
    -- Effects
    stat_mods           TEXT,                   -- JSON: {stat: modifier}
    skill_bonuses       TEXT,                   -- JSON: {skill_name: bonus}
    special_effects     TEXT,                   -- JSON: [{effect, description}]
    -- Requirements
    requires_traits     TEXT,                   -- JSON: ["trait_id"] prerequisites
    mutually_exclusive  TEXT,                   -- JSON: ["trait_id"] can't have both
    -- State
    is_innate           INTEGER DEFAULT 0 CHECK (is_innate IN (0,1)),
    can_be_learned      INTEGER DEFAULT 0 CHECK (can_be_learned IN (0,1)),
    -- Who has this
    on_player_id        TEXT,                   -- FK: player
    on_npc_id           TEXT,                   -- FK: npc
    acquired_turn       INTEGER,
    acquisition_story   TEXT,                   -- How they got it
    -- Metadata
    created_at          INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (on_player_id) REFERENCES player(player_id) ON DELETE SET NULL,
    FOREIGN KEY (on_npc_id) REFERENCES npc(npc_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- condition: Temporary or persistent states affecting entities
-- Conditions represent anything from "bleeding" to "blessed" to "drunk".
-- They stack and decay according to their type rules.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS condition (
    condition_id        TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    condition_type_id   TEXT NOT NULL,          -- FK: enum_condition_type
    -- Target
    target_type         TEXT NOT NULL CHECK (target_type IN ('player','npc','location','faction')),
    target_id           TEXT NOT NULL,          -- UUID of affected entity
    -- State
    stack_count         INTEGER DEFAULT 1,      -- How many times this is stacked
    duration_remaining  INTEGER,                -- Turns left. NULL = permanent
    is_permanent        INTEGER DEFAULT 0 CHECK (is_permanent IN (0,1)),
    -- Source
    source_type         TEXT CHECK (source_type IN ('ability','item','environment','disease','curse','divine','npc','player')),
    source_id           TEXT,                   -- UUID of source
    source_description  TEXT,                   -- Narrative explanation
    -- Effects
    stat_mods           TEXT,                   -- JSON: {stat: modifier}
    hp_mod_per_turn     INTEGER DEFAULT 0,      -- Damage or healing per turn
    description_override TEXT,                  -- Specific description for this instance
    -- Metadata
    applied_turn        INTEGER NOT NULL,
    expires_turn        INTEGER,                -- When it naturally ends
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (condition_type_id) REFERENCES enum_condition_type(condition_type_id) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- npc_memory: Structured memories for NPCs
-- Memories drive NPC behavior. They have emotional weight and decay over time.
-- Important memories become core beliefs; traumatic ones can cause conditions.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS npc_memory (
    memory_id           TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    npc_id              TEXT NOT NULL,          -- FK: npc who remembers
    -- The memory
    memory_type         TEXT NOT NULL CHECK (memory_type IN ('event','meeting','place','item','conversation','trauma','triumph','lesson','rumor')),
    description         TEXT NOT NULL,           -- Natural language memory
    -- Source
    source_event_id     TEXT,                   -- FK: event
    source_rumor_id     TEXT,                   -- FK: rumor
    -- Emotional weight determines how strongly it affects behavior
    emotional_valence   REAL DEFAULT 0.0 CHECK (emotional_valence BETWEEN -1.0 AND 1.0),
    emotional_intensity REAL DEFAULT 0.5 CHECK (emotional_intensity BETWEEN 0.0 AND 1.0),
    -- Decay
    importance_score    REAL DEFAULT 0.5 CHECK (importance_score BETWEEN 0.0 AND 1.0),  -- Resists decay
    decay_rate          REAL DEFAULT 0.01,      -- How much importance fades per turn
    times_recalled      INTEGER DEFAULT 0,      -- Recalling strengthens memory
    -- State
    is_forgotten        INTEGER DEFAULT 0 CHECK (is_forgotten IN (0,1)),
    is_core_memory      INTEGER DEFAULT 0 CHECK (is_core_memory IN (0,1)),  -- Never forgets
    -- Associated entities (who/what is this about)
    about_entity_type   TEXT CHECK (about_entity_type IN ('player','npc','faction','location','item')),
    about_entity_id     TEXT,                   -- UUID
    -- Metadata
    formed_turn         INTEGER NOT NULL,
    last_recalled_turn  INTEGER,
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (npc_id) REFERENCES npc(npc_id) ON DELETE CASCADE,
    FOREIGN KEY (source_event_id) REFERENCES event(event_id) ON DELETE SET NULL,
    FOREIGN KEY (source_rumor_id) REFERENCES rumor(rumor_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- scene: Local gameplay contexts - a bounded moment of interaction
-- Scenes group together related events, NPCs, and choices.
-- They have an atmosphere, tension level, and narrative purpose.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scene (
    scene_id            TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    location_id         TEXT,                   -- FK: location where scene takes place
    -- Description
    name                TEXT NOT NULL,
    description         TEXT NOT NULL,
    scene_type          TEXT DEFAULT 'exploration' CHECK (scene_type IN ('exploration','combat','dialogue','trade','ritual','travel','dream','death','transition')),
    -- Atmosphere
    atmosphere          TEXT,                   -- e.g., "tense, smoky, expectant"
    lighting            TEXT DEFAULT 'daylight' CHECK (lighting IN ('pitch_black','dim','torchlit','daylight','magical','divine')),
    soundscape          TEXT,                   -- Description of ambient sounds
    weather_effects     TEXT,                   -- How weather affects the scene
    -- State
    tension_level       INTEGER DEFAULT 1 CHECK (tension_level BETWEEN 1 AND 10),  -- Dramatic tension
    is_active           INTEGER DEFAULT 1 CHECK (is_active IN (0,1)),
    is_combat_active    INTEGER DEFAULT 0 CHECK (is_combat_active IN (0,1)),
    -- Participants
    present_npc_ids     TEXT,                   -- JSON: ["npc_id1"]
    present_faction_ids TEXT,                   -- JSON: ["fac_id1"]
    -- Narrative
    narrative_purpose   TEXT,                   -- Why this scene exists in the story
    gm_notes            TEXT,                   -- Hidden guidance for the narrative AI
    -- Timing
    start_turn          INTEGER NOT NULL,
    end_turn            INTEGER,                -- NULL = ongoing
    -- Metadata
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES location(location_id) ON DELETE SET NULL
);


-- ============================================================================
-- SECTION 4: RELATIONSHIP TABLES (4 tables)
-- These model many-to-many and tracking relationships between core entities.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- faction_territory: Which factions control which locations
-- A location can have multiple factions vying for control (contested).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faction_territory (
    territory_id        TEXT PRIMARY KEY,       -- UUID
    faction_id          TEXT NOT NULL,          -- FK: faction
    location_id         TEXT NOT NULL,          -- FK: location
    region_id           TEXT,                   -- FK: region (denormalized for quick queries)
    -- Control level
    control_level       REAL DEFAULT 1.0 CHECK (control_level BETWEEN 0.0 AND 10.0),  -- How firmly held
    control_type        TEXT DEFAULT 'influence' CHECK (control_type IN ('direct','influence','contested','claimed','secret')),
    is_contested        INTEGER DEFAULT 0 CHECK (is_contested IN (0,1)),
    contested_by_faction_ids TEXT,              -- JSON: ["fac_id"] if contested
    -- Details
    established_turn    INTEGER,                -- When control began
    income_per_turn     INTEGER DEFAULT 0,      -- Gold generated
    military_presence   INTEGER DEFAULT 0,      -- Soldiers stationed
    -- Metadata
    notes               TEXT,
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (faction_id) REFERENCES faction(faction_id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES location(location_id) ON DELETE CASCADE,
    FOREIGN KEY (region_id) REFERENCES region(region_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- npc_faction_link: NPC membership in factions (many-to-many)
-- An NPC can belong to multiple factions with different ranks/roles.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS npc_faction_link (
    link_id             TEXT PRIMARY KEY,       -- UUID
    npc_id              TEXT NOT NULL,          -- FK: npc
    faction_id          TEXT NOT NULL,          -- FK: faction
    -- Membership details
    rank                TEXT DEFAULT 'member' CHECK (rank IN ('leader','officer','agent','member','sympathizer','prisoner','spy')),
    role_description    TEXT,                   -- e.g., "Quartermaster", "Enforcer"
    -- State
    loyalty             REAL DEFAULT 0.5 CHECK (loyalty BETWEEN -1.0 AND 1.0),  -- -1=plotting_betrayal, 1=fanatically_loyal
    is_active_member    INTEGER DEFAULT 1 CHECK (is_active_member IN (0,1)),
    is_secret           INTEGER DEFAULT 0 CHECK (is_secret IN (0,1)),  -- Secret membership?
    -- History
    joined_turn         INTEGER NOT NULL,
    left_turn           INTEGER,                -- NULL = still member
    joined_reason       TEXT,                   -- Why they joined
    -- Metadata
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (npc_id) REFERENCES npc(npc_id) ON DELETE CASCADE,
    FOREIGN KEY (faction_id) REFERENCES faction(faction_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- player_relationship: Detailed player-to-NPC relationship tracking
-- Goes beyond the simple reputation field to model complex relationships.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_relationship (
    relationship_id     TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    player_id           TEXT NOT NULL,          -- FK: player
    npc_id              TEXT NOT NULL,          -- FK: npc
    -- Relationship dimensions (each -100 to +100)
    trust               REAL DEFAULT 0.0 CHECK (trust BETWEEN -100.0 AND 100.0),
    affection           REAL DEFAULT 0.0 CHECK (affection BETWEEN -100.0 AND 100.0),
    fear                REAL DEFAULT 0.0 CHECK (fear BETWEEN 0.0 AND 100.0),
    respect             REAL DEFAULT 0.0 CHECK (respect BETWEEN -100.0 AND 100.0),
    obligation          REAL DEFAULT 0.0 CHECK (obligation BETWEEN -100.0 AND 100.0),  -- + = owes player
    -- Overall
    relationship_stage  TEXT DEFAULT 'stranger' CHECK (relationship_stage IN ('stranger','acquaintance','friend','close_friend','rival','enemy','nemesis','lover','family','servant','master')),
    -- History
    first_met_turn      INTEGER,
    first_met_location_id TEXT,                 -- FK: location
    times_interacted    INTEGER DEFAULT 0,
    last_interaction_turn INTEGER,
    last_interaction_type TEXT,                 -- 'combat','dialogue','trade','gift','betrayal'
    shared_memories     TEXT,                   -- JSON: [{"turn":N,"description":"text"}]
    -- Secrets
    knows_player_secrets TEXT,                  -- JSON: ["secret_text"]
    player_knows_secrets TEXT,                  -- JSON: ["secret_text"]
    -- Quests
    active_quests_given TEXT,                   -- JSON: ["quest_id"]
    quests_completed_for INTEGER DEFAULT 0,
    -- Metadata
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE,
    FOREIGN KEY (npc_id) REFERENCES npc(npc_id) ON DELETE CASCADE,
    FOREIGN KEY (first_met_location_id) REFERENCES location(location_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- item_ownership_history: Provenance tracking for items
-- Every time an item changes hands, it's recorded here.
-- Creates narrative depth - "This sword was wielded by the Butcher..."
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS item_ownership_history (
    ownership_id        TEXT PRIMARY KEY,       -- UUID
    item_id             TEXT NOT NULL,          -- FK: item
    -- Previous and new owners
    from_entity_type    TEXT NOT NULL CHECK (from_entity_type IN ('player','npc','faction','location','dungeon','forged','found')),
    from_entity_id      TEXT,                   -- UUID (NULL for found/forged)
    from_entity_name    TEXT,                   -- Denormalized
    to_entity_type      TEXT NOT NULL CHECK (to_entity_type IN ('player','npc','faction','location','ground','destroyed')),
    to_entity_id        TEXT,                   -- UUID
    to_entity_name      TEXT,                   -- Denormalized
    -- Transaction details
    transaction_type    TEXT NOT NULL CHECK (transaction_type IN ('found','forged','gift','trade','theft','loot','purchase','inheritance','quest_reward','drop','destroyed')),
    price_paid          INTEGER,                -- If purchased/traded
    location_id         TEXT,                   -- FK: location where transfer happened
    turn_number         INTEGER NOT NULL,
    -- Narrative
    narrative           TEXT,                   -- Story of how it changed hands
    -- Metadata
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES location(location_id) ON DELETE SET NULL
);


-- ============================================================================
-- SECTION 5: SIMULATION TABLES (15+ tables)
-- These drive the living world simulation - economy, ecology, politics, etc.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- economy_state: Market prices, trade flows, and economic health per region
-- Economic simulation drives prices, availability, and NPC behavior.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS economy_state (
    economy_id          TEXT PRIMARY KEY,       -- UUID
    region_id           TEXT NOT NULL,          -- FK: region
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    -- Health
    prosperity_index    REAL DEFAULT 5.0 CHECK (prosperity_index BETWEEN 0.0 AND 10.0),
    inflation_rate      REAL DEFAULT 0.0,       -- Percent change per turn
    unemployment_rate   REAL DEFAULT 0.1,       -- 0.0 to 1.0
    -- Trade
    trade_balance       REAL DEFAULT 0.0,       -- Positive = surplus
    primary_exports     TEXT,                   -- JSON: ["fish","salt","iron"]
    primary_imports     TEXT,                   -- JSON: ["grain","luxury_goods"]
    trade_partner_region_ids TEXT,              -- JSON: ["reg_id"]
    -- Currency
    currency_name       TEXT DEFAULT 'gold',
    currency_stability  REAL DEFAULT 1.0,
    -- Market modifiers (affect item prices)
    food_price_mod      REAL DEFAULT 1.0,
    weapon_price_mod    REAL DEFAULT 1.0,
    armor_price_mod     REAL DEFAULT 1.0,
    magic_price_mod     REAL DEFAULT 1.0,
    luxury_price_mod    REAL DEFAULT 1.0,
    -- Events
    recent_events       TEXT,                   -- JSON: [{"turn":N,"event":"description"}]
    crisis_active       INTEGER DEFAULT 0 CHECK (crisis_active IN (0,1)),
    crisis_description  TEXT,
    -- Metadata
    turn_number         INTEGER NOT NULL,
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (region_id) REFERENCES region(region_id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- weather_state: Current weather conditions per region
-- Weather affects travel, combat, disease spread, NPC schedules, and mood.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_state (
    weather_id          TEXT PRIMARY KEY,       -- UUID
    region_id           TEXT NOT NULL,          -- FK: region
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    -- Current conditions
    weather_type        TEXT DEFAULT 'clear' CHECK (weather_type IN ('clear','cloudy','overcast','rain','heavy_rain','storm','thunderstorm','snow','blizzard','fog','mist','drought','heat_wave','unholy_darkness','divine_light')),
    temperature         REAL DEFAULT 20.0,      -- Celsius
    humidity            REAL DEFAULT 0.5 CHECK (humidity BETWEEN 0.0 AND 1.0),
    wind_speed          REAL DEFAULT 0.0,       -- km/h
    wind_direction      TEXT,                   -- 'N','NE','E', etc.
    visibility_km       REAL DEFAULT 10.0,
    -- Special
    precipitation_mm    REAL DEFAULT 0.0,       -- Per turn
    is_extreme          INTEGER DEFAULT 0 CHECK (is_extreme IN (0,1)),
    extreme_type        TEXT,                   -- 'hurricane','earthquake','divine_storm'
    -- Duration
    duration_remaining  INTEGER DEFAULT 1,      -- Turns until weather changes
    -- Effects
    travel_speed_mod    REAL DEFAULT 1.0,       -- Multiplier
    combat_accuracy_mod REAL DEFAULT 1.0,
    disease_spread_mod  REAL DEFAULT 1.0,
    fire_spread_mod     REAL DEFAULT 1.0,
    -- Forecast
    forecast_next       TEXT,                   -- JSON: [{"weather":"rain","turns":3}]
    -- Metadata
    turn_number         INTEGER NOT NULL,
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (region_id) REFERENCES region(region_id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- disease_outbreak: Disease tracking across regions and populations
-- Diseases spread based on population density, weather, and trade routes.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disease_outbreak (
    outbreak_id         TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    region_id           TEXT NOT NULL,          -- FK: region
    -- Disease details
    disease_name        TEXT NOT NULL,           -- e.g., 'Greywake Shakes', 'Blood Rot'
    disease_type        TEXT DEFAULT 'mundane' CHECK (disease_type IN ('mundane','magical','divine','curse','plague')),
    description         TEXT,                   -- Symptoms and effects
    -- Spread
    infection_rate      REAL DEFAULT 0.01 CHECK (infection_rate BETWEEN 0.0 AND 1.0),  -- Per turn per person
    mortality_rate      REAL DEFAULT 0.05 CHECK (mortality_rate BETWEEN 0.0 AND 1.0),  -- Of infected
    recovery_rate       REAL DEFAULT 0.1 CHECK (recovery_rate BETWEEN 0.0 AND 1.0),    -- Of infected per turn
    -- Current numbers
    total_population    INTEGER DEFAULT 0,      -- Total in region
    infected_count      INTEGER DEFAULT 0,
    dead_count          INTEGER DEFAULT 0,
    recovered_count     INTEGER DEFAULT 0,
    -- State
    is_contained        INTEGER DEFAULT 0 CHECK (is_contained IN (0,1)),
    containment_efforts TEXT,                   -- JSON: [{"faction":"X","effort":"quarantine"}]
    -- Spread factors
    spread_mod_weather  REAL DEFAULT 1.0,       -- Weather multiplier
    spread_mod_trade    REAL DEFAULT 1.0,       -- Trade route multiplier
    spread_mod_density  REAL DEFAULT 1.0,       -- Population density multiplier
    -- Metadata
    started_turn        INTEGER NOT NULL,
    ended_turn          INTEGER,                -- NULL = ongoing
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (region_id) REFERENCES region(region_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- ecology_snapshot: Ecological state of regions
-- Tracks wildlife, vegetation, resources, and environmental health.
-- Affects available food, materials, and random encounters.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ecology_snapshot (
    ecology_id          TEXT PRIMARY KEY,       -- UUID
    region_id           TEXT NOT NULL,          -- FK: region
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    -- Health
    ecological_health   REAL DEFAULT 5.0 CHECK (ecological_health BETWEEN 0.0 AND 10.0),
    biodiversity_index  REAL DEFAULT 5.0 CHECK (biodiversity_index BETWEEN 0.0 AND 10.0),
    -- Flora
    forest_coverage     REAL DEFAULT 0.3 CHECK (forest_coverage BETWEEN 0.0 AND 1.0),
    grassland_health    REAL DEFAULT 5.0 CHECK (grassland_health BETWEEN 0.0 AND 10.0),
    crop_yield          REAL DEFAULT 5.0 CHECK (crop_yield BETWEEN 0.0 AND 10.0),
    -- Fauna
    wildlife_population INTEGER DEFAULT 1000,
    predator_ratio      REAL DEFAULT 0.1,       -- Predator/prey ratio
    dangerous_beasts    INTEGER DEFAULT 0,      -- Number of hostile creatures
    -- Resources
    fish_stock          REAL DEFAULT 5.0 CHECK (fish_stock BETWEEN 0.0 AND 10.0),
    game_stock          REAL DEFAULT 5.0 CHECK (game_stock BETWEEN 0.0 AND 10.0),
    lumber_availability REAL DEFAULT 5.0 CHECK (lumber_availability BETWEEN 0.0 AND 10.0),
    ore_availability    REAL DEFAULT 5.0 CHECK (ore_availability BETWEEN 0.0 AND 10.0),
    water_purity        REAL DEFAULT 5.0 CHECK (water_purity BETWEEN 0.0 AND 10.0),
    -- Threats
    overharvested       INTEGER DEFAULT 0 CHECK (overharvested IN (0,1)),
    blighted            INTEGER DEFAULT 0 CHECK (blighted IN (0,1)),
    corrupted           REAL DEFAULT 0.0,       -- Cosmic corruption level
    -- Seasonal
    current_season      TEXT DEFAULT 'spring' CHECK (current_season IN ('spring','summer','autumn','winter')),
    seasonal_modifier   REAL DEFAULT 1.0,       -- Affects all values
    -- Metadata
    turn_number         INTEGER NOT NULL,
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (region_id) REFERENCES region(region_id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- divine_attention: Tracks divine/cosmic notice of entities and events
-- When characters or events attract divine attention, miracles or curses may follow.
-- This is the "cosmic horror" layer of the simulation.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS divine_attention (
    attention_id        TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    -- Target
    target_type         TEXT NOT NULL CHECK (target_type IN ('player','npc','location','region','faction','event')),
    target_id           TEXT NOT NULL,          -- UUID of noticed entity
    target_name         TEXT,                   -- Denormalized
    -- Attention details
    attention_level     REAL DEFAULT 1.0 CHECK (attention_level BETWEEN 0.0 AND 100.0),
    attention_type      TEXT DEFAULT 'observation' CHECK (attention_type IN ('observation','interest','favor','wrath','possession','marked','forgotten')),
    -- Source
    divine_entity_name  TEXT,                   -- e.g., 'The Watcher Beneath', 'The Crone of Hours'
    divine_entity_type  TEXT DEFAULT 'unknown' CHECK (divine_entity_type IN ('god','demon','spirit','eldritch','prophecy','omen','unknown')),
    -- Cause
    cause_event_id      TEXT,                   -- FK: event
    cause_description   TEXT,                   -- Why the divine noticed
    -- Effects
    blessing_active     INTEGER DEFAULT 0 CHECK (blessing_active IN (0,1)),
    curse_active        INTEGER DEFAULT 0 CHECK (curse_active IN (0,1)),
    boons_granted       TEXT,                   -- JSON: [{"name":"Iron Will","effect":"+2 will"}]
    curses_inflicted    TEXT,                   -- JSON: [{"name":"Hollow Sight","effect":"-1 sense"}]
    -- State
    is_active           INTEGER DEFAULT 1 CHECK (is_active IN (0,1)),
    -- Metadata
    first_noticed_turn  INTEGER NOT NULL,
    last_intensity_turn INTEGER,
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (cause_event_id) REFERENCES event(event_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- corruption_spread: Tracks cosmic/corruption spread through the world
-- Corruption is a fundamental force - entropy, decay, madness made manifest.
-- It spreads from sources and transforms locations and people.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS corruption_spread (
    spread_id           TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    region_id           TEXT NOT NULL,          -- FK: region
    -- Source
    source_type         TEXT NOT NULL CHECK (source_type IN ('player_action','npc_action','divine','artifact','natural','war','ritual')),
    source_id           TEXT,                   -- UUID of source entity/event
    source_description  TEXT,                   -- Narrative explanation
    -- Current spread
    corruption_level    REAL DEFAULT 1.0 CHECK (corruption_level BETWEEN 0.0 AND 100.0),
    spread_radius_km    REAL DEFAULT 1.0,
    intensity           REAL DEFAULT 1.0 CHECK (intensity BETWEEN 0.0 AND 10.0),
    -- Effects on region
    effects_visible     INTEGER DEFAULT 0 CHECK (effects_visible IN (0,1)),  -- Can player see it?
    visible_effects     TEXT,                   -- JSON: ["plants_wither","sky_darkens"]
    npc_corruption_count INTEGER DEFAULT 0,     -- NPCs affected
    wildlife_mutated    INTEGER DEFAULT 0,      -- Mutated creatures spawned
    -- Containment
    contained_by        TEXT,                   -- JSON: [{"faction":"X","method":"wards"}]
    containment_level   REAL DEFAULT 0.0,       -- 0=spreading, 10=fully contained
    -- State
    is_active           INTEGER DEFAULT 1 CHECK (is_active IN (0,1)),
    -- Metadata
    started_turn        INTEGER NOT NULL,
    ended_turn          INTEGER,                -- NULL = still spreading
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (region_id) REFERENCES region(region_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- war_state: Military conflicts between factions
-- Wars affect economy, migration, NPC survival, and available quests.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS war_state (
    war_id              TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    name                TEXT NOT NULL,          -- e.g., 'The Bell Court War'
    -- Belligerents
    aggressor_faction_id TEXT NOT NULL,         -- FK: faction
    defender_faction_id TEXT NOT NULL,          -- FK: faction
    allied_factions     TEXT,                   -- JSON: [{"faction_id":"X","side":"aggressor"}]
    -- State
    war_status          TEXT DEFAULT 'ongoing' CHECK (war_status IN ('brewing','ongoing','stalemate','aggressor_winning','defender_winning','ceasefire','ended')),
    intensity           REAL DEFAULT 1.0 CHECK (intensity BETWEEN 0.0 AND 10.0),
    -- Casualties
    aggressor_losses    INTEGER DEFAULT 0,
    defender_losses     INTEGER DEFAULT 0,
    civilian_casualties INTEGER DEFAULT 0,
    -- Territory
    contested_location_ids TEXT,                -- JSON: ["loc_id"]
    territory_changed_hands TEXT,               -- JSON: [{"from":"X","to":"Y","location":"Z","turn":N}]
    -- Economic impact
    trade_disrupted     INTEGER DEFAULT 0 CHECK (trade_disrupted IN (0,1)),
    economic_damage     REAL DEFAULT 0.0,       -- Cumulative
    -- Metadata
    started_turn        INTEGER NOT NULL,
    ended_turn          INTEGER,
    cause_description   TEXT,                   -- Why the war started
    resolution          TEXT,                   -- How it ended (if ended)
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (aggressor_faction_id) REFERENCES faction(faction_id) ON DELETE CASCADE,
    FOREIGN KEY (defender_faction_id) REFERENCES faction(faction_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- migration_flow: Population movement between regions
-- People flee war, famine, corruption, and seek opportunity.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migration_flow (
    flow_id             TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    -- Route
    from_region_id      TEXT NOT NULL,          -- FK: region
    to_region_id        TEXT NOT NULL,          -- FK: region
    -- Flow details
    migrant_count       INTEGER DEFAULT 0,
    migrant_types       TEXT,                   -- JSON: ["refugees","merchants","mercenaries"]
    push_factors        TEXT,                   -- JSON: ["war","famine","plague"] why they left
    pull_factors        TEXT,                   -- JSON: ["jobs","safety","family"] why they came
    -- State
    flow_status         TEXT DEFAULT 'active' CHECK (flow_status IN ('active','dwindling','ended','forced')),
    -- Impact
    impact_origin       REAL DEFAULT 0.0,       -- Economic/social impact on origin
    impact_destination  REAL DEFAULT 0.0,       -- Impact on destination
    -- Metadata
    started_turn        INTEGER NOT NULL,
    ended_turn          INTEGER,
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (from_region_id) REFERENCES region(region_id) ON DELETE CASCADE,
    FOREIGN KEY (to_region_id) REFERENCES region(region_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- market_listing: Individual items for sale in specific locations
-- The actual market - what can be bought, where, and for how much.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_listing (
    listing_id          TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    location_id         TEXT NOT NULL,          -- FK: location
    -- The goods
    item_id             TEXT NOT NULL,          -- FK: item (if specific item)
    generic_name        TEXT,                   -- e.g., "Iron Sword" (if generated)
    generic_item_type_id TEXT,                  -- FK: enum_item_type (if generated)
    quantity            INTEGER DEFAULT 1,
    -- Pricing
    base_price          INTEGER NOT NULL,       -- In gold
    current_price       INTEGER NOT NULL,       -- After modifiers
    price_fluctuation   REAL DEFAULT 0.0,       -- +/- percent from base
    demand_level        REAL DEFAULT 1.0,       -- 0.1 (unwanted) to 10.0 (highly sought)
    -- Seller
    seller_type         TEXT NOT NULL CHECK (seller_type IN ('npc','faction','player','guild','system')),
    seller_id           TEXT,                   -- UUID
    seller_name         TEXT,                   -- Denormalized
    -- State
    is_available        INTEGER DEFAULT 1 CHECK (is_available IN (0,1)),
    is_illegal          INTEGER DEFAULT 0 CHECK (is_illegal IN (0,1)),
    requires_reputation REAL DEFAULT -999.0,    -- Minimum faction rep to buy
    expires_turn        INTEGER,                -- NULL = permanent stock
    -- Metadata
    restock_turn        INTEGER,                -- When it will be restocked
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES location(location_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE CASCADE,
    FOREIGN KEY (generic_item_type_id) REFERENCES enum_item_type(item_type_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- technology_magic_state: Advancement of technology and magic in regions
-- Tracks what techniques, spells, and inventions are known where.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_magic_state (
    tech_id             TEXT PRIMARY KEY,       -- UUID
    region_id           TEXT NOT NULL,          -- FK: region
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    -- The advancement
    name                TEXT NOT NULL,           -- e.g., 'Water Purification Ritual'
    description         TEXT,
    category            TEXT NOT NULL CHECK (category IN ('technology','magic','alchemy','medicine','warfare','agriculture','craft','divine')),
    -- Progress
    knowledge_level     REAL DEFAULT 0.0 CHECK (knowledge_level BETWEEN 0.0 AND 10.0),  -- 0=rumored, 10=mastered
    is_known            INTEGER DEFAULT 0 CHECK (is_known IN (0,1)),
    is_mastered         INTEGER DEFAULT 0 CHECK (is_mastered IN (0,1)),
    -- Spread
    known_by_faction_ids TEXT,                  -- JSON: ["fac_id"]
    discovered_by_npc_id TEXT,                  -- FK: npc
    discovery_turn      INTEGER,
    -- Effects
    economic_effect     REAL DEFAULT 0.0,       -- +/- to prosperity
    military_effect     REAL DEFAULT 0.0,
    social_effect       REAL DEFAULT 0.0,
    -- State
    is_lost_knowledge   INTEGER DEFAULT 0 CHECK (is_lost_knowledge IN (0,1)),
    -- Metadata
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (region_id) REFERENCES region(region_id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (discovered_by_npc_id) REFERENCES npc(npc_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- memory_drift: How history changes in the collective memory
-- Over time, events are forgotten, embellished, or rewritten.
-- This is the engine's "history is written by the victors" system.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memory_drift (
    drift_id            TEXT PRIMARY KEY,       -- UUID
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    -- The original event
    source_event_id     TEXT,                   -- FK: event (may be forgotten entirely)
    -- Current collective memory
    current_version     TEXT NOT NULL,           -- What people "remember"
    truth_accuracy      REAL DEFAULT 1.0 CHECK (truth_accuracy BETWEEN 0.0 AND 1.0),  -- 1.0 = perfect memory
    -- Who remembers what
    remembered_by_factions TEXT,                -- JSON: [{"faction_id":"X","version":"their version"}]
    remembered_by_culture TEXT,                 -- The "popular" version
    -- State
    is_forgotten        INTEGER DEFAULT 0 CHECK (is_forgotten IN (0,1)),
    is_mythologized     INTEGER DEFAULT 0 CHECK (is_mythologized IN (0,1)),  -- Became legend?
    -- Drift tracking
    original_turn       INTEGER NOT NULL,       -- When it happened
    last_drift_turn     INTEGER,                -- When memory last changed
    drift_count         INTEGER DEFAULT 0,      -- How many times it's drifted
    -- Metadata
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (source_event_id) REFERENCES event(event_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- law_state: Law, crime, and justice tracking per region/location
-- Crime rates, active investigations, wanted criminals, and punishments.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS law_state (
    law_id              TEXT PRIMARY KEY,       -- UUID
    region_id           TEXT NOT NULL,          -- FK: region
    campaign_id         TEXT NOT NULL,          -- FK: campaign
    -- Enforcement
    enforcing_faction_id TEXT,                  -- FK: faction (who enforces)
    law_coverage        REAL DEFAULT 0.5 CHECK (law_coverage BETWEEN 0.0 AND 1.0),  -- How much area is patrolled
    guard_count         INTEGER DEFAULT 0,
    guard_quality       REAL DEFAULT 3.0 CHECK (guard_quality BETWEEN 0.0 AND 10.0),
    -- Crime
    crime_rate          REAL DEFAULT 0.1 CHECK (crime_rate BETWEEN 0.0 AND 1.0),
    corruption_level    REAL DEFAULT 0.1 CHECK (corruption_level BETWEEN 0.0 AND 1.0),  -- Guard corruption
    -- Laws
    active_laws         TEXT,                   -- JSON: [{"law":"no murder","punishment":"death"}]
    prohibited_goods    TEXT,                   -- JSON: ["poison","unlicensed_magic"]
    -- Investigations
    active_investigations INTEGER DEFAULT 0,
    investigation_targets TEXT,                 -- JSON: ["npc_id"]
    -- Wanted
    wanted_posters      TEXT,                   -- JSON: [{"name":"X","bounty":N,"crime":"theft"}]
    -- State
    martial_law         INTEGER DEFAULT 0 CHECK (martial_law IN (0,1)),
    curfew_active       INTEGER DEFAULT 0 CHECK (curfew_active IN (0,1)),
    -- Metadata
    turn_number         INTEGER NOT NULL,
    timestamp           INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (region_id) REFERENCES region(region_id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (enforcing_faction_id) REFERENCES faction(faction_id) ON DELETE SET NULL
);


-- ============================================================================
-- SECTION 6: INDEXES
-- Performance-critical indexes on foreign keys and frequently queried columns.
-- ============================================================================

-- Campaign indexes
CREATE INDEX IF NOT EXISTS idx_campaign_active ON campaign(is_active);

-- Player indexes
CREATE INDEX IF NOT EXISTS idx_player_campaign ON player(campaign_id);
CREATE INDEX IF NOT EXISTS idx_player_location ON player(current_location_id);
CREATE INDEX IF NOT EXISTS idx_player_region ON player(current_region_id);
CREATE INDEX IF NOT EXISTS idx_player_alive ON player(is_alive);

-- Location indexes
CREATE INDEX IF NOT EXISTS idx_location_region ON location(region_id);
CREATE INDEX IF NOT EXISTS idx_location_parent ON location(parent_location_id);
CREATE INDEX IF NOT EXISTS idx_location_type ON location(location_type);
CREATE INDEX IF NOT EXISTS idx_location_discovered ON location(discovered_by_player);

-- Region indexes
CREATE INDEX IF NOT EXISTS idx_region_campaign ON region(campaign_id);
CREATE INDEX IF NOT EXISTS idx_region_faction ON region(dominant_faction_id);

-- Faction indexes
CREATE INDEX IF NOT EXISTS idx_faction_campaign ON faction(campaign_id);
CREATE INDEX IF NOT EXISTS idx_faction_hq ON faction(headquarters_id);
CREATE INDEX IF NOT EXISTS idx_faction_leader ON faction(leader_npc_id);

-- NPC indexes
CREATE INDEX IF NOT EXISTS idx_npc_campaign ON npc(campaign_id);
CREATE INDEX IF NOT EXISTS idx_npc_location ON npc(current_location_id);
CREATE INDEX IF NOT EXISTS idx_npc_faction ON npc(primary_faction_id);
CREATE INDEX IF NOT EXISTS idx_npc_alive ON npc(is_alive);

-- Event indexes (critical for timeline queries)
CREATE INDEX IF NOT EXISTS idx_event_campaign ON event(campaign_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON event(event_type_id);
CREATE INDEX IF NOT EXISTS idx_event_location ON event(location_id);
CREATE INDEX IF NOT EXISTS idx_event_timestamp ON event(timestamp);
CREATE INDEX IF NOT EXISTS idx_event_turn ON event(turn_number);
CREATE INDEX IF NOT EXISTS idx_event_actor ON event(actor_type, actor_id);

-- Rumor indexes
CREATE INDEX IF NOT EXISTS idx_rumor_campaign ON rumor(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rumor_source_event ON rumor(source_event_id);
CREATE INDEX IF NOT EXISTS idx_rumor_status ON rumor(rumor_status_id);
CREATE INDEX IF NOT EXISTS idx_rumor_spread ON rumor(spread_level);

-- Belief indexes
CREATE INDEX IF NOT EXISTS idx_belief_campaign ON belief(campaign_id);
CREATE INDEX IF NOT EXISTS idx_belief_holder ON belief(holder_type, holder_id);
CREATE INDEX IF NOT EXISTS idx_belief_subject ON belief(subject_type, subject_id);

-- Consequence indexes
CREATE INDEX IF NOT EXISTS idx_consequence_campaign ON consequence(campaign_id);
CREATE INDEX IF NOT EXISTS idx_consequence_status ON consequence(status);
CREATE INDEX IF NOT EXISTS idx_consequence_trigger ON consequence(trigger_type_id);
CREATE INDEX IF NOT EXISTS idx_consequence_source ON consequence(source_event_id);

-- State diff indexes
CREATE INDEX IF NOT EXISTS idx_statediff_campaign ON state_diff(campaign_id);
CREATE INDEX IF NOT EXISTS idx_statediff_target ON state_diff(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_statediff_applied ON state_diff(is_applied);

-- Item indexes
CREATE INDEX IF NOT EXISTS idx_item_campaign ON item(campaign_id);
CREATE INDEX IF NOT EXISTS idx_item_type ON item(item_type_id);
CREATE INDEX IF NOT EXISTS idx_item_holder ON item(held_by_type, held_by_id);
CREATE INDEX IF NOT EXISTS idx_item_location ON item(location_id);

-- Ability indexes
CREATE INDEX IF NOT EXISTS idx_ability_campaign ON ability(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ability_type ON ability(ability_type_id);

-- Trait indexes
CREATE INDEX IF NOT EXISTS idx_trait_campaign ON trait(campaign_id);
CREATE INDEX IF NOT EXISTS idx_trait_npc ON trait(on_npc_id);
CREATE INDEX IF NOT EXISTS idx_trait_player ON trait(on_player_id);

-- Condition indexes
CREATE INDEX IF NOT EXISTS idx_condition_campaign ON condition(campaign_id);
CREATE INDEX IF NOT EXISTS idx_condition_type ON condition(condition_type_id);
CREATE INDEX IF NOT EXISTS idx_condition_target ON condition(target_type, target_id);

-- NPC Memory indexes
CREATE INDEX IF NOT EXISTS idx_memory_campaign ON npc_memory(campaign_id);
CREATE INDEX IF NOT EXISTS idx_memory_npc ON npc_memory(npc_id);
CREATE INDEX IF NOT EXISTS idx_memory_event ON npc_memory(source_event_id);

-- Scene indexes
CREATE INDEX IF NOT EXISTS idx_scene_campaign ON scene(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scene_location ON scene(location_id);
CREATE INDEX IF NOT EXISTS idx_scene_active ON scene(is_active);

-- Relationship indexes
CREATE INDEX IF NOT EXISTS idx_territory_faction ON faction_territory(faction_id);
CREATE INDEX IF NOT EXISTS idx_territory_location ON faction_territory(location_id);
CREATE INDEX IF NOT EXISTS idx_npc_faction_link_npc ON npc_faction_link(npc_id);
CREATE INDEX IF NOT EXISTS idx_npc_faction_link_faction ON npc_faction_link(faction_id);
CREATE INDEX IF NOT EXISTS idx_player_rel_player ON player_relationship(player_id);
CREATE INDEX IF NOT EXISTS idx_player_rel_npc ON player_relationship(npc_id);
CREATE INDEX IF NOT EXISTS idx_ownership_item ON item_ownership_history(item_id);
CREATE INDEX IF NOT EXISTS idx_ownership_from ON item_ownership_history(from_entity_type, from_entity_id);
CREATE INDEX IF NOT EXISTS idx_ownership_to ON item_ownership_history(to_entity_type, to_entity_id);

-- Simulation indexes
CREATE INDEX IF NOT EXISTS idx_economy_region ON economy_state(region_id);
CREATE INDEX IF NOT EXISTS idx_weather_region ON weather_state(region_id);
CREATE INDEX IF NOT EXISTS idx_disease_region ON disease_outbreak(region_id);
CREATE INDEX IF NOT EXISTS idx_ecology_region ON ecology_snapshot(region_id);
CREATE INDEX IF NOT EXISTS idx_divine_campaign ON divine_attention(campaign_id);
CREATE INDEX IF NOT EXISTS idx_corruption_region ON corruption_spread(region_id);
CREATE INDEX IF NOT EXISTS idx_war_campaign ON war_state(campaign_id);
CREATE INDEX IF NOT EXISTS idx_migration_from ON migration_flow(from_region_id);
CREATE INDEX IF NOT EXISTS idx_migration_to ON migration_flow(to_region_id);
CREATE INDEX IF NOT EXISTS idx_market_location ON market_listing(location_id);
CREATE INDEX IF NOT EXISTS idx_market_item ON market_listing(item_id);
CREATE INDEX IF NOT EXISTS idx_tech_region ON technology_magic_state(region_id);
CREATE INDEX IF NOT EXISTS idx_drift_campaign ON memory_drift(campaign_id);
CREATE INDEX IF NOT EXISTS idx_law_region ON law_state(region_id);

-- System indexes
CREATE INDEX IF NOT EXISTS idx_roll_campaign ON roll_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_roll_timestamp ON roll_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_campaign ON agent_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_journal_campaign ON journal_entry(campaign_id);
CREATE INDEX IF NOT EXISTS idx_journal_timestamp ON journal_entry(timestamp);
CREATE INDEX IF NOT EXISTS idx_journal_player ON journal_entry(player_id);
CREATE INDEX IF NOT EXISTS idx_pulse_campaign ON world_pulse(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pulse_timestamp ON world_pulse(timestamp);
CREATE INDEX IF NOT EXISTS idx_contradiction_campaign ON contradiction_ledger(campaign_id);
CREATE INDEX IF NOT EXISTS idx_save_campaign ON save_snapshot(campaign_id);
CREATE INDEX IF NOT EXISTS idx_save_player ON save_snapshot(player_id);


-- ============================================================================
-- SECTION 7: TRIGGERS
-- Automatic behaviors: timestamp updates, journal entries, and integrity checks.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Auto-updating timestamps for all tables with updated_at
-- ----------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_campaign_updated_at
AFTER UPDATE ON campaign
BEGIN
    UPDATE campaign SET updated_at = unixepoch() WHERE campaign_id = NEW.campaign_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_player_updated_at
AFTER UPDATE ON player
BEGIN
    UPDATE player SET updated_at = unixepoch() WHERE player_id = NEW.player_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_location_updated_at
AFTER UPDATE ON location
BEGIN
    UPDATE location SET updated_at = unixepoch() WHERE location_id = NEW.location_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_region_updated_at
AFTER UPDATE ON region
BEGIN
    UPDATE region SET updated_at = unixepoch() WHERE region_id = NEW.region_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_faction_updated_at
AFTER UPDATE ON faction
BEGIN
    UPDATE faction SET updated_at = unixepoch() WHERE faction_id = NEW.faction_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_npc_updated_at
AFTER UPDATE ON npc
BEGIN
    UPDATE npc SET updated_at = unixepoch() WHERE npc_id = NEW.npc_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_item_updated_at
AFTER UPDATE ON item
BEGIN
    UPDATE item SET updated_at = unixepoch() WHERE item_id = NEW.item_id;
END;

-- ----------------------------------------------------------------------------
-- Auto-create journal entry on major events (importance >= 7)
-- When a significant event occurs, automatically log it to the player journal.
-- ----------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_event_journal_entry
AFTER INSERT ON event
WHEN NEW.importance >= 7 AND NEW.is_player_facing = 1
BEGIN
    INSERT INTO journal_entry (
        entry_id, campaign_id, player_id, entry_type, title, body,
        related_event_id, related_location_id, tags, timestamp
    )
    SELECT
        lower(hex(randomblob(16))),
        NEW.campaign_id,
        p.player_id,
        'auto',
        NEW.verb || ': ' || COALESCE(NEW.target_name, 'Unknown'),
        NEW.description,
        NEW.event_id,
        NEW.location_id,
        NEW.narrative_tags,
        unixepoch()
    FROM player p
    WHERE p.campaign_id = NEW.campaign_id
    LIMIT 1;
END;

-- ----------------------------------------------------------------------------
-- Log roll when consequence is created (link to difficulty/simulation)
-- When a consequence is created from an event that involved a roll, mirror it.
-- ----------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_consequence_roll_log
AFTER INSERT ON consequence
WHEN NEW.source_event_id IS NOT NULL
BEGIN
    INSERT INTO roll_log (
        roll_id, campaign_id, roller_type, roller_id, roll_type,
        dice_count, dice_sides, modifier, difficulty, raw_result,
        final_result, is_success, critical_type, context, timestamp
    )
    SELECT
        lower(hex(randomblob(16))),
        NEW.campaign_id,
        'system',
        NULL,
        'consequence_resolution',
        0, 20, 0, NULL, 0, 0, NULL, 'none',
        'Consequence ' || NEW.consequence_id || ' created: ' || NEW.effect_description,
        unixepoch()
    WHERE NOT EXISTS (
        SELECT 1 FROM roll_log
        WHERE context LIKE '%' || NEW.consequence_id || '%'
        LIMIT 1
    );
END;

-- ----------------------------------------------------------------------------
-- Update faction territory when faction claims a location
-- Auto-inserts a territory record when a faction changes headquarters.
-- ----------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_faction_hq_territory
AFTER UPDATE OF headquarters_id ON faction
WHEN NEW.headquarters_id IS NOT NULL
BEGIN
    INSERT OR IGNORE INTO faction_territory (
        territory_id, faction_id, location_id, region_id,
        control_level, control_type, established_turn, timestamp
    )
    SELECT
        lower(hex(randomblob(16))),
        NEW.faction_id,
        NEW.headquarters_id,
        l.region_id,
        10.0,
        'direct',
        (SELECT current_turn FROM campaign WHERE campaign_id = NEW.campaign_id),
        unixepoch()
    FROM location l
    WHERE l.location_id = NEW.headquarters_id;
END;

-- ----------------------------------------------------------------------------
-- Soft-delete handling: When an NPC dies, update related records
-- ----------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_npc_death_cascade
AFTER UPDATE OF is_alive ON npc
WHEN NEW.is_alive = 0 AND OLD.is_alive = 1
BEGIN
    -- Move NPC items to ground at their location
    UPDATE item SET
        held_by_type = 'location',
        held_by_id = NEW.current_location_id,
        location_id = NEW.current_location_id
    WHERE held_by_type = 'npc' AND held_by_id = NEW.npc_id;

    -- Create a world pulse for notable NPC deaths
    INSERT INTO world_pulse (
        pulse_id, campaign_id, pulse_type, title, description,
        source_region_id, source_faction_id, intensity, timestamp
    )
    SELECT
        lower(hex(randomblob(16))),
        NEW.campaign_id,
        'death',
        NEW.title || ' ' || NEW.name || ' has died',
        'The death of ' || NEW.name || ' (' || COALESCE(NEW.death_description, 'cause unknown') || ')',
        (SELECT region_id FROM location WHERE location_id = NEW.current_location_id),
        NEW.primary_faction_id,
        5,
        unixepoch()
    WHERE NEW.stat_presence >= 12 OR NEW.faction_rank = 'leader';
END;


-- ============================================================================
-- SECTION 8: VIEWS
-- Convenience views for common queries.
-- ============================================================================

-- Player summary with location and faction info
CREATE VIEW IF NOT EXISTS v_player_summary AS
SELECT
    p.player_id, p.name, p.epithet, p.is_alive, p.level,
    p.stat_body, p.stat_grace, p.stat_sense, p.stat_mind, p.stat_will,
    p.stat_presence, p.stat_authority, p.stat_ruin, p.stat_creation,
    p.hp_current, p.hp_max, p.corruption, p.fame,
    l.name AS location_name, r.name AS region_name,
    c.current_turn AS current_turn, p.inventory_gold
FROM player p
LEFT JOIN campaign c ON p.campaign_id = c.campaign_id
LEFT JOIN location l ON p.current_location_id = l.location_id
LEFT JOIN region r ON p.current_region_id = r.region_id;

-- NPC summary with location and faction
CREATE VIEW IF NOT EXISTS v_npc_summary AS
SELECT
    n.npc_id, n.name, n.title, n.is_alive, n.emotional_state,
    n.current_goal, n.occupation,
    n.player_reputation, n.player_relationship,
    l.name AS location_name,
    f.name AS faction_name, n.faction_rank,
    n.stat_body, n.stat_grace, n.stat_sense, n.stat_mind, n.stat_will,
    n.stat_presence, n.stat_authority, n.stat_ruin, n.stat_creation
FROM npc n
LEFT JOIN location l ON n.current_location_id = l.location_id
LEFT JOIN faction f ON n.primary_faction_id = f.faction_id;

-- Active consequences (pending or active)
CREATE VIEW IF NOT EXISTS v_active_consequences AS
SELECT
    c.*, ect.display_name AS trigger_name
FROM consequence c
LEFT JOIN enum_consequence_trigger ect ON c.trigger_type_id = ect.trigger_type_id
WHERE c.status IN ('pending', 'active');

-- World state overview per region
CREATE VIEW IF NOT EXISTS v_region_overview AS
SELECT
    r.region_id, r.name AS region_name, r.region_type, r.climate,
    r.stability, r.prosperity, r.danger_level, r.corruption_level,
    r.population_total,
    f.name AS dominant_faction,
    e.prosperity_index AS economy_prosperity,
    w.weather_type, w.temperature,
    ec.ecological_health, ec.biodiversity_index,
    d.disease_name, d.infected_count,
    cs.corruption_level AS active_corruption
FROM region r
LEFT JOIN faction f ON r.dominant_faction_id = f.faction_id
LEFT JOIN economy_state e ON r.region_id = e.region_id
    AND e.turn_number = (SELECT MAX(turn_number) FROM economy_state WHERE region_id = r.region_id)
LEFT JOIN weather_state w ON r.region_id = w.region_id
    AND w.turn_number = (SELECT MAX(turn_number) FROM weather_state WHERE region_id = r.region_id)
LEFT JOIN ecology_snapshot ec ON r.region_id = ec.region_id
    AND ec.turn_number = (SELECT MAX(turn_number) FROM ecology_snapshot WHERE region_id = r.region_id)
LEFT JOIN disease_outbreak d ON r.region_id = d.region_id AND d.ended_turn IS NULL
LEFT JOIN corruption_spread cs ON r.region_id = cs.region_id AND cs.is_active = 1;


-- ============================================================================
-- SECTION 9: SEED DATA
-- Initial data to make the world immediately playable and testable.
-- ============================================================================

-- ============================================================================
-- 9.1: ENUM VALUES
-- ============================================================================

-- Event types
INSERT INTO enum_event_type (event_type_id, display_name, description, color_code, is_player_facing) VALUES
('combat', 'Combat', 'Fighting and violence', '#FF4444', 1),
('dialogue', 'Dialogue', 'Conversations and speech', '#44AAFF', 1),
('trade', 'Trade', 'Buying, selling, bartering', '#FFAA44', 1),
('exploration', 'Exploration', 'Discovering places and things', '#44FF44', 1),
('skill_check', 'Skill Check', 'Stat-based dice roll', '#AA44FF', 0),
('death', 'Death', 'Character or creature dies', '#000000', 1),
('birth', 'Birth', 'New life enters the world', '#FF88FF', 0),
('item_found', 'Item Found', 'Discovering an item', '#FFD700', 1),
('item_lost', 'Item Lost', 'Losing an item', '#888888', 1),
('relationship_change', 'Relationship Change', 'Bonds between entities shift', '#FF69B4', 0),
('weather', 'Weather', 'Environmental conditions change', '#87CEEB', 0),
('disease', 'Disease', 'Sickness spreads or resolves', '#8B4513', 0),
('corruption', 'Corruption', 'Cosmic taint spreads or manifests', '#4B0082', 1),
('divine', 'Divine', 'Gods or cosmic forces intervene', '#FFD700', 1),
('war', 'War', 'Military conflict', '#8B0000', 1),
('economic', 'Economic', 'Market shifts, trade changes', '#228B22', 0),
('political', 'Political', 'Power structures change', '#4B0082', 0),
('magic', 'Magic', 'Arcane events and spellcasting', '#9932CC', 1),
('crime', 'Crime', 'Lawbreaking and punishment', '#2F4F4F', 0),
('legacy', 'Legacy', 'Death and inheritance events', '#DAA520', 1);

-- Item types
INSERT INTO enum_item_type (item_type_id, display_name, description, equip_slot, stackable, has_durability) VALUES
('weapon', 'Weapon', 'Tools of violence and war', 'hand', 0, 1),
('armor', 'Armor', 'Protection for the body', 'body', 0, 1),
('shield', 'Shield', 'Hand-held protection', 'off_hand', 0, 1),
('consumable', 'Consumable', 'Items used once', NULL, 1, 0),
('tool', 'Tool', 'Utility items', NULL, 0, 1),
('clothing', 'Clothing', 'Worn garments', 'body', 0, 1),
('jewelry', 'Jewelry', 'Rings, amulets, trinkets', 'trinket', 0, 0),
('key', 'Key', 'Access items', NULL, 0, 0),
('book', 'Book', 'Written knowledge', NULL, 0, 0),
('artifact', 'Artifact', 'Unique powerful items', 'trinket', 0, 0),
('currency', 'Currency', 'Money and valuables', NULL, 1, 0),
('material', 'Material', 'Crafting components', NULL, 1, 0),
('food', 'Food', 'Edible items', NULL, 1, 0),
('potion', 'Potion', 'Magical consumables', NULL, 1, 0);

-- Condition types
INSERT INTO enum_condition_type (condition_type_id, display_name, description, category, is_harmful, is_curable, default_duration, max_stack) VALUES
('bleeding', 'Bleeding', 'Losing HP each turn from wounds', 'physical', 1, 1, 5, 3),
('poisoned', 'Poisoned', 'Toxins in the bloodstream', 'physical', 1, 1, 10, 1),
('stunned', 'Stunned', 'Cannot act this turn', 'physical', 1, 1, 1, 1),
('weakened', 'Weakened', 'Reduced physical stats', 'physical', 1, 1, 8, 1),
('frightened', 'Frightened', 'Reduced mental stats from fear', 'mental', 1, 1, 5, 1),
('inspired', 'Inspired', 'Bonus to mental and social stats', 'mental', 0, 1, 6, 1),
('focused', 'Focused', 'Bonus to sense and mind', 'mental', 0, 1, 4, 1),
('blessed', 'Blessed', 'Divine protection and luck', 'divine', 0, 1, 10, 1),
('cursed', 'Cursed', 'Divine misfortune and ill luck', 'divine', 1, 1, NULL, 1),
('corrupted', 'Corrupted', 'Cosmic taint affecting body and mind', 'magical', 1, 0, NULL, 5),
('invisible', 'Invisible', 'Cannot be seen by normal means', 'magical', 0, 1, 3, 1),
('on_fire', 'On Fire', 'Burning and taking damage', 'environmental', 1, 1, 4, 1),
('freezing', 'Freezing', 'Cold damage and slowed', 'environmental', 1, 1, 5, 1),
('diseased', 'Diseased', 'Suffering from illness', 'physical', 1, 1, 20, 1),
('drunk', 'Drunk', 'Reduced coordination, boosted courage', 'physical', 1, 1, 8, 1),
('exhausted', 'Exhausted', 'Severely reduced stamina recovery', 'physical', 1, 1, 12, 1),
('well_rested', 'Well Rested', 'Bonus to all stats', 'physical', 0, 1, 8, 1),
('honored', 'Honored', 'People treat you with respect', 'social', 0, 1, NULL, 1),
('infamous', 'Infamous', 'People fear or shun you', 'social', 1, 1, NULL, 1),
('marked', 'Marked', 'Divine attention makes you noticeable', 'divine', 0, 0, NULL, 1),
('debt_bound', 'Debt-Bound', 'Bound by debt to an organization', 'social', 1, 1, NULL, 1);

-- Ability types
INSERT INTO enum_ability_type (ability_type_id, display_name, description, uses_resource, can_be_learned) VALUES
('spell', 'Spell', 'Magical effects powered by willpower', 'willpower', 1),
('skill', 'Skill', 'Learned techniques using stamina', 'stamina', 1),
('innate', 'Innate', 'Natural abilities requiring no resource', NULL, 0),
('granted', 'Granted', 'Divine or magical gifts', 'willpower', 0),
('martial', 'Martial', 'Combat techniques', 'stamina', 1),
('social', 'Social', 'Persuasion and leadership', NULL, 1),
('ritual', 'Ritual', 'Complex multi-turn ceremonies', 'willpower', 1),
('stealth', 'Stealth', 'Sneaking and deception', 'stamina', 1);

-- Faction stances
INSERT INTO enum_faction_stance (stance_id, display_name, min_value, max_value, description, color_code) VALUES
('sworn_enemy', 'Sworn Enemy', -100, -81, 'Will stop at nothing to destroy you', '#8B0000'),
('hostile', 'Hostile', -80, -41, 'Openly antagonistic', '#FF4444'),
('unfriendly', 'Unfriendly', -40, -11, 'Cold, unhelpful', '#FF8844'),
('neutral', 'Neutral', -10, 10, 'No strong feelings', '#AAAAAA'),
('friendly', 'Friendly', 11, 40, 'Helpful and welcoming', '#44AA44'),
('allied', 'Allied', 41, 80, 'Will aid you in need', '#4488FF'),
('sworn_ally', 'Sworn Ally', 81, 100, 'Unbreakable bond of trust', '#FFD700');

-- Death types
INSERT INTO enum_death_type (death_type_id, display_name, description, has_aftermath, is_permanent) VALUES
('combat', 'Combat', 'Killed in battle or violence', 1, 1),
('disease', 'Disease', 'Succumbed to illness', 1, 1),
('age', 'Old Age', 'Natural end of life', 0, 1),
('divine', 'Divine', 'Struck down by cosmic forces', 1, 1),
('accident', 'Accident', 'Unfortunate mishap', 0, 1),
('execution', 'Execution', 'Put to death by law', 1, 0),
('sacrifice', 'Sacrifice', 'Gave life for a cause', 1, 1),
('corruption', 'Corruption', 'Consumed by cosmic taint', 1, 1),
('suicide', 'Suicide', 'Self-inflicted death', 0, 1),
('unknown', 'Unknown', 'Cause of death unclear', 0, 1);

-- Rumor statuses
INSERT INTO enum_rumor_status (rumor_status_id, display_name, description, spread_rate_mod, belief_decay_mod) VALUES
('nascent', 'Nascent', 'Just beginning to spread', 0.5, 1.0),
('circulating', 'Circulating', 'Moving through the population', 1.0, 1.0),
('widespread', 'Widespread', 'Known by many', 1.5, 0.8),
('contested', 'Contested', 'Conflicting versions exist', 1.2, 1.5),
('confirmed', 'Confirmed', 'Evidence supports it', 0.8, 0.5),
('debunked', 'Debunked', 'Proven false', 0.2, 2.0),
('forgotten', 'Forgotten', 'No longer remembered', 0.0, 5.0),
('mythologized', 'Mythologized', 'Became legend', 2.0, 0.1);

-- Consequence triggers
INSERT INTO enum_consequence_trigger (trigger_type_id, display_name, description, requires_target, param_schema) VALUES
('on_enter_location', 'On Enter Location', 'Fires when target enters a specific location', 1, '{"location_id":"string"}'),
('on_kill', 'On Kill', 'Fires when target kills something', 1, '{"target_type":"string"}'),
('on_time', 'On Time', 'Fires after N turns', 0, '{"turns":"integer"}'),
('on_stat_threshold', 'On Stat Threshold', 'Fires when a stat crosses a value', 1, '{"stat":"string","threshold":"integer","direction":"above|below"}'),
('on_death', 'On Death', 'Fires when target dies', 1, '{}'),
('on_item_acquire', 'On Item Acquire', 'Fires when target obtains an item', 1, '{"item_id":"string","item_type":"string"}'),
('on_faction_rep', 'On Faction Reputation', 'Fires when reputation with faction changes', 1, '{"faction_id":"string","threshold":"number"}'),
('on_corruption', 'On Corruption', 'Fires when corruption level changes', 1, '{"threshold":"number","direction":"above|below"}'),
('on_divine_attention', 'On Divine Attention', 'Fires when divine attention is gained', 1, '{"attention_level":"number"}'),
('on_rumor_spread', 'On Rumor Spread', 'Fires when a specific rumor spreads', 0, '{"rumor_id":"string","spread_level":"integer"}'),
('on_war_start', 'On War Start', 'Fires when war begins', 0, '{"faction_a":"string","faction_b":"string"}'),
('on_npc_death', 'On NPC Death', 'Fires when a specific NPC dies', 1, '{"npc_id":"string"}'),
('on_weather', 'On Weather', 'Fires on specific weather condition', 0, '{"weather_type":"string","region_id":"string"}'),
('on_player_choice', 'On Player Choice', 'Fires after a specific player decision', 1, '{"choice_id":"string"}'),
('on_disease_contract', 'On Disease Contract', 'Fires when target gets sick', 1, '{"disease_name":"string"}');


-- ============================================================================
-- 9.2: SAMPLE CAMPAIGN
-- ============================================================================
INSERT INTO campaign (
    campaign_id, name, description, world_gen_seed, difficulty, game_mode,
    current_turn, in_game_date, world_age_years, is_active, is_paused,
    current_chapter, themes,
    sim_economy, sim_ecology, sim_disease, sim_weather,
    permadeath_enabled, legacy_mode
) VALUES (
    'camp-001-aaaa',
    'The First Perception',
    'A lone figure wakes in Greywake with no memory, no name, and a debt to the city that grows heavier with each passing bell. The world watches.',
    'no-one-sees-the-first-bell-7843',
    'normal',
    'living_world',
    0,
    'Year 847 of the Broken Calendar, Late Autumn, Day 3',
    847.0,
    1,
    0,
    'Prologue: The Waking',
    '["debt","identity","corruption","faith","commerce"]',
    1, 1, 1, 1,
    0, 1
);


-- ============================================================================
-- 9.3: SAMPLE REGION
-- ============================================================================
INSERT INTO region (
    region_id, campaign_id, name, description, region_type, climate, terrain,
    size_km2, stability, prosperity, population_total, danger_level,
    corruption_level, is_known_to_player, neighboring_region_ids, lore
) VALUES (
    'reg-001-aaaa',
    'camp-001-aaaa',
    'Greywake',
    'A decaying port city built on the ruins of something older. The tide brings in more than fish.',
    'urban',
    'temperate',
    'coastal_cliffs_salt_marsh',
    45.0,
    4.5,
    5.2,
    12000,
    6,
    2.3,
    1,
    '[]',
    'Founded by exiles from the Bell Empire. The city was built atop ruins whose basements still echo with footsteps that do not belong to the living. The Civic Bell Court claims descent from the original founders and maintains order through ritual and debt-binding.'
);


-- ============================================================================
-- 9.4: SAMPLE LOCATION - Greywake Market District
-- ============================================================================
INSERT INTO location (
    location_id, region_id, parent_location_id, name, description, short_description,
    location_type, is_discovered, discovered_by_player, discovery_turn,
    danger_level, prosperity_level, population_count, is_indoors, has_lighting,
    connected_location_ids, npc_ids_present, item_ids_here,
    atmosphere_tags, ambient_sound, ambient_smell,
    map_x, map_y, map_z
) VALUES (
    'loc-001-aaaa',
    'reg-001-aaaa',
    NULL,
    'Greywake Market District',
    'A labyrinth of stalls, tents, and permanent shops clustered near the docks. The cobblestones are slick with fish scales and something darker. Above, the great bells of the Civic Court ring every hour, their sound dampened by the perpetual sea-mist. Merchants from the Tide League shout over each other, while Drowned Church acolytes move silently between stalls, collecting offerings in rusted buckets.',
    'A bustling market district by the docks.',
    'district',
    1,
    1,
    0,
    4,
    6.5,
    350,
    0,
    1,
    '[]',
    '[]',
    '[]',
    '["noisy","crowded","smoky","salt_air","tense"]',
    'Shouting merchants, clanging bells, splashing waves, a distant scream',
    'Fish, salt, rotting kelp, incense, sweat, copper',
    0.0, 0.0, 0.0
);


-- ============================================================================
-- 9.5: SAMPLE FACTIONS
-- ============================================================================
INSERT INTO faction (
    faction_id, campaign_id, name, description, faction_type, founding_story,
    primary_goal, secondary_goals, methods, core_values,
    power_level, wealth_level, influence_level, member_count,
    territory_control, is_secret, is_active,
    allied_faction_ids, enemy_faction_ids,
    headquarters_id, player_reputation, player_known
) VALUES
(
    'fac-001-aaaa', 'camp-001-aaaa',
    'Civic Bell Court',
    'The ruling authority of Greywake. They maintain order through a complex system of debt-binding, ritual bell-ringing, and bureaucratic inevitability. Every citizen owes something.',
    'political',
    'Founded by the first exiles who rang the great bell to claim the ruins. The sound drove away whatever lived in the deep basements. They have ruled ever since, passing laws and collecting debts.',
    'Maintain absolute control over Greywake through debt-binding and ritual.',
    '["Expand the bell network","Suppress heretical religions","Increase tax revenue"]',
    '["debt_binding","ritual_intimidation","bureaucratic_inevitability","selective_enforcement"]',
    '["order","tradition","debt","hierarchy"]',
    8, 7.0, 9.0, 450,
    '["loc-001-aaaa"]',
    0, 1,
    '[]', '["fac-002-aaaa"]',
    'loc-001-aaaa',
    0.0, 1
),
(
    'fac-002-aaaa', 'camp-001-aaaa',
    'Drowned Church',
    'A religious order that worships what lies beneath the waves. They believe drowning is not death but transformation. Their saints are preserved corpses that still whisper prophecy.',
    'religious',
    'Born when a fisherman named Venn Hook caught a saint in his nets. The saint spoke for three days before dissolving into brine. The Church was built on the spot where the last word fell.',
    'Prepare all souls for the Great Drowning that will transform the world.',
    '["Collect drowned bodies","Build underwater sanctuaries","Convert the fearful"]',
    '["sermons","ritual_drowning","charity","prophecy","underwater_exploration"]',
    '["charity","terror","prophecy","compassion"]',
    6, 3.0, 7.0, 800,
    '[]',
    0, 1,
    '[]', '["fac-001-aaaa"]',
    NULL,
    -10.0, 1
),
(
    'fac-003-aaaa', 'camp-001-aaaa',
    'Merchant Tide League',
    'A consortium of traders, smugglers, and bankers who control Greywakes commerce. They worship no gods but profit, and their ledgers contain secrets that could topple the Bell Court.',
    'merchant',
    'Seven merchants swore an oath on a drowned mans gold coin. The League was born. Now they control every transaction in the city, from fishmongers to artifact dealers.',
    'Control all commerce in Greywake and expand trade routes.',
    '["Undermine Bell Court taxation","Establish offshore banks","Monopolize luxury goods"]',
    '["bribery","smuggling","price_fixing","information_brokering"]',
    '["profit","efficiency","secrecy","mutual_profit"]',
    7, 9.0, 8.0, 600,
    '[]',
    0, 1,
    '[]', '[]',
    'loc-001-aaaa',
    5.0, 1
);


-- ============================================================================
-- 9.6: UPDATE REGION WITH DOMINANT FACTION
-- ============================================================================
UPDATE region SET dominant_faction_id = 'fac-001-aaaa' WHERE region_id = 'reg-001-aaaa';


-- ============================================================================
-- 9.7: SAMPLE NPCs (5 characters)
-- ============================================================================
INSERT INTO npc (
    npc_id, campaign_id, name, title, description,
    stat_body, stat_grace, stat_sense, stat_mind, stat_will,
    stat_presence, stat_authority, stat_ruin, stat_creation,
    hp_current, hp_max, stamina_current, stamina_max,
    willpower_current, willpower_max, corruption,
    occupation, race, age, personality_traits, secrets,
    is_alive, current_location_id, home_location_id,
    primary_faction_id, faction_rank,
    current_goal, emotional_state, schedule,
    player_reputation, player_relationship, knows_player_name
) VALUES
(
    'npc-001-aaaa', 'camp-001-aaaa',
    'Orro', 'Bell-Magistrate',
    'A tall man in robes the color of tarnished bells. His eyes are pale grey and do not blink often. A leather satchel at his hip contains debt scrolls - some centuries old, still binding. He moves with the inevitability of a tax collector who knows you are home.',
    9, 10, 14, 16, 18,
    13, 17, 8, 12,
    85, 85, 40, 40,
    45, 45, 1.2,
    'Magistrate', 'human', 54,
    '["ruthless","lawful","patient","intelligent"]',
    '[{"secret":"Orro secretly doubts the bell rituals work","known_by":[]}]',
    1, 'loc-001-aaaa', 'loc-001-aaaa',
    'fac-001-aaaa', 'leader',
    'Collect outstanding debts and maintain Court authority',
    'neutral',
    NULL,
    -5.0, 'stranger', 0
),
(
    'npc-002-aaaa', 'camp-001-aaaa',
    'Ilyra', 'Marrow-Saint',
    'Her body is preserved by salt and prayer, yet she moves. Her voice is the sound of waves in a shell. Where she walks, the ground is briefly damp. She collects grief like others collect coins - it fuels her prophecies.',
    6, 8, 16, 14, 20,
    17, 12, 15, 14,
    60, 60, 30, 30,
    60, 60, 8.5,
    'Prophet', 'human', 67,
    '["mystical","compassionate","terrifying","enigmatic"]',
    '[{"secret":"Ilyra was not truly drowned - she chose this","known_by":[]}]',
    1, 'loc-001-aaaa', NULL,
    'fac-002-aaaa', 'leader',
    'Guide the faithful and deliver prophecies of the Great Drowning',
    'neutral',
    NULL,
    -15.0, 'stranger', 0
),
(
    'npc-003-aaaa', 'camp-001-aaaa',
    'Venn', NULL,
    'An old fisherman with hands like gnarled roots and eyes that have seen what lives below. He wears a coat made of scales that are not from any fish known to science. He speaks rarely, but when he does, the Drowned Church listens.',
    12, 9, 18, 11, 15,
    10, 8, 12, 10,
    70, 70, 35, 35,
    35, 35, 5.0,
    'Fisherman', 'human', 72,
    '["silent","perceptive","haunted","wise"]',
    '[{"secret":"Venn still hears the first saint speaking in his dreams","known_by":["npc-002-aaaa"]}]',
    1, 'loc-001-aaaa', 'loc-001-aaaa',
    'fac-002-aaaa', 'member',
    'Fish. Listen. Remember.',
    'neutral',
    NULL,
    0.0, 'stranger', 0
),
(
    'npc-004-aaaa', 'camp-001-aaaa',
    'The Listening Child', 'The Listener',
    'A child who sits in the market, listening. No one knows their name or who they belong to. They do not speak, only listen. Those who tell them secrets find those secrets come true - for good or ill. Their eyes are too old for their face.',
    5, 14, 20, 13, 16,
    8, 4, 10, 16,
    40, 40, 50, 50,
    40, 40, 12.0,
    'Listener', 'unknown', 0,
    '["silent","omniscient","innocent","ancient"]',
    '[{"secret":"The Child is older than Greywake itself","known_by":[]}]',
    1, 'loc-001-aaaa', 'loc-001-aaaa',
    NULL, NULL,
    'Listen to everything. Remember everything. Wait.',
    'neutral',
    NULL,
    0.0, 'stranger', 0
),
(
    'npc-005-aaaa', 'camp-001-aaaa',
    'Carnifex', 'The Butcher Who Repeats',
    'A massive figure in a blood-stained apron. He repeats the last word of every sentence he speaks. His shop sells meat. No one asks what kind. He was once a soldier. He still is, in his dreams.',
    16, 8, 10, 9, 14,
    7, 11, 14, 6,
    110, 110, 45, 45,
    30, 30, 3.5,
    'Butcher', 'human', 41,
    '["violent","honest","broken","loyal"]',
    '[{"secret":"He served the Bell Court as an executioner and still carries out contract killings","known_by":["npc-001-aaaa"]}]',
    1, 'loc-001-aaaa', 'loc-001-aaaa',
    NULL, NULL,
    'Run the shop. Keep his head down. Remember the war.',
    'neutral',
    NULL,
    0.0, 'stranger', 0
);


-- ============================================================================
-- 9.8: SAMPLE PLAYER - "No One"
-- ============================================================================
INSERT INTO player (
    player_id, campaign_id, name, epithet, description, backstory,
    stat_body, stat_grace, stat_sense, stat_mind, stat_will,
    stat_presence, stat_authority, stat_ruin, stat_creation,
    hp_current, hp_max, stamina_current, stamina_max,
    willpower_current, willpower_max, corruption, divinity, fame,
    is_alive, current_location_id, current_region_id,
    experience, level, skill_points,
    inventory_gold
) VALUES (
    'plyr-001-aaaa', 'camp-001-aaaa',
    'No One',
    NULL,
    'A figure of indeterminate age and unremarkable features. You might pass them in the street and forget them by the next corner. This is either their greatest weakness or their most profound strength.',
    'You woke on the docks of Greywake three days ago with no memory of who you are. A fisherman found you face-down in the tidal pools. You had a scrap of paper in your hand with two words: "Remember nothing." The Civic Bell Court has registered you as a debtor - housing, food, and the cost of resuscitation. Your debt is 47 gold. Your name is whatever you choose to call yourself. For now, you are No One.',
    10, 10, 12, 10, 11,
    9, 8, 7, 10,
    100, 100, 50, 50,
    30, 30, 0.0, 0.0, -2.0,
    1, 'loc-001-aaaa', 'reg-001-aaaa',
    0, 1, 0,
    3
);


-- ============================================================================
-- 9.9: SAMPLE ITEMS
-- ============================================================================
INSERT INTO item (
    item_id, campaign_id, item_type_id, name, description,
    quality, durability_current, durability_max,
    mod_stat_body, mod_stat_grace, mod_stat_sense, mod_stat_mind, mod_stat_will,
    mod_stat_presence, mod_stat_authority, mod_stat_ruin, mod_stat_creation,
    mod_hp_max, damage_dice, armor_value,
    base_value, weight,
    is_unique, is_quest_item, is_cursed, curse_description,
    held_by_type, held_by_id, location_id,
    provenance, previous_owners
) VALUES
(
    'item-001-aaaa', 'camp-001-aaaa', 'weapon', 'Rust-Caked Blade',
    'A shortsword pitted with salt-rust. It has killed before. It will kill again. The balance is surprisingly good despite its appearance.',
    'common', 20, 25,
    0, 0, 0, 0, 0, 0, 0, 1, 0,
    0, '1d6+1', 0,
    15, 2.0,
    0, 0, 0, NULL,
    'player', 'plyr-001-aaaa', NULL,
    'Found on the docks near where you woke.',
    '[]'
),
(
    'item-002-aaaa', 'camp-001-aaaa', 'armor', 'Debtor Rags',
    'Rough-spun cloth marked with the Civic Bell Court seal. It marks you as a debtor in the city eyes. It offers almost no protection, but it is dry.',
    'trash', 5, 5,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, NULL, 1,
    1, 1.0,
    0, 1, 0, NULL,
    'player', 'plyr-001-aaaa', NULL,
    'Issued by the Civic Bell Court upon your registration.',
    '[{"name":"Civic Bell Court","type":"faction","id":"fac-001-aaaa"}]'
),
(
    'item-003-aaaa', 'camp-001-aaaa', 'jewelry', 'Tidal Stone',
    'A smooth black stone found in your pocket when you woke. It is warm to the touch and vibrates faintly when the tide is coming in. You do not remember where you got it.',
    'common', NULL, NULL,
    0, 0, 1, 0, 1, 0, 0, 0, 0,
    0, NULL, 0,
    50, 0.1,
    0, 1, 0, NULL,
    'player', 'plyr-001-aaaa', NULL,
    'Found in your pocket when you woke on the docks.',
    '[]'
),
(
    'item-004-aaaa', 'camp-001-aaaa', 'book', 'Water-Damaged Ledger',
    'A small notebook with most pages ruined by water. The remaining entries are in a hand you almost recognize. Lists of names, dates, and amounts. Your name - or a name like yours - appears several times with increasing debt amounts.',
    'fine', NULL, NULL,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, NULL, 0,
    100, 0.5,
    1, 1, 0, NULL,
    'player', 'plyr-001-aaaa', NULL,
    'Found sewn into your debtor rags.',
    '[]'
),
(
    'item-005-aaaa', 'camp-001-aaaa', 'consumable', 'Greywake Grog',
    'The local rotgut. Tastes of salt, regret, and something that might be fermented kelp. It gets the job done.',
    'common', NULL, NULL,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, NULL, 0,
    2, 0.5,
    0, 0, 0, NULL,
    'player', 'plyr-001-aaaa', NULL,
    'Purchased at a dockside stall.',
    '[]'
);


-- ============================================================================
-- 9.10: SAMPLE ABILITIES
-- ============================================================================
INSERT INTO ability (
    ability_id, campaign_id, ability_type_id, name, description,
    required_stat, required_stat_value,
    cost_stamina, cost_willpower, cost_hp, cooldown_turns,
    effect_description, effect_stat_mods, effect_damage, effect_healing,
    required_level, known_by_player_id
) VALUES
(
    'abil-001-aaaa', 'camp-001-aaaa', 'skill', 'Salt-Born Resilience',
    'Years (or lifetimes?) in the salt air have hardened your body against pain and privation.',
    'stat_body', 8,
    5, 0, 0, 8,
    'Reduce incoming damage by 50% for 2 turns.',
    '{"stat_body": 2}', NULL, 0,
    1, 'plyr-001-aaaa'
),
(
    'abil-002-aaaa', 'camp-001-aaaa', 'social', 'Debtor Guise',
    'You have learned to look pathetic, harmless, and utterly unworthy of attention. People overlook you. This is a kind of power.',
    'stat_presence', 6,
    0, 0, 0, 6,
    'Become unnoticeable. NPCs ignore you unless directly addressed.',
    NULL, NULL, 0,
    1, 'plyr-001-aaaa'
),
(
    'abil-003-aaaa', 'camp-001-aaaa', 'martial', 'Rust-Blade Flourish',
    'A desperate, unpredictable fighting style suited to uneven ground and poor weapons.',
    'stat_grace', 8,
    8, 0, 0, 3,
    'Make an attack roll. On success, deal 2d6 damage and gain +2 grace for 1 turn.',
    '{"stat_grace": 2}', '2d6', 0,
    1, 'plyr-001-aaaa'
),
(
    'abil-004-aaaa', 'camp-001-aaaa', 'innate', 'Unreadable Face',
    'No one can tell what you are thinking. Your expressions do not match your feelings, if you have feelings at all.',
    'stat_sense', 10,
    0, 0, 0, 0,
    'Passive: +3 to resist social manipulation and lie detection.',
    NULL, NULL, 0,
    1, 'plyr-001-aaaa'
),
(
    'abil-005-aaaa', 'camp-001-aaaa', 'stealth', 'Slip Through Crowds',
    'In a press of bodies, you become just another shadow moving between shoulders.',
    'stat_grace', 8,
    3, 0, 0, 4,
    'Move through any crowd without being stopped or remembered.',
    NULL, NULL, 0,
    1, 'plyr-001-aaaa'
);


-- ============================================================================
-- 9.11: SAMPLE TRAITS
-- ============================================================================
INSERT INTO trait (
    trait_id, campaign_id, name, description, trait_category,
    stat_mods, special_effects,
    is_innate, can_be_learned,
    on_player_id, acquired_turn, acquisition_story
) VALUES
(
    'trait-001-aaaa', 'camp-001-aaaa',
    'Debt-Bound',
    'You owe 47 gold to the Civic Bell Court. This debt colors every interaction in Greywake.',
    'background',
    '{"stat_authority": -2}',
    '[{"effect":"court_interactions","description":"All Bell Court NPCs have +10 to persuasion checks against you"}]',
    1, 0,
    'plyr-001-aaaa', 0,
    'You woke with this debt already on the books. The Court claims you have been accumulating it since before you can remember.'
),
(
    'trait-002-aaaa', 'camp-001-aaaa',
    'Tide-Touched',
    'Something about the sea resonates with you. You understand tides intuitively. Water feels like home, even when it is trying to drown you.',
    'innate',
    '{"stat_sense": 1, "stat_will": 1}',
    '[{"effect":"water_affinity","description":"+2 to all rolls involving water or the sea"}]',
    1, 0,
    'plyr-001-aaaa', 0,
    'You have always known the tides, even when you knew nothing else.'
),
(
    'trait-003-aaaa', 'camp-001-aaaa',
    'Unremarkable',
    'People forget your face. Descriptions of you vary wildly. You are the person nobody was looking at when things happened.',
    'innate',
    '{"stat_presence": -2}',
    '[{"effect":"forgettable","description":"NPCs must pass a Sense check to remember interacting with you"}]',
    1, 0,
    'plyr-001-aaaa', 0,
    'You have always been easy to overlook. Sometimes even you forget you are there.'
),
(
    'trait-004-aaaa', 'camp-001-aaaa',
    'Salt Hardened',
    'The salt air and hard living have toughened your body. You recover from injury faster than most.',
    'earned',
    '{"stat_body": 1}',
    '[{"effect":"fast_healing","description":"Recover +2 HP per turn of rest"}]',
    0, 1,
    'plyr-001-aaaa', 0,
    'Three days on the streets of Greywake have already begun to change you.'
);


-- ============================================================================
-- 9.12: SAMPLE CONDITIONS
-- ============================================================================
INSERT INTO condition (
    condition_id, campaign_id, condition_type_id, target_type, target_id,
    stack_count, duration_remaining, is_permanent,
    source_type, source_id, source_description,
    stat_mods, applied_turn
) VALUES
(
    'cond-001-aaaa', 'camp-001-aaaa', 'debt_bound', 'player', 'plyr-001-aaaa',
    1, NULL, 1,
    'environment', 'fac-001-aaaa', 'Civic Bell Court debt registration',
    '{"stat_authority": -2}', 0
),
(
    'cond-002-aaaa', 'camp-001-aaaa', 'exhausted', 'player', 'plyr-001-aaaa',
    1, 6, 0,
    'environment', NULL, 'Three days without proper rest since waking',
    '{"stat_body": -1, "stat_mind": -1}', 0
);


-- ============================================================================
-- 9.13: SAMPLE SIMULATION STATES
-- ============================================================================

-- Economy state for Greywake
INSERT INTO economy_state (
    economy_id, region_id, campaign_id,
    prosperity_index, inflation_rate, unemployment_rate,
    trade_balance, primary_exports, primary_imports,
    trade_partner_region_ids, currency_name, currency_stability,
    food_price_mod, weapon_price_mod, armor_price_mod, magic_price_mod, luxury_price_mod,
    crisis_active, crisis_description, turn_number
) VALUES (
    'econ-001-aaaa', 'reg-001-aaaa', 'camp-001-aaaa',
    5.2, 0.02, 0.15,
    1.5,
    '["salted_fish","kelp_rope","dried_sea_creatures"]',
    '["grain","iron","luxury_goods","holy_relics"]',
    '[]',
    'Greywake Drakes', 0.85,
    1.2, 0.9, 0.85, 1.4, 1.1,
    0, NULL, 0
);

-- Weather state for Greywake
INSERT INTO weather_state (
    weather_id, region_id, campaign_id,
    weather_type, temperature, humidity, wind_speed, wind_direction,
    visibility_km, precipitation_mm, is_extreme,
    duration_remaining,
    travel_speed_mod, combat_accuracy_mod, disease_spread_mod, fire_spread_mod,
    turn_number
) VALUES (
    'weath-001-aaaa', 'reg-001-aaaa', 'camp-001-aaaa',
    'mist', 12.0, 0.85, 15.0, 'SW',
    0.5, 0.5, 0,
    4,
    0.8, 0.85, 1.1, 0.6,
    0
);

-- Ecology snapshot for Greywake
INSERT INTO ecology_snapshot (
    ecology_id, region_id, campaign_id,
    ecological_health, biodiversity_index,
    forest_coverage, grassland_health, crop_yield,
    wildlife_population, predator_ratio, dangerous_beasts,
    fish_stock, game_stock, lumber_availability, ore_availability, water_purity,
    overharvested, blighted, corrupted,
    current_season, seasonal_modifier, turn_number
) VALUES (
    'eco-001-aaaa', 'reg-001-aaaa', 'camp-001-aaaa',
    4.5, 4.0,
    0.05, 3.0, 5.5,
    800, 0.08, 45,
    6.5, 3.0, 2.0, 2.5, 4.0,
    1, 0, 2.3,
    'autumn', 0.9, 0
);

-- Disease outbreak (minor)
INSERT INTO disease_outbreak (
    outbreak_id, campaign_id, region_id,
    disease_name, disease_type, description,
    infection_rate, mortality_rate, recovery_rate,
    total_population, infected_count, dead_count, recovered_count,
    is_contained, containment_efforts,
    started_turn
) VALUES (
    'dis-001-aaaa', 'camp-001-aaaa', 'reg-001-aaaa',
    'Dockside Shivers', 'mundane',
    'A minor illness spread by damp and cold. Causes fever, shaking, and vivid dreams of drowning. Usually passes in a week.',
    0.005, 0.01, 0.15,
    12000, 23, 0, 67,
    1,
    '[{"faction":"Drowned Church","effort":"prayer_circles"},{"faction":"Civic Bell Court","effort":"quarantine_orders"}]',
    -15
);

-- Law state for Greywake
INSERT INTO law_state (
    law_id, region_id, campaign_id,
    enforcing_faction_id, law_coverage, guard_count, guard_quality,
    crime_rate, corruption_level,
    active_laws, prohibited_goods,
    active_investigations, investigation_targets, wanted_posters,
    martial_law, curfew_active, turn_number
) VALUES (
    'law-001-aaaa', 'reg-001-aaaa', 'camp-001-aaaa',
    'fac-001-aaaa', 0.7, 80, 4.5,
    0.25, 0.30,
    '[{"law":"Murder is punishable by drowning","punishment":"drowning"},{"law":"Unlicensed magic carries a fine of 50 gold","punishment":"fine_or_service"},{"law":"Debt evasion is a capital crime","punishment":"indentured_service"}]',
    '["unlicensed_magic_items","poison","forbidden_texts"]',
    3,
    '["npc-005-aaaa"]',
    '[{"name":"The Drowned Rat","bounty":25,"crime":"theft_of_court_property"}]',
    0, 0, 0
);


-- ============================================================================
-- 9.14: SAMPLE EVENTS
-- ============================================================================
INSERT INTO event (
    event_id, campaign_id, event_type_id,
    actor_type, actor_id, actor_name, verb, description,
    target_type, target_id, target_name,
    location_id, region_id,
    is_public, is_player_facing, witnesses,
    importance, narrative_tags, turn_number
) VALUES
(
    'evt-001-aaaa', 'camp-001-aaaa', 'exploration',
    'player', 'plyr-001-aaaa', 'No One', 'awoke',
    'You woke face-down in the tidal pools beneath the Greywake docks. Salt water in your lungs. No memory of your name. A scrap of paper in your hand reads: "Remember nothing."',
    'none', NULL, NULL,
    'loc-001-aaaa', 'reg-001-aaaa',
    1, 1, '["npc-003-aaaa"]',
    9, '["mysterious","origin","amnesia"]', 0
),
(
    'evt-002-aaaa', 'camp-001-aaaa', 'political',
    'faction', 'fac-001-aaaa', 'Civic Bell Court', 'registered',
    'The Civic Bell Court has officially registered No One as a city debtor. Debt: 47 gold. Terms: Service or payment within 90 days.',
    'player', 'plyr-001-aaaa', 'No One',
    'loc-001-aaaa', 'reg-001-aaaa',
    0, 0, NULL,
    6, '["debt","bureaucracy","binding"]', 0
);


-- ============================================================================
-- 9.15: SAMPLE RUMOR
-- ============================================================================
INSERT INTO rumor (
    rumor_id, campaign_id, source_event_id,
    content, truth_level, rumor_status_id, spread_level,
    origin_location_id, origin_npc_id,
    known_by_faction_ids, known_by_npc_ids, is_known_to_player,
    spread_rate, decay_rate, narrative_hook,
    created_turn, last_spread_turn
) VALUES (
    'rum-001-aaaa', 'camp-001-aaaa', 'evt-001-aaaa',
    'A stranger woke on the docks with no name and a debt already on the books. Some say the sea gave them back. Others say they were never human to begin with. The Listening Child has been watching them.',
    0.6, 'circulating', 3,
    'loc-001-aaaa', 'npc-004-aaaa',
    '[]', '["npc-001-aaaa","npc-003-aaaa"]', 0,
    1.2, 0.15,
    'People are talking about you. The question is: what are they saying, and who started it?',
    0, 0
);


-- ============================================================================
-- 9.16: SAMPLE NPC MEMORIES
-- ============================================================================
INSERT INTO npc_memory (
    memory_id, campaign_id, npc_id, memory_type, description,
    source_event_id, emotional_valence, emotional_intensity,
    importance_score, is_core_memory, about_entity_type, about_entity_id,
    formed_turn
) VALUES
(
    'mem-001-aaaa', 'camp-001-aaaa', 'npc-001-aaaa',
    'event', 'A nameless debtor washed up on the docks. Happens every few years. This one had paper in their hand. I added their debt to the ledgers myself. 47 gold. They will pay, or they will serve. They always do.',
    'evt-001-aaaa', 0.0, 0.3,
    0.6, 0, 'player', 'plyr-001-aaaa', 0
),
(
    'mem-002-aaaa', 'camp-001-aaaa', 'npc-002-aaaa',
    'event', 'The sea gave back someone it should have kept. I felt it in my bones - a wrongness, like a prophecy that has forgotten how to end. They are marked, though they do not know it yet. The Drowned Church must watch them.',
    'evt-001-aaaa', 0.0, 0.8,
    0.9, 1, 'player', 'plyr-001-aaaa', 0
),
(
    'mem-003-aaaa', 'camp-001-aaaa', 'npc-003-aaaa',
    'meeting', 'I pulled them from the water. They were cold as the depths. Their eyes opened and looked at me with no recognition. In my nets, I have caught many things. This one was different. This one the sea was sorry to lose.',
    'evt-001-aaaa', 0.2, 0.7,
    0.8, 1, 'player', 'plyr-001-aaaa', 0
),
(
    'mem-004-aaaa', 'camp-001-aaaa', 'npc-004-aaaa',
    'event', 'They came to the market. They do not remember, but they have been here before. Long before. The stones remember. The bells remember. I remember. They are the First Perception, returning to itself. I must listen. I must wait.',
    'evt-001-aaaa', 0.0, 0.9,
    1.0, 1, 'player', 'plyr-001-aaaa', 0
);


-- ============================================================================
-- 9.17: SAMPLE BELIEFS
-- ============================================================================
INSERT INTO belief (
    belief_id, campaign_id, holder_type, holder_id,
    subject_type, subject_id, subject_name, belief_statement,
    confidence, is_true, source_type,
    is_active, emotional_valence, formed_turn
) VALUES
(
    'bel-001-aaaa', 'camp-001-aaaa', 'npc', 'npc-001-aaaa',
    'player', 'plyr-001-aaaa', 'No One',
    'No One is an ordinary debtor who will pay their debts or face the consequences.',
    0.8, NULL, 'direct_observation',
    1, 0.0, 0
),
(
    'bel-002-aaaa', 'camp-001-aaaa', 'npc', 'npc-002-aaaa',
    'player', 'plyr-001-aaaa', 'No One',
    'No One is significant to the Great Drowning prophecy. The sea returned them for a reason.',
    0.9, NULL, 'faith',
    1, 0.3, 0
),
(
    'bel-003-aaaa', 'camp-001-aaaa', 'npc', 'npc-004-aaaa',
    'player', 'plyr-001-aaaa', 'No One',
    'No One has been here before. They are the First Perception. Everything began with them and will end with them.',
    1.0, NULL, 'direct_observation',
    1, 0.0, 0
);


-- ============================================================================
-- 9.18: SAMPLE SCENE
-- ============================================================================
INSERT INTO scene (
    scene_id, campaign_id, location_id,
    name, description, scene_type,
    atmosphere, lighting, soundscape, weather_effects,
    tension_level, is_active, is_combat_active,
    present_npc_ids, present_faction_ids,
    narrative_purpose, gm_notes, start_turn
) VALUES (
    'scn-001-aaaa', 'camp-001-aaaa', 'loc-001-aaaa',
    'The Market at Dusk',
    'The Greywake Market District at dusk. The merchants are packing up, but the night trade is just beginning. Bell-Magistrate Orro walks the aisles with his debt scrolls. Marrow-Saint Ilyra sits by the fountain, her eyes closed in communion with the deep. Venn Hook mends nets by the eastern wall. The Listening Child sits on a crate, watching everything. The Butcher sharpens his knives in the shadows of his stall.',
    'exploration',
    'Tense, smoky, expectant. The transition between day and night trade.',
    'dim',
    'Distant bells, haggling voices, a lute being tuned somewhere, the sea',
    'The mist deadens sounds and makes lanterns seem to glow with halos.',
    4, 1, 0,
    '["npc-001-aaaa","npc-002-aaaa","npc-003-aaaa","npc-004-aaaa","npc-005-aaaa"]',
    '["fac-001-aaaa","fac-002-aaaa","fac-003-aaaa"]',
    'Introduce the player to the major NPCs and factions of Greywake. Establish the atmosphere and give the player their first meaningful choices.',
    'Let the player explore freely. Each NPC has something different to offer. The Listening Child knows the most but reveals the least. Orro will demand debt payment. Ilyra will offer prophecy. Venn will share fish and rumors. The Butcher will trade meat for stories.',
    0
);


-- ============================================================================
-- 9.19: UPDATE PLAYER EQUIPPED ITEMS
-- ============================================================================
UPDATE player SET
    equipped_weapon_id = 'item-001-aaaa',
    equipped_armor_id = 'item-002-aaaa'
WHERE player_id = 'plyr-001-aaaa';


-- ============================================================================
-- 9.20: SAMPLE CONSEQUENCES (pending story hooks)
-- ============================================================================
INSERT INTO consequence (
    consequence_id, campaign_id, source_event_id, source_type,
    trigger_type_id, trigger_params,
    effect_type, effect_params, effect_description,
    status, delay_turns, created_turn,
    target_type, target_id, narrative_weight
) VALUES
(
    'cons-001-aaaa', 'camp-001-aaaa', 'evt-002-aaaa', 'player_choice',
    'on_time', '{"turns": 90}',
    'spawn_event', '{"description":"Your debt comes due. The Civic Bell Court sends collectors."}',
    'The 90-day debt deadline triggers. Bell Court enforcers will come looking for payment.',
    'pending', 90, 0,
    'player', 'plyr-001-aaaa', 8
),
(
    'cons-002-aaaa', 'camp-001-aaaa', NULL, 'world_event',
    'on_time', '{"turns": 30}',
    'spawn_event', '{"description":"The Drowned Church approaches you with a prophecy"}',
    'Marrow-Saint Ilyra will seek you out with a prophecy about the Great Drowning.',
    'pending', 30, 0,
    'npc', 'npc-002-aaaa', 7
);


-- ============================================================================
-- 9.21: SAMPLE ROLL LOG (character creation rolls)
-- ============================================================================
INSERT INTO roll_log (
    roll_id, campaign_id, roller_type, roller_id, roll_type,
    dice_count, dice_sides, modifier, difficulty, raw_result,
    final_result, is_success, critical_type, context,
    related_stat, timestamp
) VALUES
(
    'roll-001-aaaa', 'camp-001-aaaa', 'player', 'plyr-001-aaaa',
    'skill_check', 1, 20, 0, 10, 14,
    14, 1, 'none',
    'Character creation: Sense check - tide prediction',
    'stat_sense', 0
),
(
    'roll-002-aaaa', 'camp-001-aaaa', 'system', NULL,
    'random_table', 1, 100, 0, NULL, 73,
    73, NULL, 'none',
    'World generation: Corruption seed level for Greywake',
    NULL, 0
);


-- ============================================================================
-- 9.22: SAMPLE JOURNAL ENTRY (player-written prologue)
-- ============================================================================
INSERT INTO journal_entry (
    entry_id, campaign_id, player_id, entry_type, title, body,
    related_event_id, related_location_id, mood, tags, timestamp
) VALUES (
    'jrn-001-aaaa', 'camp-001-aaaa', 'plyr-001-aaaa',
    'player_written',
    'Day Three: I Am No One',
    'I woke on the docks three days ago. Face-down in tidal pools. A fisherman pulled me out - old man, hands like roots. There was paper in my fist. "Remember nothing." I do not know who wrote it or why. I do not know my name. I have decided to call myself No One until I learn better. The city calls me a debtor. Forty-seven gold for the privilege of being pulled from the sea and given rags. The Civic Bell Court has a ledger with my unwritten name in it. I will pay them, or I will not. For now, I walk the market. I watch. I listen. I am No One. And No One sees everything.',
    'evt-001-aaaa', 'loc-001-aaaa',
    'determined',
    '["origin","debt","identity","beginning"]',
    0
);


-- ============================================================================
-- 9.23: SAMPLE WORLD PULSE
-- ============================================================================
INSERT INTO world_pulse (
    pulse_id, campaign_id, pulse_type, title, description,
    source_region_id, source_faction_id, intensity, is_read, timestamp
) VALUES (
    'pulse-001-aaaa', 'camp-001-aaaa',
    'political',
    'Bell Court Tightens Debt Laws',
    'The Civic Bell Court has announced stricter enforcement of debt collection. Debtors who fail to pay within 90 days face indentured service. Markets are tense.',
    'reg-001-aaaa', 'fac-001-aaaa',
    4, 1, 0
);


-- ============================================================================
-- SECTION 10: DATABASE VERIFICATION
-- ============================================================================

-- Verify all tables exist and have the expected row counts
-- These queries can be run after execution to confirm integrity.

-- Expected counts after seeding:
-- enum tables: ~8-20 rows each
-- campaign: 1
-- region: 1
-- location: 1
-- faction: 3
-- npc: 5
-- player: 1
-- item: 5
-- ability: 5
-- trait: 4
-- condition: 2
-- event: 2
-- rumor: 1
-- belief: 3
-- consequence: 2
-- scene: 1
-- npc_memory: 4
-- journal_entry: 1
-- roll_log: 2
-- world_pulse: 1
-- economy_state: 1
-- weather_state: 1
-- ecology_snapshot: 1
-- disease_outbreak: 1
-- law_state: 1
-- save_snapshot: 0 (empty until player saves)
-- contradiction_ledger: 0 (empty until conflicts arise)

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
