// ============================================================================
// GREYWAKE MARKET — Central hub of commerce and rumor
// ============================================================================

=== market ===
Greywake Market breathes in layers: the top layer of voices, the middle layer of prices, and the bottom layer of things that change hands without being named.

# sound:market_murmur
# animation:pulse

{ world_danger > 50:
    The merchants have pulled their awnings low. You can see the whites of their eyes even from a distance.
}

{ get_player_stat("sense") >= 3:
    Beneath the bargaining, someone is crying in a language that has no words for help.
}

* [Browse the stalls] -> market_browse
* [Listen for rumors] -> market_rumors
* [Approach the debt court] -> market_debt_court
* [Go to the Sunken Fountain] -> fountain
* [Go to the Archive Steps] -> archive
* [Leave] -> arrival

=== market_browse ===
The stalls sell what the district has decided is valuable today: dried lamp-fish, seal-wax, secondhand names, and small vials of fountain water labeled "memory-enhancing."

{ has_item("cracked_brass_lens"):
    Your lens hums when you pass a stall selling optical equipment. The merchant does not look up, but her shoulders tighten.
}

{ roll_check("sense", 10) >= 12:
    One jar contains something that moves against the glass: a rumor given physical form, preserved in vinegar and spite.
    ~ add_journal_entry("Market find", "A rumor preserved in a jar.")
- else:
    You browse, but every price seems to include a fraction of your attention that you will not get back.
}

-> DONE

=== market_rumors ===
You open your attention to the market's hidden frequencies.

{ roll_check("social", 12) >= 12:
    "The Drowned Court is buying silence again," a voice says from behind a stack of empty crates. "But this time they're paying in futures. Day after tomorrow, someone important forgets their own name."
    ~ add_journal_entry("Rumor", "Drowned Court buying silence with futures.")
- else:
    The rumors sense your interest and close like a fist. Whatever they were saying, they have decided to say it to someone else.
    ~ world_danger = world_danger + 2
    # consequence:danger_rise
}

-> DONE

=== market_debt_court ===
A makeshift tribunal beneath a torn banner. The judge wears a mask made of old receipts.

# sound:market_murmur
# animation:shudder

{ get_player_stat("authority") >= 2 || player_domain == "intrigue":
    You recognize the procedure: it is not justice, but accounting. The debt being judged is not money, but attention. The accused owes the district twelve hours of being noticed.
    ~ add_journal_entry("Debt court", "District judges debts of attention.")
    -> faction_reaction
- else:
    The language of the court is dense and rhythmic. You understand that someone is being punished, but not for what.
}

* [Intervene] -> market_intervene
* [Observe] -> market_observe
* [Leave quietly] -> market

=== market_intervene ===
{ roll_check("social", 14) >= 12:
    Your interruption is so unexpected that the court forgets its script. The accused flees. The judge turns to you with an expression you cannot read behind the receipts.
    ~ add_journal_entry("Intervention", "Disrupted a debt court.")
- else:
    The court absorbs your interruption into its proceedings. You are now listed as a co-defendant. The district has noticed you twice.
    ~ world_danger = world_danger + 5
}

-> DONE

=== market_observe ===
You watch without being watched.

{ roll_check("stealth", 10) >= 12:
    The judge removes the mask between cases. Beneath it, she is younger than the receipts suggest. Her eyes are the color of fountain water.
    ~ add_journal_entry("Observation", "Debt court judge has fountain-water eyes.")
- else:
    Someone taps your shoulder. "Spectators pay double," they whisper. You pay, or you leave.
    ~ player_focus = player_focus - 2
}

-> DONE
