-- ============================================================================
-- Phase 24d / Session 6a / Phase 6a.4 — NPC seed: Bell-Magistrate Orro
-- ============================================================================
-- Second per-NPC commit per amended PHASE_24D_HANDOFF.md §6a.4. Pattern
-- transfer test cleric → magistrate archetype per Q-ILYRA-3 ratification.
--
-- Pattern decisions (post-Ilyra ratification):
--   - memory_archetype: "magistrate" (vs Ilyra's "devout")
--   - ambition_tick.cadence: "civic_6x_year" (✓ in v0.8 enum; civic bell
--     rhythm matches institution_cadence "civic_weekly" at NPC scale)
--   - closing_conditions: 4 entries (Q-ILYRA-2 floor 2 ceiling 5; Orro is
--     a multi-path NPC). 2 of 4 player_reachable=true. Death's binding rule
--     satisfied via dedicated death_state.
--   - transfer_target_npc_id: OMITTED on player-targeted transfer (NOT null
--     per Q-ILYRA-4 + pattern-check Finding 2)
--   - Stats authored per magistrate profile: high Mind + Authority +
--     Will + Sense; low Body/Ruin
--
-- Magistrate's secret per runtime npcs.json (sec-orro-doubt-private — keeps
-- personal ledger of unadjudicated cases) encoded in knowledge_tri_layer
-- as a `knows` fact with certainty 5 + `says` policy of "silent" by default.
-- ============================================================================

