-- ============================================================================
-- Phase 24d / 6a.7.1 C2 — Seed 5 Greywake creatures (BES.I)
-- ============================================================================
-- Per ratified Path B-narrow option α. Sources: cluster_b Codex §11149-11370
-- (BES.I Greywake Bestiary; 14 entries). Selected 5 spanning provenance +
-- tier enum coverage:
--   - Greywake Drowned-Dog (mundane / nuisance)
--   - Salt-Rim Giant Crab (mundane / scenery; witness_payload TRUE)
--   - The Fountain-Listener (substrate_emanation / named; witness_payload TRUE)
--   - Salt-Wraith (wraith_class / named)
--   - Unnamed-Touched Echo (unnamed_touched / nuisance; witness_payload TRUE)
--
-- Coverage: 4/7 provenance values; 3/5 tier values; 3 witness-payload TRUE
-- + 2 witness-payload FALSE; 5 faction-relevance vectors.
--
-- Pre-flight: content.creature empty (0 rows) per 6a.7.0 audit. Risk 4 Zod
-- gate run pre-push on all 5 rows.
-- ============================================================================

INSERT INTO "content"."creature" (
  "creature_id", "name", "description", "provenance", "tier", "combat_block",
  "regional_presence_id", "tags", "witness_payload"
) VALUES (
  'cre-greywake-drowned-dog',
  'Greywake Drowned-Dog',
  'A salt-rimed wolf-thing that follows dockside patrols at night. It does not howl. SRD Wolf variant; coastal wolf-strain preserved by salt-rime growing in its fur and on its teeth. Sergeant Caleths stiff arm is a Drowned-Dog bite from twenty-six years ago that did not heal correctly because she refused Drowned Church absolution.',
  'mundane',
  'nuisance',
  '{
    "cr_individual": "1/4",
    "cr_pack": "1",
    "hp": 11,
    "ac": 13,
    "size": "Medium",
    "type": "beast",
    "attacks": [
      {"name": "bite", "to_hit": 4, "damage": "2d4+2", "damage_type": "piercing"}
    ],
    "speed": {"land": 40, "swim": 20},
    "abilities": [
      {"name": "Pack Tactics", "kind": "passive"},
      {"name": "Salt-Rime Hide", "kind": "passive", "effect": "resistance to bludgeoning while in standing water within Greywakes tidal zone"}
    ],
    "behavior": {
      "vocalizes": false,
      "tracks_by": "salt-trail on targets skin (Greywake-acclimated humans glow faintly on salt-scent scale)",
      "avoids": "cathedral grounds"
    },
    "srd_base": {"name": "Wolf", "source": "SRD 5.2", "license": "CC-BY-4.0"}
  }'::jsonb,
  'greywake',
  '["slice_eligible", "bes_i_authored", "greywake_native", "dockside_predator", "srd_variant"]'::jsonb,
  FALSE
)
ON CONFLICT ("creature_id") DO NOTHING;

