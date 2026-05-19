// ============================================================================
// COMBAT — Encounter templates
// ============================================================================

=== combat_threat_emerges ===
A threat finishes becoming a shape.

{ world_danger > 70:
    It has been following you since you arrived. The district has been feeding it your hesitation.
}

# sound:combat_start
# animation:shudder

* [Attack] -> combat_attack
* [Defend] -> combat_defend
* [Flee] -> combat_flee
* [Speak to it] -> combat_speak

=== combat_attack ===
{ roll_check("combat", 12) >= 12:
    You act before it finishes becoming real. It breaks apart into wet ash and a smell like old coins.
    ~ add_journal_entry("Combat", "Defeated a forming threat.")
    # sound:blade_ring
    # animation:flash
- else:
    The thing you strike learns the shape of your arm. Pain arrives with a precise memory of your childhood door.
    ~ player_hp = player_hp - 4
    # sound:impact_wet
    # consequence:wounded
}

-> DONE

=== combat_defend ===
You raise what protection you have.

{ roll_check("combat", 8) >= 12:
    The threat tests your guard and finds it sufficient. It withdraws, but not far. You can feel it waiting in the next shadow.
    # sound:guard_hold
- else:
    Your guard is not enough. Something gets through — not your flesh, but your certainty. You will hesitate next time.
    ~ player_hp = player_hp - 2
    ~ player_focus = player_focus - 3
    # sound:impact_wet
    # consequence:wounded
}

-> DONE

=== combat_flee ===
You choose the moment no one was watching.

{ roll_check("stealth", 10) >= 12:
    The district loses you for the length of one held breath. You find a safer angle, for now.
    ~ world_danger = max(world_danger - 10, 0)
    # sound:footsteps_fade
- else:
    You run, but the sound of pursuit keeps pace from inside your own chest. The district has your rhythm now.
    ~ world_danger = world_danger + 6
    # sound:footsteps_chase
    # consequence:danger_rise
}

-> DONE

=== combat_speak ===
You address the threat as if it could understand.

{ roll_check("social", 14) >= 12:
    It pauses. Not because it understands your words, but because it has never been spoken to before. The hesitation is enough.
    ~ add_journal_entry("Strange diplomacy", "Spoke to a threat; it hesitated.")
    # sound:whisper_resolved
- else:
    Your voice gives it a shape to aim for. It becomes more real, more focused, more hungry.
    ~ world_danger = world_danger + 8
    # sound:breach_rumble
    # consequence:danger_rise
}

-> DONE
