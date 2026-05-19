// ============================================================================
// CONSEQUENCE NARRATIVES — Triggered by consequence system
// ============================================================================

=== consequence_wounded ===
Your wound opens again when you move too quickly.

{ player_hp <= 5:
    The blood is not the right color. It carries something that flickers in the lamplight, like letters trying to form words.
    ~ add_journal_entry("Condition", "Wound bleeding strangely.")
}

-> DONE

=== consequence_danger_rise ===
The district has noticed your pattern.

{ world_danger > 80:
    The streets themselves seem to lean toward you. Doorways narrow. Shadows lengthen in directions that do not match the light.
}

-> DONE

=== consequence_faction_shift ===
Word travels fast in a city that reads ledgers before faces.

-> DONE
