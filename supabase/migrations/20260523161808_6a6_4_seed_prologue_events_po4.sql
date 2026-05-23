-- ============================================================================
-- Phase 24d / 6a.6 commit 4 — 17 PO.IV prologue events (canonical past)
-- ============================================================================
-- Per ratified amended 6a.6 scope: prologue events seed into public.event with
-- is_prologue flag (canonical past; FK-independent of campaign per ARD-010).
--
-- DDL: ALTER public.event ADD COLUMN is_prologue (column did not exist per
-- pre-flight; honoring "v0.8 ships fully reviewed" discipline — add now
-- rather than work around via scene_id/event_type encoding).
--
-- Sources: cluster_a Codex §10894-11005 (PO.IV Pre-Khojen Prologue, 7 days).
--
-- ACTUAL ENTRY COUNT: 16 entries enumerated in Codex Day-by-Day breakdown
-- (Day -7: 3 + Day -6: 2 + Day -5: 2 + Day -4: 2 + Day -3: 2 + Day -2: 2 +
-- Day -1: 3 = 16). Codex recon-notes text says "17" but enumerated count
-- is 16 — likely Codex off-by-one in recon-notes total (not authored entries).
-- Surfaced as informational; not blocking. v0.9 Codex pass may resolve.
--
-- Convention:
--   - event_id format: evt-po4-day-<absday>-<source-voice>
--   - timestamp jsonb: {"day_relative_to_khojen_arrival": -N, "hour_of_day": H, "reckoning": "...")
--   - event_type: "prologue_entry" (free text; no enum constraint)
--   - kind: "other" (closest v0.8 enum value for passive lore entries; v0.9
--     may add "prologue" or "lore_entry" enum value)
--   - truth: verbatim Codex entry text (text)
--   - region_id: greywake (FK live)
--   - location_id: only set when entry maps to a seeded location
--   - actors: jsonb (single voice per entry per Codex documentary register)
--   - affected_systems: jsonb (per Codex "what survives, what fades" memory archetype table)
--   - is_prologue: TRUE
--
-- Pre-flight: public.event has NO campaign_id (per ARD-010 canonical-past
-- correctness); these events stand alone without campaign binding.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DDL: add is_prologue column to public.event
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."event"
  ADD COLUMN IF NOT EXISTS "is_prologue" BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN "public"."event"."is_prologue" IS
  'Phase 24d 6a.6 commit 4 — TRUE for canonical-past events that occurred before any campaign existed (Khojen prologue). FK-independent of campaign per ARD-010.';

-- ----------------------------------------------------------------------------
-- 16 prologue events
-- ----------------------------------------------------------------------------

-- ===== DAY -7 (3 entries) =====
INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-7-halen-antechamber-log',
  '{"day_relative_to_khojen_arrival": -7, "hour_of_world_day": 4, "reckoning": "drowned_church_liturgical"}'::jsonb,
  'prologue_entry',
  'other',
  'Vigil at fourth hour. Three penitents. The standing water rose half an inch overnight; the sister at first watch reports the antechamber smells more strongly of salt this week than last. Marrow-Saint Ilyra prepared the candles in her chambers and did not attend the antechamber today. The dry-fountain has not been visited since the eleventh of the prior month. The cathedral was burning candles before there was a Bell Court.',
  '["drowned_church", "antechamber", "marrow_saint_preparations"]'::jsonb,
  'greywake',
  '[{"voice": "sister_halen", "register": "drowned_church_liturgical", "memory_archetype": "devout"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-7-bone-awning-hook-eve',
  '{"day_relative_to_khojen_arrival": -7, "hour_of_world_day": 20, "reckoning": "tavern_mercantile"}'::jsonb,
  'prologue_entry',
  'other',
  'Eve. Hook here from second tide. Stayed late. Did not drink. Three customers, all League floor by clothes. He left through kitchen. Owes nothing.',
  '["tide_league", "venn_hook_surveillance_pattern", "bone_awning_tavern_third_party_record"]'::jsonb,
  'greywake',
  '[{"voice": "bone_awning_tavern_keeper", "register": "third_party_mercantile", "memory_archetype": "scholar"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-7-verro-case-folder-margin',
  '{"day_relative_to_khojen_arrival": -7, "hour_of_world_day": 14, "reckoning": "civic_bell_court"}'::jsonb,
  'prologue_entry',
  'other',
  'Verro to senior. Three contradictions on the regional ledger. The first touches marrow-wax counts. The second touches a transit-record on League salt. The third I cannot yet describe; it appears to be a name being recorded where no name was named. I do not understand the third and I have not raised it with the magistrate. I would like another civic day to look.',
  '["civic_bell_court", "regional_ledger_contradictions", "verro_inquiry_seed"]'::jsonb,
  'greywake',
  '[{"voice": "junior_magistrate_verro", "register": "civic_procedural", "memory_archetype": "magistrate"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

