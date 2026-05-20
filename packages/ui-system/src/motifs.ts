/**
 * ============================================================================
 * MOTIFS — The First Perception · Tide-Stained Codex
 * ============================================================================
 * Eight canonical iconographic motifs. Diagrams, not pictograms.
 * Together with verb-chips and status glyphs, these are the ENTIRE
 * iconographic vocabulary of the UI — no icon font, no Lucide, no
 * Heroicons, no Material Icons.
 *
 * Source of truth: design_system/assets/motifs/*.svg in the design layer
 * (per project_reconciliation_state.md). Authored as inline SVG strings
 * so the bundler can tree-shake unused motifs and consumers can avoid
 * the runtime overhead of an icon font.
 *
 * All motifs use only the Tide-Stained 12-color palette (no other colors
 * may appear). Stroke widths derive from --stroke-* tokens conceptually
 * but are hard-coded here because SVG attributes don't resolve CSS vars
 * in all engines — the values mirror the canonical strokes.
 *
 * Phase 14 / Wave C / UI-102.
 * ============================================================================
 */

export type MotifName =
  | "tide_line"
  | "brass_frame"
  | "wax_seal"
  | "inkblot"
  | "tide_rise_meter"
  | "specimen_jar"
  | "wonderland_warp"
  | "litany_card";

/** Horizontal dashed rule between zones; salt-stained ink-wash variant. */
export const TIDE_LINE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect x="2" y="2" width="116" height="76" fill="none" stroke="#4A5A6A"/><path d="M2 28 L118 28" stroke="#4A5A6A" stroke-width="0.5" stroke-dasharray="2 2"/><path d="M2 56 L118 56" stroke="#4A5A6A" stroke-width="0.5" stroke-dasharray="2 2"/></svg>';

/** Bracket marks at instrument frames (meters, dials, rolls). Brass stroke. */
export const BRASS_FRAME_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><path d="M8 8 L8 22 L22 22" fill="none" stroke="#B89968" stroke-width="2"/><path d="M112 8 L112 22 L98 22" fill="none" stroke="#B89968" stroke-width="2"/><path d="M8 72 L8 58 L22 58" fill="none" stroke="#B89968" stroke-width="2"/><path d="M112 72 L112 58 L98 58" fill="none" stroke="#B89968" stroke-width="2"/></svg>';

/** Drowned-red filled disc with CANON and event ID. Stamped when State Manager commits. */
export const WAX_SEAL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="28" fill="#8A2E2E" stroke="#1A1F2A" stroke-width="1.5"/><text x="40" y="40" text-anchor="middle" font-family="IM Fell English SC, serif" font-size="11" fill="#E8DFC8">CANON</text><text x="40" y="54" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="8" fill="#E8DFC8" letter-spacing="0.05em">E0042</text></svg>';

/** Tide-ink ellipsoidal stain; opacity scales with rumor spread. */
export const INKBLOT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><ellipse cx="60" cy="42" rx="38" ry="14" fill="#1A1F2A" opacity="0.35"/><ellipse cx="50" cy="36" rx="14" ry="6" fill="#1A1F2A" opacity="0.55"/><ellipse cx="70" cy="46" rx="10" ry="4" fill="#1A1F2A" opacity="0.6"/></svg>';

/** Vertical vessel with fill bar at high-water mark. Used for ALL pressure meters. */
export const TIDE_RISE_METER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 100"><rect x="14" y="10" width="32" height="84" fill="none" stroke="#4A5A6A"/><rect x="14" y="50" width="32" height="44" fill="#6B3F8E" opacity="0.55"/><line x1="10" y1="30" x2="50" y2="30" stroke="#8A2E2E" stroke-dasharray="3 2"/></svg>';

/** Entity / NPC card outline; "held but not contained." */
export const SPECIMEN_JAR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><path d="M48 18 L72 18 L74 24 L72 100 L48 100 L46 24 Z" fill="none" stroke="#4A5A6A" stroke-width="1.2"/><line x1="48" y1="40" x2="72" y2="40" stroke="#4A5A6A" stroke-width="0.5" stroke-dasharray="2 1"/><ellipse cx="60" cy="68" rx="12" ry="10" fill="#6B3F8E" opacity="0.40"/></svg>';

/** Impossible diagram — compass that turns when watched. Tide-bloom stroke. Never gimmicky. */
export const WONDERLAND_WARP_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><circle cx="60" cy="40" r="28" fill="none" stroke="#6B3F8E"/><g font-family="IM Fell English SC, serif" font-size="9" fill="#6B3F8E"><text x="60" y="14" text-anchor="middle">N</text><text x="60" y="72" text-anchor="middle">S</text><text x="30" y="44" text-anchor="middle">W</text><text x="90" y="44" text-anchor="middle">E</text><text x="60" y="46" text-anchor="middle" fill="#8A2E2E">↺</text></g></svg>';

/** Salt-bleached card with single italic Caveat line + "— LITANY CARD" brass label. */
export const LITANY_CARD_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80"><rect x="6" y="10" width="148" height="60" fill="#F5EFE0" stroke="#4A5A6A"/><text x="80" y="38" text-anchor="middle" font-family="Caveat, cursive" font-size="16" fill="#1A1F2A">&#34;the clock that knows it is wrong&#34;</text><text x="80" y="58" text-anchor="middle" font-family="IM Fell English SC, serif" font-size="9" fill="#B89968" letter-spacing="0.1em">— LITANY CARD</text></svg>';

/** Canonical lookup map — all 8 motifs by name. */
export const MOTIFS: Record<MotifName, string> = {
  tide_line:        TIDE_LINE_SVG,
  brass_frame:      BRASS_FRAME_SVG,
  wax_seal:         WAX_SEAL_SVG,
  inkblot:          INKBLOT_SVG,
  tide_rise_meter:  TIDE_RISE_METER_SVG,
  specimen_jar:     SPECIMEN_JAR_SVG,
  wonderland_warp:  WONDERLAND_WARP_SVG,
  litany_card:      LITANY_CARD_SVG,
};

/** All motif names — useful for iteration in dev surfaces / Storybook-equivalent. */
export const MOTIF_NAMES: readonly MotifName[] = [
  "tide_line",
  "brass_frame",
  "wax_seal",
  "inkblot",
  "tide_rise_meter",
  "specimen_jar",
  "wonderland_warp",
  "litany_card",
] as const;

/**
 * Get the raw SVG markup string for a motif.
 * Use with `element.innerHTML = motifMarkup("brass_frame")` or a template literal.
 */
export function motifMarkup(name: MotifName): string {
  return MOTIFS[name];
}

/**
 * Create a DOM element containing the motif SVG, ready to append.
 * Returns a `<span>` wrapper with aria-label and role="img" so screen
 * readers announce it (default label = motif name; pass `ariaLabel` to override).
 *
 * Per design discipline: motifs are decorative scaffolding in most contexts.
 * Pass `ariaLabel: ""` (empty string) to mark as decorative (aria-hidden).
 */
export function renderMotif(name: MotifName, ariaLabel?: string): HTMLSpanElement {
  const wrapper = document.createElement("span");
  wrapper.className = `motif motif--${name}`;
  wrapper.innerHTML = MOTIFS[name];
  if (ariaLabel === "") {
    wrapper.setAttribute("aria-hidden", "true");
  } else {
    wrapper.setAttribute("role", "img");
    wrapper.setAttribute("aria-label", ariaLabel ?? name.replace(/_/g, " "));
  }
  return wrapper;
}
