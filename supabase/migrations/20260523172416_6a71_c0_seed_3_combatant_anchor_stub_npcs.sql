-- ============================================================================
-- Phase 24d / 6a.7.1 C0 — Seed 3 combatant-anchor stub NPCs
-- ============================================================================
-- Per ratified base_npc_id semantic gate response: (b) identity-anchor
-- confirmed. Combatant.base_npc_id is identity-anchor (combat_block jsonb is
-- self-contained stat source); group/cell/faction adversaries need stub
-- NPCs per ADR-018 §C stub-anchor pattern.
--
-- Uses BUG-FIX-2 NPC_STUB_MARKER sentinel-string pattern from
-- packages/persistence/src/naming.ts (NPC_STUB_MARKER =
-- "STUB::AWAITING_NARRATIVE_DEPTH"). Stubs are schema-conformant Bundle A
-- minimum (survive Zod validation); marked with combatant_anchor_only_stub
-- tag for engine + audit filtering.
--
-- 3 STUBS for 6a.7.1 C3 combatants:
--   - npc-glass-tooth-gang-leader      (anchors Glass-Tooth Gang, CMB.I #2)
--   - npc-junior-magistrate-cell-lead  (anchors Aggressive Junior Magistrate Faction, CMB.I #3)
--   - npc-tide-league-defector-spokesperson  (anchors Tide League Defector Cell, CMB.I #6)
--
-- Pre-flight: 7 named NPCs already seeded (Ilyra/Orro/Venn/Listening Child/
-- Butcher/Caleth/Voryn). None map to these group adversaries. Stubs are
-- minimum-shape additions; NOT replacements for canonical NPC authoring.
-- ============================================================================

INSERT INTO "public"."npc" (
  "npc_id", "name", "role", "desire", "fear", "current_plan",
  "want_model", "knowledge_tri_layer", "closing_conditions",
  "memory_archetype", "ambition_tick", "schedule_nesting",
  "stats", "derived_stats", "tags",
  "faction_links", "schema_version"
) VALUES
  (
    'npc-glass-tooth-gang-leader',
    'Glass-Tooth Gang (leader-anchor stub)',
    'STUB::AWAITING_NARRATIVE_DEPTH',
    'STUB::AWAITING_NARRATIVE_DEPTH',
    'STUB::AWAITING_NARRATIVE_DEPTH',
    'STUB::AWAITING_NARRATIVE_DEPTH',
    '{"drive":{"description":"STUB::AWAITING_NARRATIVE_DEPTH","intensity":1,"freshness_decay":0},"barter":[],"kill_for":{"trigger_condition":"STUB::AWAITING_NARRATIVE_DEPTH","threshold":"warning","target_class":"self"},"fear_loss":{"what":"STUB::AWAITING_NARRATIVE_DEPTH","urgency":1,"abandons_drive_if_imminent":false}}'::jsonb,
    '{"knows":[],"says":{"default_policy":"silent"},"believes":[]}'::jsonb,
    '[{"kind":"passover_state","description":"STUB::AWAITING_NARRATIVE_DEPTH","player_reachable":true},{"kind":"death_state","description":"STUB::AWAITING_NARRATIVE_DEPTH","player_reachable":false}]'::jsonb,
    'peasant',
    '{"cadence":"irregular_per_assignment","success_streak":0,"last_attempt":null}'::jsonb,
    '{"local_pattern":{"summary":"STUB::AWAITING_NARRATIVE_DEPTH"},"nested_under_institution_id":"STUB::AWAITING_NARRATIVE_DEPTH","variance_seed":"STUB::AWAITING_NARRATIVE_DEPTH"}'::jsonb,
    '{"body":10,"grace":10,"sense":10,"mind":10,"will":10,"presence":10,"authority":2,"ruin":2,"creation":2}'::jsonb,
    '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}'::jsonb,
    '["combatant_anchor_only_stub", "scenery_tier", "bug_fix_2_sentinel_pattern", "adr_018_section_c", "anchors_combatant_glass_tooth_gang"]'::jsonb,
    '[]'::jsonb,
    'v0.8'
  ),
  (
    'npc-junior-magistrate-cell-lead',
    'Aggressive Junior Magistrate Cell (cell-lead-anchor stub)',
    'STUB::AWAITING_NARRATIVE_DEPTH',
    'STUB::AWAITING_NARRATIVE_DEPTH',
    'STUB::AWAITING_NARRATIVE_DEPTH',
    'STUB::AWAITING_NARRATIVE_DEPTH',
    '{"drive":{"description":"STUB::AWAITING_NARRATIVE_DEPTH","intensity":1,"freshness_decay":0},"barter":[],"kill_for":{"trigger_condition":"STUB::AWAITING_NARRATIVE_DEPTH","threshold":"warning","target_class":"self"},"fear_loss":{"what":"STUB::AWAITING_NARRATIVE_DEPTH","urgency":1,"abandons_drive_if_imminent":false}}'::jsonb,
    '{"knows":[],"says":{"default_policy":"silent"},"believes":[]}'::jsonb,
    '[{"kind":"passover_state","description":"STUB::AWAITING_NARRATIVE_DEPTH","player_reachable":true},{"kind":"death_state","description":"STUB::AWAITING_NARRATIVE_DEPTH","player_reachable":false}]'::jsonb,
    'peasant',
    '{"cadence":"irregular_per_assignment","success_streak":0,"last_attempt":null}'::jsonb,
    '{"local_pattern":{"summary":"STUB::AWAITING_NARRATIVE_DEPTH"},"nested_under_institution_id":"STUB::AWAITING_NARRATIVE_DEPTH","variance_seed":"STUB::AWAITING_NARRATIVE_DEPTH"}'::jsonb,
    '{"body":10,"grace":10,"sense":10,"mind":10,"will":10,"presence":10,"authority":2,"ruin":2,"creation":2}'::jsonb,
    '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}'::jsonb,
    '["combatant_anchor_only_stub", "scenery_tier", "bug_fix_2_sentinel_pattern", "adr_018_section_c", "anchors_combatant_aggressive_junior_magistrate_faction"]'::jsonb,
    '[]'::jsonb,
    'v0.8'
  ),
  (
    'npc-tide-league-defector-spokesperson',
    'Tide League Defector Cell (spokesperson-anchor stub)',
    'STUB::AWAITING_NARRATIVE_DEPTH',
    'STUB::AWAITING_NARRATIVE_DEPTH',
    'STUB::AWAITING_NARRATIVE_DEPTH',
    'STUB::AWAITING_NARRATIVE_DEPTH',
    '{"drive":{"description":"STUB::AWAITING_NARRATIVE_DEPTH","intensity":1,"freshness_decay":0},"barter":[],"kill_for":{"trigger_condition":"STUB::AWAITING_NARRATIVE_DEPTH","threshold":"warning","target_class":"self"},"fear_loss":{"what":"STUB::AWAITING_NARRATIVE_DEPTH","urgency":1,"abandons_drive_if_imminent":false}}'::jsonb,
    '{"knows":[],"says":{"default_policy":"silent"},"believes":[]}'::jsonb,
    '[{"kind":"passover_state","description":"STUB::AWAITING_NARRATIVE_DEPTH","player_reachable":true},{"kind":"death_state","description":"STUB::AWAITING_NARRATIVE_DEPTH","player_reachable":false}]'::jsonb,
    'peasant',
    '{"cadence":"irregular_per_assignment","success_streak":0,"last_attempt":null}'::jsonb,
    '{"local_pattern":{"summary":"STUB::AWAITING_NARRATIVE_DEPTH"},"nested_under_institution_id":"STUB::AWAITING_NARRATIVE_DEPTH","variance_seed":"STUB::AWAITING_NARRATIVE_DEPTH"}'::jsonb,
    '{"body":10,"grace":10,"sense":10,"mind":10,"will":10,"presence":10,"authority":2,"ruin":2,"creation":2}'::jsonb,
    '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}'::jsonb,
    '["combatant_anchor_only_stub", "scenery_tier", "bug_fix_2_sentinel_pattern", "adr_018_section_c", "anchors_combatant_tide_league_defector_cell"]'::jsonb,
    '[]'::jsonb,
    'v0.8'
  )
ON CONFLICT ("npc_id") DO NOTHING;
