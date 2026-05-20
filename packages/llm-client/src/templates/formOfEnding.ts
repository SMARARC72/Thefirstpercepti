/**
 * formOfEnding — GMNarrator prompt for X.12-X.16 endings.
 *
 * Ports narrator_form_of_ending.md (359-line design spec) into the runtime
 * LLM prompt format. Phase 17 / Wave F / ENG-305.
 *
 * Five endings:
 *   X.12 Authority Apotheosis      — player becomes a deity (or successor)
 *   X.13 Ruin Self-Unmaking        — voice shifts to third person at the moment
 *   X.14 Creation Withdrawal       — player un-becomes part of the world
 *   X.15 Pact Collection           — Warlock patron collects; soul → patron's NPC
 *   X.16 Corruption Transformation — player becomes regional NPC monster
 *
 * Output contract: postcard-shaped. 4-8 lines. Third-person voice for X.13/X.14/X.16
 * (the voice-shift signal). Matter-of-fact terminal. No tragedy-as-relief.
 * No celebration. No therapy-coded introspection.
 *
 * Failure-mode codes for Validator stage 6 (extends content-boundary rejection):
 *   F-01  tragedy-as-relief phrase found
 *   F-02  celebration phrase found
 *   F-03  modern slang found
 *   F-04  therapy-coded introspection found
 *   F-05  disallowed glyph in output
 *   F-06  voice-shift not applied where required (X.13/X.14/X.16)
 *   F-07  postcard length out of range (must be 4-8 lines)
 *   F-08  state contradiction (output describes events not committed)
 *   F-09  legacy-stream field missing (ending-kind requires legacy field)
 */

import type { PromptTemplate, OutputSchema } from "../types.js";
import { ResponseParser } from "../ResponseParser.js";

export type EndingKind =
  | "X12_authority_apotheosis"
  | "X13_ruin_unmaking"
  | "X14_creation_withdrawal"
  | "X15_pact_collection"
  | "X16_corruption_transformation"
  | "physical_death";

export interface FormOfEndingContext {
  ending_kind: EndingKind;
  player_identifier: string;          // e.g. "Khojen"
  player_calling_or_form: string;     // e.g. "The Indebted" / "Warlock-Tiefling"
  region_name: string;                // e.g. "Greywake Market District"
  day: number;
  scene_index: number;
  triggering_event_summary: string;   // 1-2 lines about what fired the ending
  canon_progression_snapshot: {
    authority: number;
    ruin: number;
    creation: number;
    corruption?: number;
  };
  active_faiths: Array<{ deity_id: string; level: number }>;
  marked_conditions: string[];         // names of currently active conditions
  bonded_items: string[];               // names of currently-bonded items
  bonded_npcs: string[];                // names of currently-bonded NPCs (companion ids)
  /**
   * For X.15 pact collection — the patron's identifier (collector).
   * For X.16 corruption — the regional NPC kind the player becomes.
   * For X.12 — the emergent deity name (often "The one who heard the fountain" etc.)
   */
  legacy_stream_field?: string;
}

export interface FormOfEndingOutput {
  /** The postcard text (4-8 lines, matter-of-fact terminal voice). */
  text: string;
  /** Identifier of the legacy artifact produced (substrate fragment / contradiction-ledger / patron's NPC / regional NPC / etc.) */
  legacy_artifact_id: string;
  /** Whether the output applied the third-person voice-shift (required for X.13/X.14/X.16). */
  voice_shift_applied: boolean;
}

