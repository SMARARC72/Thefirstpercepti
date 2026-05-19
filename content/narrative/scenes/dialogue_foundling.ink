// ============================================================================
// THE FOUNDLING — Unclaimed witness
// ============================================================================

=== dialogue_foundling ===
The Foundling sits where the light fails to reach, wrapped in something that might once have been a banner.

"You are not the first to arrive here," they say, not looking at you. "But you might be the first to leave without being claimed."

{ get_player_stat("sense") >= 3:
    Their shadow is wrong. It points in a direction where there is no light source.
}

* [Ask what followed them] -> foundling_followed
* [Ask about being claimed] -> foundling_claimed
* [Offer protection] -> foundling_protection
* [Leave] -> arrival

=== foundling_followed ===
"It does not have a shape yet," the Foundling whispers. "It is still learning from the people it watches. Yesterday it walked like the market guard. Today it walks like you."

{ roll_check("sense", 12) >= 12:
    "Tomorrow it will walk like someone you trust. That is when you must run."
    ~ add_journal_entry("Foundling warning", "A shapeless thing is learning to walk like you.")
- else:
    They shudder. "I should not have told you. Now it knows that I know."
    ~ world_danger = world_danger + 3
}

-> DONE

=== foundling_claimed ===
"The district claims everyone eventually," they say. "Some become streets. Some become stories. Some become the silence between words. I am trying to become none of those."

{ player_form == "spirit_bound":
    They look at you with sudden recognition. "You are already claimed. You just have not noticed the second signature yet."
    ~ add_journal_entry("Claimed", "The Foundling says I am already claimed.")
}

* [Ask who claims you] -> foundling_who
* [Say nothing] -> foundling_silence

=== foundling_who ===
{ roll_check("social", 10) >= 12:
    "The fountain," they say. "The fountain claims everyone who drinks from it. Not the water — the reflection. It keeps a copy."
    ~ add_journal_entry("Fountain claim", "The fountain claims people through their reflection.")
- else:
    They shake their head. "If I name it, it will hear me. And it has been listening so carefully."
    ~ player_focus = player_focus - 1
}

-> DONE

=== foundling_silence ===
Your silence is not empty. The Foundling fills it with their own breathing, which is rapid and shallow.

"Thank you," they say finally. "Most people talk until the listening becomes a weapon."

~ player_focus = player_focus + 1
-> DONE

=== foundling_protection ===
{ roll_check("social", 12) >= 12:
    The Foundling looks at you with an expression you cannot name. "No one has offered that before. The market offers trade. The Archive offers knowledge. But protection..."
    They stand, and their shadow corrects itself. "I will remember you. That is dangerous, but I will do it anyway."
    ~ add_journal_entry("Protection", "Offered protection to the Foundling.")
- else:
    "You cannot protect me," they say, not unkindly. "You cannot even protect yourself. The district has already made copies of both of us."
    ~ world_danger = world_danger + 2
}

-> DONE
