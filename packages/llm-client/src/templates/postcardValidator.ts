/**
 * ============================================================================
 * POSTCARD VALIDATOR — UI-405
 * ============================================================================
 * Phase 20 / Wave J / UI-405. Sister file to Phase 17's `formOfEnding.ts`.
 *
 * Validates the structured output of the Form-of-Ending template against the
 * postcard contract specified in `narrator_form_of_ending.md` and the Phase 17
 * voice manifesto:
 *
 *   1. Line count in [4, 8]                  (postcard shape)
 *   2. Voice-shift applied for X.13/X.14/X.16, NOT for X.12/X.15/physical_death
 *   3. VoiceEvaluator band == "pass" (>= 0.85)
 *
 * The Phase 17 template asks the LLM to set `voice_shift_applied: boolean`
 * itself — but we don't trust that flag, we derive it from the text. The LLM
 * may have set it to true and then forgotten to actually shift; we catch
 * that here.
 *
 * Voice-shift detection — heuristic:
 *   - Split text into sentence-cells in order.
 *   - For each cell, classify pronoun-person: 2nd ("you/your/yours"), 3rd
 *     ("they/them/their/theirs" OR a name token at sentence-initial).
 *   - A "shift" is a transition from "2nd predominates in early cells" to
 *     "3rd predominates in late cells". Concretely: the first sentence is
 *     2nd-person and the LAST sentence is 3rd-person.
 *   - If both bands appear in the same sentence (split-cell), require the
 *     3rd-person tokens to outnumber the 2nd-person in that final sentence.
 *
 * Why heuristic + not LLM-judge: voice-shift is a binary structural property,
 * not a graded aesthetic call. The heuristic is deterministic, reproducible,
 * and cheap to run on every committed ending. Phase 17 VoiceEvaluator does
 * the aesthetic grading; this file does the structural check.
 *
 * Note: This module is dependency-free for the heuristic itself; the caller
 * is expected to pass an already-evaluated VoiceEvalResult so this module
 * doesn't need to import from @first-perception/narrative. Keeps the
 * llm-client package tree-shakeable.
 * ============================================================================
 */

import type { EndingKind, FormOfEndingOutput } from "./formOfEnding.js";

/** External contract — caller passes the VoiceEvaluator result they've already
 *  computed. Avoids a package-level import from @first-perception/narrative. */
export interface ExternalVoiceEvalResult {
  score: number;
  band: "pass" | "warn" | "fail";
  banned_phrases_found?: string[];
  disallowed_glyphs_found?: string[];
}

export type PostcardErrorCode =
  | "line_count_out_of_range"
  | "voice_shift_required_but_absent"
  | "voice_shift_present_but_not_required"
  | "voice_band_below_pass"
  | "banned_phrase_found"
  | "disallowed_glyph_found"
  | "empty_text"
  | "legacy_artifact_missing";

export interface PostcardError {
  code: PostcardErrorCode;
  detail: string;
}

export interface PostcardValidationResult {
  valid: boolean;
  errors: PostcardError[];
  voice_shift_detected: boolean;
  line_count: number;
  /** The voice-shift evidence — which sentence is the pivot, what pronouns
   *  were found before/after. Useful for debugging false positives during
   *  ENG-308 (Phase 23) refinement. */
  voice_shift_evidence: VoiceShiftEvidence;
}

export interface VoiceShiftEvidence {
  first_sentence_person: "second" | "third" | "mixed" | "unknown";
  last_sentence_person: "second" | "third" | "mixed" | "unknown";
  second_person_count: number;
  third_person_count: number;
  pivot_sentence_index: number | null;
}

/**
 * Ending kinds that REQUIRE the voice shift. Per the Phase 17 template
 * narrator_form_of_ending.md: X.13/X.14/X.16 shift; X.12/X.15/physical_death
 * stay in 2nd person.
 */
export const ENDINGS_REQUIRING_VOICE_SHIFT: ReadonlySet<EndingKind> = new Set([
  "X13_ruin_unmaking",
  "X14_creation_withdrawal",
  "X16_corruption_transformation",
] as const);

