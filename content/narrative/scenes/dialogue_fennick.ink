// ============================================================================
// FENNICK THE TONGUE — Broker of harmful information
// ============================================================================

=== dialogue_fennick ===
Fennick the Tongue leans against a wall that does not exist. He has been selling the same secret to three different people for six years, and none of them have compared notes.

"You want information," he says. "Everyone wants information. The question is whether you can afford the kind that does not come with consequences."

* [Ask about the market] -> fennick_market
* [Ask about the Breach] -> fennick_breach
* [Buy a secret] -> fennick_buy
* [Threaten him] -> fennick_threaten
* [Leave] -> market

=== fennick_market ===
"The market is a thermometer," Fennick says. "When the Drowned Court is nervous, prices drop. When the Archive is nervous, prices rise. Right now, both are nervous, which means the real trade is happening somewhere else entirely."

{ roll_check("intrigue", 12) >= 12:
    He leans closer. "The Foundling has been asking about you. Not your name — your shadow. Someone wants to know what follows you."
    ~ add_journal_entry("Fennick warning", "The Foundling is asking about your shadow.")
- else:
    He smiles, and the smile contains no information you can use.
}

-> dialogue_fennick

=== fennick_breach ===
"The Breach is not a wound," Fennick says, suddenly serious. "It is a mouth. And mouths do not open without wanting something."

{ get_player_stat("lore") >= 2:
    He notices your attention. "You know something. I can see it in the way you hold your shoulders. Tell me, and I'll tell you what the mouth wants."
    * [Tell him what you know] -> fennick_exchange
    * [Remain silent] -> fennick_silent
- else:
    "But you do not need to know what it wants," he continues, relaxing. "You only need to know that it is hungry."
    ~ world_danger = world_danger + 2
    -> dialogue_fennick
}

=== fennick_exchange ===
{ roll_check("social", 10) >= 12:
    You trade a fragment of your first perception for a fragment of his. The exchange leaves you both slightly different.
    ~ add_journal_entry("Exchange", "Traded first perception fragment with Fennick.")
    ~ player_focus = player_focus + 1
- else:
    He takes your knowledge and gives you a lie wrapped in truth's clothing. You will not know which is which until it matters.
    ~ player_focus = player_focus - 2
}

-> DONE

=== fennick_silent ===
"Silence is also information," Fennick says, nodding as if you have confirmed something. "I will sell your silence to someone who needs it."

-> DONE

=== fennick_buy ===
"Secrets have grades," Fennick says. "Safe, warm, and burning. Which can you afford?"

{ has_item("a_dull_iron_token"):
    * [Pay with the iron token] -> fennick_pay_token
}
* [Pay with a promise] -> fennick_pay_promise
* [Decide against it] -> dialogue_fennick

=== fennick_pay_token ===
He takes the token without looking at it. "This is older than the market. It remembers when this place was water."

{ roll_check("intrigue", 10) >= 12:
    "The secret is this: the fountain does not remember names. The fountain remembers the absence of names. That is why the Court is afraid of it."
    ~ add_journal_entry("Fennick's secret", "The fountain remembers absence of names.")
- else:
    "The secret is this: someone is watching the watcher. Good luck sleeping."
    ~ player_focus = player_focus - 1
}

-> DONE

=== fennick_pay_promise ===
{ roll_check("social", 14) >= 12:
    "A promise from you is worth more than coin," he says. "I will collect later. For now: the Archive's restricted vault contains a mirror that shows the viewer's first perception. The Archivists use it to screen applicants."
    ~ add_journal_entry("Promise debt", "Owed Fennick a promise for vault mirror secret.")
- else:
    "Your promises are cheap. Everyone promises. The district is made of broken promises and the things that grow in their cracks."
    ~ world_danger = world_danger + 3
}

-> DONE

=== fennick_threaten ===
{ roll_check("combat", 12) >= 12:
    Fennick raises his hands. "Violence is also information. I have filed yours under 'impatient.'"
    He produces a folded paper. "Here. A list of everyone who has asked about you in the last three days. Use it wisely."
    ~ add_journal_entry("Threat", "Forced Fennick to reveal who is asking about you.")
- else:
    Fennick does not flinch. "Threats are currency I do not accept. But I will note that you tried."
    ~ world_danger = world_danger + 5
}

-> DONE
