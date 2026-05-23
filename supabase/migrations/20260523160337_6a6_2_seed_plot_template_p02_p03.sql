-- ============================================================================
-- Phase 24d / 6a.6 commit 2 — Seed content.plot_template: P-02 + P-03 (batched)
-- ============================================================================
-- Per ratified amended 6a.6 scope. Mirrors P-01 pattern (commit 1 / 80d6dee).
-- Batched because P-01 ratification confirmed shape transfers cleanly.
--
-- Sources: cluster_a Codex §9737-9761 (P-02 + P-03 plot anchor rows),
-- Sec L Bundle E primitive doc.
--
-- Pre-flight FK closure verified (Discipline 9):
--   - P-02 central_npc_ids: npc-venn-hook (live, broker archetype)
--   - P-02 central_institution_ids: inst-merchant-tide-league + inst-civic-bell-court (both live)
--   - P-03 central_npc_ids: npc-the-listening-child (live, contradiction_bearing)
--   - P-03 central_institution_ids: inst-drowned-church + inst-civic-bell-court (both live)
--   - region_id: greywake (live)
--   - constituent_quest_ids:
--       P-02 → Q1 The Hook (lands 6a.6 commit 3) + Q3 The Grain Compensation (v0.9 pending)
--       P-03 → Q4 The Seized Letter (v0.9 pending)
--   - pan_world_plot_ids: pw-03-shattering-echo + pw-01-counted-wastes-imbalance (logical text refs)
--
-- Predicate DSL strings validated via predicate-dsl parser (#18 from 6a.5.8.2).
--
-- BORDERLINE ratifications applied from P-01:
--   - subplot_admission_policy: TEMPLATE (BORDERLINE-1)
--   - predicate strings: <key>:<value> + AND/OR/NOT flat grammar
--   - dangling quest refs: kept with v0_9_*_pending tags
--   - pan_world_plot_id: text-string ref (no FK target in v0.8)
--   - three_act_trace: inline in description (v0.9 backlog #21 for structured field)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- P-02 The Scrip Run (Greywake instance of PW-03 Shattering Echo)
-- ----------------------------------------------------------------------------
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
  'plot-p02-scrip-run',
  'greywake',
  'The Scrip Run',
  'Greywake instance of pan-world plot PW-03 (The Shattering Echo). Will Tide Leagues over-issue concealment hold, or will the salt-scrip transition from latent to kinetic state? Tide Leagues three-pronged reach (currency stability + exit liquidity + member retention) is structurally fragile; the scrip run is the closing-condition race. Three-act trace: Setup (Q3 surfaces witnessed, route disruption visible; volatility nudges 1.0 → 1.1; player may not register connection to Tide League solvency). Confrontation (Q1 surfaces requested, Venn Hook reaches out; volatility crosses 1.5; aftershock rumor compounds). Resolution (scrip stability tick crosses kinetic threshold OR confession-into-mediation lands OR substrate-consummation window expires at 18 game-months).',
  '["bundle_e_authored", "pan_world_pw03", "tide_league_axis", "scrip_run", "v0_9_constituent_quest_q3_pending", "slice"]'::jsonb,
  'Will Tide Leagues over-issue concealment hold, or will the salt-scrip transition from latent to kinetic state?',
  '["npc-venn-hook"]'::jsonb,
  '["inst-merchant-tide-league", "inst-civic-bell-court"]'::jsonb,
  'pw-03-shattering-echo',
  '["quest-q1-the-hook", "quest-q3-the-grain-compensation"]'::jsonb,
  '{
    "parent_plot_id": "plot-p02-scrip-run",
    "cross_plot_resonance_allowed": true,
    "admission_rules": [
      {
        "rule_id": "p02_admit_tide_league_economic",
        "accepts_quest_if": "involves_faction:fac-merchant-tide-league OR involves_topic:scrip_valuation OR involves_topic:salt_convoys OR involves_topic:broker_rotations OR involves_topic:tide_league_ledger",
        "rejects_quest_if": "purely_theological_with_no_economic_axis"
      },
      {
        "rule_id": "p02_admit_shattering_aftershock_rumor",
        "accepts_quest_if": "involves_topic:shattering_aftershock_rumor OR involves_pan_world_plot:pw-03-shattering-echo",
        "rejects_quest_if": "involves_drowned_church_internal_doctrine"
      },
      {
        "rule_id": "p02_reject_drowned_church_theology",
        "accepts_quest_if": "involves_drowned_church_with_economic_mediation_role",
        "rejects_quest_if": "involves_faction:fac-drowned-church AND involves_topic:theology AND NOT involves_topic:scrip_valuation"
      }
    ]
  }'::jsonb
)
ON CONFLICT ("plot_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- P-03 The Drowned Letter (Greywake instance of PW-01 Counted Wastes Imbalance)
-- ----------------------------------------------------------------------------
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
  'plot-p03-drowned-letter',
  'greywake',
  'The Drowned Letter',
  'Greywake instance of pan-world plot PW-01 (The Counted Wastes Imbalance). Will Greywakes relationship with Numerand survive Bell Courts interference in absolution-warrant correspondence? Unusually pan-world-coupled: Numerand-side relationship state affects PW-01 directly. Three-act trace: Setup (The Listening Child surfaces the prophecy hint days before Q4 fires). Confrontation (Q4 surfaces requested + prophecy hybrid, heaviest arrival; player must retrieve or accept seizure). Resolution (chosen path produces immediate world-delta; pan-world cascade ripples to PW-01).',
  '["bundle_e_authored", "pan_world_pw01", "drowned_church_axis", "bell_court_axis", "numerand_diplomatic_axis", "drowned_letter", "v0_9_constituent_quest_q4_pending", "slice"]'::jsonb,
  'Will Greywakes relationship with Numerand survive Bell Courts interference in absolution-warrant correspondence?',
  '["npc-the-listening-child"]'::jsonb,
  '["inst-drowned-church", "inst-civic-bell-court"]'::jsonb,
  'pw-01-counted-wastes-imbalance',
  '["quest-q4-the-seized-letter"]'::jsonb,
  '{
    "parent_plot_id": "plot-p03-drowned-letter",
    "cross_plot_resonance_allowed": true,
    "admission_rules": [
      {
        "rule_id": "p03_admit_absolution_warrant_correspondence",
        "accepts_quest_if": "involves_topic:absolution_warrant OR involves_topic:numerand_correspondence",
        "rejects_quest_if": "purely_economic_with_no_diplomatic_axis"
      },
      {
        "rule_id": "p03_admit_junior_magistrate_expansionism",
        "accepts_quest_if": "involves_faction_action:fac-civic-bell-court:junior_magistrate_expansion OR involves_faction_action:fac-civic-bell-court:warrant_interference",
        "rejects_quest_if": "involves_senior_magistrate_routine_procedural_with_no_expansion_axis"
      },
      {
        "rule_id": "p03_admit_numerand_standing",
        "accepts_quest_if": "involves_topic:numerand_standing OR involves_topic:numerand_credit_of_faith",
        "rejects_quest_if": "purely_internal_greywake_with_no_numerand_axis"
      }
    ]
  }'::jsonb
)
ON CONFLICT ("plot_id") DO NOTHING;
