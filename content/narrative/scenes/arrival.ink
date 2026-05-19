// ============================================================================
// ARRIVAL — First scene after character creation
// ============================================================================

=== arrival ===
{ world_location }

# sound:ambient_drip
# animation:pulse

{ player_form == "spirit_bound":
    Your second shadow answers half a breath late. The street notices.
}

{ player_form == "warped":
    Your body remembers the Shattering in ways the paving stones cannot ignore.
}

{ player_form == "construct":
    The materials that still dream inside you resonate with the fountain's frequency.
}

People keep their distance, not because they know what you are, but because the world seems to notice you first.

* [Look around] -> arrival_look
* [Listen for trouble] -> arrival_listen
* [Approach the fountain] -> fountain
* [Go to Greywake Market] -> market
* [Go to the Archive Steps] -> archive
* [Speak to the nearest witness] -> dialogue_sister_mourn
* [Rest here] -> dream_rest

=== arrival_look ===
The scene sharpens.

{ get_player_stat("sense") >= 2:
    You notice: a drain clogged with violet thread, a court seal scratched into the fountain lip, and one dry footprint pointing away.
    ~ add_journal_entry("Perceived evidence", "Violet thread, court seal, dry footprint.")
- else:
    You find details, but they arrange themselves into the wrong conclusion before you can stop them.
}

* [Follow the dry footprint] -> arrival
* [Inspect the court seal] -> fountain_examine_seal
* [Pull the violet thread] -> arrival

=== arrival_listen ===
You open your attention to the district's hidden frequencies.

{ get_player_stat("sense") >= 3:
    Beneath the public noise: three knocks, a breath, then water moving uphill. Someone nearby says your name as if reading it from a ledger.
    ~ add_journal_entry("Heard", "Your name spoken from a ledger.")
- else:
    The street sounds normal. Too normal. The absence of strangeness is itself a warning.
}

-> DONE
