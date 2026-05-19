// ============================================================================
// THE FIRST PERCEPTION — Main Narrative
// ============================================================================
// Entry point for all narrative content. Includes scene modules.
// ============================================================================

INCLUDE scenes/arrival.ink
INCLUDE scenes/fountain.ink
INCLUDE scenes/archive.ink
INCLUDE scenes/combat.ink
INCLUDE scenes/dialogue.ink
INCLUDE scenes/market.ink
INCLUDE scenes/breach.ink
INCLUDE scenes/dialogue_fennick.ink
INCLUDE scenes/dialogue_foundling.ink
INCLUDE scenes/dreams.ink
INCLUDE systems/faction_reactions.ink
INCLUDE systems/consequences.ink
INCLUDE systems/legacy.ink

// ── Global Variables (bound from engine) ──
VAR player_name = "No One"
VAR player_hp = 20
VAR player_max_hp = 20
VAR player_focus = 15
VAR player_max_focus = 15
VAR player_form = "human"
VAR player_posture = "seeker"
VAR player_domain = "lore"
VAR world_danger = 34
VAR world_location = "The Sunken Fountain"
VAR world_region = "Greywake Market District"
VAR world_day = 1
VAR world_phase = "The Waking Hour"
VAR turn_count = 0

// ── External Functions (provided by engine bridge) ──
EXTERNAL get_player_stat(stat_name)
EXTERNAL get_world_danger()
EXTERNAL get_faction_trust(faction_id)
EXTERNAL get_faction_fear(faction_id)
EXTERNAL has_condition(condition_id)
EXTERNAL has_item(item_id)
EXTERNAL get_turn_count()
EXTERNAL roll_check(domain, difficulty)
EXTERNAL add_journal_entry(label, detail)
EXTERNAL min(a, b)
EXTERNAL max(a, b)

// ── Main Entry Knot ──
=== start ===
The world notices you before you notice it.

{ player_name != "No One":
    The name {player_name} carries weight here. Or perhaps the weight is in what the name has survived.
- else:
    No name survives first contact. That is the first lesson.
}

You stand at {world_location}, in the {world_region}. The {world_phase} settles over the district like a decision already made.

-> arrival

// ── Helper Knots ──

=== wait_and_watch ===
You let the hour pass through you.

{ get_player_stat("sense") >= 3:
    Beneath the public noise, a second rhythm appears: three knocks, a breath, then water moving uphill.
    ~ add_journal_entry("World pulse", "Three knocks, a breath, water uphill.")
- else:
    The street changes in ways you cannot name. A shutter opens where there was no window.
}

{ world_danger > 50:
    Something in the district has been waiting for stillness.
}

-> DONE

=== rest ===
You search for a dry angle beneath collapsed stone.

{ roll_check("physical", 10) >= 12:
    Your breathing steadies. The district briefly forgets to punish stillness.
    ~ player_hp = min(player_hp + 3, player_max_hp)
    ~ player_focus = min(player_focus + 3, player_max_focus)
- else:
    You rest, but not cleanly. Every closed eye contains a street you have not walked yet.
    ~ player_hp = min(player_hp + 1, player_max_hp)
}

-> DONE