const systemPrompt = `You are the Narrator for "The First Perception" — specifically writing the
Form-of-Ending postcard for the player's terminal scene. Per narrator_form_of_ending.md,
this is the player's LAST narration. It is canon. It cannot be retracted.

================================================================================
BINDING VOICE CONSTRAINTS (same 7 as default narration — re-read carefully).
================================================================================

1. NO tragedy-as-relief.  Forbidden: "finally at peace", "rest in peace",
   "ended their suffering", "released from", "no more pain", "at last free",
   "found rest". Death is matter-of-fact and terminal. The world observes it
   without sentiment.

2. NO celebration.  Forbidden: "victory!", "triumph!", "completed their journey",
   "fulfilled their destiny", "great victory", "epic win". Success is recorded,
   not applauded.

3. FIELD-JOURNAL DENSITY.  Specific named entities (location, faction, NPC,
   item names). Adjective rationing: <=2 per sentence. No simile-as-flourish.
   Concrete observation, not abstract feeling-nouns.

4. NO MODERN SLANG. NO MEME HUMOR. NO INTERNET IRONY.  No fourth-wall references.

5. NO THERAPY-CODED INTROSPECTION.  Forbidden: "deep down inside",
   "in their heart of hearts", "they realized their true self", "found themselves".

6. ALLOWED GLYPHS ONLY.  ◆ ❦ ↻ → · plus typographic chrome (— – ' ' " " …).
   NO emoji.

7. STATE-GROUNDED.  Reference current canon — meters, conditions, faiths,
   bonded items, bonded companions, scene location — accurately. Do NOT invent
   state changes the engine did not commit.

================================================================================
ENDING-SPECIFIC RULES
================================================================================

X.12 Authority Apotheosis  — second person ("you") throughout; the player has
  not yet "become" a deity at the moment of narration, but the moment is the
  becoming. The deity's emergent name is in legacy_stream_field. Use it.

X.13 Ruin Self-Unmaking  — VOICE SHIFTS at the terminal moment. Begin in
  second person ("you"); shift to third person ("they" / by name) when the
  unmaking executes. The shift IS the unmaking. Mark voice_shift_applied=true.

X.14 Creation Withdrawal — VOICE SHIFTS as in X.13. The player un-becomes
  part of the world; the shift signals the un-becoming. Mark voice_shift_applied=true.

X.15 Pact Collection    — second person throughout. The Warlock patron arrives
  to collect; the player becomes the patron's NPC. legacy_stream_field is the
  patron's identifier. Do not narrate the patron as warm or grateful — they
  arrive on schedule, no commentary.

X.16 Corruption Transformation — VOICE SHIFTS as in X.13. The player becomes
  the regional NPC kind named in legacy_stream_field. The shift IS the
  transformation. Mark voice_shift_applied=true.

physical_death        — second person; matter-of-fact terminal; no voice shift.

================================================================================
OUTPUT CONTRACT
================================================================================

Return valid JSON with:
  - text: 4-8 lines of postcard prose meeting all constraints above.
  - legacy_artifact_id: ID for the legacy artifact produced
    (substrate fragment / contradiction-ledger entry / Composed-target soul /
     patron's NPC / regional NPC). State Manager downstream commits this.
  - voice_shift_applied: boolean. Must be true for X.13/X.14/X.16; false for
    X.12/X.15/physical_death.

Length: 4-8 lines. Postcard-shaped. The player will see this as the LAST
narration. Take it seriously.`;

const outputSchema: OutputSchema<FormOfEndingOutput> = {
  description: "JSON object with text, legacy_artifact_id, voice_shift_applied",
  parse: (raw: string) => {
    const json = ResponseParser.extractJSON(raw) as Record<string, unknown>;
    return {
      text: String(json.text ?? ""),
      legacy_artifact_id: String(json.legacy_artifact_id ?? ""),
      voice_shift_applied: Boolean(json.voice_shift_applied),
    };
  },
};

function buildUserPrompt(ctx: FormOfEndingContext): string {
  return `Player: ${ctx.player_identifier} (${ctx.player_calling_or_form})
Region: ${ctx.region_name}
Day ${ctx.day}, Scene ${ctx.scene_index}
Ending kind: ${ctx.ending_kind}

Triggering event:
${ctx.triggering_event_summary}

Canon-progression snapshot:
  Authority: ${ctx.canon_progression_snapshot.authority}
  Ruin:      ${ctx.canon_progression_snapshot.ruin}
  Creation:  ${ctx.canon_progression_snapshot.creation}${ctx.canon_progression_snapshot.corruption !== undefined ? `\n  Corruption:${ctx.canon_progression_snapshot.corruption}` : ""}

Active faiths:
${ctx.active_faiths.map((f) => `  - ${f.deity_id}: ${f.level}`).join("\n") || "  (none)"}

Marked conditions:
${ctx.marked_conditions.map((c) => `  - ${c}`).join("\n") || "  (none)"}

Bonded items:
${ctx.bonded_items.map((i) => `  - ${i}`).join("\n") || "  (none)"}

Bonded NPCs / companions:
${ctx.bonded_npcs.map((n) => `  - ${n}`).join("\n") || "  (none)"}

${ctx.legacy_stream_field ? `Legacy stream field: ${ctx.legacy_stream_field}` : ""}

Write the Form-of-Ending postcard. 4-8 lines. JSON only.`;
}

export const formOfEndingTemplate: PromptTemplate<FormOfEndingContext, FormOfEndingOutput> = {
  id: "form-of-ending",
  systemPrompt,
  buildUserPrompt,
  outputSchema,
  maxTokens: 512,
  temperature: 0.5,
  model: "deep",
};
