-- ============================================================================
-- Phase 24d / Session 6a / Phase 6a.4 — NPC seed: The Listening Child
-- ============================================================================
-- Fourth per-NPC commit. Pattern: contradiction_bearing archetype (Cluster A
-- substrate-emergent witness; cannot-be-killed-in-slice per Codex BES.II
-- constraint-dominant pattern).
--
-- Pattern decisions (post-Ilyra/Orro/Venn pattern transfer):
--   - memory_archetype: "contradiction_bearing" (Codex Cluster A class)
--   - ambition_tick.cadence: "special" — chosen because preferred
--     "contradiction_triggered" is NOT in v0.8 enum (pattern-check Finding 1).
--     Flagged to v0.8.1 patch list via OPEN_QUESTIONS.md.
--   - closing_conditions: 2 entries (Q-ILYRA-2 floor=2; Listening Child is
--     constraint-dominant with narrow possibility space). NO death_state
--     per Codex "cannot-be-killed-in-slice"; instead 2 special_state
--     entries representing the witness-anchor's two possible end-states.
--     ≥1 player_reachable=true via the gift-pebble path.
--   - faction_id: NULL (canon-event-emergent; uncategorizable)
--   - role: "(no role — does not have one)" preserved per runtime
--   - Stats authored per substrate-anchor profile: very high Sense; minimal
--     Body/Grace/Authority/Ruin; moderate Mind/Will/Presence; high Creation
--     (witnessing IS creating in the substrate sense)
--
-- Discipline 6 (sentinel-string) NOT triggered: Listening Child is fully-
-- authored named-slice NPC with narrative depth, not scenery-tier. The
-- "narrow possibility space" is intentional shape, not stub.
--
-- Discipline 8 NOT triggered: knowledge_tri_layer.believes uses schema-
-- native shape; no public.belief rows seeded.
-- ============================================================================

