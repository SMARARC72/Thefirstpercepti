// ============================================================================
// DREAMS — Rest and sleep encounter events
// ============================================================================

=== dream_rest ===
You find a place where the district's attention thins.

{ world_danger > 60:
    Even here, the danger presses against your eyelids. Sleep will not come cleanly.
}

{ player_form == "spirit_bound":
    Your bound spirit paces while you rest. It does not sleep. It has never slept.
}

* [Sleep lightly] -> dream_light
* [Sleep deeply] -> dream_deep
* [Stay awake] -> dream_awake

=== dream_light ===
You let yourself drift, but keep one hand on the stone.

{ roll_check("sense", 10) >= 12:
    In the space between waking and sleeping, you hear the district's true name. Not the name the maps use — the name it calls itself, which is older and sadder.
    ~ add_journal_entry("True name", "Heard the district's true name in light sleep.")
    ~ player_focus = player_focus + 2
- else:
    Dreams come, but they are not yours. You dream of being a fountain, remembering names you never knew.
    ~ player_focus = player_focus + 1
}

~ player_hp = min(player_hp + 2, player_max_hp)
-> DONE

=== dream_deep ===
You surrender to sleep entirely.

{ roll_check("will", 12) >= 12:
    You dream of the world before the Shattering. It is not better, but it is more certain. You wake with a word on your tongue that you do not recognize.
    ~ add_journal_entry("Pre-Shattering dream", "Dreamed the world before the Shattering.")
    ~ player_hp = min(player_hp + 4, player_max_hp)
    ~ player_focus = min(player_focus + 3, player_max_focus)
- else:
    Something visits you in the deep. It does not harm you, but it studies you, and you can feel its attention like cold fingers on your thoughts.
    ~ player_focus = player_focus - 2
    ~ player_hp = min(player_hp + 1, player_max_hp)
}

-> DONE

=== dream_awake ===
You choose vigilance over rest.

{ get_player_stat("sense") >= 3:
    The district changes while you watch. A doorway appears where there was only wall. A shadow moves against the light. By morning, three things will be different, and you will have witnessed only one of them.
    ~ add_journal_entry("Vigil", "Witnessed the district changing while awake.")
- else:
    The night is long. Your attention frays. By morning you are no more rested than when you stopped, but at least you are still here.
}

-> DONE
