// ============================================================================
// THE FIRST PERCEPTION — Main Narrative
// ============================================================================
// Entry point for all narrative content. Includes scene modules.
// ============================================================================

// ============================================================================
// ARRIVAL — First scene after character creation
// ============================================================================

=== arrival ===
{ world_location }

{ player_form == "spirit_bound":
    Your second shadow answers half a breath late. The street notices.
}

{ player_form == "warped":
    Your body remembers the Shattering in ways the paving stones cannot ignore.
}

{ player_form == "construct":
    The materials that still dream inside you resonate with the fountain's frequency.
}

People keep their distance, not because they know what you are, but because the world seems to notice you first.

* [Look around] -> arrival_look
* [Listen for trouble] -> arrival_listen
* [Approach the fountain] -> fountain
* [Speak to the nearest witness] -> dialogue_sister_mourn

=== arrival_look ===
The scene sharpens.

{ get_player_stat("sense") >= 2:
    You notice: a drain clogged with violet thread, a court seal scratched into the fountain lip, and one dry footprint pointing away.
    ~ add_journal_entry("Perceived evidence", "Violet thread, court seal, dry footprint.")
- else:
    You find details, but they arrange themselves into the wrong conclusion before you can stop them.
}

* [Follow the dry footprint] -> arrival
* [Inspect the court seal] -> fountain_examine_seal
* [Pull the violet thread] -> arrival

=== arrival_listen ===
You open your attention to the district's hidden frequencies.

{ get_player_stat("sense") >= 3:
    Beneath the public noise: three knocks, a breath, then water moving uphill. Someone nearby says your name as if reading it from a ledger.
    ~ add_journal_entry("Heard", "Your name spoken from a ledger.")
- else:
    The street sounds normal. Too normal. The absence of strangeness is itself a warning.
}

-> DONE

// ============================================================================
// THE SUNKEN FOUNTAIN — Central location hub
// ============================================================================

=== fountain ===
The Sunken Fountain waits.

{ world_danger > 60:
    The water is black today. Something has been feeding at the bottom.
}

{ world_danger > 80:
    The fountain repeats names only after someone has paid to erase them. You hear your own name bubbling in the water.
}

* [Touch the water] -> fountain_touch
* [Read the carved names] -> fountain_names
* [Examine the court seal] -> fountain_examine_seal
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
- else:
    You recognize it as official, but not which office. The symbol seems to shift when you look directly at it.
}

-> DONE

// ============================================================================
// THE LUMINOUS ARCHIVE — Knowledge and records location
// ============================================================================

=== archive ===
The Luminous Archive rises around you like a held breath.

Rows of shelves extend into shadow. Each book is a record of something that should not have survived the Shattering.

* [Search for records about the fountain] -> archive_search_fountain
* [Look for your name] -> archive_search_name
* [Study the archive bells] -> archive_bells
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

// ============================================================================
// COMBAT — Encounter templates
// ============================================================================

=== combat_threat_emerges ===
A threat finishes becoming a shape.

{ world_danger > 70:
    It has been following you since you arrived. The district has been feeding it your hesitation.
}

* [Attack] -> combat_attack
* [Defend] -> combat_defend
* [Flee] -> combat_flee
* [Speak to it] -> combat_speak

=== combat_attack ===
{ roll_check("combat", 12) >= 12:
    You act before it finishes becoming real. It breaks apart into wet ash and a smell like old coins.
    ~ add_journal_entry("Combat", "Defeated a forming threat.")
- else:
    The thing you strike learns the shape of your arm. Pain arrives with a precise memory of your childhood door.
    ~ player_hp = player_hp - 4
}

-> DONE

=== combat_defend ===
You raise what protection you have.

{ roll_check("combat", 8) >= 12:
    The threat tests your guard and finds it sufficient. It withdraws, but not far. You can feel it waiting in the next shadow.
- else:
    Your guard is not enough. Something gets through — not your flesh, but your certainty. You will hesitate next time.
    ~ player_hp = player_hp - 2
    ~ player_focus = player_focus - 3
}

-> DONE

=== combat_flee ===
You choose the moment no one was watching.

{ roll_check("stealth", 10) >= 12:
    The district loses you for the length of one held breath. You find a safer angle, for now.
    ~ world_danger = max(world_danger - 10, 0)
- else:
    You run, but the sound of pursuit keeps pace from inside your own chest. The district has your rhythm now.
    ~ world_danger = world_danger + 6
}

-> DONE

=== combat_speak ===
You address the threat as if it could understand.

{ roll_check("social", 14) >= 12:
    It pauses. Not because it understands your words, but because it has never been spoken to before. The hesitation is enough.
    ~ add_journal_entry("Strange diplomacy", "Spoke to a threat; it hesitated.")
- else:
    Your voice gives it a shape to aim for. It becomes more real, more focused, more hungry.
    ~ world_danger = world_danger + 8
}

-> DONE

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

// ============================================================================
// GREYWAKE MARKET — Central hub of commerce and rumor
// ============================================================================

=== market ===
Greywake Market breathes in layers: the top layer of voices, the middle layer of prices, and the bottom layer of things that change hands without being named.

{ world_danger > 50:
    The merchants have pulled their awnings low. You can see the whites of their eyes even from a distance.
}

{ get_player_stat("sense") >= 3:
    Beneath the bargaining, someone is crying in a language that has no words for help.
}

