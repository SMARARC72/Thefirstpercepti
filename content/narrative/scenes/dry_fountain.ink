// ============================================================================
// THE DRY FOUNTAIN — Greywake slice anchor (Phase 18 / CONTENT-201)
// ============================================================================
// Replaces the prior generic fountain scene as the slice's tonal north-star.
// Per project memory: the dry fountain leaks upward; the Listening Child
// sits at the lip; this is where Hear-the-Fountain and Compose are cast
// and where the X.12 Apotheosis can fire.
// ============================================================================

=== dry_fountain ===
The fountain is dry to the eye and leaks upward.

# sound:pulse-bell
# animation:pulse

Black seawater rises an inch above the lip of the topmost basin and dissolves into the air. The salt-rime on the lower stones is unbroken. There is no plumbing that should produce this.

{ get_player_stat("sense") >= 2:
    A child sits at the upper basin lip. Pale clean clothes nobody has seen elsewhere. The child does not look at the fountain — looks up, past your left shoulder, at something nobody else can see.
}

* [Look closely at the carved names] -> dry_fountain_carved_lip
* [Look closely at the water] -> dry_fountain_black_water
* [Reach for the one coin] -> dry_fountain_one_coin
* [Speak to the Listening Child] -> dialogue_the_listening_child
* [Cast Hear the Fountain] -> dry_fountain_cast_hear
* [Step back to the market] -> arrival

=== dry_fountain_carved_lip ===
You lean to read what has been carved into the basin's lip.

{ roll_check("mind", 12) >= 12:
    Names. Arranged in an order you do not yet understand. Some you recognize. Some you do not. One of them — neither recognized nor unrecognized — has the cadence of yours.
    ~ add_journal_entry("Carved lip", "Names arranged in an order not understood. One has the cadence of yours.")
- else:
    The carving is worn. Fragments: "...drowned...", "...practicing...", "...do not name aloud."
    ~ add_journal_entry("Carved lip", "Fragments: drowned, practicing, do not name aloud.")
}

-> dry_fountain

=== dry_fountain_black_water ===
You hold your hand near the surface that should not be there.

{ get_player_stat("sense") >= 3:
    The water rises an inch above your palm without touching it. It is not wet. It is held in surface tension by something that is not water. The cold has the wrong cold's wrongness.
    ~ add_journal_entry("Black water", "Held by surface tension. Not wet. Wrong cold.")
- else:
    The water does not behave. You cannot make it behave by watching.
}

* [Try to take a vial of it] -> dry_fountain_vial
* [Step back] -> dry_fountain

=== dry_fountain_vial ===
{ has_item("item_bell_marked_charm") || has_item("item_vial_of_practiced_name_water"):
    You hold an empty vial at the lip. The water enters slowly and against the curvature. The vial hums faintly against the heel of your hand.
    ~ add_journal_entry("Practicing water", "Vial filled at the dry fountain.")
- else:
    Without a proper vessel, the water refuses you. It dissolves into the air before it reaches your fingers.
}

-> dry_fountain

=== dry_fountain_one_coin ===
A single coin lies in the upper basin. Nobody removes it.

{ roll_check("will", 14) >= 14:
    Your hand stops half an inch above the coin. Not by your decision.
    ~ add_journal_entry("The one coin", "Your hand stops above it. Not by your decision.")
- else:
    You reach for the coin and find your hand is already at your side. You do not remember moving it. The coin has not been touched.
    ~ add_journal_entry("The one coin", "Reached, but the hand returned. The coin has not been touched.")
}

-> dry_fountain

=== dry_fountain_cast_hear ===
{ get_player_stat("authority") < 1:
    You attempt to address the fountain. The fountain does not address you back. Your weight is not yet right for the rite.
    -> dry_fountain
}

You speak the name and the fountain practices it back.

# sound:ambient

{ roll_check("will", 12) >= 12:
    The practicing is at your inner ear, not your outer. The Listening Child does not look at you. Authority weighs differently in your chest now, a fraction heavier.
    ~ add_journal_entry("Hear the Fountain", "The fountain practiced the name back.")
    -> faction_reaction
- else:
    You speak; the fountain does not answer. Salt-rime on the lower stones has shifted at the western edge. The Listening Child does not look up.
    ~ add_journal_entry("Hear the Fountain", "Cast attempted; the fountain did not answer.")
}

-> dry_fountain

=== dialogue_the_listening_child ===
The child does not look at you. The child looks past your left shoulder, at something nobody else can see.

CHILD: "The fountain is leaking the wrong direction."

The child pauses. The cadence is of citation — as if quoting something not yet said.

CHILD: "That is not unusual."

* [Ask the child their name] -> child_ask_name
* [Speak the words "practicing water"] -> child_practicing_water
* [Ask about The Unnamed] -> child_unnamed
* [Step back] -> dry_fountain

=== child_ask_name ===
CHILD: "That is a child who sits here."

The child does not elaborate. The hands remain folded.

-> dialogue_the_listening_child

=== child_practicing_water ===
The child does not look at you. The child opens one fist.

# sound:pulse-bell

A small pebble sits in the open palm, warm in the afternoon.

CHILD: "This belongs to whoever practices. The water is practicing."

The child extends the hand.

CHILD: "Take it."

* [Take the pebble] -> child_take_pebble
* [Decline] -> child_decline_pebble

=== child_take_pebble ===
You take it. The child closes the fist. The fist is empty now. The pebble is in your pocket.

CHILD: "It will not be lost. That is part of what it is."

~ add_journal_entry("The Listening Child's pebble", "The child gifted the pebble after the words 'practicing water' were spoken at the fountain.")

-> dry_fountain

=== child_decline_pebble ===
The child closes the fist. The fist is not empty now.

CHILD: "Then the practicing is not yet yours."

-> dry_fountain

=== child_unnamed ===
CHILD: "The one who is not yet named is listening to the rehearsal. The listening is not the same as the naming. The naming is later."

-> dialogue_the_listening_child
