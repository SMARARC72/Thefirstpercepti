-- ============================================================================
-- Phase 24d / Session 6a / Phase 6a.4 — NPC seed: Venn Hook
-- ============================================================================
-- Third per-NPC commit. Pattern transfer test cleric→magistrate→broker.
--
-- Pattern decisions (per ratified Q-ILYRA-1..4):
--   - memory_archetype: "broker"
--   - ambition_tick.cadence: "trade_season_8x_year" (✓ in v0.8 enum;
--     mercantile rhythm at NPC scale, mirrors Tide League institution
--     cadence "regional_seasonal")
--   - closing_conditions: 5 entries (Q-ILYRA-2 expected ceiling 4-5;
--     Venn is multi-vector — survivor archetype with most divergent
--     outcomes). 3 player_reachable. Death's binding rule satisfied.
--   - transfer_target_npc_id: OMITTED on transfer_state (Q-ILYRA-4)
--   - Stats authored per broker profile: high Sense + Grace + Mind +
--     Presence; moderate Will; low Authority/Ruin/Creation (transactional)
--
-- Runtime secrets (sec-venn-arrival + sec-venn-manipulations from
-- content/world-data/npcs.json) encoded as knowledge_tri_layer facts with
-- says.default_policy "guarded" and audience-conditional overrides.
-- ============================================================================

