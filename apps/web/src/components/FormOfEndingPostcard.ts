/**
 * ============================================================================
 * FORM-OF-ENDING POSTCARD — UI-405 DOM surface
 * ============================================================================
 * Phase 20 / Wave J / UI-405. Wireframe source: END_X12.html approach B
 * "Letter to the One You Are Becoming" (the most voice-faithful of the three
 * approaches per the wireframe's own notes).
 *
 * Renders the postcard prose at the terminal moment. Per the wireframe + the
 * Phase 17 template:
 *   - 4-8 lines of postcard prose
 *   - For X.13/X.14/X.16: voice shifted to 3rd person at the terminal moment
 *     (the surface displays both halves of the shift verbatim — the shift IS
 *     the unmaking / withdrawal / transformation)
 *   - Export action: "Save to journal" — writes the postcard text to the
 *     player's journal as a final entry (caller wires onExport)
 *
 * What this file does NOT do:
 *   - Call the LLM. The caller already has the FormOfEndingOutput from
 *     turnOrchestrator → formOfEndingTemplate.
 *   - Validate. The caller already ran postcardValidator. This surface
 *     trusts its input and surfaces the postcard cleanly.
 *
 * If the caller wants to surface validation errors (e.g., voice-shift not
 * applied), it should compose this postcard with a sibling diagnostic panel,
 * not bake the errors into this surface. Per design discipline, the
 * postcard is the player's LAST narration and shouldn't carry chrome.
 * ============================================================================
 */

import type { EndingKind, FormOfEndingOutput } from "@first-perception/llm-client";

export interface FormOfEndingPostcardProps {
  ending_kind: EndingKind;
  output: FormOfEndingOutput;
  /** Display day + scene, surfaced as the postcard date stamp. */
  day: number;
  scene_index: number;
  /** Player identifier — the addressee of the postcard for X.12/X.15. */
  player_identifier: string;
  /** The deity name (X.12), patron (X.15), or regional NPC kind (X.16),
   *  surfaced in the gutter as the legacy-stream-field. */
  legacy_stream_field?: string;
  onExportToJournal?: () => void;
  onContinueToLegacy?: () => void;
}

const ENDING_TITLE: Record<EndingKind, string> = {
  X12_authority_apotheosis: "Form of Ending — Apotheosis",
  X13_ruin_unmaking: "Form of Ending — Self-Unmaking",
  X14_creation_withdrawal: "Form of Ending — Withdrawal",
  X15_pact_collection: "Form of Ending — Pact Collection",
  X16_corruption_transformation: "Form of Ending — Transformation",
  physical_death: "Form of Ending — Death",
};

const ENDING_TAG: Record<EndingKind, string> = {
  X12_authority_apotheosis: "X.12",
  X13_ruin_unmaking: "X.13",
  X14_creation_withdrawal: "X.14",
  X15_pact_collection: "X.15",
  X16_corruption_transformation: "X.16",
  physical_death: "—",
};

