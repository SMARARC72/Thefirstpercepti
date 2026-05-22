-- ============================================================================
-- Phase 24d / Session 6a / Phase 6a.4 — NPC seed: Marrow-Saint Ilyra
-- ============================================================================
-- First named NPC per per-NPC commit cadence (Desktop pattern-check after).
-- Per amended PHASE_24D_HANDOFF.md §6a.4 + Discipline 6 (sentinel-string) +
-- Discipline 8 (Belief BUG-FIX-1) + Discipline 2 (roundtrip test fixture).
--
-- Ilyra is the slice apex theological-tier NPC. Full Bundle A REQUIRED stack
-- authored from her runtime narrative (`content/world-data/npcs.json[0]`) +
-- the slice Codex (Marrow-Saint of the Drowned Church; apotheosis-candidate
-- belief; marrow-rendering practice; salt-vow-bound).
--
-- Stats derived per author judgment (no runtime stats existed):
--   custom_stats: body 9, grace 10, sense 12, mind 11, will 14, presence 13,
--                 authority 6, ruin 2, creation 4 (Marrow-Saint profile)
--   derived_stats (translation_rules §1 formula, no race modifier):
--     STR = max(9, 10*0.6) = 9
--     DEX = max(10, 9*0.5) = 10
--     CON = clamp(9*0.8 + 4, 8, 20) = 11
--     INT = mind = 11
--     WIS = sense = 12
--     CHA = max(13, 14*0.7) = 13
--
-- Bundle A REQUIRED stack: all 6 sub-blocks fully populated (NOT sentinel-stub
-- per Discipline 6 — Ilyra is a fully-authored named NPC). closing_conditions
-- ships ≥2 entries; 1 player_reachable=true (success_state) per Death's
-- binding rule.
--
-- Discipline 8 (Belief shape): knowledge_tri_layer.believes uses the schema-
-- native shape (proposition/conviction/evidence_resistance) which is DISTINCT
-- from the engine Belief interface. Discipline 8 governs engine-Belief
-- instances written to public.belief; this migration writes none. If a
-- follow-up commit seeds public.belief rows referencing Ilyra as holder,
-- those instances must conform to BUG-FIX-1 shape.
-- ============================================================================

