// ============================================================================
// Postcard Validator tests — UI-405
// ============================================================================
// Phase 20 / Wave J. Covers:
//   - Line-count enforcement (4-8 inclusive)
//   - Voice-shift detection (heuristic): X.13/X.14/X.16 must shift 2nd→3rd
//   - Voice-shift suppression: X.12/X.15/physical_death must NOT shift
//   - Voice-band integration (consumes pre-computed VoiceEvaluator result)
//   - Legacy-artifact-id presence
//   - Composite valid-postcard happy path for each ending kind
//
// Per HANDOFF.md: "voice-shift X.13/X.14/X.16 (second→third person)" — this
// test file is the structural enforcement of that rule. The aesthetic check
// (banned phrases, glyphs) is delegated to VoiceEvaluator which is exercised
// by its own tests in packages/narrative.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  validatePostcard,
  detectVoiceShift,
  ENDINGS_REQUIRING_VOICE_SHIFT,
  type ExternalVoiceEvalResult,
  type PostcardErrorCode,
} from "../postcardValidator.js";
import type { EndingKind, FormOfEndingOutput } from "../formOfEnding.js";

const passingVoiceEval: ExternalVoiceEvalResult = {
  score: 0.92,
  band: "pass",
  banned_phrases_found: [],
  disallowed_glyphs_found: [],
};

const warningVoiceEval: ExternalVoiceEvalResult = {
  score: 0.78,
  band: "warn",
};

function output(
  overrides: Partial<FormOfEndingOutput> = {},
): FormOfEndingOutput {
  return {
    text: "default postcard\nline two\nline three\nline four",
    legacy_artifact_id: "lga_default",
    voice_shift_applied: false,
    ...overrides,
  };
}

function codes(errors: { code: PostcardErrorCode }[]): PostcardErrorCode[] {
  return errors.map((e) => e.code);
}

// ----------------------------------------------------------------------------
// Voice-shift heuristic — direct unit tests
// ----------------------------------------------------------------------------

describe("detectVoiceShift — heuristic classifier", () => {
  it("all-2nd-person text → first=second, last=second, no pivot", () => {
    const e = detectVoiceShift(
      "You speak the name. You hear the answer in your own voice. Your hands shake.",
    );
    expect(e.first_sentence_person).toBe("second");
    expect(e.last_sentence_person).toBe("second");
    expect(e.pivot_sentence_index).toBeNull();
  });

  it("all-3rd-person text → first=third, last=third", () => {
    const e = detectVoiceShift(
      "She speaks the name. The fountain answers in her own voice. Her hands shake.",
    );
    expect(e.first_sentence_person).toBe("third");
    expect(e.last_sentence_person).toBe("third");
  });

  it("2nd→3rd shift mid-text → pivot at the shift sentence, last=third", () => {
    const text =
      "You speak the name a final time. " +
      "You hear the fountain answer in your own voice. " +
      "She is no longer Khojen. " +
      "They call her now by the name she practiced.";
    const e = detectVoiceShift(text);
    expect(e.first_sentence_person).toBe("second");
    expect(e.last_sentence_person).toBe("third");
    expect(e.pivot_sentence_index).toBe(2);
  });

  it("only-1 sentence is unknown if no pronouns surface", () => {
    const e = detectVoiceShift("The room closes around the moment.");
    expect(e.first_sentence_person).toBe("unknown");
  });

  it("mixed sentence with late third → classifies as third", () => {
    const e = detectVoiceShift(
      "You opened the door and she was not Khojen anymore.",
    );
    expect(e.last_sentence_person).toBe("third");
  });

  it("counts pronouns globally for evidence diagnostics", () => {
    const e = detectVoiceShift(
      "You stand. You speak. She is not you. They record her name.",
    );
    expect(e.second_person_count).toBeGreaterThanOrEqual(3);
    expect(e.third_person_count).toBeGreaterThanOrEqual(3);
  });
});

// ----------------------------------------------------------------------------
// Validation results — by error code
// ----------------------------------------------------------------------------