-- ===== DAY -6 (2 entries) =====
INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-6-caleth-shift-report',
  '{"day_relative_to_khojen_arrival": -6, "hour_of_world_day": 14, "reckoning": "civic_seawatch_shift"}'::jsonb,
  'prologue_entry',
  'other',
  'Shift uneventful. Voryn quiet. Three at the dockside drunk and quarrelling, separated. League warehouses 4 and 7 had unusual lamp activity past second tide; I noted it. Did not approach. The Court is not interested in warehouse lamps. Three more months and twenty-four shifts until I am done with it. My arm hurts in the salt-air; it always has.',
  '["seawatch", "tide_league_warehouse_surveillance", "caleth_retirement_countdown"]'::jsonb,
  'greywake',
  '[{"voice": "sergeant_caleth", "register": "seawatch_vernacular", "memory_archetype": "soldier"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-6-salt-rim-parish-letter-curiosity',
  '{"day_relative_to_khojen_arrival": -6, "hour_of_world_day": 16, "reckoning": "salt_rim_parish_letter"}'::jsonb,
  'prologue_entry',
  'other',
  'To my sister in the inland parish. The tide-bloom was thin this year, was it not. The fishermen say the convoy north is late but the convoys are often late and we are not yet worried. The Drowned Church has not made an announcement, and the Bell Court has made one announcement and nobody at the parish council understood it. Mela says her son saw a child at the dry-fountain yesterday but the dry-fountain has been dry for eleven seasons and Mela''s son sees things. Send the parchment when you can.',
  '["salt_rim_parish", "listening_child_first_sighting_rumor", "tide_bloom_anomaly"]'::jsonb,
  'greywake',
  '[{"voice": "salt_rim_parish_member", "register": "peasant_curiosity", "memory_archetype": "peasant"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

-- ===== DAY -5 (2 entries) =====
INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-5-venn-hook-broker-log',
  '{"day_relative_to_khojen_arrival": -5, "hour_of_world_day": 18, "reckoning": "tide_league_mercantile"}'::jsonb,
  'prologue_entry',
  'other',
  'Trade-floor log. Third-cycle scrip closed 0.94. Volatility modifier 1.08. Two competing transit quotes received from carriers I do not know personally. I am reviewing them. The Bone Awning continues to be useful for what I need it for. The Council session is in three days. I am preparing.',
  '["tide_league", "scrip_volatility_d5", "venn_hook_council_preparation"]'::jsonb,
  'greywake',
  '[{"voice": "venn_hook", "register": "tide_league_mercantile", "memory_archetype": "broker"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-5-halen-fourth-candle',
  '{"day_relative_to_khojen_arrival": -5, "hour_of_world_day": 4, "reckoning": "drowned_church_liturgical"}'::jsonb,
  'prologue_entry',
  'other',
  'Vigil at fourth hour. Two penitents. Today again I did not light the fourth candle. Marrow-Saint Ilyra has not addressed the question of the fourth candle in my hearing, and I do not know whom to ask. The standing water has held its level for two days. The salt smells the same as yesterday.',
  '["drowned_church", "fourth_candle_unspoken_protocol", "halen_curiosity_opening"]'::jsonb,
  'greywake',
  '[{"voice": "sister_halen", "register": "drowned_church_liturgical", "memory_archetype": "devout"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