INSERT INTO "public"."npc" (
  "npc_id", "name", "role", "desire", "fear", "current_plan",
  "want_model", "knowledge_tri_layer", "closing_conditions",
  "memory_archetype", "ambition_tick", "schedule_nesting",
  "stats", "derived_stats", "tags",
  "faction_links",
  "schema_version"
) VALUES (
  'npc-marrow-saint-ilyra',
  'Marrow-Saint Ilyra',
  'Marrow-Saint of the Drowned Church',
  'Hear The Unnamed name a successor in the dry fountain; believe she may be the chosen vessel.',
  'A rival succession candidate emerging with Drowned Church Faith higher than her own.',
  'Petition the player to bring a Bell-Court-struck name as a salt-immersion offering; if successful, escalate to a Composing rite that re-anchors the absented name in the fountain''s memory.',
  -- want_model
  '{
    "drive": {
      "description": "Hear The Unnamed name a successor in the dry fountain; believe she may be the chosen vessel.",
      "intensity": 5,
      "freshness_decay": 0
    },
    "barter": [
      {"offered": "absolution-warrant for civic transgression", "cost_to_npc": 2},
      {"offered": "small marrow-wax candle (single vigil)", "cost_to_npc": 1},
      {"offered": "salt-oath blessing on a personal commitment", "cost_to_npc": 3}
    ],
    "kill_for": {
      "trigger_condition": "A rival apotheosis candidate emerges with Drowned Church Faith higher than Ilyra''s and the Composing rite has been completed against her",
      "threshold": "absolute",
      "target_class": "individual"
    },
    "fear_loss": {
      "what": "her succession candidacy",
      "urgency": 5,
      "abandons_drive_if_imminent": false
    }
  }'::jsonb,
  -- knowledge_tri_layer
  '{
    "knows": [
      {"fact_id": "fact-marrow-source-pilgrims", "source_event_id": "evt-ilyra-rendered-third-pilgrim", "certainty": 5},
      {"fact_id": "fact-fountain-listens", "source_event_id": "evt-ilyra-first-vigil", "certainty": 5},
      {"fact_id": "fact-unnamed-active-in-greywake", "source_event_id": "evt-ilyra-second-vigil", "certainty": 4}
    ],
    "says": {
      "default_policy": "guarded",
      "per_audience_overrides": {
        "bell_court_magistrate": "silent",
        "salt_vow_acolyte": "open",
        "drowned_church_pilgrim": "selective"
      }
    },
    "believes": [
      {
        "proposition": "I am the apotheosis candidate The Unnamed will choose",
        "conviction": 5,
        "evidence_resistance": 5
      },
      {
        "proposition": "The marrow-wax candles work because the pilgrim renderings were consensual at salt-oath level",
        "conviction": 4,
        "evidence_resistance": 3
      },
      {
        "proposition": "Bell Court struck-names persist in the fountain''s deep memory and can be re-anchored",
        "conviction": 4,
        "evidence_resistance": 4
      }
    ]
  }'::jsonb,
  -- closing_conditions (min 2; ≥1 player_reachable=true per Death's binding rule)
  '[
    {
      "kind": "success_state",
      "description": "Player helps Ilyra perform the Composing rite at the dry fountain; The Unnamed names her successor.",
      "player_reachable": true,
      "consequence_summary": "Ilyra ascends; Drowned Church institutional power consolidates; player gains apotheosis-route credit."
    },
    {
      "kind": "death_state",
      "description": "Ilyra dies in an apotheosis attempt that fails because The Unnamed names another candidate.",
      "player_reachable": false,
      "consequence_summary": "Ilyra''s successor candidacy collapses; Drowned Church enters schism between salt-vow + marrow-rendering coalitions."
    },
    {
      "kind": "transfer_state",
      "description": "Ilyra recognizes the player as a fellow vessel and transfers her candidacy + accumulated marrow-wax knowledge to the player.",
      "player_reachable": true,
      "transfer_target_npc_id": null,
      "consequence_summary": "Player inherits the candidacy path; Ilyra retires to vigil-keeping. Triggered by very-high-Authority + Drowned Church Faith."
    }
  ]'::jsonb,
  'devout',
  -- ambition_tick (theological_irregular cadence per apotheosis-tier drive)
  '{
    "cadence": "theological_irregular",
    "success_streak": 0,
    "last_attempt": null
  }'::jsonb,
  -- schedule_nesting (nested under inst-drowned-church)
  '{
    "local_pattern": {
      "summary": "Stations: dawn (cathedral antechamber vigil at standing-water basin) → midday (marrow-rendering chamber, when active) → dusk (composing-rite preparation in the cathedral)."
    },
    "nested_under_institution_id": "inst-drowned-church",
    "variance_seed": "ilyra-schedule-2026"
  }'::jsonb,
  -- stats (custom_stats_block: Marrow-Saint profile — high Will + Authority + Presence)
  '{
    "body": 9,
    "grace": 10,
    "sense": 12,
    "mind": 11,
    "will": 14,
    "presence": 13,
    "authority": 6,
    "ruin": 2,
    "creation": 4
  }'::jsonb,
  -- derived_stats (5e ability scores via translation_rules §1)
  '{
    "str": 9,
    "dex": 10,
    "con": 11,
    "int": 11,
    "wis": 12,
    "cha": 13
  }'::jsonb,
  -- tags
  '["named-slice-npc", "faction-anchor", "theological", "recruitable-via-bond", "dangerous-with-authority", "bundle_a_authored", "slice"]'::jsonb,
  -- faction_links (Drowned Church anchor)
  '[{"faction_id": "fac-drowned-church", "role": "marrow_saint", "loyalty": 5}]'::jsonb,
  'v0.8'
)
ON CONFLICT ("npc_id") DO NOTHING;
