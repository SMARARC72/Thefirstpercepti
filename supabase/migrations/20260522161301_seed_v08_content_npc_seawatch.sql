-- ============================================================================
-- Phase 24d / Session 6a / Phase 6a.4 — NPC seed: Sea-watch (Caleth + Voryn)
-- ============================================================================
-- Sixth (combined) per-NPC commit. Closes 6a.4. Pattern: soldier archetype +
-- Bell Court Sea-watch sub-faction. Vested/Cynical paired fingerprint per
-- PO.II Codex authoring.
--
-- Combined-commit rationale:
--   - Both are Bell Court Sea-watch sub-faction members (loyalty 4-5)
--   - Both share dockside patrol 08:00-14:00 (relational partner pair)
--   - Authoring depth differs (Caleth senior + Voryn junior); both fully
--     support Bundle A per Codex (no sentinel-string fallback needed)
--
-- Pattern decisions (Caleth):
--   - memory_archetype: "soldier" (watch — violence remembered, politics scrambled)
--   - ambition_tick.cadence: "irregular_per_assignment" (running out clock; low
--     intensity unless incident forces hand)
--   - closing_conditions: 3 entries (success/passover/death; death low-probability)
--   - faction_id: "fac-civic-bell-court" loyalty 4 (institutional vested)
--
-- Pattern decisions (Voryn):
--   - memory_archetype: "soldier" (watch — early-career variant; violence
--     under-encoded, social over-encoded)
--   - ambition_tick.cadence: "civic_6x_year" (per civic cycle; wide variance)
--   - closing_conditions: 3 entries (success/transfer/passover; NO death_state —
--     junior never put at lethal risk in slice per HC fingerprint slide content)
--   - faction_id: "fac-civic-bell-court" loyalty 3 (uncertain commitment)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Sergeant Mer Caleth (senior watch)
-- ----------------------------------------------------------------------------
INSERT INTO "public"."npc" (
  "npc_id", "name", "role", "desire", "fear", "current_plan",
  "want_model", "knowledge_tri_layer", "closing_conditions",
  "memory_archetype", "ambition_tick", "schedule_nesting",
  "stats", "derived_stats", "tags",
  "faction_links",
  "schema_version"
) VALUES (
  'npc-seawatch-sergeant-mer-caleth',
  'Sergeant Mer Caleth',
  'Senior Watchwoman of the Greywake Sea-watch',
  'Retire with a clean record. Four months remain in her service.',
  'That her last four months produce an incident requiring her testimony in a doctrinal court.',
  'Run out the clock: brief at HQ 06:00-08:00, dockside patrol with Voryn 08:00-14:00, civic district reports 14:00-18:00, home 18:00-22:00. Avoid being pulled into doctrinal court business.',
  -- want_model (clean-retirement drive; barter shapes by audience)
  '{
    "drive": {
      "description": "Retire cleanly. Four months remain in her service; the closing-condition race has a deadline.",
      "intensity": 4,
      "freshness_decay": 0
    },
    "barter": [
      {"offered": "information about which dockside warehouses Tide League actually uses", "cost_to_npc": 3, "audience_refuse": ["drowned_church"]},
      {"offered": "permission to read a sealed Sea-watch incident log (writ-permit OR verifiably outside both contesting factions)", "cost_to_npc": 4},
      {"offered": "her own quiet judgment on whether Bell-Magistrate Orro is right about The Unnamed (offered ONLY to no-faction-loyalty player at end of shift)", "cost_to_npc": 5}
    ],
    "kill_for": {
      "trigger_condition": "watch member under her supervision moved against; aggressor at lethal risk",
      "threshold": "legal force first; physical only if a watch member is at lethal risk",
      "target_class": "aggressor"
    },
    "fear_loss": {
      "what": "the clean-retirement timeline; doctrinal-court testimony would pull her in unwillingly",
      "urgency": 4,
      "abandons_drive_if_imminent": false
    }
  }'::jsonb,
  -- knowledge_tri_layer (operational watch knowledge; institutional reticence by audience)
  '{
    "knows": [
      {"fact_id": "fact-seawatch-funding-tied-to-tide-league-scrip-stability", "source_event_id": "evt-caleth-budget-briefing-historical", "certainty": 5, "last_recalled": "ongoing"},
      {"fact_id": "fact-tide-league-actual-warehouse-list", "source_event_id": "evt-caleth-dockside-patrol-decades", "certainty": 5, "last_recalled": "ongoing"},
      {"fact_id": "fact-two-prior-watch-members-quit-suddenly", "source_event_id": "evt-caleth-personnel-history", "certainty": 4},
      {"fact_id": "fact-magistrate-verro-inquiry-adjacent-to-shift", "source_event_id": "evt-caleth-shift-briefing-current", "certainty": 3, "last_recalled": "current_week"}
    ],
    "says": {
      "default_policy": "selective",
      "per_audience_overrides": {
        "bell_court_superior": "procedural_no_opinion",
        "drowned_church": "courteous_no_signal",
        "tide_league": "transactional_no_commitment",
        "fellow_seawatch": "occasionally_candid",
        "player_no_faction": "dry_observational"
      }
    },
    "believes": [
      {"proposition": "Years of service taught me more than my superiors know", "conviction": 5, "evidence_resistance": 4},
      {"proposition": "The Bell Court is procedurally correct most of the time and morally correct rarely", "conviction": 4, "evidence_resistance": 3},
      {"proposition": "The Unnamed is real; the Bell Courts jurisdictional claim over The Unnamed is doubtful; neither belief is for public discussion", "conviction": 4, "evidence_resistance": 4}
    ]
  }'::jsonb,
  -- closing_conditions (3 entries; ≥1 player_reachable; passover ships residue_drive)
  '[
    {
      "kind": "success_state",
      "description": "Clean four-month retirement completed without doctrinal-court testimony; Caleth transitions to retired-watch NPC (occasional witness role).",
      "player_reachable": true,
      "consequence_summary": "Caleth absent from active duty; available as occasional witness/informant for player; Sea-watch roster reduced by one senior; Voryn promotion accelerated."
    },
    {
      "kind": "passover_state",
      "description": "Caleth forced to testify in a doctrinal-civic dispute; retires under cloud.",
      "player_reachable": true,
      "consequence_summary": "Caleth retires with reputational damage; transitions to quiet contempt for the Court that abandoned her; becomes occasional informant to Drowned Church (player-aligned with Drowned Church gains a low-cost informant; player-aligned with Bell Court loses a procedural ally).",
      "residue_drive": {
        "description": "Quiet contempt for the Bell Court; willing to leak procedural details to Drowned Church contacts at low cost",
        "intensity": 3
      }
    },
    {
      "kind": "death_state",
      "description": "Caleth dies on duty (low probability per Codex; her competence makes this content-relevant but not likely without direct player intervention).",
      "player_reachable": false,
      "consequence_summary": "Sea-watch loses senior commander mid-retirement window; Bell Court emergency promotion (Voryn promoted unprepared OR external senior reassigned); Drowned Church + Tide League both flag the destabilization."
    }
  ]'::jsonb,
  'soldier',
  -- ambition_tick (irregular per assignment; running out clock)
  '{
    "cadence": "irregular_per_assignment",
    "success_streak": 0,
    "last_attempt": null
  }'::jsonb,
  -- schedule_nesting (Bell Court Sea-watch shift; variance ±30 min)
  '{
    "local_pattern": {
      "summary": "Watch HQ 06:00-08:00 (briefing); dockside patrol with Voryn 08:00-14:00; civic district 14:00-18:00 (reports); home 18:00-22:00. Off-duty location varies between dockside tavern and home."
    },
    "nested_under_institution_id": "inst-civic-bell-court",
    "variance_seed": "caleth-seawatch-senior-30min-shift-offset"
  }'::jsonb,
  -- stats (senior soldier: solid Body 14, high Sense 14 + Will 13 + Authority 8, stiff arm = reduced Grace)
  '{
    "body": 14,
    "grace": 9,
    "sense": 14,
    "mind": 11,
    "will": 13,
    "presence": 12,
    "authority": 8,
    "ruin": 5,
    "creation": 3
  }'::jsonb,
  -- derived_stats (translation_rules §1; no race modifier)
  '{
    "str": 14,
    "dex": 9,
    "con": 14,
    "int": 11,
    "wis": 14,
    "cha": 12
  }'::jsonb,
  -- tags
  '["named-slice-npc", "seawatch-sub-faction", "bell-court-vested", "soldier-archetype", "vested-fingerprint", "retirement-countdown", "po-ii-authored", "paired-with-voryn", "slice"]'::jsonb,
  -- faction_links (Bell Court Sea-watch sub-faction; institutional vested)
  '[{"faction_id": "fac-civic-bell-court", "role": "seawatch_sergeant_senior", "loyalty": 4}]'::jsonb,
  'v0.8'
)
ON CONFLICT ("npc_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Watchwoman Tess Voryn (junior watch)
-- ----------------------------------------------------------------------------
INSERT INTO "public"."npc" (
  "npc_id", "name", "role", "desire", "fear", "current_plan",
  "want_model", "knowledge_tri_layer", "closing_conditions",
  "memory_archetype", "ambition_tick", "schedule_nesting",
  "stats", "derived_stats", "tags",
  "faction_links",
  "schema_version"
) VALUES (
  'npc-seawatch-tess-voryn',
  'Watchwoman Tess Voryn',
  'Junior Sea-watch, four years service',
  'Know whether the watch is the right place for her, by the end of next civic cycle.',
  'Commit to the watch and find it was a mistake; OR leave the watch and find she should have stayed. Both fears real.',
  'Run partner-shift with Caleth: HQ briefing 06:00-08:00, dockside patrol 08:00-14:00, bunk-house or off-duty 14:00-22:00. Watch for signals about whether to stay or leave.',
  -- want_model (uncertainty-resolution drive; low-cost gossip barter; uncommitted kill_for threshold)
  '{
    "drive": {
      "description": "Resolve uncertainty about whether the watch is the right place for her, by the end of next civic cycle. Open to being convinced either way.",
      "intensity": 3,
      "freshness_decay": 0
    },
    "barter": [
      {"offered": "hearsay from the dockside about Tide League scrip rates", "cost_to_npc": 1},
      {"offered": "her own observation that Sergeant Caleth has been different the last month", "cost_to_npc": 2, "requires": "any_rapport"},
      {"offered": "fragments of Junior Magistrate Verros inquiry (overheard hallway conversations)", "cost_to_npc": 3, "requires": "trust_outside_watch_chain"}
    ],
    "kill_for": {
      "trigger_condition": "fellow watch member at lethal risk; will draw before legal protocol if she is the only one on scene (has not done this yet; uncertain whether she will)",
      "threshold": "lethal_risk",
      "target_class": "aggressor"
    },
    "fear_loss": {
      "what": "the choice itself; either path may be the wrong one",
      "urgency": 4,
      "abandons_drive_if_imminent": false
    }
  }'::jsonb,
  -- knowledge_tri_layer (junior knowledge; over-encoded social memory; under-encoded violence)
  '{
    "knows": [
      {"fact_id": "fact-caleth-counting-down-to-retirement", "source_event_id": "evt-voryn-partner-observation-monthly", "certainty": 4, "last_recalled": "current_week"},
      {"fact_id": "fact-verro-inquiry-hallway-fragments", "source_event_id": "evt-voryn-hq-overheard-fragments", "certainty": 2, "last_recalled": "current_week"},
      {"fact_id": "fact-two-dockside-tavernkeepers-by-name", "source_event_id": "evt-voryn-patrol-rounds-quarterly", "certainty": 5, "last_recalled": "ongoing"},
      {"fact_id": "fact-one-training-cohort-quit-took-tide-league-security", "source_event_id": "evt-voryn-cohort-attrition", "certainty": 4}
    ],
    "says": {
      "default_policy": "selective",
      "per_audience_overrides": {
        "anyone_friendly": "more_than_she_should",
        "sergeant_caleth": "deferential",
        "civilian_unknown": "by_the_book",
        "player_open_handed": "talkative",
        "player_as_authority": "terse"
      }
    },
    "believes": [
      {"proposition": "My uncertainty about the watch is the most important thing about me right now", "conviction": 4, "evidence_resistance": 2},
      {"proposition": "Caleth knows the right answer but wont tell me", "conviction": 4, "evidence_resistance": 3},
      {"proposition": "The Unnamed is probably a real thing I dont understand", "conviction": 3, "evidence_resistance": 1},
      {"proposition": "Bell Court magistrates are mostly tired men", "conviction": 3, "evidence_resistance": 2}
    ]
  }'::jsonb,
  -- closing_conditions (3 entries; NO death_state per Codex slice constraint; ≥1 player_reachable)
  '[
    {
      "kind": "success_state",
      "description": "Voryn stays; promoted to senior tier; transitions to mid-career Sea-watch NPC. Fingerprint slides Cynical → Vested.",
      "player_reachable": true,
      "consequence_summary": "Voryn promoted; becomes institutional ally for Bell Court-aligned players; her early-career social-memory advantage carries forward as senior; Sea-watch roster stabilized post-Caleth retirement."
    },
    {
      "kind": "transfer_state",
      "description": "Voryn leaves the watch; takes work with Tide League OR Drowned Church (HC contradiction: which is content-driven). Fingerprint slides Cynical → Fugitive (exit-glance tells become permanent).",
      "player_reachable": true,
      "consequence_summary": "Voryn no longer Sea-watch; reappears in target factions roster; Bell Court Sea-watch sub-faction destabilized (two senior departures in same cycle if paired with Caleth retirement); player may encounter her in new institutional context."
    },
    {
      "kind": "passover_state",
      "description": "Voryn stays unhappily; transitions to residue_drive = quiet competence, occasional informant.",
      "player_reachable": true,
      "consequence_summary": "Voryn remains Sea-watch but disengaged; available as low-trust informant for non-Bell-Court players; never promoted; her unresolved uncertainty becomes a permanent character feature.",
      "residue_drive": {
        "description": "Quiet competent service without commitment; occasional informant to whoever earns minimum trust outside the watch chain",
        "intensity": 2
      }
    }
  ]'::jsonb,
  'soldier',
  -- ambition_tick (per civic cycle; ambition itself in flux; most ticks resolve as introspection)
  '{
    "cadence": "civic_6x_year",
    "success_streak": 0,
    "last_attempt": null
  }'::jsonb,
  -- schedule_nesting (Bell Court Sea-watch shift; off-duty varies)
  '{
    "local_pattern": {
      "summary": "Watch HQ 06:00-08:00 (briefing); dockside patrol with Caleth 08:00-14:00; bunk-house or off-duty 14:00-22:00 (varies). Mood per playthrough: talkative / withdrawn / restless."
    },
    "nested_under_institution_id": "inst-civic-bell-court",
    "variance_seed": "voryn-seawatch-junior-mood-variant"
  }'::jsonb,
  -- stats (junior soldier: moderate Body 11, decent Sense 12 + Grace 12, lower Authority 4 + Will 9)
  '{
    "body": 11,
    "grace": 12,
    "sense": 12,
    "mind": 11,
    "will": 9,
    "presence": 11,
    "authority": 4,
    "ruin": 3,
    "creation": 3
  }'::jsonb,
  -- derived_stats (translation_rules §1; no race modifier)
  '{
    "str": 11,
    "dex": 12,
    "con": 12,
    "int": 11,
    "wis": 12,
    "cha": 11
  }'::jsonb,
  -- tags
  '["named-slice-npc", "seawatch-sub-faction", "bell-court-uncertain", "soldier-archetype", "cynical-fingerprint", "fingerprint-slide-candidate", "po-ii-authored", "paired-with-caleth", "slice"]'::jsonb,
  -- faction_links (Bell Court Sea-watch sub-faction; uncertain commitment)
  '[{"faction_id": "fac-civic-bell-court", "role": "seawatch_watchwoman_junior", "loyalty": 3}]'::jsonb,
  'v0.8'
)
ON CONFLICT ("npc_id") DO NOTHING;
