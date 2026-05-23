-- ============================================================================
-- Phase 24d / 6a.6 commit 3 — Seed content.quest_template: Q1 The Hook
-- ============================================================================
-- Per ratified amended 6a.6 scope. First Bundle D definitional quest.
-- Mirrors plot_template pattern from commits 1+2.
--
-- Sources: cluster_a Codex §10745-10860 (PO.III Q1 The Hook scene — canonical
-- confession-betrayal worked example; Venn Hook detonation at Bone Awning).
--
-- Pre-flight FK closure verified (Discipline 9):
--   - primary_npc_ids: npc-venn-hook (live, broker archetype)
--   - primary_faction_ids: fac-merchant-tide-league + fac-civic-bell-court (live)
--   - primary_region_id: greywake (live)
--   - parent_plot_id (in subplot_graph_relation): plot-p02-scrip-run (live, from 6a.6 commit 2)
--   - related_quest_ids: Q2/Q3/Q4/Q5 NOT seeded — v0_9_pending tags applied
--   - surface_at_location_id (in discovery_channel): Bone Awning tavern NOT seeded;
--     field is optional, OMITTED. Closest seeded location loc-tide-league-brokers-office
--     is faction-aligned but wrong venue per Codex. v0.9 location expansion pending.
--
-- Closure-gap audit per user directive:
--   - NO item refs in quest template (items appear in narrative outcomes only, STATE-side)
--   - Q2/Q3/Q4/Q5 dangling quest refs tagged v0_9_*_pending (same pattern as plot)
--   - Bone Awning location ref dropped (omit optional field; v0.9 location expansion)
--   - No blocking closure issues
--
-- BORDERLINE ratifications applied (from P-01):
--   - subplot_graph_relation: TEMPLATE (BORDERLINE-3 ratified)
--   - discovery_channel: TEMPLATE for channel SET (BORDERLINE-2 ratified)
--   - related_quest_ids dangling refs: kept with v0_9_*_pending tags
--
-- Archetype choice: want_collision per L.IV taxonomy (Venn Hook's want_model
-- collides with player's; collision-pressure metric drives surfacing). Codex
-- subtype "confession-betrayal" is descriptive narrative term; not in v0.8
-- enum (8 values: want_collision / institutional_failure / faction_reach_attempt
-- / rumor_investigation / discovery / succession / doctrinal / economic).
-- ============================================================================

INSERT INTO "content"."quest_template" (
  "quest_id",
  "name",
  "description",
  "tags",
  "archetype",
  "discovery_channel",
  "subplot_graph_relation",
  "primary_npc_ids",
  "primary_faction_ids",
  "primary_region_id"
) VALUES (
  'quest-q1-the-hook',
  'The Hook',
  'Canonical confession-betrayal worked example. Venn Hook approaches the player at the Bone Awning tavern (dockside, 19:00-22:00 window, Day 27 per L.IV pressure trace); Acts I (scrip-partnership cover) -> II (confession-on-offer drop, 8-min auto-advance safety net) -> III (4 player paths: accept-the-offer / decline-and-report / decline-and-walk / walk-away-mid-scene). Each path maps to L.IV closing-state + L.V plot mutations on P-02 Scrip Run + cross-plot resonance to P-01 Apotheosis Race. Exercises Venn Hooks Fugitive prompt skeleton (tells, exit-glances, sentence-foreshortening on pressure, refusal patterns).',
  '["bundle_d_authored", "confession_betrayal_archetype", "po_iii_authored", "multi_plot_constituent", "v0_9_related_quest_q2_pending", "v0_9_related_quest_q3_pending", "v0_9_related_quest_q4_pending", "v0_9_related_quest_q5_pending", "v0_9_bone_awning_location_pending", "slice"]'::jsonb,
  'want_collision',
  '{
    "kind": "requested",
    "surface_at_day": 27,
    "surface_via_npc_id": "npc-venn-hook"
  }'::jsonb,
  '{
    "quest_id": "quest-q1-the-hook",
    "parent_plot_id": "plot-p02-scrip-run",
    "related_quest_ids": [
      {"quest_id": "quest-q2-names-on-the-wax", "relation_kind": "mirrors"},
      {"quest_id": "quest-q3-the-grain-compensation", "relation_kind": "mirrors"},
      {"quest_id": "quest-q5-the-saint-acts-alone", "relation_kind": "mirrors"}
    ],
    "emergence_path": []
  }'::jsonb,
  '["npc-venn-hook"]'::jsonb,
  '["fac-merchant-tide-league", "fac-civic-bell-court"]'::jsonb,
  'greywake'
)
ON CONFLICT ("quest_id") DO NOTHING;