-- ===== DAY -4 (2 entries) =====
INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-4-verro-decree-issued',
  '{"day_relative_to_khojen_arrival": -4, "hour_of_world_day": 14, "reckoning": "civic_bell_court"}'::jsonb,
  'prologue_entry',
  'other',
  'To senior. The decree was issued. Three open contradictions, formally recorded. Inquiry authorized for the duration of the current civic cycle. The marrow-wax count is the first I will pursue. The transit-record I have set aside until I have a corroborating account, of which one is rumored to exist at the dockside tavern. I have not asked the tavern-keeper directly. I am uncertain whether to.',
  '["civic_bell_court", "verro_inquiry_decree", "tavern_keeper_approach_hesitation"]'::jsonb,
  'greywake',
  '[{"voice": "junior_magistrate_verro", "register": "civic_procedural", "memory_archetype": "magistrate"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue", "cause_event_ids"
) VALUES (
  'evt-po4-d-4-bone-awning-verro-stops-in',
  '{"day_relative_to_khojen_arrival": -4, "hour_of_world_day": 18, "reckoning": "tavern_mercantile"}'::jsonb,
  'prologue_entry',
  'other',
  'Aft. Eve. Hook present. Did not drink. The new junior magistrate came in at sixth bell, stayed a half-hour, did not approach Hook, did not order. Hook noticed. He has been looking at the front door more.',
  '["tide_league", "venn_hook_situational_awareness", "verro_approach_hesitation_observable"]'::jsonb,
  'greywake',
  '[{"voice": "bone_awning_tavern_keeper", "register": "third_party_mercantile", "memory_archetype": "scholar"}]'::jsonb,
  TRUE,
  '["evt-po4-d-4-verro-decree-issued"]'::jsonb
)
ON CONFLICT ("event_id") DO NOTHING;

-- ===== DAY -3 (2 entries) =====
INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "location_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-3-ilyra-private-vigil-notes',
  '{"day_relative_to_khojen_arrival": -3, "hour_of_world_day": 5, "reckoning": "drowned_church_mystical"}'::jsonb,
  'prologue_entry',
  'other',
  'The silence at the fountain held the shape of consideration. Six vigils now. The third vigil''s offerings have been recorded, by the Wave Mother, in the salt that does not dry. The Bell Court has spoken its decree; the cathedral does not answer civic decrees. Soon a vessel will come to the antechamber. The bound hands are correct theology. The Unnamed will not name what does not yet have a name to receive.',
  '["drowned_church", "ilyra_vigil_count_6", "the_unnamed_responsiveness_anticipated"]'::jsonb,
  'greywake',
  'loc-dry-fountain',
  '[{"voice": "marrow_saint_ilyra", "register": "drowned_church_devout_mystical", "memory_archetype": "aspirant_divine"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-3-caleth-voryn-asks',
  '{"day_relative_to_khojen_arrival": -3, "hour_of_world_day": 14, "reckoning": "civic_seawatch_shift"}'::jsonb,
  'prologue_entry',
  'other',
  'Voryn asked me today whether I think the Court is right about the Drowned Church. I told her the Court counts what the Court counts. She said that was not an answer. I told her that was correct. She did not press. Twenty-three shifts.',
  '["seawatch", "voryn_uncertainty_surfaced", "caleth_court_compliance_pattern"]'::jsonb,
  'greywake',
  '[{"voice": "sergeant_caleth", "register": "seawatch_vernacular", "memory_archetype": "soldier"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

