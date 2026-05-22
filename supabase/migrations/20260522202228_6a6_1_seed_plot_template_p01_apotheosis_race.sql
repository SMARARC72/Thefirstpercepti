-- ============================================================================
-- Phase 24d / 6a.6 commit 1 — Seed content.plot_template: P-01 Apotheosis Race
-- ============================================================================
-- Per ratified amended 6a.6 scope (post-6a.5.5 template/state split).
-- First Bundle E definitional plot. PAUSE after this commit for Desktop
-- pattern-check before authoring P-02/P-03 in commit 2.
--
-- Sources: cluster_a Codex §9724-9735 (P-01 plot anchor row), Sec L Bundle E
-- primitive doc, cluster_a_playable_opening + sec_l_liveness memories.
--
-- Pre-flight FK closure verified (Discipline 9):
--   - central_npc_ids: npc-marrow-saint-ilyra + npc-the-listening-child (live)
--   - central_institution_ids: inst-drowned-church + inst-civic-bell-court (live)
--   - region_id: greywake (live)
--   - constituent_quest_ids: Q1 will land in 6a.6 commit 3; Q2 + Q5 are
--     v0.9 quest-expansion (dangling JSONB refs flagged via tags;
--     constituent_quest_ids is JSONB-array, NOT FK-enforced at DB level)
--   - pan_world_plot_id: pw-02-naming-race (logical text ref; pan_world_plot
--     table not in v0.8 schema; v0.9 backlog)
--
-- subplot_admission_policy encodes ratified BORDERLINE-1 TEMPLATE shape:
--   admit Ilyra-involving / dry-fountain / Unnamed-responsiveness;
--   admit Bell Court strike-emergent-name attempts;
--   reject Tide League purely economic (-> P-02 scope).
-- ============================================================================

INSERT INTO "content"."plot_template" (
  "plot_id",
  "region_id",
  "name",
  "description",
  "tags",
  "spine_question",
  "central_npc_ids",
  "central_institution_ids",
  "pan_world_plot_id",
  "constituent_quest_ids",
  "subplot_admission_policy"
) VALUES (
  'plot-p01-apotheosis-race',
  'greywake',
  'The Apotheosis Race',
  'Greywake instance of pan-world plot PW-02 (The Naming Race). Will The Unnamed name a successor, and if so, who, and on whose authority? The Drowned Church believes Marrow-Saint Ilyra is being prepared by The Unnamed for emergence; the Bell Court asserts jurisdictional authority over any naming claim; the Listening Child witnesses the substrate naming-process at the dry fountain. Three-act trace: Setup (Q2 + Q5 surface; Drowned Church visibly destabilizing). Confrontation (Q1 detonates; Bell Court audit pressure spikes; Ilyra moves toward unauthorized vigil). Resolution (closing-condition race fires within season).',
  '["bundle_e_authored", "pan_world_pw02", "drowned_church_axis", "apotheosis", "v0_9_constituent_quest_q2_pending", "v0_9_constituent_quest_q5_pending", "slice"]'::jsonb,
  'Will The Unnamed name a successor, and if so, who, and on whose authority?',
  '["npc-marrow-saint-ilyra", "npc-the-listening-child"]'::jsonb,
  '["inst-drowned-church", "inst-civic-bell-court"]'::jsonb,
  'pw-02-naming-race',
  '["quest-q1-the-hook", "quest-q2-names-on-the-wax", "quest-q5-the-saint-acts-alone"]'::jsonb,
  '{
    "parent_plot_id": "plot-p01-apotheosis-race",
    "cross_plot_resonance_allowed": true,
    "admission_rules": [
      {
        "rule_id": "p01_admit_ilyra_or_unnamed_involvement",
        "accepts_quest_if": "involves_npc:npc-marrow-saint-ilyra OR involves_location:loc-greywake-dry-fountain OR involves_substrate:the_unnamed_responsiveness",
        "rejects_quest_if": "purely_economic_with_no_doctrinal_axis"
      },
      {
        "rule_id": "p01_admit_bell_court_strike_emergent_name",
        "accepts_quest_if": "involves_faction_action:fac-civic-bell-court:strike_emergent_name_claim",
        "rejects_quest_if": "purely_procedural_with_no_succession_axis"
      },
      {
        "rule_id": "p01_reject_tide_league_economic",
        "accepts_quest_if": "involves_faction:fac-merchant-tide-league AND involves_mediation_role:drowned_church_or_bell_court",
        "rejects_quest_if": "quest_archetype:economic AND involves_faction:fac-merchant-tide-league AND NOT involves_npc:npc-marrow-saint-ilyra"
      }
    ]
  }'::jsonb
)
ON CONFLICT ("plot_id") DO NOTHING;
