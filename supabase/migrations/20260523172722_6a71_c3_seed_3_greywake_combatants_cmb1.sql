-- ============================================================================
-- Phase 24d / 6a.7.1 C3 — Seed 3 Greywake combatants (CMB.I; LIVE)
-- ============================================================================
-- Per ratified Path B-narrow option α + 6a.7 commit batch shape.
-- Source: cluster_c Codex §11574-11647 (CMB.I Adversary Catalog).
--
-- 3 combatants from CMB.I (Greywake-bound; M8-slice-encounterable):
--   - cmb-glass-tooth-gang (CMB.I #2; gang_member; default_militant voice)
--   - cmb-aggressive-junior-magistrate-faction (CMB.I #3; cell_member; bell_magistrate voice)
--   - cmb-tide-league-defector-cell (CMB.I #6; cell_member; venn_hook voice — mirror archetype)
--
-- Each combatant's base_npc_id points at corresponding stub from C0 commit
-- per ADR-018 §C stub-anchor pattern. NONE exercise SC-02 social_attacks
-- (empty array []) — consistent with Path B-narrow option α (Numerand-
-- specific mechanic; no Greywake combatant exercises it). cosmological_
-- redirection_id column dropped in C1 per ADR-018 §B.
--
-- voice_archetype enum mapping (closest fits from v0.8 enum):
--   - Glass-Tooth Gang (Bored archetype per Codex) → default_militant
--   - Junior Magistrate Faction (Climbing archetype per Codex) → bell_magistrate
--   - Tide League Defector Cell (Cynical mirror to Venn Hook per Codex) → venn_hook
--
-- Pre-flight (Discipline 9 + Risk 4):
--   - content.combatant empty (verified 0 rows pre-C3)
--   - base_npc_id FKs verified live (3 stubs from C0; 859f307)
--   - Risk 4 Zod gate run pre-push on all 3 rows
-- ============================================================================

INSERT INTO "content"."combatant" (
  "combatant_id", "base_npc_id", "voice_archetype", "combat_block", "social_attacks"
) VALUES (
  'cmb-glass-tooth-gang',
  'npc-glass-tooth-gang-leader',
  'default_militant',
  '{
    "cr_individual": "1/4",
    "cr_gang": "2",
    "entity_type": "gang",
    "hp_individual": 7,
    "hp_gang": 28,
    "ac": 12,
    "size": "Medium",
    "type": "humanoid",
    "fingerprint": "Bored (early-career, transitioning to Climbing or Fugitive depending on success)",
    "attacks": [
      {"name": "light_crossbow", "to_hit": 3, "damage": "1d6+1", "damage_type": "piercing"},
      {"name": "club", "to_hit": 2, "damage": "1d4", "damage_type": "bludgeoning"}
    ],
    "abilities": [
      {"name": "Smoke-Bottle", "kind": "action", "effect": "15-ft. cube of obscuring smoke for 3 rounds"},
      {"name": "Pack Tactics", "kind": "passive", "active_in": "gang_form"}
    ],
    "tactics": {
      "round_1": "Smoke-Bottle on the most armored target, scatter and harass with crossbow",
      "on_losing": "Regroup at predetermined dockside positions; if isolated, surrender on terms",
      "stop_condition": "They stop fighting when one of their own goes down; have not had a member killed yet"
    },
    "produced_by_faction": "fac-civic-bell-court",
    "produced_by_rationale": "their existence is downstream of civic-magistrate writ-system perceived inequities",
    "opposed_by_factions": [
      {"faction_id": "fac-civic-bell-court", "weight": 3, "kind": "regulated_seawatch"},
      {"faction_id": "fac-merchant-tide-league", "weight": 2, "kind": "irritated_warehouse_damage"},
      {"faction_id": "fac-drowned-church", "weight": 4, "kind": "doctrinal_sermon_hours_attack"}
    ],
    "encounter_beat": {
      "typical_location": "dockside between second and third tide on civic-procession days; near Tide League warehouses during sermon hours",
      "slice_likelihood": "M8: likely if Khojen walks dockside during a sermon"
    },
    "voice_attribution": "the_joker",
    "provenance": {"category": "greywake_original", "source_reference": "CMB.I #2", "license": "original"}
  }'::jsonb,
  '[]'::jsonb
)
ON CONFLICT ("combatant_id") DO NOTHING;

INSERT INTO "content"."combatant" (
  "combatant_id", "base_npc_id", "voice_archetype", "combat_block", "social_attacks"
) VALUES (
  'cmb-aggressive-junior-magistrate-faction',
  'npc-junior-magistrate-cell-lead',
  'bell_magistrate',
  '{
    "cr_individual": "1",
    "cr_cell": "3",
    "entity_type": "cell",
    "hp": 25,
    "ac": 16,
    "ac_source": "chain shirt + shield",
    "size": "Medium",
    "type": "humanoid",
    "fingerprint": "Climbing (expansionist variant)",
    "attacks": [
      {"name": "longsword", "to_hit": 5, "damage": "1d8+3", "damage_type": "slashing"},
      {"name": "hand_crossbow", "to_hit": 4, "damage": "1d6+2", "damage_type": "piercing"}
    ],
    "abilities": [
      {"name": "Improvised Writ", "kind": "action", "effect": "declare arrest authority not signed by Orro; targets within 30 ft. DC 13 WIS save or socially compelled to comply for 1 round; ends if attacked"}
    ],
    "tactics": {
      "round_1": "Lead junior declares Improvised Writ on the highest-AC target; flank companions move to detain",
      "on_losing": "Invoke false-superior-orders and retreat under cover of writ-authority",
      "stop_condition": "Confirmed counter-order from Orro himself, in person, OR Sea-watch intervention (Caleth specifically will face them down)"
    },
    "produced_by_faction": "fac-civic-bell-court",
    "produced_by_rationale": "internal expansionist faction; Orros nightmare",
    "opposed_by_factions": [
      {"faction_id": "fac-civic-bell-court", "weight": 4, "kind": "internal_orro_faction_contest"},
      {"faction_id": "fac-merchant-tide-league", "weight": 3, "kind": "audit_deferrals_threatened"},
      {"faction_id": "fac-drowned-church", "weight": 5, "kind": "doctrinally_affronted"}
    ],
    "encounter_beat": {
      "typical_location": "civic district during inquiry hours; absolution-warrant courier routes; near Tide League floor on audit-related days",
      "slice_likelihood": "M8: likely if Khojen interacts with the Hook quest Bell Court branch"
    },
    "voice_attribution": "hunter_s_thompson",
    "provenance": {"category": "srd_variant", "source_reference": "CMB.I #3; base Knight (SRD 5.2)", "license": "cc_by_4_0"}
  }'::jsonb,
  '[]'::jsonb
)
ON CONFLICT ("combatant_id") DO NOTHING;

INSERT INTO "content"."combatant" (
  "combatant_id", "base_npc_id", "voice_archetype", "combat_block", "social_attacks"
) VALUES (
  'cmb-tide-league-defector-cell',
  'npc-tide-league-defector-spokesperson',
  'venn_hook',
  '{
    "cr_individual": "1",
    "cr_cell": "3",
    "entity_type": "cell",
    "hp_per_member": 22,
    "ac": 12,
    "ac_source": "heavy traveling clothes",
    "size": "Medium",
    "type": "humanoid",
    "fingerprint": "Cynical (former-Vested, mirror-variant to Venn Hook)",
    "attacks": [
      {"name": "shortsword", "to_hit": 3, "damage": "1d6+1", "damage_type": "piercing"},
      {"name": "light_crossbow", "to_hit": 4, "damage": "1d6+2", "damage_type": "piercing"}
    ],
    "abilities": [
      {"name": "Cell Coordination", "kind": "passive", "effect": "advantage on attack rolls when 2+ cell members within 30 ft. of each other and shared target"},
      {"name": "Ledger Knowledge", "kind": "passive", "effect": "each carries fragment of over-issue calculation; full reveal requires all 3 alive OR documents intact"}
    ],
    "tactics": {
      "round_1": "One stays back with ledger-fragments; two close to engage; they call ledger-related tactical commands",
      "on_losing": "Fragment-carrier flees first; other two cover",
      "stop_condition": "They negotiate if Khojen credibly offers to broker the exposure through a non-Bell-Court channel (Numerand correspondence; Drowned Church mediation)"
    },
    "produced_by_faction": "fac-merchant-tide-league",
    "produced_by_rationale": "former members; the Leagues own discipline trained them",
    "opposed_by_factions": [
      {"faction_id": "fac-merchant-tide-league", "weight": 5, "kind": "existential"},
      {"faction_id": "npc-venn-hook", "weight": 4, "kind": "personal"}
    ],
    "encounter_beat": {
      "typical_location": "salt-rim parish villages where they are hiding; dockside cellars for evidence consolidation; never Tide League floor or Bone Awning",
      "slice_likelihood": "M8: encountered if Khojen pursues Hook quest investigation branch broadly"
    },
    "voice_attribution": "tyler_durden",
    "provenance": {"category": "greywake_original", "source_reference": "CMB.I #6", "license": "original"},
    "ally_target_for_negotiation": {
      "trigger_kind": "non_bell_court_exposure_channel",
      "options": ["numerand_correspondence", "drowned_church_mediation"]
    }
  }'::jsonb,
  '[]'::jsonb
)
ON CONFLICT ("combatant_id") DO NOTHING;
