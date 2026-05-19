// ============================================================================
// THE OLD BREACH — Dangerous late-game area
// ============================================================================

=== breach ===
The Old Breach is not a place. It is a disagreement between the city and the ground beneath it.

# sound:breach_rumble
# animation:shudder

{ world_danger > 70:
    The air tastes of copper and old lightning. Things live here that have never been named, because naming them would require admitting they exist.
}

{ player_form == "warped":
    Your body resonates with the Breach. The Shattering that made you also made this. You are kin, whether you want to be or not.
}

* [Explore carefully] -> breach_explore
* [Listen to the walls] -> breach_listen
* [Descend] -> breach_descend
* [Go to the Sunken Fountain] -> fountain
* [Retreat] -> arrival

=== breach_explore ===
You move through the Breach as if it were a living thing that might startle.

{ roll_check("sense", 14) >= 12:
    The debris is arranged in patterns. Not architecture — grammar. The Breach is trying to say something, and the city has been misunderstanding it for generations.
    ~ add_journal_entry("Breach grammar", "Debris arranged in linguistic patterns.")
- else:
    A floorboard that should not exist creaks. Something below you shifts its weight.
    ~ world_danger = world_danger + 4
}

-> DONE

=== breach_listen ===
You press your ear to the wall. It is warm.

{ get_player_stat("sense") >= 4:
    The wall has a heartbeat, slow and deliberate. Whoever built this place did not build it empty. They built it as a container.
    ~ add_journal_entry("Breach heartbeat", "The walls are alive and deliberate.")
- else:
    You hear your own pulse returned to you, distorted, as if the wall is trying to learn the rhythm of your fear.
    ~ player_focus = player_focus - 3
}

-> DONE

=== breach_descend ===
The stairs downward have been worn by feet that were not entirely human.

# sound:stone_scrape
# animation:shudder

{ roll_check("physical", 16) >= 12:
    You descend through three false floors. At the bottom, a door without a handle. The keyhole is shaped like an eye.
    ~ add_journal_entry("Deep breach", "Door with eye-shaped keyhole at bottom of stairs.")
- else:
    The stairs end in a collapse. You turn back, but the way up seems longer than it should be. The Breach has borrowed some of your distance.
    ~ player_hp = player_hp - 3
    # consequence:wounded
}

-> DONE