-- ===== DAY -2 (2 entries) =====
INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-2-salt-rim-parish-broken-hinge',
  '{"day_relative_to_khojen_arrival": -2, "hour_of_world_day": 15, "reckoning": "salt_rim_parish_letter"}'::jsonb,
  'prologue_entry',
  'other',
  'To my sister in the inland parish. Mela''s son says he saw the child again at the dry-fountain. He says the child told him a thing, and he tried to tell me the thing, and when he opened his mouth I heard the words but I cannot now remember what the words were. I have asked Mela''s son twice today and the second time he could not remember either. I have written this letter at the third bell. My tea has gone cold without being drunk, although I am certain I poured it before I sat down. I will not light the lamp tonight. Send the parchment when you can.',
  '["salt_rim_parish", "listening_child_speech_event", "broken_hinge_canonical_first_instance", "memory_anomaly_writer_and_child"]'::jsonb,
  'greywake',
  '[{"voice": "salt_rim_parish_member", "register": "peasant_curiosity", "memory_archetype": "contradiction_bearing"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue", "cause_event_ids"
) VALUES (
  'evt-po4-d-2-bone-awning-hook-asks-tavern-keeper',
  '{"day_relative_to_khojen_arrival": -2, "hour_of_world_day": 22, "reckoning": "tavern_mercantile"}'::jsonb,
  'prologue_entry',
  'other',
  'Eve. Hook stayed past closing. I let him. He paid the difference. He asked if I had ever seen a junior magistrate sit at this table alone. I said yes, last week. He said yes, he knew, that was not the question. I did not understand the question. He left through the kitchen door.',
  '["tide_league", "venn_hook_audit_anticipation", "bone_awning_tavern_keeper_observation_recruitment"]'::jsonb,
  'greywake',
  '[{"voice": "bone_awning_tavern_keeper", "register": "third_party_mercantile", "memory_archetype": "scholar"}]'::jsonb,
  TRUE,
  '["evt-po4-d-4-bone-awning-verro-stops-in"]'::jsonb
)
ON CONFLICT ("event_id") DO NOTHING;

-- ===== DAY -1 (3 entries) =====
INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-1-halen-magistrate-attendance-writ',
  '{"day_relative_to_khojen_arrival": -1, "hour_of_world_day": 4, "reckoning": "drowned_church_liturgical"}'::jsonb,
  'prologue_entry',
  'other',
  'Vigil at fourth hour. Four penitents. The standing water rose three inches overnight; high-tide mark, by Drowned reckoning. Marrow-Saint Ilyra will preside at the mid-morning vigil tomorrow. I am to be on antechamber duty. A junior magistrate of the Civic Bell Court has formally requested attendance at next month''s marrow-vigil; the writ permits attendance, it does not permit counting, and Marrow-Saint Ilyra has not yet been informed.',
  '["drowned_church", "bell_court_attendance_writ_pending", "ilyra_undisclosed_writ"]'::jsonb,
  'greywake',
  '[{"voice": "sister_halen", "register": "drowned_church_liturgical", "memory_archetype": "devout"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-1-venn-hook-final-prep',
  '{"day_relative_to_khojen_arrival": -1, "hour_of_world_day": 18, "reckoning": "tide_league_mercantile"}'::jsonb,
  'prologue_entry',
  'other',
  'Trade-floor log. Third-cycle scrip closed 0.93. Volatility modifier 1.10. Council session tomorrow. I have prepared. I have prepared what I have prepared. The Bone Awning, between sixth and seventh bell, the next evening I am there. After that the Bone Awning will not be useful any longer.',
  '["tide_league", "scrip_volatility_d1_climbing", "venn_hook_exit_plan_seeded"]'::jsonb,
  'greywake',
  '[{"voice": "venn_hook", "register": "tide_league_mercantile", "memory_archetype": "broker"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;

INSERT INTO "public"."event" (
  "event_id", "timestamp", "event_type", "kind", "truth", "affected_systems",
  "region_id", "location_id", "actors", "is_prologue"
) VALUES (
  'evt-po4-d-1-listening-child-not-yet-tomorrow',
  '{"day_relative_to_khojen_arrival": -1, "hour_of_world_day": 16, "reckoning": "substrate_emergent"}'::jsonb,
  'prologue_entry',
  'other',
  '"Not yet. Tomorrow."',
  '["the_listening_child", "salt_rim_parish_overheard", "khojen_arrival_substrate_anticipation", "locked_verbatim_per_house_rt_po4"]'::jsonb,
  'greywake',
  'loc-dry-fountain',
  '[{"voice": "the_listening_child", "register": "substrate_emergent", "memory_archetype": "contradiction_bearing", "overheard_in": "salt_rim_parish"}]'::jsonb,
  TRUE
)
ON CONFLICT ("event_id") DO NOTHING;