* [Browse the stalls] -> market_browse
* [Listen for rumors] -> market_rumors
* [Approach the debt court] -> market_debt_court
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
}

-> DONE

=== market_debt_court ===
A makeshift tribunal beneath a torn banner. The judge wears a mask made of old receipts.

{ get_player_stat("authority") >= 2 || player_domain == "intrigue":
    You recognize the procedure: it is not justice, but accounting. The debt being judged is not money, but attention. The accused owes the district twelve hours of being noticed.
    ~ add_journal_entry("Debt court", "District judges debts of attention.")
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

// ============================================================================
// THE OLD BREACH — Dangerous late-game area
// ============================================================================

=== breach ===
The Old Breach is not a place. It is a disagreement between the city and the ground beneath it.

{ world_danger > 70:
    The air tastes of copper and old lightning. Things live here that have never been named, because naming them would require admitting they exist.
}

{ player_form == "warped":
    Your body resonates with the Breach. The Shattering that made you also made this. You are kin, whether you want to be or not.
}

* [Explore carefully] -> breach_explore
* [Listen to the walls] -> breach_listen
* [Descend] -> breach_descend
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

{ roll_check("physical", 16) >= 12:
    You descend through three false floors. At the bottom, a door without a handle. The keyhole is shaped like an eye.
    ~ add_journal_entry("Deep breach", "Door with eye-shaped keyhole at bottom of stairs.")
- else:
    The stairs end in a collapse. You turn back, but the way up seems longer than it should be. The Breach has borrowed some of your distance.
    ~ player_hp = player_hp - 3
}

-> DONE

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

// ============================================================================
// FACTION REACTIONS — Dynamic faction responses
// ============================================================================

=== faction_reaction ===
{ get_faction_trust("drowned_court") < -20:
    -> fc_hostile
}

{ get_faction_trust("drowned_court") > 20:
    -> fc_friendly
}

-> fc_neutral

=== fc_hostile ===
The Drowned Court has marked you. You notice watchers at the fountain's edge, too still to be casual.

~ world_danger = world_danger + 5

-> DONE

=== fc_friendly ===
A court agent approaches openly. "The Court extends protection to those who understand the value of silence."

-> DONE

=== fc_neutral ===
The Court observes. They have not decided what you are yet.

-> DONE

// ============================================================================
// CONSEQUENCE NARRATIVES — Triggered by consequence system
// ============================================================================

=== consequence_wounded ===
Your wound opens again when you move too quickly.

{ player_hp <= 5:
    The blood is not the right color. It carries something that flickers in the lamplight, like letters trying to form words.
    ~ add_journal_entry("Condition", "Wound bleeding strangely.")
}

-> DONE

=== consequence_danger_rise ===
The district has noticed your pattern.

{ world_danger > 80:
    The streets themselves seem to lean toward you. Doorways narrow. Shadows lengthen in directions that do not match the light.
}

-> DONE

=== consequence_faction_shift ===
Word travels fast in a city that reads ledgers before faces.

-> DONE

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


// ── Global Variables (bound from engine) ──
VAR player_name = "No One"
VAR player_hp = 20
VAR player_max_hp = 20
VAR player_focus = 15
VAR player_max_focus = 15
VAR player_form = "human"
VAR player_posture = "seeker"
VAR player_domain = "lore"
VAR world_danger = 34
VAR world_location = "The Sunken Fountain"
VAR world_region = "Greywake Market District"
VAR world_day = 1
VAR world_phase = "The Waking Hour"
VAR turn_count = 0

// ── External Functions (provided by engine bridge) ──
EXTERNAL get_player_stat(stat_name)
EXTERNAL get_world_danger()
EXTERNAL get_faction_trust(faction_id)
EXTERNAL get_faction_fear(faction_id)
EXTERNAL has_condition(condition_id)
EXTERNAL has_item(item_id)
EXTERNAL get_turn_count()
EXTERNAL roll_check(domain, difficulty)
EXTERNAL add_journal_entry(label, detail)

// ── Main Entry Knot ──
=== start ===
The world notices you before you notice it.

{ player_name != "No One":
    The name {player_name} carries weight here. Or perhaps the weight is in what the name has survived.
- else:
    No name survives first contact. That is the first lesson.
}

You stand at {world_location}, in the {world_region}. The {world_phase} settles over the district like a decision already made.

-> arrival

// ── Helper Knots ──

=== wait_and_watch ===
You let the hour pass through you.

{ get_player_stat("sense") >= 3:
    Beneath the public noise, a second rhythm appears: three knocks, a breath, then water moving uphill.
    ~ add_journal_entry("World pulse", "Three knocks, a breath, water uphill.")
- else:
    The street changes in ways you cannot name. A shutter opens where there was no window.
}

{ world_danger > 50:
    Something in the district has been waiting for stillness.
}

-> DONE

=== rest ===
You search for a dry angle beneath collapsed stone.

{ roll_check("physical", 10) >= 12:
    Your breathing steadies. The district briefly forgets to punish stillness.
    ~ player_hp = min(player_hp + 3, player_max_hp)
    ~ player_focus = min(player_focus + 3, player_max_focus)
- else:
    You rest, but not cleanly. Every closed eye contains a street you have not walked yet.
    ~ player_hp = min(player_hp + 1, player_max_hp)
}

-> DONE
