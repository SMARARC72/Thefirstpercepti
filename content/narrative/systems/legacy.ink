// ============================================================================
// LEGACY — Death and inheritance narratives
// ============================================================================

=== legacy_death ===
You do not end. You become a detail in someone else's first perception.

{ player_name != "No One":
    The name {player_name} is spoken one more time, then filed in the Archive under "Pending."
}

The world you leave behind has been changed by your passage. Factions remember. Locations bear marks. Rumors grow new details.

* [Begin again] -> legacy_begin_again

=== legacy_begin_again ===
Someone new arrives at {world_location}.

{ has_item("cracked_brass_lens"):
    They find a cracked brass lens in the fountain's basin. It shows them things they are not ready to see.
}

The cycle continues. The world notices them first.

-> DONE
