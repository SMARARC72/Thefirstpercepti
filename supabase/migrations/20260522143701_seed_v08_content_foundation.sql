-- ============================================================================
-- Phase 24d / Session 6a / Phase 6a.2 — Foundation content seed (Greywake)
-- ============================================================================
-- Per amended PHASE_24D_HANDOFF.md §6a.2. Lands the FK-target foundation
-- entities that downstream seeds (factions, institutions, NPCs, plots, etc.)
-- reference. NO Bundle A / Bundle B / Bundle C primitives here — those land
-- in 6a.3+.
--
-- Per Discipline 1 (three-form seed): this migration is the SQL form;
-- companion test-fixture JSONs land in 6a.3+ tests as each T handler is
-- exercised against this seeded foundation.
--
-- Per Discipline 4 (ARD-016 dual-write Phase A): foundation entities are
-- content.* and don't have a state.* counterpart, so no save_snapshot blob
-- write needed. Dual-write kicks in for state.* (6b).
--
-- Per Discipline 5 (advisors): verify clean after this migration applies.
--
-- Idempotent via INSERT ... ON CONFLICT DO NOTHING on PK; safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1 region: Greywake
-- ----------------------------------------------------------------------------
INSERT INTO "public"."region" (
  "region_id", "name", "status", "framing_notes", "tags", "schema_version"
) VALUES (
  'greywake',
  'Greywake',
  'active',
  'Coastal hinge city; tide-as-witness; theological + civic + commercial three-institution braid. Slice region.',
  '["slice", "coastal", "hinge_city"]'::jsonb,
  'v0.8'
)
ON CONFLICT ("region_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6 locations: from content/world-data/locations.json (per Discipline 4 Q4 path)
-- ----------------------------------------------------------------------------
INSERT INTO "public"."location" ("location_id", "region_id", "name", "schema_version") VALUES
  ('loc-greywake-market-district', 'greywake', 'Greywake Market District', 'v0.8'),
  ('loc-dry-fountain', 'greywake', 'The Dry Fountain', 'v0.8'),
  ('loc-bell-court-precinct', 'greywake', 'Bell Court Precinct', 'v0.8'),
  ('loc-drowned-cathedral', 'greywake', 'Drowned Cathedral Antechamber', 'v0.8'),
  ('loc-tide-league-brokers-office', 'greywake', 'Tide League Broker''s Office', 'v0.8'),
  ('loc-bell-forge', 'greywake', 'The Bell-Forge', 'v0.8')
ON CONFLICT ("location_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1 race: tiefling (Khojen baseline + occasional Greywake-touched NPCs)
-- ----------------------------------------------------------------------------
INSERT INTO "public"."race" (
  "race_id", "name", "ability_bonuses", "size", "speed_feet", "darkvision_feet",
  "languages_known", "traits", "schema_version"
) VALUES (
  'tiefling',
  'Tiefling',
  '{"INT": 1, "CHA": 2}'::jsonb,
  'medium',
  30,
  60,
  '["common", "infernal"]'::jsonb,
  '["darkvision_60", "hellish_resistance_fire", "infernal_legacy_minor"]'::jsonb,
  'v0.8'
)
ON CONFLICT ("race_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1 class: warlock (Khojen's class — pact tradition fits the calling)
-- ----------------------------------------------------------------------------
INSERT INTO "public"."class" (
  "class_id", "default_calling_name", "hit_die", "primary_abilities",
  "save_proficiencies", "spellcasting_kind", "schema_version"
) VALUES (
  'warlock',
  'The Pact-Bound',
  8,
  '["cha"]'::jsonb,
  '["wis", "cha"]'::jsonb,
  'pact',
  'v0.8'
)
ON CONFLICT ("class_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3 deities (regional pantheon anchors for Greywake slice)
-- ----------------------------------------------------------------------------
INSERT INTO "public"."deity" (
  "deity_id", "name", "alignment", "domains", "symbol", "symbol_motif",
  "status", "schema_version"
) VALUES
  (
    'umberlee',
    'Umberlee',
    '"CE"'::jsonb,
    '["tempest", "death"]'::jsonb,
    'salt_wave_breaking',
    'wave-crest carved into kraken-tooth',
    'worshipped',
    'v0.8'
  ),
  (
    'the_unnamed',
    'The Unnamed',
    '"N"'::jsonb,
    '["death", "trickery"]'::jsonb,
    'dry_fountain_basin',
    'inverted cup with no rim',
    'contested',
    'v0.8'
  ),
  (
    'mystra',
    'Mystra',
    '"NG"'::jsonb,
    '["knowledge", "arcana"]'::jsonb,
    'seven_pointed_star',
    'silver thread coiled in spiral',
    'dormant',
    'v0.8'
  )
ON CONFLICT ("deity_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1 pantheon: Greywake regional pantheon
-- ----------------------------------------------------------------------------
INSERT INTO "public"."pantheon" (
  "pantheon_id", "origin_label", "deity_ids", "region_ids", "status", "schema_version"
) VALUES (
  'greywake_regional_pantheon',
  'Greywake Tide-Bound Pantheon',
  '["umberlee", "the_unnamed", "mystra"]'::jsonb,
  '["greywake"]'::jsonb,
  'active',
  'v0.8'
)
ON CONFLICT ("pantheon_id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1 quirk: The Indebted (Khojen's calling — civic debt + theological obligation)
-- ----------------------------------------------------------------------------
INSERT INTO "public"."quirk" (
  "quirk_id", "name", "description_template", "intensity", "schema_version"
) VALUES (
  'quirk-the-indebted',
  'The Indebted',
  'Owes debts of three kinds — civic (Bell Court ledger), theological (Drowned Church absolution-promised), commercial (Tide League scrip-bound). The debts are real, accruing, and visible to those who can read the proper ledgers.',
  3,
  'v0.8'
)
ON CONFLICT ("quirk_id") DO NOTHING;
