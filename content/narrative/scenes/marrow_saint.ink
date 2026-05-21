// ============================================================================
// MARROW-SAINT ILYRA — Dialogue scene (Phase 18 / CONTENT-204)
// ============================================================================
// NPC: npc-marrow-saint-ilyra. Per Phase 14.5 beat file. Topics: drowned_church
// / the_unnamed / marrow_wax / bell_magistrate_orro / fountain / salt_immersion.
// Standing-water protocol (she stays in the antechamber). DC 18 Will unlocks
// candidacy secret. Bond-recruitment offer if faith_drowned_church >= 5.
// Listening Child's pebble is ALSO a recruitment prerequisite per memory.
// ============================================================================

=== dialogue_marrow_saint_ilyra ===
The Drowned Cathedral antechamber is knee-deep in standing water that should not be there.

# sound:location-danger

Marrow-Saint Ilyra is at a niche, lighting a marrow-wax candle. Her wrists are bound with red cord.

ILYRA: "You came as we hoped someone might. Stay where the water is shallowest."

* [Approach] -> ilyra_approach
* [Stay at the threshold] -> ilyra_threshold
* [Leave] -> arrival

=== ilyra_approach ===
The water parts around your boots and rejoins behind you, slowly.

ILYRA: "I am Marrow-Saint Ilyra. The candle is for someone who did not finish their vigil. You have not been listed yet. Tell me who has not yet named you."

{ get_faction_trust("drowned_church") >= 3:
    She does not look at the candle when she speaks of it. Her eyes are the same colour as the standing water.
}

* [Ask about the Drowned Church] -> ilyra_church
* [Ask about The Unnamed] -> ilyra_unnamed
* [Ask about marrow-wax] -> ilyra_marrow_wax
* [Ask about Bell-Magistrate Orro] -> ilyra_orro
* [Ask about the dry fountain] -> ilyra_fountain
* [Ask about salt-immersion] -> ilyra_salt_immersion
* [Leave] -> arrival

=== ilyra_threshold ===
ILYRA: "The threshold is a position. The Drowned Church accepts positions."

She lights another candle without turning. The flame's wrong-gold catches the water.

-> ilyra_approach

=== ilyra_church ===
ILYRA: "The Drowned Church does not refuse anyone the water. The water refuses some. That is a different relation. We listen for what the city tries to forget. Sometimes the city is grateful for the listening."

ILYRA: "There are three rites that matter here. Salt-immersion is for what you bring. Marrow-wax is for what you leave behind. Composing is for what you cannot yet say."

~ add_journal_entry("Drowned Church doctrine", "Salt-immersion / marrow-wax / Composing. The water refuses some.")

-> ilyra_approach

=== ilyra_unnamed ===
ILYRA: "The Unnamed is not a god. The Unnamed is what becomes a god."

She pauses. The bound wrists do not move.

ILYRA: "The fountain is rehearsing the name. We are not yet the rehearsal. We hold the room."

{ roll_check("will", 18) >= 18:
    She looks at you directly for the first time. The water around her ankles stops moving for the duration of the look.
    ILYRA: "When the rehearsal becomes the speaking, someone will be in the room first. Someone has to be. Do not assume I am offering you the position."
    ~ add_journal_entry("Ilyra — candidacy", "She believes she may be the successor. Does not yet name you as candidate.")
- else:
    She does not elaborate. The water resumes its slow parting and rejoining.
}

-> ilyra_approach

=== ilyra_marrow_wax ===
ILYRA: "The candles are rendered from those who fell on vigil. Many of them asked. Some of them did not. The Drowned Church does not pretend either way. The candles work."

{ roll_check("will", 15) >= 15:
    She continues without prompting.
    ILYRA: "You wonder if I have rendered. Yes. I have rendered three. I knew each of them. I would render again if asked. I would not render unasked. Do not ask me to clarify the difference."
    ~ add_journal_entry("Ilyra — marrow", "She has personally rendered three. Will not render unasked. Will not clarify the difference under question.")
}

-> ilyra_approach

=== ilyra_orro ===
ILYRA: "Orro is competent and careful. Competence is not the same as jurisdiction. He knows this. He keeps a private ledger."

ILYRA: "I will not approach him. If you do, do not tell him I said so."

~ add_journal_entry("Ilyra on Orro", "Suspects his private ledger. Will not approach him.")

-> ilyra_approach

=== ilyra_fountain ===
ILYRA: "The fountain practices. We do not interrupt. Some who listen long enough begin to practice with it."

ILYRA: "If you find yourself answering it, come back here. Bring whatever the fountain gave you."

{ has_item("item_listening_childs_pebble"):
    Her eyes go to your pocket where the pebble warms against your hand. She does not name what she has seen.
}

-> ilyra_approach

=== ilyra_salt_immersion ===
ILYRA: "Bring the salt-rime to me. I will read what it weighs. What you carry that is not yours will be set aside. What you carry that is yours will be salt-marked. Some of it will be marked you cannot remove. Sit with that before you ask."

{ has_item("item_salt_rime_shard"):
    She has noticed the salt-rime in your possession without your having shown it. Her gaze returns to the candle.
}

-> ilyra_approach