INSERT INTO "public"."npc" (
  "npc_id", "name", "role", "desire", "fear", "current_plan",
  "want_model", "knowledge_tri_layer", "closing_conditions",
  "memory_archetype", "ambition_tick", "schedule_nesting",
  "stats", "derived_stats", "tags",
  "faction_links",
  "schema_version"
) VALUES (
  'npc-bell-magistrate-orro',
  'Bell-Magistrate Orro',
  'Senior Magistrate of the Civic Bell Court',
  'A clean civic record. Adjudicate every contradiction in the open ledger within three civic days.',
  'Theological intervention erasing or rewriting struck names without ledger record; or his private doubt-ledger becoming public before he can adjudicate it.',
  'Schedule case-clearance pushes every civic week; flag the player as a potential witness in three currently-floating contradiction cases.',
  -- want_model (magistrate profile)
  '{
    "drive": {
      "description": "Maintain a clean civic record by adjudicating every floating contradiction within three civic days.",
      "intensity": 4,
      "freshness_decay": 3
    },
    "barter": [
      {"offered": "civic-warrant authorizing a specific inquiry", "cost_to_npc": 2},
      {"offered": "ledgered witness statement (entered as record)", "cost_to_npc": 1},
      {"offered": "magistrate''s seal on a written affidavit", "cost_to_npc": 3},
      {"offered": "discretionary case-clearance prioritization", "cost_to_npc": 4, "refusal_if_audience_includes": ["npc-marrow-saint-ilyra"]}
    ],
    "kill_for": {
      "trigger_condition": "Sustained institutional erasure of struck names without ledger record — only when civic order''s collapse is the alternative",
      "threshold": "critical",
      "target_class": "institution"
    },
    "fear_loss": {
      "what": "civic record integrity + the private doubt-ledger remaining private",
      "urgency": 4,
      "abandons_drive_if_imminent": true
    }
  }'::jsonb,
  -- knowledge_tri_layer (civic facts + private doubt-ledger as silent-policy fact)
  '{
    "knows": [
      {"fact_id": "fact-bell-court-struck-names-current-cycle", "source_event_id": "evt-orro-civic-cycle-2026-q1", "certainty": 5},
      {"fact_id": "fact-private-doubt-ledger-cases", "source_event_id": "evt-orro-personal-ledger-maintenance", "certainty": 5, "last_recalled": "ongoing"},
      {"fact_id": "fact-three-contradictions-floating-currently", "source_event_id": "evt-orro-week-end-review", "certainty": 4}
    ],
    "says": {
      "default_policy": "selective",
      "per_audience_overrides": {
        "drowned_church_marrow_saint": "silent",
        "tide_league_broker": "selective",
        "junior_magistrate": "guarded",
        "bell_court_witness": "open"
      }
    },
    "believes": [
      {
        "proposition": "Three civic days is the maximum a contradiction may float before order is offended",
        "conviction": 5,
        "evidence_resistance": 4
      },
      {
        "proposition": "Some cases genuinely cannot be adjudicated under the current civic framework; my private ledger records them honestly",
        "conviction": 4,
        "evidence_resistance": 5
      },
      {
        "proposition": "Theological interventions that erase struck names without ledger trail are the deepest threat to civic order",
        "conviction": 5,
        "evidence_resistance": 4
      }
    ]
  }'::jsonb,
  -- closing_conditions (4 entries: success / death / transfer / passover; 2 player_reachable)
  '[
    {
      "kind": "success_state",
      "description": "Player helps Orro adjudicate the three floating contradictions within civic-deadline; private doubt-ledger remains private; civic record clean.",
      "player_reachable": true,
      "consequence_summary": "Orro retains senior magistracy; Bell Court institutional power consolidates; player earns civic credit + access to magistrate corps."
    },
    {
      "kind": "death_state",
      "description": "Orro assassinated by a faction that benefits from civic disorder (Drowned Church zealot OR Tide League broker whose contradiction adjudication threatens scrip).",
      "player_reachable": false,
      "consequence_summary": "Bell Court enters succession crisis between senior + junior magistrate coalitions; private doubt-ledger discovered + leaked to the press; multiple cases re-opened."
    },
    {
      "kind": "transfer_state",
      "description": "Orro retires after recognizing the player as a worthier successor to civic stewardship; transfers his magistracy + the private doubt-ledger.",
      "player_reachable": true,
      "consequence_summary": "Player inherits civic magistracy + access to the doubt-ledger as a knowledge asset. Triggered by very-high-Authority + civic recognition path."
    },
    {
      "kind": "passover_state",
      "description": "Orro''s drive shifts from civic clean-record to private doubt-ledger publication when he concludes the framework itself cannot adjudicate certain cases.",
      "player_reachable": false,
      "consequence_summary": "Orro becomes a reformist within the Bell Court — pushes for framework expansion to accommodate previously-unadjudicable cases. Faction-internal coalition shift.",
      "residue_drive": {
        "description": "Publish the private doubt-ledger as a reformist manifesto",
        "intensity": 4
      }
    }
  ]'::jsonb,
  'magistrate',
  -- ambition_tick (civic_6x_year — bi-monthly civic decision cycle)
  '{
    "cadence": "civic_6x_year",
    "success_streak": 0,
    "last_attempt": null
  }'::jsonb,
  -- schedule_nesting (nested under inst-civic-bell-court)
  '{
    "local_pattern": {
      "summary": "Stations: dawn (case-docket review at precinct) → midday (formal court session OR field inquiry) → dusk (private ledger entry + week-end-review on civic days 6 + 12)."
    },
    "nested_under_institution_id": "inst-civic-bell-court",
    "variance_seed": "orro-schedule-2026"
  }'::jsonb,
  -- stats (custom_stats_block: magistrate profile — high Mind/Authority/Will/Sense)
  '{
    "body": 8,
    "grace": 9,
    "sense": 13,
    "mind": 14,
    "will": 13,
    "presence": 12,
    "authority": 7,
    "ruin": 1,
    "creation": 3
  }'::jsonb,
  -- derived_stats (translation_rules §1; no race modifier)
  '{
    "str": 8,
    "dex": 9,
    "con": 10,
    "int": 14,
    "wis": 13,
    "cha": 12
  }'::jsonb,
  -- tags
  '["named-slice-npc", "faction-anchor", "civic_authority", "magistrate", "private-doubt-ledger", "bundle_a_authored", "slice"]'::jsonb,
  -- faction_links (Bell Court anchor)
  '[{"faction_id": "fac-civic-bell-court", "role": "senior_magistrate", "loyalty": 5}]'::jsonb,
  'v0.8'
)
ON CONFLICT ("npc_id") DO NOTHING;
