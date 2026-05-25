-- ============================================================================
-- Phase 24d / 6a.8.2 C2 — Seed 5 failure_state_branch_templates (Greywake; LIVE)
-- ============================================================================
-- Per ratified Phase E (C2) dispatch + 6a80_fs_closure_ranked_list.md top-5.
-- TEMPLATE-side seed ONLY per 6a.5.8.1 Discipline-10 split:
--   - content.failure_state_branch_template = definitional content (this migration)
--   - state.failure_state_branch = empty until campaign init at 6b.5
--
-- 5 branches (top 5 by ascending dangling-ref count + plot anchor + cosmological
-- diversity per closure-ranked list):
--   1. fs-p01-f-tide-league-mediation    (0 dangling; local; question retired)
--   2. fs-p01-a-bell-court-strike        (1 dangling: Verro; local; central NPC lost)
--   3. fs-p02-f-bell-court-audit-expansion (1 dangling: Verro; local; rival displacement)
--   4. fs-p02-a-confidence-cascade       (1 dangling: Wax Guild; local; pressure)
--   5. fs-p02-d-shattering-aftershock    (1 dangling: Numerand; regional; pressure)
--
-- v0_9_pending tracking (3 unique dangling refs across the 5 branches):
--   - npc-junior-magistrate-verro  → used in fs-p01-a winner_set + fs-p02-f winner_set
--                                    (career-advancement actor; will seed in v0.9 NPC sprint)
--   - fac-wax-guild                → used in fs-p02-a loser_set
--                                    (artisan-guild faction; v0.9 faction expansion)
--   - institution-numerand-academy → INTENTIONALLY OMITTED from fs-p02-d winner_set
--                                    per Numerand-drift discipline (Desktop directive):
--                                    "reference-mention only, not load-bearing" — Bell
--                                    Court is the primary load-bearing winner per Codex
--                                    §13525; Numerand observers are secondary mention;
--                                    tracked here as v0_9_pending without encoding
--
-- Numerand-drift discipline RE-CHECK (per Desktop §5.5 + Phase E directive):
--   - fs-p02-d: Bell Court is encoded primary winner; Numerand OMITTED (reference-mention
--     only per directive); no other branch in strict-5 set touches Numerand
--   - Discipline check: PASSED for strict-5 set
--
-- parent_plot_id FK validity:
--   - 4/5 branches → plot-p01-apotheosis-race + plot-p02-scrip-run (both LIVE since 6a.6)
--   - 0/5 branches → plot-p03-drowned-letter (P-03 anchor work deferred per backlog #28)
--   - All 5 FKs resolve cleanly to seeded plot_template rows
--
-- trigger enum mapping rationale (per failure_state_trigger enum):
--   - fs-p01-f → spine_question_unanswered (apotheosis question RETIRED via mediation)
--   - fs-p01-a → central_npc_lost (Ilyra struck from Order's living register; identity loss)
--   - fs-p02-f → rival_plot_displacement (Bell Court audit-expansion displaces Tide League)
--   - fs-p02-a → pressure_overrun (scrip confidence cascade ignites)
--   - fs-p02-d → pressure_overrun (market panic on confirmed Shattering rumor)
--
-- Pre-flight (Discipline 9 + Risk 4):
--   - Pre-seed: content.failure_state_branch_template empty (verified 0 rows pre-C2)
--   - parent_plot_id FKs verified: plot-p01-apotheosis-race + plot-p02-scrip-run LIVE
--   - winner_set/loser_set actor FKs (seeded refs): all resolve
--   - Risk 4 Zod gate: ALL 5 ROWS PASS (FailureStateBranchTemplateSchemaZ;
--     enum compliance + minItems:1 on winner/loser sets + handle_window_days >= 3)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Branch 1: FS-P01-F Tide League Mediation
-- Source: Codex §13420-13433
-- Spine question functionally retired via Tide League brokered settlement
-- Closure: cleanest of all 21 branches (0 dangling refs)
-- ----------------------------------------------------------------------------
INSERT INTO "content"."failure_state_branch_template" (
  "branch_id", "parent_plot_id", "trigger", "cosmological_reach",
  "winner_set", "loser_set", "handle_window_days",
  "point_of_no_return_marker_ids"
) VALUES (
  'fs-p01-f-tide-league-mediation',
  'plot-p01-apotheosis-race',
  'spine_question_unanswered',
  'local',
  '[
    {"actor_kind": "faction", "actor_id": "fac-merchant-tide-league"}
  ]'::jsonb,
  '[
    {"actor_kind": "faction", "actor_id": "fac-drowned-church"},
    {"actor_kind": "faction", "actor_id": "fac-civic-bell-court"}
  ]'::jsonb,
  9,
  '["fs-por-p01-f-mediation-ceremony"]'::jsonb
)
ON CONFLICT ("branch_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Branch 2: FS-P01-A Bell Court Strike Succeeds
-- Source: Codex §13340-13353
-- Ilyra's name struck before silence resolves; Mad Hatter's "no answer" branch
-- v0_9_pending: npc-junior-magistrate-verro (career advancement actor)
-- ----------------------------------------------------------------------------
INSERT INTO "content"."failure_state_branch_template" (
  "branch_id", "parent_plot_id", "trigger", "cosmological_reach",
  "winner_set", "loser_set", "handle_window_days",
  "point_of_no_return_marker_ids"
) VALUES (
  'fs-p01-a-bell-court-strike',
  'plot-p01-apotheosis-race',
  'central_npc_lost',
  'local',
  '[
    {"actor_kind": "faction", "actor_id": "fac-civic-bell-court"},
    {"actor_kind": "npc", "actor_id": "npc-junior-magistrate-verro"}
  ]'::jsonb,
  '[
    {"actor_kind": "faction", "actor_id": "fac-drowned-church"},
    {"actor_kind": "npc", "actor_id": "npc-marrow-saint-ilyra"},
    {"actor_kind": "faction", "actor_id": "fac-merchant-tide-league"}
  ]'::jsonb,
  8,
  '["fs-por-p01-a-wax-sealed-letter-delivered"]'::jsonb
)
ON CONFLICT ("branch_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Branch 3: FS-P02-F Bell Court Audit Expansion
-- Source: Codex §13551-13565
-- Bell Court audit-expansion writ takes Tide League harbor-fees council ground
-- v0_9_pending: npc-junior-magistrate-verro (3-JM signatory; career advancement)
-- ----------------------------------------------------------------------------
INSERT INTO "content"."failure_state_branch_template" (
  "branch_id", "parent_plot_id", "trigger", "cosmological_reach",
  "winner_set", "loser_set", "handle_window_days",
  "point_of_no_return_marker_ids"
) VALUES (
  'fs-p02-f-bell-court-audit-expansion',
  'plot-p02-scrip-run',
  'rival_plot_displacement',
  'local',
  '[
    {"actor_kind": "faction", "actor_id": "fac-civic-bell-court"},
    {"actor_kind": "npc", "actor_id": "npc-junior-magistrate-verro"}
  ]'::jsonb,
  '[
    {"actor_kind": "faction", "actor_id": "fac-merchant-tide-league"},
    {"actor_kind": "faction", "actor_id": "fac-drowned-church"}
  ]'::jsonb,
  16,
  '["fs-por-p02-f-audit-expansion-writ-delivered"]'::jsonb
)
ON CONFLICT ("branch_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Branch 4: FS-P02-A Confidence Cascade
-- Source: Codex §13470-13483
-- Scrip-to-salt-coin valuation collapses sub-50; brokers withdraw; Sea-watch fades
-- v0_9_pending: fac-wax-guild (journeymen-paid-in-scrip loser-set member)
-- ----------------------------------------------------------------------------
INSERT INTO "content"."failure_state_branch_template" (
  "branch_id", "parent_plot_id", "trigger", "cosmological_reach",
  "winner_set", "loser_set", "handle_window_days",
  "point_of_no_return_marker_ids"
) VALUES (
  'fs-p02-a-confidence-cascade',
  'plot-p02-scrip-run',
  'pressure_overrun',
  'local',
  '[
    {"actor_kind": "faction", "actor_id": "fac-civic-bell-court"}
  ]'::jsonb,
  '[
    {"actor_kind": "faction", "actor_id": "fac-merchant-tide-league"},
    {"actor_kind": "npc", "actor_id": "npc-seawatch-sergeant-mer-caleth"},
    {"actor_kind": "npc", "actor_id": "npc-seawatch-tess-voryn"},
    {"actor_kind": "faction", "actor_id": "fac-wax-guild"}
  ]'::jsonb,
  9,
  '["fs-por-p02-a-broker-board-sub-50-cents"]'::jsonb
)
ON CONFLICT ("branch_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Branch 5: FS-P02-D Shattering Aftershock Confirmation
-- Source: Codex §13518-13532
-- Market panic on confirmed Shattering rumor; scrip drops to 31 cents
-- v0_9_pending: institution-numerand-academy (INTENTIONALLY OMITTED from
--   winner_set per Numerand-drift discipline: "reference-mention only, not
--   load-bearing"). Bell Court is the primary load-bearing winner. Witness-
--   payload TRUE per Death's chair-rule (Shattering is regional metaphysics).
-- ----------------------------------------------------------------------------
INSERT INTO "content"."failure_state_branch_template" (
  "branch_id", "parent_plot_id", "trigger", "cosmological_reach",
  "winner_set", "loser_set", "handle_window_days",
  "point_of_no_return_marker_ids"
) VALUES (
  'fs-p02-d-shattering-aftershock',
  'plot-p02-scrip-run',
  'pressure_overrun',
  'regional',
  '[
    {"actor_kind": "faction", "actor_id": "fac-civic-bell-court"}
  ]'::jsonb,
  '[
    {"actor_kind": "faction", "actor_id": "fac-merchant-tide-league"},
    {"actor_kind": "npc", "actor_id": "npc-seawatch-sergeant-mer-caleth"},
    {"actor_kind": "npc", "actor_id": "npc-seawatch-tess-voryn"}
  ]'::jsonb,
  15,
  '["fs-por-p02-d-broker-board-sub-40-cents"]'::jsonb
)
ON CONFLICT ("branch_id") DO NOTHING;