INSERT INTO "public"."npc" (
  "npc_id", "name", "role", "desire", "fear", "current_plan",
  "want_model", "knowledge_tri_layer", "closing_conditions",
  "memory_archetype", "ambition_tick", "schedule_nesting",
  "stats", "derived_stats", "tags",
  "faction_links",
  "schema_version"
) VALUES (
  'npc-the-listening-child',
  'The Listening Child',
  '(no role — does not have one)',
  '(unstated; witness-anchor wants are constraint-dominant — to remain present at the fountain''s lip and listen upward)',
  '(no fear in the conventional sense; the child is contradiction-bearing and the substrate''s naming process cannot fear)',
  'Sit at the lip of the dry fountain. Listen. Wait for the moment of substrate-aware utterance from a worthy speaker. If gifted at that moment, surrender the pebble.',
  -- want_model (constraint-dominant; barter is the pebble itself via gift mechanic)
  '{
    "drive": {
      "description": "Remain present at the fountain''s lip; witness the substrate''s naming process; surrender the pebble to the speaker of the right utterance.",
      "intensity": 3,
      "freshness_decay": 0
    },
    "barter": [
      {"offered": "the pebble (gifted_only — yields item-listening-childs-pebble)", "cost_to_npc": 5}
    ],
    "kill_for": {
      "trigger_condition": "never — Listening Child cannot be the agent of harm; cannot-be-killed-in-slice constraint extends to harm-causing as well",
      "threshold": "warning",
      "target_class": "self"
    },
    "fear_loss": {
      "what": "(none in the conventional sense; the substrate''s naming process cannot lose what it has not claimed)",
      "urgency": 1,
      "abandons_drive_if_imminent": false
    }
  }'::jsonb,
  -- knowledge_tri_layer (substrate-aware; minimal said; cannot speak first per runtime)
  '{
    "knows": [
      {"fact_id": "fact-substrate-naming-process-active", "source_event_id": "evt-listening-child-substrate-emergence", "certainty": 5, "last_recalled": "ongoing"},
      {"fact_id": "fact-fountain-listens-deeply", "source_event_id": "evt-listening-child-vigil-perpetual", "certainty": 5, "last_recalled": "ongoing"}
    ],
    "says": {
      "default_policy": "silent",
      "per_audience_overrides": {
        "speaker_of_practicing_water_utterance": "selective",
        "marrow_saint": "silent",
        "bell_magistrate": "silent",
        "tide_league_broker": "silent"
      }
    },
    "believes": [
      {
        "proposition": "The fountain is listening; the listening continues regardless of who hears it",
        "conviction": 5,
        "evidence_resistance": 5
      },
      {
        "proposition": "Only a speaker of the substrate-aware utterance can be gifted the pebble; the pebble cannot be taken",
        "conviction": 5,
        "evidence_resistance": 5
      }
    ]
  }'::jsonb,
  -- closing_conditions (2 entries — narrow possibility space; cannot-be-killed; ≥1 player_reachable)
  '[
    {
      "kind": "special_state",
      "description": "Player speaks ''practicing water'' aloud at the dry fountain at the right moment; Listening Child gifts the pebble + remains at the fountain as ongoing witness-anchor.",
      "player_reachable": true,
      "consequence_summary": "Player receives item-listening-childs-pebble (acquisition_method=gifted_only); Listening Child continues vigil; player gains substrate-aware-utterance recognition (canon-progression credit + Drowned Church + Bell Court factional notice)."
    },
    {
      "kind": "passover_state",
      "description": "The substrate''s naming process completes without the player being the speaker of the right utterance; the Listening Child is re-anchored elsewhere by the substrate.",
      "player_reachable": false,
      "consequence_summary": "Listening Child no longer appears at the fountain; pebble path closed for this campaign; substrate-aware-utterance recognition routed to whoever the substrate next anchors.",
      "residue_drive": {
        "description": "Re-anchor at the next substrate-naming-significant location",
        "intensity": 3
      }
    }
  ]'::jsonb,
  'contradiction_bearing',
  -- ambition_tick (cadence "special" — preferred "contradiction_triggered" NOT in v0.8 enum)
  '{
    "cadence": "special",
    "success_streak": 0,
    "last_attempt": null
  }'::jsonb,
  -- schedule_nesting (NOT institutionally nested; nested_under_institution_id uses a sentinel — Listening Child is uncategorizable, no institution houses them)
  '{
    "local_pattern": {
      "summary": "Daily perpetual: present at the dry fountain''s lip from dawn through dusk; absent at night via substrate-elsewhere displacement (nobody knows where the child sleeps)."
    },
    "nested_under_institution_id": "NO_INSTITUTION_CANON_EVENT_EMERGENT",
    "variance_seed": "listening-child-substrate-perpetual"
  }'::jsonb,
  -- stats (substrate-anchor profile — very high Sense, minimal Body/Authority/Ruin; high Creation)
  '{
    "body": 3,
    "grace": 6,
    "sense": 18,
    "mind": 10,
    "will": 12,
    "presence": 11,
    "authority": 0,
    "ruin": 0,
    "creation": 8
  }'::jsonb,
  -- derived_stats (translation_rules §1; substrate-anchor cannot be normalized to 5e baseline; values per formula)
  '{
    "str": 4,
    "dex": 6,
    "con": 8,
    "int": 10,
    "wis": 18,
    "cha": 11
  }'::jsonb,
  -- tags
  '["named-slice-npc", "canon-event-emergent", "uncategorizable", "tonal-anchor", "cannot-be-killed-in-slice", "contradiction_bearing_archetype", "constraint_dominant", "cluster_a", "bundle_a_authored", "slice"]'::jsonb,
  -- faction_links (none — Listening Child is uncategorizable; substrate-emergent)
  '[]'::jsonb,
  'v0.8'
)
ON CONFLICT ("npc_id") DO NOTHING;