INSERT INTO "content"."creature" (
  "creature_id", "name", "description", "provenance", "tier", "combat_block",
  "regional_presence_id", "tags", "witness_payload"
) VALUES (
  'cre-salt-rim-giant-crab',
  'Salt-Rim Giant Crab',
  'A chitinous old thing the size of a cart. The shell remembers what it has eaten. SRD Giant Crab variant; Greywake adult specimens grow chitin that records dietary history in calcified ridges, readable by a salt-rim parish elder or a Drowned Church marrow-saint.',
  'mundane',
  'scenery',
  '{
    "cr_juvenile": "1/8",
    "cr_adult": "2",
    "hp_juvenile": 13,
    "hp_adult": 26,
    "ac": 15,
    "size_juvenile": "Medium",
    "size_adult": "Large",
    "type": "beast",
    "attacks": [
      {"name": "claw", "to_hit": 3, "damage_juvenile": "1d4+2", "damage_adult": "1d6+2", "damage_type": "bludgeoning", "on_hit": "grapple"}
    ],
    "attacks_per_round_adult": 2,
    "speed": {"land": 30, "swim": 30},
    "abilities": [
      {"name": "Amphibious", "kind": "passive"},
      {"name": "Resonant Carapace", "kind": "passive", "effect": "produces low sub-audible hum when within 30 ft. of a Bell Court ledger-stamped wax object; known watch-tell"}
    ],
    "harvest_ritual": {
      "performer": "drowned_church_marrow_saint",
      "duration_hours": 1,
      "yields": "up to 1d4 of the creatures prior victims by name (if named in life)",
      "contested_by": "civic_bell_court"
    },
    "srd_base": {"name": "Giant Crab", "source": "SRD 5.2", "license": "CC-BY-4.0"}
  }'::jsonb,
  'greywake',
  '["slice_eligible", "bes_i_authored", "greywake_native", "coastal_predator", "srd_variant", "witness_bearing", "drowned_church_liturgical_significance"]'::jsonb,
  TRUE
)
ON CONFLICT ("creature_id") DO NOTHING;

INSERT INTO "content"."creature" (
  "creature_id", "name", "description", "provenance", "tier", "combat_block",
  "regional_presence_id", "tags", "witness_payload"
) VALUES (
  'cre-fountain-listener',
  'The Fountain-Listener',
  'A humanoid-shaped salt accretion that gathers near dry liturgical sites. It does not move while observed. It is closer than it was yesterday. Greywake-original uncanny entry (Mad Hatter broken-hinge contribution). Three current specimens stand within sight of the dry-fountain; their accumulated distance is recorded in Drowned Church liturgical journals. When all three reach the fountain rim simultaneously, the substrate triggers a P-01 acceleration event (canonical, not yet narratively triggered).',
  'substrate_emanation',
  'named',
  '{
    "cr": "3",
    "hp": 52,
    "ac": 14,
    "size": "Medium",
    "type": "elemental",
    "subtype": "uncanny",
    "attacks": [
      {"name": "Salt-Encrust", "to_hit": 6, "damage": "2d8", "damage_type": "bludgeoning", "save": {"stat": "STR", "dc": 13, "on_fail": "speed halved for 1 minute"}}
    ],
    "speed": {"land": 20},
    "immunities": ["poison", "psychic"],
    "resistances": ["piercing", "slashing"],
    "abilities": [
      {"name": "Observation-Bound Motion", "kind": "passive", "effect": "moves only when not under direct observation by any creature; accretes 1 inch closer to the dry-fountain per silent vigil"},
      {"name": "Broken-Hinge Property", "kind": "passive", "effect": "if no one observes for 24 game-hours, gains prior 24 hours of motion retroactively even if engine event-log says it did not move"}
    ],
    "voice": "the_mad_hatter",
    "p01_acceleration_trigger": {
      "condition": "all_three_specimens_reach_fountain_rim_simultaneously",
      "current_specimens_count": 3
    }
  }'::jsonb,
  'greywake',
  '["slice_eligible", "bes_i_authored", "greywake_native", "substrate_emanation_class", "witness_bearing", "broken_hinge_property", "p01_apotheosis_race_substrate_link"]'::jsonb,
  TRUE
)
ON CONFLICT ("creature_id") DO NOTHING;

