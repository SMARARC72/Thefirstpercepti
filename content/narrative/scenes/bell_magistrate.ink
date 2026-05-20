// ============================================================================
// BELL-MAGISTRATE ORRO — Dialogue scene (Phase 18 / CONTENT-203)
// ============================================================================
// Per packages/narrative dispatcher convention: dialogue_<npc-id-shortname>.
// NPC: npc-bell-magistrate-orro. Per Phase 14.5 beat file. Topics:
// ledger / the_unnamed / drowned_church / civic_warrant / personal_ledger / summons.
// Off-record signal: inkwell-down. DC 17 Mind unlocks personal-ledger secret.
// ============================================================================

=== dialogue_bell_magistrate_orro ===
Orro is at the central desk, ledger open, writing.

# sound:location-safe

Two clerks at side desks. The brass bell hangs silent above the door.

{ has_condition("bonded_to_marrow_saint_ilyra"):
    Orro looks up before you reach the desk. He has noticed something he does not name aloud.
}

ORRO: "Approach the desk if your matter is urgent. Otherwise the clerks will take your statement."

* [Approach the desk] -> orro_approach
* [Speak to a clerk instead] -> orro_clerk
* [Leave] -> arrival

=== orro_approach ===
ORRO: "Bell-Magistrate Orro. You are not on today's docket. State your matter. Speak in complete sentences if you can. The clerks transcribe."

The clerks' pens are poised.

* [Ask about the ledger] -> orro_ledger
* [Ask about The Unnamed] -> orro_unnamed
* [Ask about the Drowned Church] -> orro_church
* [Ask about civic warrants] -> orro_warrant
* [Ask about Bell-Magistrate Orro personally] -> orro_personal
* [Leave] -> arrival

=== orro_ledger ===
ORRO: "The Bell Court's ledger records what the Bell Court witnesses. Names are entered. Names are sometimes struck. A struck name is no longer a name in this jurisdiction."

{ get_player_stat("mind") >= 3:
    He pauses, briefly. "What becomes of the weight that name carried — that is a separate question this Court does not entertain on the docket."
    ~ add_journal_entry("Orro on the ledger", "Struck names lose name-status in jurisdiction. Carried-weight is off-docket.")
}

-> orro_approach

=== orro_unnamed ===
Orro sets the inkwell aside. The conversation has moved off-record.

# sound:ambient

ORRO: "The Bell Court considers The Unnamed a category, not a person. The category is 'weight that should have been struck but was not.' Your Drowned Church friends will tell you otherwise. You will form your own assessment."

ORRO: "If you tell me what you assess, I will not enter it. I am offering the conversation off-record."

~ add_journal_entry("Orro off-record", "Orro is willing to discuss The Unnamed off-record.")

* [Share your assessment] -> orro_share_assessment
* [Decline politely] -> orro_decline_assessment

=== orro_share_assessment ===
You speak. Orro listens without writing.

{ get_faction_trust("drowned_church") > 5:
    He nods, slightly. "Then we understand each other in different directions."
- else:
    He considers. "Then we may understand each other in similar directions. The inkwell stays aside."
}

-> orro_personal_ledger_unlock

=== orro_decline_assessment ===
ORRO: "Acknowledged. The offer stands until you leave the precinct."

The inkwell remains aside until you turn to go.

-> orro_approach

=== orro_church ===
ORRO: "The Drowned Church operates within civic tolerance. Marrow-Saint Ilyra is a competent religious official. The Bell Court has filed no warrant against her."

ORRO: "I would not advise informing her of any conversation we have here."

-> orro_approach

=== orro_warrant ===
ORRO: "A warrant is filed when the Court adjudicates necessity. Necessity requires a contradiction in the open ledger exceeding three civic days. You can request a copy of any warrant filed naming you."

ORRO: "You cannot request a copy of a warrant filed naming a struck name. The latter request is itself contradictory."

-> orro_approach

=== orro_personal ===
ORRO: "The Bell Court does not personalize its magistrates. I am the senior magistrate. That is the relevant fact."

{ roll_check("mind", 17) >= 17:
    He pauses. The inkwell goes aside.
    ORRO: "If your question is whether I keep a private ledger of cases this Court could not adjudicate — that question is also off-record. It is not yes or no. It is one I would prefer not to answer here."
    -> orro_personal_ledger_unlock
- else:
    His expression does not change. The inkwell stays in his hand.
    -> orro_approach
}

=== orro_personal_ledger_unlock ===
ORRO: "Do not name the ledger to anyone, including me, in this precinct. If you have a contradiction the Court cannot adjudicate that you believe should be adjudicable — tell me at the canal walk on Tuesday evening, after seventh bell. Not here."

~ add_journal_entry("Orro — personal ledger", "Exists. Conversation moves to canal walk, Tuesday after seventh bell. Quest unlocked.")

-> arrival

=== orro_clerk ===
A junior clerk looks up. The clerk does not introduce themselves. The Bell Court does not personalize its juniors either.

CLERK: "Statement?"

-> arrival