describe("validatePostcard — empty text", () => {
  it("empty text → empty_text error, valid=false", () => {
    const r = validatePostcard({
      ending_kind: "X12_authority_apotheosis",
      output: output({ text: "" }),
      voice_eval: passingVoiceEval,
    });
    expect(r.valid).toBe(false);
    expect(codes(r.errors)).toEqual(["empty_text"]);
  });

  it("whitespace-only text → empty_text error", () => {
    const r = validatePostcard({
      ending_kind: "X12_authority_apotheosis",
      output: output({ text: "   \n   " }),
      voice_eval: passingVoiceEval,
    });
    expect(codes(r.errors)).toContain("empty_text");
  });
});

describe("validatePostcard — line count", () => {
  it("3 lines → line_count_out_of_range", () => {
    const r = validatePostcard({
      ending_kind: "X12_authority_apotheosis",
      output: output({ text: "one\ntwo\nthree" }),
      voice_eval: passingVoiceEval,
    });
    expect(codes(r.errors)).toContain("line_count_out_of_range");
  });

  it("9 lines → line_count_out_of_range", () => {
    const text = Array.from({ length: 9 }, (_, i) => `line ${i + 1}`).join("\n");
    const r = validatePostcard({
      ending_kind: "X12_authority_apotheosis",
      output: output({ text }),
      voice_eval: passingVoiceEval,
    });
    expect(codes(r.errors)).toContain("line_count_out_of_range");
  });

  it("4 lines and 8 lines are both accepted (boundary)", () => {
    for (const n of [4, 8]) {
      const text = Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n");
      const r = validatePostcard({
        ending_kind: "X12_authority_apotheosis",
        output: output({ text, legacy_artifact_id: "lga_ok" }),
        voice_eval: passingVoiceEval,
      });
      expect(codes(r.errors)).not.toContain("line_count_out_of_range");
    }
  });

  it("blank lines do NOT count toward the 4-line minimum", () => {
    const r = validatePostcard({
      ending_kind: "X12_authority_apotheosis",
      output: output({ text: "one\n\n\ntwo\n\nthree\n\n" }),
      voice_eval: passingVoiceEval,
    });
    expect(r.line_count).toBe(3);
    expect(codes(r.errors)).toContain("line_count_out_of_range");
  });
});

// ----------------------------------------------------------------------------
// Voice-shift — the canonical UI-405 rule
// ----------------------------------------------------------------------------

describe("validatePostcard — voice-shift for X.13/X.14/X.16", () => {
  const shiftedText =
    "You stand at the edge of the room. " +
    "You speak the name once. " +
    "The room records the speaking. " +
    "She is no longer Khojen.";

  const heldText =
    "You stand at the edge of the room. " +
    "You speak the name once. " +
    "Your voice answers your own ear. " +
    "You are alone in the recording.";

  it.each<EndingKind>([
    "X13_ruin_unmaking",
    "X14_creation_withdrawal",
    "X16_corruption_transformation",
  ])("%s with held voice → voice_shift_required_but_absent", (kind) => {
    const r = validatePostcard({
      ending_kind: kind,
      output: output({ text: heldText, legacy_artifact_id: "lga_x" }),
      voice_eval: passingVoiceEval,
    });
    expect(codes(r.errors)).toContain("voice_shift_required_but_absent");
    expect(r.voice_shift_detected).toBe(false);
  });

  it.each<EndingKind>([
    "X13_ruin_unmaking",
    "X14_creation_withdrawal",
    "X16_corruption_transformation",
  ])("%s with shifted voice → valid", (kind) => {
    const r = validatePostcard({
      ending_kind: kind,
      output: output({
        text: shiftedText,
        legacy_artifact_id: "lga_x",
        voice_shift_applied: true,
      }),
      voice_eval: passingVoiceEval,
    });
    expect(r.valid).toBe(true);
    expect(r.voice_shift_detected).toBe(true);
  });

  it("X.12 with shifted voice → voice_shift_present_but_not_required", () => {
    const r = validatePostcard({
      ending_kind: "X12_authority_apotheosis",
      output: output({ text: shiftedText, legacy_artifact_id: "lga_x12" }),
      voice_eval: passingVoiceEval,
    });
    expect(codes(r.errors)).toContain("voice_shift_present_but_not_required");
  });

  it("X.15 with held voice → valid (pact collection stays 2nd)", () => {
    const r = validatePostcard({
      ending_kind: "X15_pact_collection",
      output: output({ text: heldText, legacy_artifact_id: "lga_x15" }),
      voice_eval: passingVoiceEval,
    });
    expect(r.valid).toBe(true);
  });

  it("physical_death with held voice → valid", () => {
    const r = validatePostcard({
      ending_kind: "physical_death",
      output: output({ text: heldText, legacy_artifact_id: "lga_death" }),
      voice_eval: passingVoiceEval,
    });
    expect(r.valid).toBe(true);
  });

  it("ENDINGS_REQUIRING_VOICE_SHIFT covers exactly X.13/X.14/X.16", () => {
    expect(Array.from(ENDINGS_REQUIRING_VOICE_SHIFT).sort()).toEqual([
      "X13_ruin_unmaking",
      "X14_creation_withdrawal",
      "X16_corruption_transformation",
    ]);
  });
});

