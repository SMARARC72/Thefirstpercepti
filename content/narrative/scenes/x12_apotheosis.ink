// ============================================================================
// X.12 AUTHORITY APOTHEOSIS — Ending scene (Phase 18 / CONTENT-205)
// ============================================================================
// Per project memory + Workflows X.12-X.16 spec: triggered at Authority >= 10
// at the dry fountain. Emergent deity name fires (typically "The One Who
// Heard the Fountain" if name unnamed). Voice-shift NOT applied (X.12 stays
// in second person — the becoming is "you"; per narrator_form_of_ending.md).
//
// Pattern: ink scene calls llm_generate(prompt) to fetch the postcard text
// from formOfEnding template (Phase 17). Falls back to static narration if
// LLM unavailable. State Manager downstream commits the deity birth event
// via canon-event-emergent codepath (engine reducers, not Ink).
// ============================================================================

=== x12_apotheosis ===
You speak the name a final time and the fountain answers in the voice you have been practicing.

# sound:ambient
# animation:pulse

The voice is yours. It is no longer only yours.

{ get_player_stat("authority") < 10:
    The voice falters. The Authority you carry is not yet enough. The fountain stops mid-practicing. The Listening Child closes the open fist.
    ~ add_journal_entry("X.12 attempt", "Apotheosis attempted with Authority < 10. The fountain stopped mid-practicing.")
    -> dry_fountain
}

Marrow-Saint Ilyra stops moving in the antechamber three streets away.
The Bell Court ledger acquires an entry no clerk wrote.
The Listening Child stands up for the first time anyone has seen.

# sound:pulse-bell

~ temp emergent_name = "The One Who Heard the Fountain"

You are called {emergent_name} now. You are not called {player_name} anymore.

~ add_journal_entry("X.12 Apotheosis — Form of Ending", "Authority 10 at the dry fountain. The voice the fountain practiced is yours and no longer only yours. {emergent_name} succeeds you.")

-> legacy_death
