-- ============================================================================
-- Phase 24d / Session 6a / Phase 6a.3 — Faction + Institution seed (Greywake)
-- ============================================================================
-- Per amended PHASE_24D_HANDOFF.md §6a.3 + Q3 = A-modified (hand-author
-- institutions alongside factions; NOT via Faction T handler routing).
-- Each Greywake faction gets BOTH a public.faction row AND a content.institution
-- row (per Bundle B); faction_id + institution_id are kept stable for joins.
--
-- Source: content/world-data/factions.json (3 entries — drowned-church,
-- civic-bell-court, merchant-tide-league).
--
-- Bundle C primitives (faction_reach, faction_ledger, faction_tick_resolution,
-- commodity_catalog, scrip_stability_model) deferred to a follow-up migration
-- as needed by 6a.6 plot seed; faction columns here use the v0.8 REQUIRED set
-- (faction_id, name, core_goal, resources, stance_to_player) + supporting
-- fields that have direct mappings from the runtime factions.json.
--
-- Bundle B primitives (institution_cadence, jurisdictional_strength,
-- internal_factions, institutional_memory_archetype) hand-authored per Q3
-- ratified discipline:
--   - Drowned Church: ngo_internal cadence, devout memory, salt-vow + marrow
--     internal coalitions
--   - Bell Court: civic_weekly cadence, magistrate memory, senior/junior
--     internal split
--   - Tide League: regional_seasonal cadence, broker memory, scrip-side +
--     salt-coin-side coalitions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3 factions
-- ----------------------------------------------------------------------------
INSERT INTO "public"."faction" (
  "faction_id", "name", "type", "region_id", "core_goal", "fear",
  "resources", "stance_to_player", "tags", "schema_version"
) VALUES
  (
    'fac-drowned-church',
    'The Drowned Church',
    'theological',
    'greywake',
    'Restore the fountain''s memory of Bell-Court-struck names through Composing rites; assert theological authority over civic erasure.',
    'A successor to The Unnamed chosen outside the Drowned Church chain.',
    '["salt_vow_acolytes", "marrow_wax_candles", "tide_anchored_cathedral", "absolution_ledger"]'::jsonb,
    'watchful',
    '["slice", "theological", "institution"]'::jsonb,
    'v0.8'
  ),
  (
    'fac-civic-bell-court',
    'The Civic Bell Court',
    'administrative_legal',
    'greywake',
    'Maintain a clean civic record by adjudicating contradictions within three civic days.',
    'Theological intervention erasing or rewriting struck names without ledger record.',
    '["court_seal", "ledgered_witnesses", "bell_court_precinct", "magistrate_corps"]'::jsonb,
    'civic_authority',
    '["slice", "civic_authority", "institution"]'::jsonb,
    'v0.8'
  ),
  (
    'fac-merchant-tide-league',
    'The Merchant Tide League',
    'commercial_brokerage',
    'greywake',
    'Stabilize regional scrip against tide-driven volatility; broker the three institutions'' financial entanglements.',
    'Scrip collapse from salt-coin parity loss.',
    '["scrip_warrants", "salt_coin_reserves", "broker_warrants_office", "merchant_credit_lines"]'::jsonb,
    'neutral_brokering',
    '["slice", "commercial", "institution"]'::jsonb,
    'v0.8'
  )
ON CONFLICT ("faction_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3 institutions (Bundle B; parent_faction_id FK ties to public.faction)
-- ----------------------------------------------------------------------------
-- Schema_pack v0.8 institution lives in content.* per ARD-010.
INSERT INTO "content"."institution" (
  "institution_id", "name", "description", "tags",
  "institution_cadence", "jurisdictional_strength",
  "internal_factions", "institutional_memory_archetype", "parent_faction_id"
) VALUES
  (
    'inst-drowned-church',
    'The Drowned Church (Institutional)',
    'Bundle B institution shape for the Drowned Church — theological cadence + internal salt-vow / marrow coalition split + devout memory archetype.',
    '["slice", "theological", "bundle_b"]'::jsonb,
    '{
      "schedule_tier": "ngo_internal",
      "baseline_resolution_unit": "game_week",
      "decision_cycle_per_unit": 1,
      "member_npc_ids": ["npc-marrow-saint-ilyra", "npc-butcher-who-repeats"]
    }'::jsonb,
    7,
    '[
      {
        "sub_faction_id": "subfac-drowned-salt-vow",
        "sub_faction_name": "Salt-Vow Acolytes",
        "member_npc_ids": ["npc-marrow-saint-ilyra"],
        "alignment_with_parent": "loyal",
        "influence_weight": 4
      },
      {
        "sub_faction_id": "subfac-drowned-marrow-renderers",
        "sub_faction_name": "Marrow-Renderer Sodality",
        "member_npc_ids": ["npc-butcher-who-repeats"],
        "alignment_with_parent": "factional",
        "influence_weight": 3
      }
    ]'::jsonb,
    'devout',
    'fac-drowned-church'
  ),
  (
    'inst-civic-bell-court',
    'The Civic Bell Court (Institutional)',
    'Bundle B institution shape for the Bell Court — civic_weekly cadence + senior/junior magistrate internal split + magistrate memory archetype.',
    '["slice", "civic_authority", "bundle_b"]'::jsonb,
    '{
      "schedule_tier": "civic_weekly",
      "baseline_resolution_unit": "game_week",
      "decision_cycle_per_unit": 2,
      "member_npc_ids": ["npc-bell-magistrate-orro"]
    }'::jsonb,
    8,
    '[
      {
        "sub_faction_id": "subfac-bellcourt-senior-magistrates",
        "sub_faction_name": "Senior Magistrates",
        "member_npc_ids": ["npc-bell-magistrate-orro"],
        "alignment_with_parent": "loyal",
        "influence_weight": 5
      },
      {
        "sub_faction_id": "subfac-bellcourt-junior-magistrates",
        "sub_faction_name": "Junior Magistrates",
        "member_npc_ids": [],
        "alignment_with_parent": "reformist",
        "influence_weight": 2
      }
    ]'::jsonb,
    'magistrate',
    'fac-civic-bell-court'
  ),
  (
    'inst-merchant-tide-league',
    'The Merchant Tide League (Institutional)',
    'Bundle B institution shape for the Tide League — regional_seasonal cadence + scrip/salt-coin internal coalition split + broker memory archetype.',
    '["slice", "commercial", "bundle_b"]'::jsonb,
    '{
      "schedule_tier": "regional_seasonal",
      "baseline_resolution_unit": "game_season",
      "decision_cycle_per_unit": 3,
      "member_npc_ids": ["npc-venn-hook"]
    }'::jsonb,
    6,
    '[
      {
        "sub_faction_id": "subfac-tideleague-scrip",
        "sub_faction_name": "Scrip-Side Brokers",
        "member_npc_ids": ["npc-venn-hook"],
        "alignment_with_parent": "loyal",
        "influence_weight": 4
      },
      {
        "sub_faction_id": "subfac-tideleague-salt-coin",
        "sub_faction_name": "Salt-Coin Brokers",
        "member_npc_ids": [],
        "alignment_with_parent": "factional",
        "influence_weight": 3
      }
    ]'::jsonb,
    'broker',
    'fac-merchant-tide-league'
  )
ON CONFLICT ("institution_id") DO NOTHING;
