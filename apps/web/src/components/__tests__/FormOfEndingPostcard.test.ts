/**
 * @vitest-environment happy-dom
 */
// ============================================================================
// FormOfEndingPostcard tests — UI-405 DOM surface
// ============================================================================
// Phase 20 / Wave J. Render contract:
//   - 4-8 lines, one <p> per line
//   - Ending tag + day/scene stamp
//   - Greeting selected by ending kind
//   - Legacy stream gutter (kind-aware phrasing)
//   - Voice-shift indicator reflects output.voice_shift_applied
//   - Export + Continue actions
//
// Snapshot of a full X.13 unmaking postcard locks the rendered output.
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { createFormOfEndingPostcard } from "../FormOfEndingPostcard.js";
import type { EndingKind, FormOfEndingOutput } from "@first-perception/llm-client";

const fullText = [
  "You stand at the edge of the dry fountain.",
  "You speak the unmaking once.",
  "The room records the unmaking.",
  "She is no longer Khojen.",
].join("\n");

function makeOutput(overrides: Partial<FormOfEndingOutput> = {}): FormOfEndingOutput {
  return {
    text: fullText,
    legacy_artifact_id: "lga_unmaking",
    voice_shift_applied: true,
    ...overrides,
  };
}

describe("FormOfEndingPostcard — render", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders root with the testid + ending-kind data attribute", () => {
    const el = createFormOfEndingPostcard({
      ending_kind: "X13_ruin_unmaking",
      output: makeOutput(),
      day: 14,
      scene_index: 9,
      player_identifier: "Khojen",
    });
    expect(el.dataset.testid).toBe("form-of-ending-postcard");
    expect(el.dataset.endingKind).toBe("X13_ruin_unmaking");
    expect(el.dataset.endingTag).toBe("X.13");
  });

  it("date stamp surfaces day + scene + tag", () => {
    const el = createFormOfEndingPostcard({
      ending_kind: "X12_authority_apotheosis",
      output: makeOutput(),
      day: 14,
      scene_index: 3,
      player_identifier: "Khojen",
    });
    expect(el.querySelector("[data-testid='postcard-stamp']")?.textContent).toBe(
      "DAY 14 · SCENE 3 · X.12",
    );
  });

  it("renders one <p> per non-blank line in the postcard body", () => {
    const el = createFormOfEndingPostcard({
      ending_kind: "X12_authority_apotheosis",
      output: makeOutput({ text: "one\n\ntwo\nthree\nfour\n" }),
      day: 14,
      scene_index: 3,
      player_identifier: "Khojen",
    });
    const lines = el.querySelectorAll("[data-testid='postcard-body'] .postcard-line");
    expect(lines).toHaveLength(4);
    expect(lines[0].textContent).toBe("one");
    expect(lines[3].textContent).toBe("four");
  });

  it("greeting changes per ending kind", () => {
    const make = (kind: EndingKind): string =>
      createFormOfEndingPostcard({
        ending_kind: kind,
        output: makeOutput(),
        day: 14,
        scene_index: 3,
        player_identifier: "Khojen",
      }).querySelector(".postcard-greeting")!.textContent!;

    expect(make("X12_authority_apotheosis")).toBe("To the one you are becoming —");
    expect(make("X13_ruin_unmaking")).toBe("For the record. Khojen —");
    expect(make("X14_creation_withdrawal")).toBe("On the un-becoming of Khojen —");
    expect(make("X15_pact_collection")).toBe("The patron arrives, on schedule —");
    expect(make("X16_corruption_transformation")).toBe("On what Khojen has become —");
    expect(make("physical_death")).toBe("For the record. Khojen —");
  });

  it("voice-shift indicator reflects output.voice_shift_applied", () => {
    const shifted = createFormOfEndingPostcard({
      ending_kind: "X13_ruin_unmaking",
      output: makeOutput({ voice_shift_applied: true }),
      day: 14,
      scene_index: 9,
      player_identifier: "Khojen",
    });
    expect(
      shifted.querySelector("[data-testid='postcard-voice']")?.textContent,
    ).toBe("voice shifted · 2nd → 3rd");
    expect(
      (shifted.querySelector("[data-testid='postcard-voice']") as HTMLElement).dataset
        .voiceShiftApplied,
    ).toBe("true");

    const held = createFormOfEndingPostcard({
      ending_kind: "X12_authority_apotheosis",
      output: makeOutput({ voice_shift_applied: false }),
      day: 14,
      scene_index: 3,
      player_identifier: "Khojen",
    });
    expect(
      held.querySelector("[data-testid='postcard-voice']")?.textContent,
    ).toBe("voice held · 2nd person");
  });

  it("legacy gutter uses kind-aware phrasing when legacy_stream_field is set", () => {
    const el = createFormOfEndingPostcard({
      ending_kind: "X12_authority_apotheosis",
      output: makeOutput(),
      day: 14,
      scene_index: 3,
      player_identifier: "Khojen",
      legacy_stream_field: "The One Who Heard the Fountain",
    });
    const gutter = el.querySelector("[data-testid='postcard-gutter']");
    expect(gutter?.textContent).toBe("— deity emergent: The One Who Heard the Fountain");
  });

  it("legacy gutter omitted when legacy_stream_field is absent", () => {
    const el = createFormOfEndingPostcard({
      ending_kind: "X12_authority_apotheosis",
      output: makeOutput(),
      day: 14,
      scene_index: 3,
      player_identifier: "Khojen",
    });
    expect(el.querySelector("[data-testid='postcard-gutter']")).toBeNull();
  });

  it("export + continue actions fire their callbacks", () => {
    const exported: number[] = [];
    const continued: number[] = [];
    const el = createFormOfEndingPostcard({
      ending_kind: "X13_ruin_unmaking",
      output: makeOutput(),
      day: 14,
      scene_index: 9,
      player_identifier: "Khojen",
      onExportToJournal: () => exported.push(1),
      onContinueToLegacy: () => continued.push(1),
    });
    (el.querySelector("[data-testid='postcard-export']") as HTMLButtonElement).click();
    (el.querySelector("[data-testid='postcard-continue']") as HTMLButtonElement).click();
    expect(exported).toEqual([1]);
    expect(continued).toEqual([1]);
  });

  it("snapshot — X.13 unmaking postcard with full chrome", () => {
    const el = createFormOfEndingPostcard({
      ending_kind: "X13_ruin_unmaking",
      output: makeOutput(),
      day: 14,
      scene_index: 9,
      player_identifier: "Khojen",
      legacy_stream_field: "ledger-entry-bell-court-E0099",
      onExportToJournal: () => {},
      onContinueToLegacy: () => {},
    });
    expect(el.outerHTML).toMatchSnapshot();
  });
});
