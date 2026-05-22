-- ============================================================================
-- Phase 24d / Session 6a / Phase 6a.4 — NPC seed: The Butcher Who Repeats
-- ============================================================================
-- Fifth (last named) per-NPC commit. Pattern: contradiction_bearing archetype
-- with stabilization-pattern + drowned-church-adjacent + do-not-disrupt-cycle.
--
-- Pattern decisions:
--   - memory_archetype: "contradiction_bearing" (like Listening Child)
--   - ambition_tick.cadence: "special" (preferred "silence_held_indefinite"
--     NOT in v0.8 enum; logged for v0.8.1 patch)
--   - closing_conditions: 3 entries (Q-ILYRA-2 floor=2 ceiling=3 for
--     Butcher per ratified expected counts). Cycle-stabilization means
--     possibility space is narrow:
--       1. special_state: player provides closing utterance during the
--          cycle pause; Butcher dispersed back into substrate intentionally
--       2. passover_state: cycle-break attempt by player disperses Butcher
--          unintentionally (player_reachable=true but undesired outcome)
--       3. death_state: ritual-tampering by Drowned Church zealot dissolves
--          the stabilization pattern catastrophically
--     ≥1 player_reachable (both special_state + passover_state are reachable)
--   - faction_id: "fac-drowned-church" (drowned-church-adjacent per runtime)
--   - Stats: substrate-fragment profile — moderate Body (large man); minimal
--     Mind/Will (continuity thinned); high Sense + Creation; moderate Ruin
--     (the cuts ARE rendered tissue of canon events)
-- ============================================================================

