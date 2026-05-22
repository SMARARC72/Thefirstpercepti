-- ============================================================================
-- Phase 24c / Session 5a / Phase 5a.2 — Native Postgres ENUMs (201 types)
-- ============================================================================
-- Per PHASE_24C_HANDOFF.md §Phase 5a.2.
-- Source: extracted from `database/schema.postgres.generated.sql` lines 35-2461
-- (per ARD-009 — schema_pack_v0.8.json is canonical; gen-ddl is derived).
--
-- All 201 ENUMs land in PUBLIC schema for cross-schema accessibility (per
-- ARD-011 §2). Names follow `x_enum_name` annotation where set, otherwise
-- auto-derived `<entity>_<field>_enum` per generator convention.
--
-- Khoja Decision #3 — default-native ENUM strategy. Lookup-table variants
-- (x_enum_strategy: "lookup") land in Phase 5a.3 as separate tables, not here.
--
-- Idempotent: DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$
-- wraps every CREATE TYPE per generator pattern. Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Native Postgres ENUM types (per ARD-011 §2; Khoja Decision #3 'native' criteria)
-- ----------------------------------------------------------------------------
-- public.defs_skill_check_block_properties_stat_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_skill_check_block_properties_stat_enum" AS ENUM (
    'body',
    'grace',
    'sense',
    'mind',
    'will',
    'presence',
    'authority',
    'ruin',
    'creation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_dialogue_state_block_properties_topic_history_items_properties_last_response_band_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_dialogue_state_block_properties_topic_history_items_properties_last_response_band_enum" AS ENUM (
    'open',
    'guarded',
    'selective',
    'silent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_goal_block_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_goal_block_properties_kind_enum" AS ENUM (
    'acquire',
    'destroy',
    'preserve',
    'transform',
    'reveal',
    'conceal',
    'name',
    'unname'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_goal_block_properties_target_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_goal_block_properties_target_kind_enum" AS ENUM (
    'individual',
    'institution',
    'concept',
    'item',
    'location',
    'self'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_trigger_block_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_trigger_block_properties_kind_enum" AS ENUM (
    'time',
    'condition',
    'threshold',
    'random',
    'discovery',
    'narrative_event'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_effect_block_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_effect_block_properties_kind_enum" AS ENUM (
    'stat_modifier',
    'hp_delta',
    'meter_delta',
    'condition_apply',
    'condition_remove',
    'spawn_entity',
    'remove_entity',
    'scene_route',
    'faction_stance_shift',
    'rumor_spawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_faction_plan_block_properties_cadence_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_faction_plan_block_properties_cadence_enum" AS ENUM (
    'seasonal_4x_year',
    'monthly',
    'irregular_per_assignment',
    'liturgical_12x_year',
    'civic_6x_year',
    'trade_season_8x_year',
    'theological_irregular',
    'special'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_faction_plan_block_properties_plan_steps_items_properties_result_band_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_faction_plan_block_properties_plan_steps_items_properties_result_band_enum" AS ENUM (
    'success',
    'partial',
    'setback',
    'failure'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_session_state_block_properties_notice_thresholds_fired_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_session_state_block_properties_notice_thresholds_fired_items_enum" AS ENUM (
    '7',
    '8',
    '9',
    '10'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_focus_block_properties_source_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_focus_block_properties_source_kind_enum" AS ENUM (
    'natural',
    'pact',
    'ritual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.npc_closing_state
DO $$ BEGIN
  CREATE TYPE "public"."npc_closing_state" AS ENUM (
    'success_state',
    'passover_state',
    'death_state',
    'transfer_state',
    'special_state'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.want_model_kill_threshold
DO $$ BEGIN
  CREATE TYPE "public"."want_model_kill_threshold" AS ENUM (
    'warning',
    'danger',
    'critical',
    'absolute'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.want_model_target_class
DO $$ BEGIN
  CREATE TYPE "public"."want_model_target_class" AS ENUM (
    'individual',
    'institution',
    'concept',
    'self'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.knowledge_says_policy
DO $$ BEGIN
  CREATE TYPE "public"."knowledge_says_policy" AS ENUM (
    'open',
    'guarded',
    'selective',
    'silent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_knowledge_tri_layer_properties_says_properties_per_audience_overrides_additional_properties_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_knowledge_tri_layer_properties_says_properties_per_audience_overrides_additional_properties_enum" AS ENUM (
    'open',
    'guarded',
    'selective',
    'silent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.ambition_tick_cadence
DO $$ BEGIN
  CREATE TYPE "public"."ambition_tick_cadence" AS ENUM (
    'seasonal_4x_year',
    'monthly',
    'irregular_per_assignment',
    'liturgical_12x_year',
    'civic_6x_year',
    'trade_season_8x_year',
    'theological_irregular',
    'special'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.institution_schedule_tier
DO $$ BEGIN
  CREATE TYPE "public"."institution_schedule_tier" AS ENUM (
    'ngo_internal',
    'civic_weekly',
    'regional_seasonal',
    'cosmological_yearly'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.institution_baseline_unit
DO $$ BEGIN
  CREATE TYPE "public"."institution_baseline_unit" AS ENUM (
    'game_day',
    'game_week',
    'game_season',
    'game_year'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.internal_faction_alignment
DO $$ BEGIN
  CREATE TYPE "public"."internal_faction_alignment" AS ENUM (
    'loyal',
    'factional',
    'reformist',
    'schismatic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.faction_tick_attempt_kind
DO $$ BEGIN
  CREATE TYPE "public"."faction_tick_attempt_kind" AS ENUM (
    'expansion',
    'consolidation',
    'defense',
    'withdrawal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.faction_tick_outcome
DO $$ BEGIN
  CREATE TYPE "public"."faction_tick_outcome" AS ENUM (
    'gain',
    'stalemate',
    'setback'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_faction_tick_resolution_properties_delta_ledger_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_faction_tick_resolution_properties_delta_ledger_properties_kind_enum" AS ENUM (
    'scrip',
    'salt_coin'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.commodity_unit
DO $$ BEGIN
  CREATE TYPE "public"."commodity_unit" AS ENUM (
    'kg',
    'barrel',
    'ingot',
    'scrap',
    'bushel',
    'head'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.discovery_channel_kind
DO $$ BEGIN
  CREATE TYPE "public"."discovery_channel_kind" AS ENUM (
    'overheard',
    'witnessed',
    'requested',
    'stumbled',
    'recruited',
    'prophecy'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.collision_pressure_kind
DO $$ BEGIN
  CREATE TYPE "public"."collision_pressure_kind" AS ENUM (
    'want_overlap',
    'knowledge_asymmetry',
    'schedule_conflict',
    'faction_clash'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.cross_plot_resonance_kind
DO $$ BEGIN
  CREATE TYPE "public"."cross_plot_resonance_kind" AS ENUM (
    'shared_constituent',
    'npc_mediated_bleed',
    'faction_mediated_tension',
    'pan_world_echo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.pan_world_hook_kind
DO $$ BEGIN
  CREATE TYPE "public"."pan_world_hook_kind" AS ENUM (
    'name_succession',
    'currency_crisis',
    'doctrinal_drift',
    'counted_imbalance'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_high_engagement_smoothing_properties_smoothing_actions_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_high_engagement_smoothing_properties_smoothing_actions_items_enum" AS ENUM (
    'reduce_resonance_intensity',
    'delay_secondary_plot_pressure',
    'suppress_redundant_information'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.fs_marker_event_kind
DO $$ BEGIN
  CREATE TYPE "public"."fs_marker_event_kind" AS ENUM (
    'item_movement',
    'scheduled_announcement',
    'institutional_act',
    'environmental_change'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.cross_regional_presence_kind
DO $$ BEGIN
  CREATE TYPE "public"."cross_regional_presence_kind" AS ENUM (
    'endemic',
    'migratory',
    'echo',
    'rumor_only'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.social_attack_kind
DO $$ BEGIN
  CREATE TYPE "public"."social_attack_kind" AS ENUM (
    'intimidation',
    'doctrinal_pressure',
    'ledger_revelation',
    'shame',
    'obligation_call',
    'aesthetic_judgment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_social_attack_properties_target_resistance_properties_stat_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_social_attack_properties_target_resistance_properties_stat_enum" AS ENUM (
    'presence',
    'will',
    'mind'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.cosmological_target_kind
DO $$ BEGIN
  CREATE TYPE "public"."cosmological_target_kind" AS ENUM (
    'wraith',
    'haunting',
    'cult',
    'spirit',
    'named_being'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.cosmological_effect_kind
DO $$ BEGIN
  CREATE TYPE "public"."cosmological_effect_kind" AS ENUM (
    'redirect_haunting',
    'transfer_burden',
    'renegotiate_term',
    'summon_substitute'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_cosmological_redirection_properties_effect_duration_properties_unit_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_cosmological_redirection_properties_effect_duration_properties_unit_enum" AS ENUM (
    'game_day',
    'game_week',
    'game_season'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_orthogonalized_subplot_admission_properties_orthogonality_check_properties_blocked_relations_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_orthogonalized_subplot_admission_properties_orthogonality_check_properties_blocked_relations_items_enum" AS ENUM (
    'mirrors',
    'contains'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.personality_archetype
DO $$ BEGIN
  CREATE TYPE "public"."personality_archetype" AS ENUM (
    'marrow_saint',
    'bell_magistrate',
    'venn_hook',
    'butcher_who_repeats',
    'listening_child',
    'closed_books_servitor_operator',
    'aesthete_magistrate',
    'sergeant_of_sanctions',
    'sum_wraith_whisperer',
    'default_militant',
    'scholar_witness',
    'contradiction_bearer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.voice_register_kind
DO $$ BEGIN
  CREATE TYPE "public"."voice_register_kind" AS ENUM (
    'formal',
    'intimate',
    'ceremonial',
    'vernacular',
    'fragmentary',
    'incantatory',
    'clinical'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_slide_trigger_properties_from_archetype_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_slide_trigger_properties_from_archetype_enum" AS ENUM (
    'marrow_saint',
    'bell_magistrate',
    'venn_hook',
    'butcher_who_repeats',
    'listening_child',
    'closed_books_servitor_operator',
    'aesthete_magistrate',
    'sergeant_of_sanctions',
    'sum_wraith_whisperer',
    'default_militant',
    'scholar_witness',
    'contradiction_bearer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_slide_trigger_properties_to_archetype_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_slide_trigger_properties_to_archetype_enum" AS ENUM (
    'marrow_saint',
    'bell_magistrate',
    'venn_hook',
    'butcher_who_repeats',
    'listening_child',
    'closed_books_servitor_operator',
    'aesthete_magistrate',
    'sergeant_of_sanctions',
    'sum_wraith_whisperer',
    'default_militant',
    'scholar_witness',
    'contradiction_bearer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.slide_trigger_kind
DO $$ BEGIN
  CREATE TYPE "public"."slide_trigger_kind" AS ENUM (
    'event_threshold',
    'narrative_beat',
    'relationship_collapse',
    'canon_progression',
    'player_invocation',
    'scene_close'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.fingerprint_waiver_reason
DO $$ BEGIN
  CREATE TYPE "public"."fingerprint_waiver_reason" AS ENUM (
    'constraint_dominant',
    'narrative_silence',
    'substrate_anchor',
    'ritual_prescribed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.skeleton_cache_invalidation_kind
DO $$ BEGIN
  CREATE TYPE "public"."skeleton_cache_invalidation_kind" AS ENUM (
    'ttl',
    'fingerprint_change',
    'manual_purge',
    'session_end',
    'canon_progression'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.subplot_relation_kind
DO $$ BEGIN
  CREATE TYPE "public"."subplot_relation_kind" AS ENUM (
    'contains',
    'blocks',
    'enables',
    'mirrors',
    'subplot_of'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_concealment_policy_properties_conceal_from_archetypes_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_concealment_policy_properties_conceal_from_archetypes_items_enum" AS ENUM (
    'marrow_saint',
    'bell_magistrate',
    'venn_hook',
    'butcher_who_repeats',
    'listening_child',
    'closed_books_servitor_operator',
    'aesthete_magistrate',
    'sergeant_of_sanctions',
    'sum_wraith_whisperer',
    'default_militant',
    'scholar_witness',
    'contradiction_bearer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.concealment_reveal_trigger_kind
DO $$ BEGIN
  CREATE TYPE "public"."concealment_reveal_trigger_kind" AS ENUM (
    'skill_check',
    'narrative_beat',
    'canon_progression',
    'ledger_audit',
    'ritual_performance',
    'force_revelation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.concealment_premature_reveal_penalty
DO $$ BEGIN
  CREATE TYPE "public"."concealment_premature_reveal_penalty" AS ENUM (
    'none',
    'relationship_damage',
    'faction_consequence',
    'canon_event',
    'ledger_record'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.shaping_operator_kind
DO $$ BEGIN
  CREATE TYPE "public"."shaping_operator_kind" AS ENUM (
    'amplify',
    'attenuate',
    'invert',
    'fragment',
    'euphemize',
    'literalize'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_shaping_operator_properties_applies_when_intermediary_archetype_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_shaping_operator_properties_applies_when_intermediary_archetype_enum" AS ENUM (
    'marrow_saint',
    'bell_magistrate',
    'venn_hook',
    'butcher_who_repeats',
    'listening_child',
    'closed_books_servitor_operator',
    'aesthete_magistrate',
    'sergeant_of_sanctions',
    'sum_wraith_whisperer',
    'default_militant',
    'scholar_witness',
    'contradiction_bearer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.third_party_document_kind
DO $$ BEGIN
  CREATE TYPE "public"."third_party_document_kind" AS ENUM (
    'letter',
    'ledger',
    'broadsheet',
    'inscription',
    'petition',
    'sermon',
    'marginalia'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_archetype_lock_properties_permitted_archetypes_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_archetype_lock_properties_permitted_archetypes_items_enum" AS ENUM (
    'marrow_saint',
    'bell_magistrate',
    'venn_hook',
    'butcher_who_repeats',
    'listening_child',
    'closed_books_servitor_operator',
    'aesthete_magistrate',
    'sergeant_of_sanctions',
    'sum_wraith_whisperer',
    'default_militant',
    'scholar_witness',
    'contradiction_bearer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_archetype_lock_properties_forbidden_archetypes_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_archetype_lock_properties_forbidden_archetypes_items_enum" AS ENUM (
    'marrow_saint',
    'bell_magistrate',
    'venn_hook',
    'butcher_who_repeats',
    'listening_child',
    'closed_books_servitor_operator',
    'aesthete_magistrate',
    'sergeant_of_sanctions',
    'sum_wraith_whisperer',
    'default_militant',
    'scholar_witness',
    'contradiction_bearer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_world_time_properties_tide_phase_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_world_time_properties_tide_phase_enum" AS ENUM (
    'low',
    'rising',
    'high',
    'falling',
    'still'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_hit_dice_entry_properties_die_size_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_hit_dice_entry_properties_die_size_enum" AS ENUM (
    '6',
    '8',
    '10',
    '12'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_alignment_descriptor_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_alignment_descriptor_enum" AS ENUM (
    'LG',
    'NG',
    'CG',
    'LN',
    'N',
    'CN',
    'LE',
    'NE',
    'CE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_regional_pack_ref_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_regional_pack_ref_properties_kind_enum" AS ENUM (
    'conditions',
    'currencies',
    'magic_traditions',
    'pantheon',
    'items',
    'recipes',
    'factions',
    'deities',
    'litanies',
    'marginalia',
    'substrate',
    'loot_tables',
    'materials',
    'cult_institutions',
    'environment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_attunement_slot_properties_status_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_attunement_slot_properties_status_enum" AS ENUM (
    'empty',
    'attuned',
    'sworn',
    'cursed',
    'scarred'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_attunement_slot_properties_ceremony_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_attunement_slot_properties_ceremony_kind_enum" AS ENUM (
    'short_rest',
    'salt_immersion',
    'sworn_oath',
    'blood_consecration',
    'involuntary_curse'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_attunement_slot_properties_break_conditions_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_attunement_slot_properties_break_conditions_items_enum" AS ENUM (
    'dis-engagement',
    'trauma',
    'competing_claim',
    'remove_curse',
    'canon_event'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_path_ledger_entry_properties_domain_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_path_ledger_entry_properties_domain_enum" AS ENUM (
    'law',
    'faith',
    'mercy',
    'cruelty',
    'promise',
    'oath',
    'debt',
    'ruin',
    'creation',
    'loyalty',
    'betrayal',
    'curiosity',
    'silence',
    'hubris',
    'tithe',
    'tapu_violation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_canon_progression_entry_properties_stat_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_canon_progression_entry_properties_stat_enum" AS ENUM (
    'authority',
    'ruin',
    'creation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_inventory_entry_properties_equipped_slot_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_inventory_entry_properties_equipped_slot_enum" AS ENUM (
    'main_hand',
    'off_hand',
    'two_handed',
    'armor',
    'shield',
    'helm',
    'cloak',
    'boots',
    'gloves',
    'ring_1',
    'ring_2',
    'amulet',
    'belt'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_inventory_entry_properties_soul_instance_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_inventory_entry_properties_soul_instance_properties_kind_enum" AS ENUM (
    'witness',
    'spirit',
    'fragment',
    'echo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_inventory_entry_properties_soul_instance_properties_speaks_threshold_properties_meter_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_inventory_entry_properties_soul_instance_properties_speaks_threshold_properties_meter_enum" AS ENUM (
    'fatigue',
    'clarity',
    'debt',
    'notice',
    'corruption'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_inventory_entry_properties_memory_instance_properties_readable_via_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_inventory_entry_properties_memory_instance_properties_readable_via_items_enum" AS ENUM (
    'legend_lore_spell',
    'speak_with_dead_on_origin',
    'imposed_unrecord_inverted',
    'alchemy_purgative_inversion',
    'sense_check'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_known_spell_entry_properties_source_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_known_spell_entry_properties_source_enum" AS ENUM (
    'class',
    'race',
    'feat',
    'item',
    'pact',
    'canon_event'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_body_modifications_block_properties_grafts_items_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_body_modifications_block_properties_grafts_items_properties_kind_enum" AS ENUM (
    'brass_spinal_brace',
    'bone_lattice_lung',
    'salt_iron_jaw_brace',
    'marrow_wax_eye',
    'drowned_amber_hand',
    'bell_iron_chest_plate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_body_modifications_block_properties_symbionts_items_properties_host_relationship_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_body_modifications_block_properties_symbionts_items_properties_host_relationship_enum" AS ENUM (
    'parasitic',
    'commensal',
    'mutualist',
    'contested'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_validator_stage_result_properties_stage_id_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_validator_stage_result_properties_stage_id_enum" AS ENUM (
    'stage_1_input',
    'stage_2_rules',
    'stage_3_canon_consistency',
    'stage_4_canon_progression',
    'stage_5_contradiction_check',
    'stage_6_content_boundary'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.defs_world_pulse_ticker_item_properties_ticker_class_enum
DO $$ BEGIN
  CREATE TYPE "public"."defs_world_pulse_ticker_item_properties_ticker_class_enum" AS ENUM (
    'faction_action',
    'rumor',
    'weather',
    'rite',
    'canon_event'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_campaign_properties_mode_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_campaign_properties_mode_enum" AS ENUM (
    'standard',
    'immersive',
    'tactical',
    'hardcore',
    'creator_debug'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_campaign_properties_status_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_campaign_properties_status_enum" AS ENUM (
    'active',
    'dead',
    'legacy',
    'ended'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_campaign_properties_leveling_mode_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_campaign_properties_leveling_mode_enum" AS ENUM (
    'xp',
    'milestone'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_campaign_properties_former_party_members_items_properties_departure_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_campaign_properties_former_party_members_items_properties_departure_kind_enum" AS ENUM (
    'dismissed',
    'betrayed',
    'died',
    'recalled_by_faction',
    'departed_X12',
    'departed_X13',
    'departed_X14',
    'departed_X15',
    'departed_X16',
    'obligation_expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_campaign_properties_accessibility_settings_properties_color_blind_palette_id_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_campaign_properties_accessibility_settings_properties_color_blind_palette_id_enum" AS ENUM (
    'deuteranopia',
    'protanopia',
    'tritanopia'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_campaign_properties_accessibility_settings_properties_adaptive_prose_density_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_campaign_properties_accessibility_settings_properties_adaptive_prose_density_enum" AS ENUM (
    'compact',
    'standard',
    'expanded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_campaign_properties_ui_preference_state_properties_tooltip_density_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_campaign_properties_ui_preference_state_properties_tooltip_density_enum" AS ENUM (
    'minimal',
    'standard',
    'verbose'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_player_properties_save_proficiencies_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_player_properties_save_proficiencies_items_enum" AS ENUM (
    'str',
    'dex',
    'con',
    'int',
    'wis',
    'cha'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_player_properties_death_state_properties_ending_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_player_properties_death_state_properties_ending_kind_enum" AS ENUM (
    'physical_death',
    'X12_apotheosis',
    'X13_unmaking',
    'X14_withdrawal',
    'X15_pact_collection',
    'X16_corruption_transformation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_player_properties_knowledge_state_properties_locations_known_additional_properties_properties_fog_state_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_player_properties_knowledge_state_properties_locations_known_additional_properties_properties_fog_state_enum" AS ENUM (
    'unknown',
    'glimpsed',
    'visited',
    'known'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_player_properties_knowledge_posture_history_items_properties_posture_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_player_properties_knowledge_posture_history_items_properties_posture_enum" AS ENUM (
    'mechanical',
    'interpretive',
    'performative',
    'credulous',
    'skeptical'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_player_properties_knowledge_posture_history_items_properties_switched_by_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_player_properties_knowledge_posture_history_items_properties_switched_by_enum" AS ENUM (
    'player_explicit',
    'consequence',
    'narrative_trigger'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_event_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_event_properties_kind_enum" AS ENUM (
    'physical_conflict',
    'social_conflict',
    'faith_conflict',
    'economic_conflict',
    'memory_conflict',
    'reality_pressure',
    'discovery',
    'transformation',
    'deicide',
    'deity_birth',
    'regional_apostasy',
    'substrate_exposure',
    'rite',
    'oath_made',
    'oath_broken',
    'oath_fulfilled',
    'craft',
    'salvage',
    'loot_taken',
    'loot_refused',
    'notice_convergence',
    'other',
    'notice_threshold_cross',
    'body_modification_applied',
    'body_modification_removed',
    'adaptagen_consumed',
    'mutation_canon_event'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_event_properties_canon_progression_credit_items_properties_stat_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_event_properties_canon_progression_credit_items_properties_stat_enum" AS ENUM (
    'authority',
    'ruin',
    'creation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_event_properties_combat_state_properties_initiative_order_items_properties_actor_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_event_properties_combat_state_properties_initiative_order_items_properties_actor_kind_enum" AS ENUM (
    'player',
    'companion',
    'npc',
    'creature',
    'environment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_event_properties_diegetic_elements_items_properties_element_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_event_properties_diegetic_elements_items_properties_element_kind_enum" AS ENUM (
    'fountain',
    'bell',
    'ledger',
    'tithing_cup',
    'vials_shelf',
    'bell_forge',
    'marrow_wax_candle',
    'salt_pan',
    'litany_card'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_faction_properties_faction_obligation_state_per_companion_additional_properties_properties_obligation_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_faction_properties_faction_obligation_state_per_companion_additional_properties_properties_obligation_kind_enum" AS ENUM (
    'loan',
    'contract',
    'gift_debt',
    'tithe',
    'vigil'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_faction_properties_faction_obligation_state_per_companion_additional_properties_properties_violation_state_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_faction_properties_faction_obligation_state_per_companion_additional_properties_properties_violation_state_enum" AS ENUM (
    'honored',
    'drifting',
    'violated'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_npc_properties_tracker_state_properties_tracker_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_npc_properties_tracker_state_properties_tracker_kind_enum" AS ENUM (
    'observer',
    'agent_provocateur',
    'binder',
    'executioner'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_npc_properties_witness_history_items_properties_perception_quality_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_npc_properties_witness_history_items_properties_perception_quality_enum" AS ENUM (
    'direct',
    'overheard',
    'inferred',
    'told_about'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.npc_memory_archetype
DO $$ BEGIN
  CREATE TYPE "public"."npc_memory_archetype" AS ENUM (
    'peasant',
    'soldier',
    'scholar',
    'devout',
    'magistrate',
    'broker',
    'aspirant_divine',
    'child',
    'contradiction_bearing'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_belief_properties_truth_status_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_belief_properties_truth_status_enum" AS ENUM (
    'true',
    'false',
    'partial',
    'unknown',
    'contested'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_consequence_properties_trigger_type_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_consequence_properties_trigger_type_enum" AS ENUM (
    'time',
    'condition',
    'threshold',
    'random',
    'discovery'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_consequence_properties_status_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_consequence_properties_status_enum" AS ENUM (
    'pending',
    'triggered',
    'resolved',
    'failed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_state_diff_properties_changes_items_properties_operation_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_state_diff_properties_changes_items_properties_operation_enum" AS ENUM (
    'set',
    'increment',
    'append',
    'remove',
    'replace'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_contradiction_ledger_entry_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_contradiction_ledger_entry_properties_kind_enum" AS ENUM (
    'race_extinction',
    'deity_death',
    'deity_birth',
    'race_emergence',
    'region_transformation',
    'rumor_vs_canon',
    'memory_vs_record',
    'unmade_event',
    'named_unnamed',
    'substrate_exposed',
    'substrate_dispersed',
    'other',
    'companion_memory_disagreement'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_contradiction_ledger_entry_properties_surfacing_state_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_contradiction_ledger_entry_properties_surfacing_state_enum" AS ENUM (
    'dormant',
    'surfacing_to_player',
    'resolved'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_class_properties_class_id_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_class_properties_class_id_enum" AS ENUM (
    'barbarian',
    'bard',
    'cleric',
    'druid',
    'fighter',
    'monk',
    'paladin',
    'ranger',
    'rogue',
    'sorcerer',
    'warlock',
    'wizard'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_class_properties_hit_die_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_class_properties_hit_die_enum" AS ENUM (
    '6',
    '8',
    '10',
    '12'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_class_properties_primary_abilities_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_class_properties_primary_abilities_items_enum" AS ENUM (
    'str',
    'dex',
    'con',
    'int',
    'wis',
    'cha'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_class_properties_save_proficiencies_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_class_properties_save_proficiencies_items_enum" AS ENUM (
    'str',
    'dex',
    'con',
    'int',
    'wis',
    'cha'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_class_properties_custom_stat_hooks_items_properties_modifier_source_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_class_properties_custom_stat_hooks_items_properties_modifier_source_enum" AS ENUM (
    'body',
    'grace',
    'sense',
    'mind',
    'will',
    'presence',
    'authority',
    'ruin',
    'creation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_class_properties_spellcasting_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_class_properties_spellcasting_kind_enum" AS ENUM (
    'none',
    'full',
    'half',
    'third',
    'pact'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_race_properties_size_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_race_properties_size_enum" AS ENUM (
    'tiny',
    'small',
    'medium',
    'large'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_race_properties_world_mutation_state_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_race_properties_world_mutation_state_enum" AS ENUM (
    'baseline',
    'emergent',
    'drift_subrace',
    'endangered',
    'extinct'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_subrace_properties_world_mutation_state_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_subrace_properties_world_mutation_state_enum" AS ENUM (
    'baseline',
    'emergent',
    'drift_subrace',
    'endangered',
    'extinct'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_deity_properties_domains_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_deity_properties_domains_items_enum" AS ENUM (
    'knowledge',
    'life',
    'light',
    'nature',
    'tempest',
    'trickery',
    'war',
    'death'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_deity_properties_origin_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_deity_properties_origin_enum" AS ENUM (
    'baseline',
    'regional',
    'heretical_reading',
    'emergent',
    'fragmentary',
    'dead',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_deity_properties_status_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_deity_properties_status_enum" AS ENUM (
    'worshipped',
    'dormant',
    'sleeping',
    'dead',
    'newborn',
    'contested'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_deity_properties_succession_rule_properties_on_death_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_deity_properties_succession_rule_properties_on_death_enum" AS ENUM (
    'void',
    'successor_appointed',
    'domain_redistributed',
    'fragment_into_lesser',
    'no_successor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_deity_properties_mythological_substrate_refs_items_properties_reading_mode_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_deity_properties_mythological_substrate_refs_items_properties_reading_mode_enum" AS ENUM (
    'inherit',
    'distort',
    'deny',
    'accidental'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_pantheon_properties_status_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_pantheon_properties_status_enum" AS ENUM (
    'active',
    'regional',
    'heretical',
    'dormant',
    'extinct'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_pantheon_properties_regional_configuration_properties_worshipped_deities_items_properties_reading_mode_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_pantheon_properties_regional_configuration_properties_worshipped_deities_items_properties_reading_mode_enum" AS ENUM (
    'orthodox',
    'heretical_reading',
    'distorted',
    'silent_majority',
    'suppressed_minority'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_pantheon_properties_regional_configuration_properties_heretical_reading_patterns_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_pantheon_properties_regional_configuration_properties_heretical_reading_patterns_items_enum" AS ENUM (
    'demoted_mother',
    'silent_twin',
    'buried_domain',
    'forgotten_dawn',
    'unnamed_among_names',
    'recanted_heresy'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_pantheon_properties_faith_meter_negative_value_ui_treatment_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_pantheon_properties_faith_meter_negative_value_ui_treatment_enum" AS ENUM (
    'hidden_in_ui',
    'shown_as_apostate',
    'shown_as_explicit_negative'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_spell_properties_school_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_spell_properties_school_enum" AS ENUM (
    'abjuration',
    'conjuration',
    'divination',
    'enchantment',
    'evocation',
    'illusion',
    'necromancy',
    'transmutation',
    'regional'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_spell_properties_save_type_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_spell_properties_save_type_enum" AS ENUM (
    'str',
    'dex',
    'con',
    'int',
    'wis',
    'cha'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_spell_properties_attack_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_spell_properties_attack_kind_enum" AS ENUM (
    'melee',
    'ranged'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_spell_properties_subschool_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_spell_properties_subschool_enum" AS ENUM (
    'forbiddings',
    'witness_spells',
    'listening',
    'marking_spells',
    'naming_spells',
    'contradiction_burst',
    'resonance',
    'unbecoming',
    'memory_spells',
    'echoes',
    'lattice_shifts',
    'inversions',
    'half_summon',
    'borrowed_things'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_condition_properties_scope_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_condition_properties_scope_enum" AS ENUM (
    'universal',
    'regional'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_condition_properties_ui_category_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_condition_properties_ui_category_enum" AS ENUM (
    'metaphysical',
    'social_legal',
    'physical',
    'lethal_tracking'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_type_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_type_enum" AS ENUM (
    'weapon',
    'armor',
    'shield',
    'ammunition',
    'tool',
    'trinket',
    'consumable',
    'wondrous',
    'book',
    'key',
    'currency_token'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_rarity_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_rarity_enum" AS ENUM (
    'common',
    'uncommon',
    'rare',
    'very_rare',
    'legendary',
    'artifact'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_identification_requires_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_identification_requires_items_enum" AS ENUM (
    'time_1hr',
    'identify_spell',
    'contemplation',
    'canon_event',
    'quest'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_attunement_ceremony_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_attunement_ceremony_enum" AS ENUM (
    'short_rest',
    'salt_immersion',
    'sworn_oath',
    'blood_consecration'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_equip_slot_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_equip_slot_enum" AS ENUM (
    'main_hand',
    'off_hand',
    'two_handed',
    'armor',
    'shield',
    'helm',
    'cloak',
    'boots',
    'gloves',
    'ring',
    'amulet',
    'belt'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_tinting_class_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_tinting_class_enum" AS ENUM (
    'vellum_mundane',
    'brass_greywake',
    'tide_bloom_metaphysical',
    'verdigris_consumable',
    'drowned_red_cursed',
    'bone_relic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_weapon_properties_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_weapon_properties_items_enum" AS ENUM (
    'finesse',
    'light',
    'heavy',
    'two_handed',
    'versatile',
    'reach',
    'thrown',
    'loading',
    'ammunition',
    'special',
    'ritual',
    'salt_marked',
    'witness_marked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_effects_on_attune_structured_items_properties_effect_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_effects_on_attune_structured_items_properties_effect_kind_enum" AS ENUM (
    'stat_modifier',
    'meter_delta',
    'condition_apply',
    'condition_remove',
    'spell_cast',
    'save_advantage',
    'save_disadvantage',
    'damage_resist',
    'damage_vulnerability',
    'skill_bonus',
    'auto_succeed',
    'auto_fail',
    'trigger_event',
    'set_flag'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_effects_on_equip_structured_items_properties_effect_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_effects_on_equip_structured_items_properties_effect_kind_enum" AS ENUM (
    'stat_modifier',
    'meter_delta',
    'condition_apply',
    'condition_remove',
    'spell_cast',
    'save_advantage',
    'save_disadvantage',
    'damage_resist',
    'damage_vulnerability',
    'skill_bonus',
    'auto_succeed',
    'auto_fail',
    'trigger_event',
    'set_flag'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_effects_on_use_structured_items_properties_effect_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_effects_on_use_structured_items_properties_effect_kind_enum" AS ENUM (
    'stat_modifier',
    'meter_delta',
    'condition_apply',
    'condition_remove',
    'spell_cast',
    'save_advantage',
    'save_disadvantage',
    'damage_resist',
    'damage_vulnerability',
    'skill_bonus',
    'auto_succeed',
    'auto_fail',
    'trigger_event',
    'set_flag'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_witness_payload_properties_soul_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_witness_payload_properties_soul_kind_enum" AS ENUM (
    'fragment',
    'echo',
    'transferred',
    'bound',
    'composed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_adaptagen_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_adaptagen_kind_enum" AS ENUM (
    'mutagen',
    'stabilizer',
    'reverser',
    'binding_serum',
    'sleeping_grafts'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_properties_evolution_ledger_items_properties_evolution_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_properties_evolution_ledger_items_properties_evolution_kind_enum" AS ENUM (
    'rust',
    'polish',
    'patina',
    'soul_thickening',
    'ritual_brightening',
    'decay'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_one_of_properties_subtype_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_one_of_properties_subtype_enum" AS ENUM (
    'simple_melee',
    'simple_ranged',
    'martial_melee',
    'martial_ranged'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_item_one_of_properties_damage_type_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_item_one_of_properties_damage_type_enum" AS ENUM (
    'bludgeoning',
    'piercing',
    'slashing',
    'fire',
    'cold',
    'lightning',
    'thunder',
    'force',
    'radiant',
    'necrotic',
    'psychic',
    'acid',
    'poison'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_recipe_properties_track_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_recipe_properties_track_enum" AS ENUM (
    'forging',
    'tinkering',
    'alchemy'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_recipe_properties_ability_check_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_recipe_properties_ability_check_enum" AS ENUM (
    'str',
    'dex',
    'con',
    'int',
    'wis',
    'cha'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_region_properties_status_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_region_properties_status_enum" AS ENUM (
    'active',
    'starting',
    'transformed',
    'lost',
    'dream',
    'abyssal',
    'future'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_region_properties_heretical_reading_pattern_refs_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_region_properties_heretical_reading_pattern_refs_items_enum" AS ENUM (
    'demoted_mother',
    'silent_twin',
    'buried_domain',
    'forgotten_dawn',
    'unnamed_among_names',
    'recanted_heresy'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_regional_pack_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_regional_pack_properties_kind_enum" AS ENUM (
    'conditions',
    'currencies',
    'magic_traditions',
    'pantheon',
    'items',
    'recipes',
    'factions',
    'deities',
    'litanies',
    'marginalia',
    'substrate',
    'loot_tables',
    'materials',
    'cult_institutions',
    'environment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_mythological_substrate_entry_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_mythological_substrate_entry_properties_kind_enum" AS ENUM (
    'pattern',
    'proto_deity',
    'era_marker',
    'fragment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_mythological_substrate_entry_properties_status_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_mythological_substrate_entry_properties_status_enum" AS ENUM (
    'dormant',
    'exposed',
    'bound',
    'dispersed',
    'renamed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_loot_table_properties_scope_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_loot_table_properties_scope_enum" AS ENUM (
    'carried',
    'hidden',
    'yielded',
    'canon_event_drop'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_loot_table_properties_rolls_items_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_loot_table_properties_rolls_items_properties_kind_enum" AS ENUM (
    'guaranteed',
    'weighted',
    'memory'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_loot_table_properties_template_grammar_version_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_loot_table_properties_template_grammar_version_enum" AS ENUM (
    'v0.5'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_material_properties_category_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_material_properties_category_enum" AS ENUM (
    'material_metal',
    'material_stone',
    'material_wood',
    'material_fiber',
    'material_reagent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_material_properties_tinting_class_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_material_properties_tinting_class_enum" AS ENUM (
    'vellum_mundane',
    'brass_greywake',
    'tide_bloom_metaphysical',
    'verdigris_consumable',
    'drowned_red_cursed',
    'bone_relic',
    'cursed_substrate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_material_properties_witness_payload_one_of_properties_carries_soul_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_material_properties_witness_payload_one_of_properties_carries_soul_kind_enum" AS ENUM (
    'witness',
    'spirit',
    'fragment',
    'echo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_material_properties_witness_payload_one_of_properties_provenance_chain_items_properties_transfer_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_material_properties_witness_payload_one_of_properties_provenance_chain_items_properties_transfer_kind_enum" AS ENUM (
    'gifted',
    'stolen',
    'won',
    'inherited',
    'harvested',
    'salvaged'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_material_properties_tier_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_material_properties_tier_enum" AS ENUM (
    'T1',
    'T2',
    'T3',
    'T4'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_material_properties_decay_states_items_properties_decay_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_material_properties_decay_states_items_properties_decay_kind_enum" AS ENUM (
    'region_locked',
    'time_locked',
    'ritual_locked',
    'concentration_locked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_material_properties_craft_tracks_eligible_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_material_properties_craft_tracks_eligible_items_enum" AS ENUM (
    'forging',
    'alchemy',
    'tinkering',
    'scribing',
    'ritual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_material_properties_acquisition_method_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_material_properties_acquisition_method_enum" AS ENUM (
    'purchased',
    'gifted_only',
    'harvested',
    'quest_reward',
    'canon_event_only',
    'crafted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_regional_currency_state_properties_crisis_intensity_modifier_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_regional_currency_state_properties_crisis_intensity_modifier_enum" AS ENUM (
    '1',
    '0.85',
    '0.6',
    '0.4',
    '1.2',
    '0.05'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_regional_currency_state_properties_crisis_label_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_regional_currency_state_properties_crisis_label_enum" AS ENUM (
    'calm',
    'rumored_crisis',
    'declared_crisis',
    'acute_crisis',
    'resolved',
    'collapsed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_cult_institution_properties_doctrines_items_properties_faith_meter_aligned_properties_alignment_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_cult_institution_properties_doctrines_items_properties_faith_meter_aligned_properties_alignment_kind_enum" AS ENUM (
    'tenets_aligned',
    'tenets_violating'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_cult_institution_properties_rite_kinds_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_cult_institution_properties_rite_kinds_items_enum" AS ENUM (
    'daily',
    'weekly',
    'seasonal',
    'lunar',
    'tidal',
    'canon_event'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_creature_material_properties_harvest_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_creature_material_properties_harvest_kind_enum" AS ENUM (
    'hide',
    'blood',
    'bone',
    'scale',
    'tooth',
    'organ',
    'feather',
    'venom',
    'ichor',
    'shell'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_creature_material_properties_harvest_skill_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_creature_material_properties_harvest_skill_enum" AS ENUM (
    'body',
    'grace',
    'sense',
    'mind',
    'will'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_creature_material_properties_tier_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_creature_material_properties_tier_enum" AS ENUM (
    'T1',
    'T2',
    'T3',
    'T4'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_companion_properties_recruitment_path_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_companion_properties_recruitment_path_enum" AS ENUM (
    'quest',
    'bond',
    'faction_mediated',
    'canon_event_emergent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_companion_properties_terms_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_companion_properties_terms_properties_kind_enum" AS ENUM (
    'gift',
    'loan',
    'contract'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_companion_properties_party_tier_state_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_companion_properties_party_tier_state_enum" AS ENUM (
    'with_player',
    'separately_acting',
    'dismissed_or_resting'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_agent_envelope_properties_agent_name_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_agent_envelope_properties_agent_name_enum" AS ENUM (
    'input_interpreter',
    'rules_agent',
    'npc_evaluator',
    'faction_evaluator',
    'domain_evaluator',
    'world_director',
    'dice_resolution',
    'state_manager',
    'narrator',
    'content_boundary_validator'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_location_properties_fog_of_knowledge_state_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_location_properties_fog_of_knowledge_state_enum" AS ENUM (
    'unknown',
    'glimpsed',
    'visited',
    'known'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_travel_route_properties_traversal_risk_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_travel_route_properties_traversal_risk_enum" AS ENUM (
    'safe',
    'watched',
    'dangerous',
    'deadly'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_conflict_envelope_properties_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_conflict_envelope_properties_kind_enum" AS ENUM (
    'physical',
    'social',
    'magical',
    'ritual',
    'economic',
    'factional',
    'mythological',
    'metaphysical'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_portrait_layer_definition_properties_layer_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_portrait_layer_definition_properties_layer_kind_enum" AS ENUM (
    'race_silhouette',
    'class_glyph',
    'alignment_tint',
    'condition_overlay',
    'body_mod_overlay',
    'curated_event_overlay'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_imposed_spell_properties_school_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_imposed_spell_properties_school_enum" AS ENUM (
    'abjuration',
    'conjuration',
    'divination',
    'enchantment',
    'evocation',
    'illusion',
    'necromancy',
    'transmutation',
    'regional'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_imposed_spell_properties_save_type_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_imposed_spell_properties_save_type_enum" AS ENUM (
    'str',
    'dex',
    'con',
    'int',
    'wis',
    'cha'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_imposed_spell_properties_attack_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_imposed_spell_properties_attack_kind_enum" AS ENUM (
    'melee',
    'ranged'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_imposed_spell_properties_subschool_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_imposed_spell_properties_subschool_enum" AS ENUM (
    'forbiddings',
    'witness_spells',
    'listening',
    'marking_spells',
    'naming_spells',
    'contradiction_burst',
    'resonance',
    'unbecoming',
    'memory_spells',
    'echoes',
    'lattice_shifts',
    'inversions',
    'half_summon',
    'borrowed_things'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_litany_properties_schema_version_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_litany_properties_schema_version_enum" AS ENUM (
    'v1',
    'v2'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_marginalia_properties_trigger_kind_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_marginalia_properties_trigger_kind_enum" AS ENUM (
    'canon_progression_event',
    'state_threshold',
    'item_acquired',
    'item_event',
    'location_entered',
    'npc_interaction',
    'npc_speech_anomaly',
    'scene_end',
    'rite',
    'manual',
    'faction_action',
    'social_conflict',
    'weather_omen',
    'time_progression'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_marginalia_properties_display_context_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_marginalia_properties_display_context_enum" AS ENUM (
    'player_journal_at_end_of_scene',
    'inline_in_narration',
    'inline_during_scene',
    'inline_at_scene_open',
    'inline_at_scene_close',
    'tome_unlock',
    'world_pulse_ticker'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_marginalia_properties_schema_version_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_marginalia_properties_schema_version_enum" AS ENUM (
    'v1',
    'v2'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_opex_event_properties_agent_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_opex_event_properties_agent_enum" AS ENUM (
    'narrator',
    'state_manager',
    'validator_input',
    'validator_rules',
    'validator_consistency',
    'validator_progression',
    'validator_contradiction',
    'validator_boundary',
    'form_of_ending',
    'postcard',
    'voice_evaluator',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_opex_event_properties_tier_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_opex_event_properties_tier_enum" AS ENUM (
    'premium',
    'mid',
    'cheap'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_opex_event_properties_fallback_reason_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_opex_event_properties_fallback_reason_enum" AS ENUM (
    'daily_cap_hit',
    'session_budget_exhausted',
    'primary_failure',
    'manual_override',
    'tier_policy_default'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_model_tier_policy_properties_agent_tiers_pattern_properties_^[a-z_]+$_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_model_tier_policy_properties_agent_tiers_pattern_properties_^[a-z_]+$_enum" AS ENUM (
    'premium',
    'mid',
    'cheap'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.institutional_memory_archetype
DO $$ BEGIN
  CREATE TYPE "public"."institutional_memory_archetype" AS ENUM (
    'devout',
    'magistrate',
    'scholar',
    'broker'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.quest_archetype
DO $$ BEGIN
  CREATE TYPE "public"."quest_archetype" AS ENUM (
    'want_collision',
    'institutional_failure',
    'faction_reach_attempt',
    'rumor_investigation',
    'discovery',
    'succession',
    'doctrinal',
    'economic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.quest_closing_state
DO $$ BEGIN
  CREATE TYPE "public"."quest_closing_state" AS ENUM (
    'open',
    'active',
    'completed_success',
    'completed_betrayal',
    'completed_walked',
    'expired',
    'failed',
    'deferred'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.plot_current_act
DO $$ BEGIN
  CREATE TYPE "public"."plot_current_act" AS ENUM (
    'setup',
    'confrontation',
    'resolution'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.spine_visibility
DO $$ BEGIN
  CREATE TYPE "public"."spine_visibility" AS ENUM (
    'hidden',
    'suggested',
    'visible',
    'named',
    'central'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.plot_closing_state
DO $$ BEGIN
  CREATE TYPE "public"."plot_closing_state" AS ENUM (
    'open',
    'active_setup',
    'active_confrontation',
    'active_resolution',
    'closed_clean',
    'closed_messy',
    'closed_kinetic',
    'closed_silenced',
    'closed_failure_state'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_surfacing_threshold_config_properties_channel_priority_items_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_surfacing_threshold_config_properties_channel_priority_items_enum" AS ENUM (
    'overheard',
    'witnessed',
    'requested',
    'stumbled',
    'recruited',
    'prophecy'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.trade_route_active_status
DO $$ BEGIN
  CREATE TYPE "public"."trade_route_active_status" AS ENUM (
    'open',
    'disrupted',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.institution_response_resolution_kind
DO $$ BEGIN
  CREATE TYPE "public"."institution_response_resolution_kind" AS ENUM (
    'decisive',
    'deferred',
    'escalated',
    'ignored'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.failure_state_trigger
DO $$ BEGIN
  CREATE TYPE "public"."failure_state_trigger" AS ENUM (
    'spine_question_unanswered',
    'central_npc_lost',
    'central_institution_collapsed',
    'pressure_overrun',
    'player_withdrawal',
    'rival_plot_displacement'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.failure_state_cosmological_reach
DO $$ BEGIN
  CREATE TYPE "public"."failure_state_cosmological_reach" AS ENUM (
    'local',
    'regional',
    'pan_world',
    'cosmological'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.failure_state_actor_kind
DO $$ BEGIN
  CREATE TYPE "public"."failure_state_actor_kind" AS ENUM (
    'npc',
    'faction',
    'institution',
    'deity'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.failure_state_branch_state
DO $$ BEGIN
  CREATE TYPE "public"."failure_state_branch_state" AS ENUM (
    'pending',
    'armed',
    'fired',
    'averted',
    'resolved'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.creature_provenance
DO $$ BEGIN
  CREATE TYPE "public"."creature_provenance" AS ENUM (
    'mundane',
    'drowned_church',
    'unnamed_touched',
    'deep_world',
    'substrate_emanation',
    'constructed',
    'wraith_class'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.creature_tier
DO $$ BEGIN
  CREATE TYPE "public"."creature_tier" AS ENUM (
    'nuisance',
    'scenery',
    'named',
    'boss',
    'cosmological'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.creature_action_kind
DO $$ BEGIN
  CREATE TYPE "public"."creature_action_kind" AS ENUM (
    'melee',
    'ranged',
    'spell',
    'special',
    'reaction'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.voice_segment_trigger
DO $$ BEGIN
  CREATE TYPE "public"."voice_segment_trigger" AS ENUM (
    'scene_open',
    'scene_close',
    'topic_raised',
    'secret_pressured',
    'rumor_referenced',
    'canon_event_witnessed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.schemas_prompt_skeleton_properties_schema_version_enum
DO $$ BEGIN
  CREATE TYPE "public"."schemas_prompt_skeleton_properties_schema_version_enum" AS ENUM (
    'v1'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.info_class
DO $$ BEGIN
  CREATE TYPE "public"."info_class" AS ENUM (
    'rumor',
    'fact',
    'prophecy',
    'doctrine',
    'confession',
    'judgment',
    'omen'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- public.information_veracity
DO $$ BEGIN
  CREATE TYPE "public"."information_veracity" AS ENUM (
    'true',
    'false',
    'partial',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

