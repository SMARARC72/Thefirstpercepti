// ============================================================================
// NOTICE 09 — Confrontation (Phase 18 / CONTENT-202)
// ============================================================================
// Faction agents intercept; named-by-not-yet-named condition fires.
// Last stop before Convergence at 10.
// ============================================================================

=== notice_09_confrontation ===
Two Bell Court clerks intercept you at the precinct corner. One carries a closed ledger. The other carries nothing visible.

# sound:combat-sting

The clerk with the ledger speaks: "Three civic days. The Court has accumulated a contradiction in your name."

{ roll_check("presence", 14) >= 14:
    You hold posture. The clerk with the ledger acknowledges the holding with the smallest nod the Court permits. "You will be summoned by the seventh bell on the third day. Acknowledge."
    ~ add_journal_entry("Notice 9 — Confrontation", "Bell Court will summon by the seventh bell on the third day.")
- else:
    Your composure slips. The clerk with the ledger marks something in the margin. The other clerk does not move. "Your acknowledgment is recorded. You will be summoned."
    ~ add_journal_entry("Notice 9 — Confrontation", "Acknowledgment recorded under duress. Bell Court summons coming.")
}

* [Acknowledge formally] -> notice_09_acknowledge
* [Ask which contradiction] -> notice_09_ask
* [Refuse the summons] -> notice_09_refuse

=== notice_09_acknowledge ===
"Acknowledged." The ledger closes. The other clerk has not moved.

The clerks walk past you without further address. The precinct corner returns to ordinary daylight, slowly.

-> arrival

=== notice_09_ask ===
"Which contradiction is in my name?"

The clerk with the ledger does not open it. "The Court does not disclose strikings. If you have not been struck, this is a courtesy. If you have, it is procedure."

-> notice_09_acknowledge

=== notice_09_refuse ===
"Refusal is itself entered in the record." The ledger opens, briefly, and closes. The other clerk has stepped half a pace closer.

~ add_journal_entry("Notice 9 — Refusal", "Refusal entered in Bell Court record. Warrant likely.")

-> arrival