// ----------------------------------------------------------------------------
// Voice band + diagnostics
// ----------------------------------------------------------------------------

describe("validatePostcard — VoiceEvaluator integration", () => {
  it("non-pass band → voice_band_below_pass error", () => {
    const r = validatePostcard({
      ending_kind: "X12_authority_apotheosis",
      output: output({ text: "one\ntwo\nthree\nfour", legacy_artifact_id: "lga_x12" }),
      voice_eval: warningVoiceEval,
    });
    expect(codes(r.errors)).toContain("voice_band_below_pass");
  });

  it("banned phrases are surfaced as individual errors", () => {
    const r = validatePostcard({
      ending_kind: "X12_authority_apotheosis",
      output: output({ text: "one\ntwo\nthree\nfour", legacy_artifact_id: "lga_x12" }),
      voice_eval: {
        score: 0.70,
        band: "warn",
        banned_phrases_found: ["finally at peace", "rest in peace"],
      },
    });
    const c = codes(r.errors);
    expect(c.filter((x) => x === "banned_phrase_found")).toHaveLength(2);
  });

  it("disallowed glyphs are surfaced as individual errors", () => {
    const r = validatePostcard({
      ending_kind: "X12_authority_apotheosis",
      output: output({ text: "one\ntwo\nthree\nfour", legacy_artifact_id: "lga_x12" }),
      voice_eval: {
        score: 0.70,
        band: "fail",
        disallowed_glyphs_found: ["🌊"],
      },
    });
    expect(codes(r.errors)).toContain("disallowed_glyph_found");
  });
});

// ----------------------------------------------------------------------------
// Legacy artifact id
// ----------------------------------------------------------------------------

describe("validatePostcard — legacy artifact id", () => {
  it("missing legacy_artifact_id → legacy_artifact_missing", () => {
    const r = validatePostcard({
      ending_kind: "X12_authority_apotheosis",
      output: output({ text: "one\ntwo\nthree\nfour", legacy_artifact_id: "" }),
      voice_eval: passingVoiceEval,
    });
    expect(codes(r.errors)).toContain("legacy_artifact_missing");
  });
});

// ----------------------------------------------------------------------------
// Happy path — one test per ending kind
// ----------------------------------------------------------------------------

describe("validatePostcard — happy paths by ending kind", () => {
  const held = [
    "You stand at the edge of the dry fountain.",
    "Marrow-Saint Ilyra kneels.",
    "Your voice is the one the fountain has been practicing.",
    "You are called by a name that was not yours yesterday.",
  ].join("\n");

  const shifted = [
    "You stand at the edge of the dry fountain.",
    "You speak the unmaking once.",
    "The room records the unmaking.",
    "She is no longer Khojen.",
  ].join("\n");

  it("X.12 with held voice + valid voice band → valid", () => {
    const r = validatePostcard({
      ending_kind: "X12_authority_apotheosis",
      output: output({ text: held, legacy_artifact_id: "lga_apot" }),
      voice_eval: passingVoiceEval,
    });
    expect(r.valid).toBe(true);
  });

  it("X.13 with shifted voice + valid voice band → valid", () => {
    const r = validatePostcard({
      ending_kind: "X13_ruin_unmaking",
      output: output({
        text: shifted,
        legacy_artifact_id: "lga_ledger_entry",
        voice_shift_applied: true,
      }),
      voice_eval: passingVoiceEval,
    });
    expect(r.valid).toBe(true);
    expect(r.voice_shift_detected).toBe(true);
  });
});