INSERT INTO "public"."npc" (
  "npc_id", "name", "role", "desire", "fear", "current_plan",
  "want_model", "knowledge_tri_layer", "closing_conditions",
  "memory_archetype", "ambition_tick", "schedule_nesting",
  "stats", "derived_stats", "tags",
  "faction_links",
  "schema_version"
) VALUES (
  'npc-butcher-who-repeats',
  'The Butcher Who Repeats',
  'Marrow-Butcher (Drowned Church-adjacent)',
  '(contradiction-bearing — the Butcher exists in a state where "wanting" has been thinned to a recurring observation)',
  '(the cycle being broken; dispersing into the substrate before the next canon-event renders)',
  'Continue the five-minute cycle: wrap a cut, weigh, mark, set down. Wait for the next canon-event rendering. Do not break the cycle.',
  -- want_model (cycle-stabilized; barter happens only at the cycle pause)
  '{
    "drive": {
      "description": "Maintain the five-minute cycle without break; allow canon-event renderings to deposit cuts; stabilize against substrate dispersal.",
      "intensity": 3,
      "freshness_decay": 0
    },
    "barter": [
      {"offered": "single cut from the stall (the player can name which one; the Butcher will not stop the cycle, will wrap it at the next pause)", "cost_to_npc": 2},
      {"offered": "the name of whose name was struck to produce a specific cut (answered at the next pause; flat affect)", "cost_to_npc": 3}
    ],
    "kill_for": {
      "trigger_condition": "never — the Butcher cannot interrupt the cycle even to defend himself; harm-causing requires continuity he no longer possesses",
      "threshold": "warning",
      "target_class": "self"
    },
    "fear_loss": {
      "what": "the cycle pattern; without it the substrate disperses what is left",
      "urgency": 5,
      "abandons_drive_if_imminent": false
    }
  }'::jsonb,
  -- knowledge_tri_layer (substrate-thinned knowledge; says only at cycle pauses)
  '{
    "knows": [
      {"fact_id": "fact-cuts-are-rendered-canon-event-tissue", "source_event_id": "evt-butcher-post-ritual-emergence", "certainty": 5, "last_recalled": "ongoing"},
      {"fact_id": "fact-cycle-is-stabilization-pattern", "source_event_id": "evt-butcher-cycle-discovery", "certainty": 5, "last_recalled": "ongoing"},
      {"fact_id": "fact-each-cut-has-source-struck-name", "source_event_id": "evt-butcher-marrow-rendering-knowledge-inheritance", "certainty": 4}
    ],
    "says": {
      "default_policy": "selective",
      "per_audience_overrides": {
        "drowned_church_marrow_saint": "guarded",
        "bell_court_magistrate": "selective",
        "cycle-disrupter": "silent",
        "cycle-respecter": "open"
      }
    },
    "believes": [
      {
        "proposition": "The cycle is what remains; breaking it removes what little continuity I have",
        "conviction": 5,
        "evidence_resistance": 5
      },
      {
        "proposition": "The cuts are honest tissue; whoever asks about a cut deserves the source-name if they understand what they are asking",
        "conviction": 4,
        "evidence_resistance": 4
      }
    ]
  }'::jsonb,
  -- closing_conditions (3 entries; player_reachable on first two)
  '[
    {
      "kind": "special_state",
      "description": "Player provides the closing utterance during a cycle pause (substrate-aware verbal acknowledgment that the Butcher''s rendering work is consensual at salt-oath level); Butcher dispersed back into substrate intentionally.",
      "player_reachable": true,
      "consequence_summary": "The Butcher Who Repeats permanently absent from the market district stall; cuts no longer appear; substrate-naming-process re-routes through a new anchor (likely Listening Child OR fountain directly). Player gains substrate-acknowledgment recognition (Drowned Church + canon-progression credit)."
    },
    {
      "kind": "passover_state",
      "description": "Player breaks the cycle unintentionally (interrupting at the wrong moment, taking a cut without naming it, or asking a question the Butcher cannot answer without breaking pattern). Substrate disperses the Butcher unintentionally.",
      "player_reachable": true,
      "consequence_summary": "Butcher permanently absent; substrate dispersal was not consensual; Drowned Church + Bell Court factions both flag the player as a substrate-disrupter (negative civic + theological notice; faction-stance shifts hostile).",
      "residue_drive": {
        "description": "(no residue; substrate-dispersed entities do not have ongoing drives)",
        "intensity": 1
      }
    },
    {
      "kind": "death_state",
      "description": "Drowned Church zealot or Bell Court tampering dissolves the stabilization pattern catastrophically (e.g. ritual-undoing, sustained ledger-naming of the source-cuts).",
      "player_reachable": false,
      "consequence_summary": "Catastrophic substrate event in the market district; multiple canon-event renderings dispersed; Bell Court emergency contradiction-ledger session; Drowned Church internal schism between salt-vow + marrow-rendering coalitions deepens."
    }
  ]'::jsonb,
  'contradiction_bearing',
  -- ambition_tick (cadence "special" — preferred "silence_held_indefinite" NOT in v0.8 enum)
  '{
    "cadence": "special",
    "success_streak": 0,
    "last_attempt": null
  }'::jsonb,
  -- schedule_nesting (drowned-church-adjacent but market district; cycle IS the schedule)
  '{
    "local_pattern": {
      "summary": "Five-minute cycle, perpetual during market hours: wrap a cut → weigh → mark the paper → set down → repeat. Speaks at the next pause when addressed. Will not eat. Will not blink at intervals shorter than five minutes."
    },
    "nested_under_institution_id": "inst-drowned-church",
    "variance_seed": "butcher-cycle-perpetual"
  }'::jsonb,
  -- stats (substrate-fragment profile — moderate Body 13, minimal Mind/Will 4-5, high Sense + Creation)
  '{
    "body": 13,
    "grace": 8,
    "sense": 14,
    "mind": 5,
    "will": 4,
    "presence": 9,
    "authority": 2,
    "ruin": 4,
    "creation": 6
  }'::jsonb,
  -- derived_stats (translation_rules §1; no race modifier)
  '{
    "str": 13,
    "dex": 8,
    "con": 14,
    "int": 5,
    "wis": 14,
    "cha": 9
  }'::jsonb,
  -- tags
  '["named-slice-npc", "contradiction-bearing", "drowned-church-adjacent", "stabilization-pattern", "do-not-disrupt-cycle", "contradiction_bearing_archetype", "cluster_a", "bundle_a_authored", "slice"]'::jsonb,
  -- faction_links (Drowned Church-adjacent; not core member)
  '[{"faction_id": "fac-drowned-church", "role": "marrow_renderer_adjacent", "loyalty": 2}]'::jsonb,
  'v0.8'
)
ON CONFLICT ("npc_id") DO NOTHING;
