// ============================================================================
// THE SUNKEN FOUNTAIN — Central location hub
// ============================================================================

=== fountain ===
The Sunken Fountain waits.

# sound:ambient_drip
# animation:pulse

{ world_danger > 60:
    The water is black today. Something has been feeding at the bottom.
}

{ world_danger > 80:
    The fountain repeats names only after someone has paid to erase them. You hear your own name bubbling in the water.
}

* [Touch the water] -> fountain_touch
* [Read the carved names] -> fountain_names
* [Examine the court seal] -> fountain_examine_seal
* [Go to Greywake Market] -> market
* [Go to the Archive Steps] -> archive
* [Step back] -> arrival

=== fountain_touch ===
Your fingers break the surface.

{ roll_check("metaphysical", 12) >= 12:
    The water is not wet. It is memory, held in surface tension. For a moment you see the fountain as it was: full, surrounded by flowers, ringing with coins.
    ~ add_journal_entry("Vision", "The fountain remembers being full.")
- else:
    The cold is absolute. Your hand comes back covered in something that smells of old copper and regret.
    ~ player_hp = player_hp - 1
}

-> DONE

=== fountain_names ===
You lean closer to read what has been carved.

{ get_player_stat("mind") >= 3:
    The names are arranged by date of death, but some dates are in the future. One entry reads: "{player_name} — Day {world_day + 3}."
    ~ add_journal_entry("Carved names", "Your name, dated three days from now.")
- else:
    The carving is too worn. You make out fragments: "...drowned...", "...remember...", "...do not look up."
}

-> DONE

=== fountain_examine_seal ===
A court seal scratched into the stone lip.

{ get_player_stat("lore") >= 2 || player_domain == "lore":
    The Drowned Court's mark. They have claimed this fountain as evidence in a trial that has not happened yet.
    ~ add_journal_entry("Evidence", "Drowned Court seal on fountain.")
    -> faction_reaction
- else:
    You recognize it as official, but not which office. The symbol seems to shift when you look directly at it.
}

-> DONE
