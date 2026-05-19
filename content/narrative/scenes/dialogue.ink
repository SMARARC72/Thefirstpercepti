// ============================================================================
// DIALOGUE — NPC conversation trees
// ============================================================================

=== dialogue_sister_mourn ===
Sister Mourn watches you with the patience of someone who catalogs disasters.

"You have the look of someone who has already seen the ending," she says. "Most people arrive here still hoping for a middle."

* [Ask about the fountain] -> sm_fountain
* [Ask what she wants] -> sm_wants
* [Ask about the Archive] -> sm_archive
* [Leave] -> arrival

=== sm_fountain ===
"The fountain repeats names," she says, "but only after someone has paid to erase them. The Drowned Court has been buying silence for three generations."

{ get_player_stat("sense") >= 3:
    She does not look at the fountain when she speaks of it. Her eyes track something above the waterline.
}

~ add_journal_entry("Sister Mourn", "Fountain repeats erased names.")

-> dialogue_sister_mourn

=== sm_wants ===
"I want proof that the fountain is remembering names. Not repeating them — remembering. There is a difference between echo and memory."

She produces a small vial. "If you can get me water that remembers, I can get you access to the Archive's restricted vault."

* [Agree] -> sm_agree
* [Refuse] -> sm_refuse
* [Bargain for more] -> sm_bargain

=== sm_agree ===
"Good. The fountain is most honest at Deep Night. Bring me what you find."

~ add_journal_entry("Quest", "Collect fountain water at Deep Night for Sister Mourn.")

-> DONE

=== sm_refuse ===
She nods as if you have confirmed something. "Most refuse. Most also return, eventually. The fountain has that effect."

~ world_danger = world_danger + 2

-> DONE

=== sm_bargain ===
{ roll_check("intrigue", 12) >= 12:
    "You bargain like someone who has already lost everything once. Fine. The vault access, plus one truth from the Archive about your own arrival."
    ~ add_journal_entry("Bargain", "Sister Mourn: vault access + truth about arrival.")
- else:
    "You have nothing to bargain with. The fountain has not taken enough from you yet. Come back when you have scars worth trading."
}

-> DONE

=== sm_archive ===
"The Archive keeps what the world tries to forget. But some things forget themselves so thoroughly that even the Archive cannot hold them."

She looks at you with sudden intensity. "Be careful what you look for in there. The Archive does not always distinguish between searching and becoming."

-> dialogue_sister_mourn