export function validatePostcard(args: {
  ending_kind: EndingKind;
  output: FormOfEndingOutput;
  voice_eval: ExternalVoiceEvalResult;
}): PostcardValidationResult {
  const { ending_kind, output, voice_eval } = args;
  const errors: PostcardError[] = [];

  // 0. Empty / no-output guard.
  if (!output.text || output.text.trim().length === 0) {
    return {
      valid: false,
      errors: [{ code: "empty_text", detail: "postcard text is empty" }],
      voice_shift_detected: false,
      line_count: 0,
      voice_shift_evidence: blankEvidence(),
    };
  }

  // 1. Line count in [4, 8] inclusive. "Lines" are narrative beats — either
  // newline-separated, or sentence-separated within a single prose paragraph.
  // Soft-wrap is intentionally not counted (the template contract says
  // "lines" meaning beats, not rendered rows). SENTENCE_SPLIT_RX handles
  // both "\n+" and ".!? + space + capital" boundaries.
  const lines = output.text
    .split(SENTENCE_SPLIT_RX)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const line_count = lines.length;
  if (line_count < 4 || line_count > 8) {
    errors.push({
      code: "line_count_out_of_range",
      detail: `expected 4-8 non-blank lines, got ${line_count}`,
    });
  }

  // 2. Voice-shift detection (heuristic). See module header.
  const voice_shift_evidence = detectVoiceShift(output.text);
  const voice_shift_detected =
    voice_shift_evidence.first_sentence_person === "second" &&
    voice_shift_evidence.last_sentence_person === "third";

  const required = ENDINGS_REQUIRING_VOICE_SHIFT.has(ending_kind);
  if (required && !voice_shift_detected) {
    errors.push({
      code: "voice_shift_required_but_absent",
      detail: `${ending_kind} requires 2nd→3rd person shift at terminal moment; first sentence person=${voice_shift_evidence.first_sentence_person}, last=${voice_shift_evidence.last_sentence_person}`,
    });
  }
  if (!required && voice_shift_detected) {
    errors.push({
      code: "voice_shift_present_but_not_required",
      detail: `${ending_kind} should stay in 2nd person; detected 2nd→3rd shift`,
    });
  }

  // 3. VoiceEvaluator pass band.
  if (voice_eval.band !== "pass") {
    errors.push({
      code: "voice_band_below_pass",
      detail: `score ${voice_eval.score} falls in '${voice_eval.band}' band; require >= 0.85 / 'pass'`,
    });
  }

  // 4. Surface banned phrase / disallowed glyph specifics as separate errors
  // so the caller can render them inline. These are redundant with the band
  // check but help diagnostics.
  for (const phrase of voice_eval.banned_phrases_found ?? []) {
    errors.push({ code: "banned_phrase_found", detail: `"${phrase}"` });
  }
  for (const glyph of voice_eval.disallowed_glyphs_found ?? []) {
    errors.push({ code: "disallowed_glyph_found", detail: `"${glyph}"` });
  }

  // 5. Legacy artifact id must be present — State Manager downstream needs it
  // to commit the legacy stream field. Empty id is an LLM omission.
  if (!output.legacy_artifact_id || output.legacy_artifact_id.trim().length === 0) {
    errors.push({
      code: "legacy_artifact_missing",
      detail: "legacy_artifact_id is required for State Manager to commit the legacy field",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    voice_shift_detected,
    line_count,
    voice_shift_evidence,
  };
}

// ----------------------------------------------------------------------------
// Voice-shift heuristic
// ----------------------------------------------------------------------------

const SECOND_PERSON_RX = /\b(you|your|yours|yourself)\b/gi;
const THIRD_PERSON_RX = /\b(he|she|they|him|her|them|his|hers|theirs|himself|herself|themselves)\b/gi;
const SENTENCE_SPLIT_RX = /(?<=[.!?])\s+(?=[A-Z])|\n+/;

function classifySentence(s: string): "second" | "third" | "mixed" | "unknown" {
  const secondMatches = [...s.matchAll(SECOND_PERSON_RX)];
  const thirdMatches = [...s.matchAll(THIRD_PERSON_RX)];
  const second = secondMatches.length;
  const third = thirdMatches.length;
  if (second === 0 && third === 0) return "unknown";
  if (second > 0 && third === 0) return "second";
  if (third > 0 && second === 0) return "third";
  // Both present — the sentence is part of a voice shift if the LAST
  // third-person pronoun appears AFTER the LAST second-person pronoun by
  // character index. The voice shift IS the terminal moment, so positional
  // recency is the right signal. Catches "You opened the door and she was
  // not Khojen anymore." where "she" appears mid-sentence but after "You".
  const lastSecondIdx = secondMatches[secondMatches.length - 1].index ?? -1;
  const lastThirdIdx = thirdMatches[thirdMatches.length - 1].index ?? -1;
  if (lastThirdIdx > lastSecondIdx) return "third";
  if (lastSecondIdx > lastThirdIdx) return "second";
  return "mixed";
}

export function detectVoiceShift(text: string): VoiceShiftEvidence {
  const sentences = text
    .split(SENTENCE_SPLIT_RX)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) return blankEvidence();

  const first_sentence_person = classifySentence(sentences[0]);
  const last_sentence_person = classifySentence(sentences[sentences.length - 1]);

  let second = 0;
  let third = 0;
  let pivot: number | null = null;
  let seenSecond = false;
  for (let i = 0; i < sentences.length; i++) {
    const kind = classifySentence(sentences[i]);
    if (kind === "second") seenSecond = true;
    if (seenSecond && kind === "third" && pivot === null) pivot = i;
    second += (sentences[i].match(SECOND_PERSON_RX) ?? []).length;
    third += (sentences[i].match(THIRD_PERSON_RX) ?? []).length;
  }

  return {
    first_sentence_person,
    last_sentence_person,
    second_person_count: second,
    third_person_count: third,
    pivot_sentence_index: pivot,
  };
}

function blankEvidence(): VoiceShiftEvidence {
  return {
    first_sentence_person: "unknown",
    last_sentence_person: "unknown",
    second_person_count: 0,
    third_person_count: 0,
    pivot_sentence_index: null,
  };
}
