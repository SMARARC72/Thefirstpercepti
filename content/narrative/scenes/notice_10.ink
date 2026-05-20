// ============================================================================
// NOTICE 10 — Convergence (Phase 18 / CONTENT-202)
// ============================================================================
// Multi-faction scene. Per faction-interactions.md: factions argue jurisdiction
// in front of player. Player may align, broker (DC 18 Presence), or refuse.
// Apotheosis-attempt eligible if Authority >= 9 (-> x12_apotheosis).
// ============================================================================

=== notice_10_convergence ===
The market closes around you without announcement.

# sound:combat-sting
# animation:pulse

Marrow-Saint Ilyra arrives from the east, wrists rebound in red cord. Bell-Magistrate Orro arrives from the north, inkwell capped. Venn Hook arrives from the south, hook unconcealed for the first time you have seen.

None of the three address the others. Each addresses you.

ILYRA: "The fountain has been practicing your name. We hold the room for the rehearsal."

ORRO: "The Bell Court has accumulated a contradiction in your name beyond civic tolerance."

VENN: "The League records the convergence. Premium applies."

{ get_player_stat("authority") >= 9:
    Something in the room — the room itself — adjusts to the weight you have begun to carry. The candles in the cathedral, two streets away, do not flicker. The candles know.
    
    * [Speak the name yourself] -> x12_apotheosis
}

* [Align with the Drowned Church] -> notice_10_align_church
* [Align with the Bell Court] -> notice_10_align_court
* [Attempt to broker] -> notice_10_broker
* [Refuse all] -> notice_10_refuse

=== notice_10_align_church ===
You speak in Ilyra's direction. The other two do not interrupt; the other two are listening.

~ add_journal_entry("Convergence outcome", "Aligned with Drowned Church. Bell Court warrant likely; Tide League records the alignment.")

-> arrival

=== notice_10_align_court ===
You speak in Orro's direction. He uncaps the inkwell. The other two register the uncapping.

~ add_journal_entry("Convergence outcome", "Aligned with Bell Court. Drowned Church marks you; Tide League records the alignment.")

-> arrival

=== notice_10_broker ===
{ roll_check("presence", 18) >= 18:
    You speak between the three. The brokering holds long enough for each to step back without committing. Venn Hook smiles slowly.
    ~ add_journal_entry("Convergence outcome", "Brokered. All three retreat without commitment. Tide League notes the brokering.")
- else:
    The brokering does not hold. One of the three commits anyway; the other two adjust.
}

-> arrival

=== notice_10_refuse ===
You refuse all three. The refusal is recorded by all three.

{ get_player_stat("authority") >= 9:
    The refusal is the rehearsal. The room knows it. You know it.
    -> x12_apotheosis
- else:
    The refusal closes the convergence without resolving it. Each faction departs along their arrival paths. The market reopens, slowly.
    ~ add_journal_entry("Convergence outcome", "Refused all three. Convergence unresolved. Pressure persists.")
}

-> arrival