INSERT INTO "content"."creature" (
  "creature_id", "name", "description", "provenance", "tier", "combat_block",
  "regional_presence_id", "tags", "witness_payload"
) VALUES (
  'cre-salt-wraith',
  'Salt-Wraith',
  'The dead of Greywake who refused absolution, bound by salt that has not yet dried. They do not haunt; they remain. Greywake-original. Salt-Wraiths are individuals, not a population. Each one has a name. Drowned Church maintains a registry; Bell Court refuses to recognize it as civic record. Species-level closing condition (Deaths rule): when Greywakes coastal salt-rime begins to dry — environmental shift expected within 80 game-years — all Salt-Wraiths dissolve simultaneously. Canon; slice does not encompass it.',
  'wraith_class',
  'named',
  '{
    "cr": "2",
    "hp": 36,
    "ac": 12,
    "size": "Medium",
    "type": "undead",
    "subtype": "incorporeal",
    "attacks": [
      {"name": "Salt-Touch", "to_hit": 5, "damage": "3d6", "damage_type": "cold", "additional_damage": "1d6", "additional_damage_type": "necrotic", "on_hit": "targets coastal direction sense impaired for 1 hour"}
    ],
    "speed": {"hover": 30},
    "immunities": ["non-magical bludgeoning/piercing/slashing"],
    "vulnerabilities": ["fresh-water aspersion + Drowned Church absolution rite"],
    "abilities": [
      {"name": "Incorporeal", "kind": "passive"},
      {"name": "Cannot Cross Fresh-Water", "kind": "constraint"}
    ],
    "absolution_rite": {
      "performer": "drowned_church",
      "cost": "liturgical authority",
      "result": "salt-crystallized memory token (5-30 scrip if intact); drowned church will buy for registry"
    },
    "voice": "death",
    "species_closing_condition": {
      "trigger": "coastal_salt_rime_begins_to_dry",
      "expected_in_years": 80,
      "effect": "all salt-wraiths dissolve simultaneously"
    }
  }'::jsonb,
  'greywake',
  '["slice_eligible", "bes_i_authored", "greywake_native", "wraith_class", "drowned_church_doctrinal_territory", "bell_court_unrecorded", "deaths_rule_species_closing_in_canon"]'::jsonb,
  FALSE
)
ON CONFLICT ("creature_id") DO NOTHING;

INSERT INTO "content"."creature" (
  "creature_id", "name", "description", "provenance", "tier", "combat_block",
  "regional_presence_id", "tags", "witness_payload"
) VALUES (
  'cre-unnamed-touched-echo',
  'Unnamed-Touched Echo',
  'A small thing — the size of a childs fist — that appears in places where The Unnamed has been considering something. Touching it does not harm. Not touching it is worse. Greywake-original; tied to the pantheon-tier The Unnamed (canonical, not statted as a creature). Its presence does not mean The Unnamed is currently watching; it means The Unnamed was. The Listening Child has been observed within 30 ft. of an Echo on at least three occasions. Mad Hatter broken-hinge property in physical form.',
  'unnamed_touched',
  'nuisance',
  '{
    "cr": "1/4",
    "hp": 6,
    "ac": 11,
    "size": "Tiny",
    "type": "aberration",
    "subtype": "uncanny_non_hostile",
    "attacks": [],
    "speed": {"none": true},
    "abilities": [
      {"name": "Resonance", "kind": "passive", "effect": "creatures within 10 ft. have their last actions outcome become uncertain until 1-hour rest; engine treats last roll as both rolls worst-case until resolved; player feels they remember the outcome ambiguously"},
      {"name": "Broken-Hinge Physical Form", "kind": "passive", "effect": "leaving untouched in a scene means the scenes outcome carries residual ambiguity"}
    ],
    "voice": "yennefer",
    "appears_at": "locations where the_unnamed has paid attention (dry-fountain, antechamber threshold, one specific dockside piling)",
    "interaction": {
      "pick_up": "harmless; produces brief sense of being seen",
      "leave_untouched": "scene outcome carries residual ambiguity",
      "sell": "drowned_church_heresy_event"
    }
  }'::jsonb,
  'greywake',
  '["slice_eligible", "bes_i_authored", "greywake_native", "unnamed_touched_class", "witness_bearing", "drowned_church_canonical_possession", "tide_league_failed_acquisition_target", "verro_inquiry_third_contradiction_seed"]'::jsonb,
  TRUE
)
ON CONFLICT ("creature_id") DO NOTHING;
