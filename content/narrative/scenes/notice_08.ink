// ============================================================================
// NOTICE 08 — Acknowledgment (Phase 18 / CONTENT-202)
// ============================================================================
// Marked NPC speaks; first explicit pressure scene. The condition
// recognized-by-not-yet-named fires. Per Notice Ladder spec.
// ============================================================================

=== notice_08_acknowledgment ===
A Drowned Church initiate stops in front of you in the alley between the cathedral and the market.

# sound:location-danger

The initiate does not speak first. The initiate waits for you to acknowledge them, and then says: "The Marrow-Saint has been told."

{ get_player_stat("will") >= 12:
    You hold the initiate's gaze. The initiate's eyes are the same colour as the standing water in the antechamber. Nothing else moves.
- else:
    The initiate's gaze takes a small piece of your composure. You feel the loss after the initiate has walked past.
}

~ add_journal_entry("Notice 8 — Acknowledgment", "A Drowned Church initiate has named that you have been named. The Marrow-Saint has been told.")

* [Follow the initiate toward the cathedral] -> dialogue_marrow_saint_ilyra
* [Continue your previous path] -> arrival
