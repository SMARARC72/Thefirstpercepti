// ============================================================================
// NOTICE 07 — Murmur (Phase 18 / CONTENT-202)
// ============================================================================
// First Notice-Ladder step. Faction starts asking after the player; no direct
// action yet. Per Notice Ladder spec (R-82): stepped consequences at 7/8/9/10.
// Triggered by faction_loyalty crossing 7. Plays as ambient market scene.
// ============================================================================

=== notice_07_murmur ===
A boy at the fish-monger's stall mentions your name to the woman wrapping his order.

# sound:ambient

The woman does not look up. She finishes wrapping. She glances at the alley toward the cathedral. The boy pays and leaves.

{ get_player_stat("sense") >= 3:
    You hear the name a second time, half a street away, in the voice of someone you have not yet met.
    ~ add_journal_entry("Notice 7 — Murmur", "Your name is being asked after. The asking has not yet reached you.")
- else:
    Something has shifted in how the market holds you. You cannot name what.
    ~ add_journal_entry("Notice 7 — Murmur", "The market holds you differently. You cannot name what.")
}

-> arrival
