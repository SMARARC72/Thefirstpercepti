// ============================================================================
// THE LUMINOUS ARCHIVE — Knowledge and records location
// ============================================================================

=== archive ===
The Luminous Archive rises around you like a held breath.

# sound:archive_bell
# animation:pulse

Rows of shelves extend into shadow. Each book is a record of something that should not have survived the Shattering.

* [Search for records about the fountain] -> archive_search_fountain
* [Look for your name] -> archive_search_name
* [Study the archive bells] -> archive_bells
* [Go to the Sunken Fountain] -> fountain
* [Go to Greywake Market] -> market
* [Leave] -> arrival

=== archive_search_fountain ===
You search the indices for anything connected to the Sunken Fountain.

{ roll_check("lore", 10) >= 12:
    You find a deposition from a witness who no longer exists: "The fountain does not drown people. It remembers them too completely, and the weight of that memory pulls them under."
    ~ add_journal_entry("Archive record", "Fountain remembers too completely.")
- else:
    The indices are coded. You find references to "Project Sunken" and "The Breach Memorandum" but the actual texts are stored in a restricted vault.
}

-> DONE

=== archive_search_name ===
{ roll_check("lore", 14) >= 12:
    There is a file. Thin, recent. It contains only a sketch of your face and the words: "Subject arrived. Do not intervene yet."
    ~ world_danger = world_danger + 10
    ~ add_journal_entry("Discovery", "A file on you exists in the Archive.")
- else:
    If there is a record, it is not under any name you have used. The Archive keeps secrets in categories that have not been invented yet.
}

-> DONE

=== archive_bells ===
The bells hang motionless, but you feel their ringing in your teeth.

{ world_day >= 3:
    They are ringing for a keeper who was buried three days ago. The keepers here do not always stay buried.
    ~ add_journal_entry("Archive bells", "Ringing for a buried keeper.")
- else:
    The bells are silent. In the Archive, silence is louder than ringing.
}

-> DONE