export function createFormOfEndingPostcard(props: FormOfEndingPostcardProps): HTMLElement {
  const root = document.createElement("article");
  root.className = "form-of-ending-postcard letter";
  root.setAttribute("role", "article");
  root.setAttribute("aria-label", `${ENDING_TITLE[props.ending_kind]} — postcard`);
  root.dataset.testid = "form-of-ending-postcard";
  root.dataset.endingKind = props.ending_kind;
  root.dataset.endingTag = ENDING_TAG[props.ending_kind];

  // ── header: date stamp + title
  const head = document.createElement("header");
  head.className = "postcard-head";

  const stamp = document.createElement("p");
  stamp.className = "eb postcard-stamp";
  stamp.dataset.testid = "postcard-stamp";
  stamp.textContent = `DAY ${props.day} · SCENE ${props.scene_index} · ${ENDING_TAG[props.ending_kind]}`;
  head.appendChild(stamp);

  const title = document.createElement("h2");
  title.className = "postcard-title";
  title.textContent = ENDING_TITLE[props.ending_kind];
  head.appendChild(title);

  // X.12 wireframe approach B opens with "To the one you are becoming —".
  // The greeting is ending-kind-specific so the surface reads true even when
  // the LLM omits a salutation in the postcard text itself.
  const greeting = document.createElement("p");
  greeting.className = "postcard-greeting";
  greeting.textContent = greetingFor(props.ending_kind, props.player_identifier);
  head.appendChild(greeting);

  root.appendChild(head);

  // ── body: the postcard text, split into <p> per line so the type setter
  // (Garamond at 13px per the wireframe) renders the postcard cadence cleanly.
  const body = document.createElement("div");
  body.className = "postcard-body";
  body.dataset.testid = "postcard-body";

  const lines = props.output.text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  for (const line of lines) {
    const p = document.createElement("p");
    p.className = "postcard-line";
    p.textContent = line;
    body.appendChild(p);
  }
  root.appendChild(body);

  // ── gutter: legacy stream field, when surfaced. The wireframe's gutter-note
  // pattern is small italic chrome at the right margin.
  if (props.legacy_stream_field) {
    const gutter = document.createElement("aside");
    gutter.className = "postcard-gutter";
    gutter.dataset.testid = "postcard-gutter";
    gutter.textContent = legacyGutterPhrase(props.ending_kind, props.legacy_stream_field);
    root.appendChild(gutter);
  }

  // ── footer: voice-shift indicator + actions
  const footer = document.createElement("footer");
  footer.className = "postcard-footer row";

  const voiceIndicator = document.createElement("span");
  voiceIndicator.className = "postcard-voice";
  voiceIndicator.dataset.testid = "postcard-voice";
  voiceIndicator.dataset.voiceShiftApplied = props.output.voice_shift_applied ? "true" : "false";
  voiceIndicator.textContent = props.output.voice_shift_applied
    ? "voice shifted · 2nd → 3rd"
    : "voice held · 2nd person";
  footer.appendChild(voiceIndicator);

  if (props.onExportToJournal) {
    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "btn ghost postcard-export";
    exportBtn.dataset.testid = "postcard-export";
    exportBtn.textContent = "Export to journal";
    exportBtn.addEventListener("click", () => props.onExportToJournal!());
    footer.appendChild(exportBtn);
  }

  if (props.onContinueToLegacy) {
    const cont = document.createElement("button");
    cont.type = "button";
    cont.className = "btn postcard-continue";
    cont.dataset.testid = "postcard-continue";
    cont.textContent = "Continue to legacy";
    cont.addEventListener("click", () => props.onContinueToLegacy!());
    footer.appendChild(cont);
  }

  root.appendChild(footer);

  return root;
}

function greetingFor(kind: EndingKind, player: string): string {
  switch (kind) {
    case "X12_authority_apotheosis":
      return "To the one you are becoming —";
    case "X13_ruin_unmaking":
      return `For the record. ${player} —`;
    case "X14_creation_withdrawal":
      return `On the un-becoming of ${player} —`;
    case "X15_pact_collection":
      return "The patron arrives, on schedule —";
    case "X16_corruption_transformation":
      return `On what ${player} has become —`;
    case "physical_death":
      return `For the record. ${player} —`;
  }
}

function legacyGutterPhrase(kind: EndingKind, field: string): string {
  switch (kind) {
    case "X12_authority_apotheosis":
      return `— deity emergent: ${field}`;
    case "X13_ruin_unmaking":
      return `— contradiction-ledger entry: ${field}`;
    case "X14_creation_withdrawal":
      return `— substrate fragment: ${field}`;
    case "X15_pact_collection":
      return `— collected by: ${field}`;
    case "X16_corruption_transformation":
      return `— regional NPC kind: ${field}`;
    case "physical_death":
      return `— legacy artifact: ${field}`;
  }
}