INSERT INTO "public"."npc" (
  "npc_id", "name", "role", "desire", "fear", "current_plan",
  "want_model", "knowledge_tri_layer", "closing_conditions",
  "memory_archetype", "ambition_tick", "schedule_nesting",
  "stats", "derived_stats", "tags",
  "faction_links",
  "schema_version"
) VALUES (
  'npc-venn-hook',
  'Venn Hook',
  'Tide League Broker',
  'Stable salt-scrip valuation. Privately: enough scrip to leave Greywake before the next major Shattering aftershock.',
  'Bell Court audit detecting his fudged transit records, OR being struck from a ledger the way his predecessor was.',
  'Continue brokering scrip-side margins per Tide League trade-season rhythm; accumulate scrip reserves; identify a viable exit vector before the next aftershock.',
  -- want_model (broker profile — survival-priority, transactional)
  '{
    "drive": {
      "description": "Accumulate enough scrip to exit Greywake before the next major Shattering aftershock; outwardly: stable salt-scrip valuation.",
      "intensity": 4,
      "freshness_decay": 5
    },
    "barter": [
      {"offered": "favorable scrip-to-salt-coin exchange rate (1 transaction)", "cost_to_npc": 1},
      {"offered": "transit record entry with adjustable timing", "cost_to_npc": 2},
      {"offered": "introduction to a foreign-port broker contact", "cost_to_npc": 3},
      {"offered": "warning when Bell Court audit window opens", "cost_to_npc": 4, "refusal_if_audience_includes": ["npc-bell-magistrate-orro"]},
      {"offered": "predecessor''s name + the records of her case (if player has access)", "cost_to_npc": 5}
    ],
    "kill_for": {
      "trigger_condition": "Imminent personal exposure of the fudged transit records AND escape vector blocked — survival-only trigger",
      "threshold": "warning",
      "target_class": "individual"
    },
    "fear_loss": {
      "what": "his unfudged exit window + the predecessor''s fate becoming his own",
      "urgency": 5,
      "abandons_drive_if_imminent": true
    }
  }'::jsonb,
  -- knowledge_tri_layer (broker facts including the two secrets from runtime)
  '{
    "knows": [
      {"fact_id": "fact-tide-league-scrip-cycle", "source_event_id": "evt-venn-broker-onboarding", "certainty": 5, "last_recalled": "ongoing"},
      {"fact_id": "fact-predecessor-ledger-struck", "source_event_id": "evt-venn-inheritance", "certainty": 4},
      {"fact_id": "fact-fudged-transit-records-self", "source_event_id": "evt-venn-margin-adjustment-cycle-3", "certainty": 5},
      {"fact_id": "fact-second-aftershock-imminent", "source_event_id": "evt-venn-coastal-pattern-reading", "certainty": 3}
    ],
    "says": {
      "default_policy": "guarded",
      "per_audience_overrides": {
        "bell_court_magistrate": "silent",
        "drowned_church_marrow_saint": "selective",
        "tide_league_broker_peer": "open",
        "foreign_port_visitor": "guarded"
      }
    },
    "believes": [
      {
        "proposition": "Greywake will not survive another aftershock the way it survived the Shattering",
        "conviction": 4,
        "evidence_resistance": 3
      },
      {
        "proposition": "My predecessor''s fate was civic erasure for unknown cause; the cause was scrip-side too",
        "conviction": 3,
        "evidence_resistance": 4
      },
      {
        "proposition": "Self-preservation is the only honest contract",
        "conviction": 5,
        "evidence_resistance": 5
      }
    ]
  }'::jsonb,
  -- closing_conditions (5 entries; 3 player_reachable; ≥1 death-or-equivalent)
  '[
    {
      "kind": "success_state",
      "description": "Player helps Venn secure exit visa + foreign-port introduction before the next aftershock; Venn departs Greywake intact.",
      "player_reachable": true,
      "consequence_summary": "Venn permanently exits the slice; Tide League loses scrip-side primary broker; player gains foreign-port contact network access."
    },
    {
      "kind": "death_state",
      "description": "Venn caught by Bell Court audit + struck from ledger like predecessor; OR caught in second-aftershock event he predicted but failed to exit.",
      "player_reachable": false,
      "consequence_summary": "Tide League succession-of-broker crisis; salt-coin-side coalition gains influence; predecessor case re-opens."
    },
    {
      "kind": "transfer_state",
      "description": "Venn recognizes player as a better-positioned successor to the broker seat; transfers scrip-warrant access + the predecessor''s case records.",
      "player_reachable": true,
      "consequence_summary": "Player inherits Tide League broker seat (commercial economic anchor); transit-record manipulation capability + predecessor knowledge transferred."
    },
    {
      "kind": "passover_state",
      "description": "Venn''s exit window closes; he abandons the escape plan and re-commits to long-Greywake survival via deeper Tide League institutional embedding.",
      "player_reachable": false,
      "consequence_summary": "Venn becomes a permanent Greywake fixture; drive shifts to institutional consolidation rather than exit.",
      "residue_drive": {
        "description": "Maximize Tide League institutional power within Greywake",
        "intensity": 3
      }
    },
    {
      "kind": "special_state",
      "description": "Player provides Venn with information about the predecessor''s case that resolves the cosmological-erasure question; Venn becomes a witness rather than a successor.",
      "player_reachable": true,
      "consequence_summary": "Venn becomes a Bell Court witness against Tide League fudging practices; institutional power shift in Bell Court''s favor; high-Authority + Bell Court Faith path."
    }
  ]'::jsonb,
  'broker',
  -- ambition_tick (trade_season_8x_year — Tide League mercantile cadence)
  '{
    "cadence": "trade_season_8x_year",
    "success_streak": 0,
    "last_attempt": null
  }'::jsonb,
  -- schedule_nesting (nested under inst-merchant-tide-league)
  '{
    "local_pattern": {
      "summary": "Stations: dawn (scrip-rate review at broker''s office) → midday (active brokering with merchants + transit-record entry) → dusk (private accounting + exit-vector planning)."
    },
    "nested_under_institution_id": "inst-merchant-tide-league",
    "variance_seed": "venn-schedule-2026"
  }'::jsonb,
  -- stats (broker profile — high Sense/Grace/Mind/Presence)
  '{
    "body": 9,
    "grace": 12,
    "sense": 14,
    "mind": 13,
    "will": 11,
    "presence": 12,
    "authority": 4,
    "ruin": 2,
    "creation": 2
  }'::jsonb,
  -- derived_stats (translation_rules §1; no race modifier)
  '{
    "str": 9,
    "dex": 12,
    "con": 11,
    "int": 13,
    "wis": 14,
    "cha": 12
  }'::jsonb,
  -- tags
  '["named-slice-npc", "faction-anchor", "economic", "recruitable-via-bond", "self-preservation-first", "broker_archetype", "bundle_a_authored", "slice"]'::jsonb,
  -- faction_links (Tide League anchor)
  '[{"faction_id": "fac-merchant-tide-league", "role": "scrip_side_broker", "loyalty": 4}]'::jsonb,
  'v0.8'
)
ON CONFLICT ("npc_id") DO NOTHING;
