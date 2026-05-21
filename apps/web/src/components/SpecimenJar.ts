/**
 * ============================================================================
 * SPECIMEN JAR — Procedural Portrait Recompose
 * ============================================================================
 * Phase 20 / Wave J / UI-401. Wireframe source: PORTRAIT_RECOMPOSE.html.
 *
 * What this is: a layered SVG portrait that recomposes from character state
 * every time a meter changes. Five layers per the wireframe:
 *
 *   A · race silhouette       (compositional slot — caller provides asset id;
 *                              this file ships only the default human silh)
 *   B · class glyph           (compositional slot — same caller-provided model)
 *   C · alignment tint        (CSS variable — no SVG; left to the consumer's
 *                              stylesheet to interpret data-alignment attr)
 *   D · meter state            (procedural rules implemented here)
 *   E · condition overlays    (caller passes condition ids; renderer surfaces
 *                              one badge per id as marginal pins)
 *
 * The recompose engine is pure: takes CharacterState → returns SVG markup.
 * Caller wraps in a host element. Phase 20 ships the recompose RULES and the
 * default jar chrome; the per-race silhouette / per-class glyph SVG assets
 * are the design-team's job (R-50: ~46 SVGs total) and slot in via
 * `raceSilhouetteSvg` / `classGlyphSvg` props.
 *
 * Voice discipline (per PHASE 14 / Tide-Stained):
 *   - palette: closed 12-color Tide-Stained set, no additions
 *   - no emoji; allowed ornaments only (◆ ❦ ↻ → ·)
 *   - no bounce/spring; 80ms linear crossfade on recompose
 *   - reduced-motion: skip the crossfade, swap directly
 * ============================================================================
 */

import { SPECIMEN_JAR_SVG } from "@first-perception/ui-system";

// ----------------------------------------------------------------------------
// Recompose rules — thresholds derived from PORTRAIT_RECOMPOSE.html (lines
// 108-111). Editing these changes the visual contract; coordinate with the
// design layer if you change any threshold.
// ----------------------------------------------------------------------------

export const SPECIMEN_JAR_THRESHOLDS = {
  corruptionVeining: 4, // corruption ≥ 4 → drowned-red veining overlay
  fatigueShadow: 7, // fatigue ≥ 7 → bone shadow + posture droop
  noticeHalo: 7, // notice ≥ 7 → lantern halo
  clarityEdgeMax: 4, // clarity < 4 → tide-bloom tint edge
} as const;

export interface CharacterMeters {
  corruption: number;
  fatigue: number;
  notice: number;
  clarity: number;
  debt: number;
}

export interface SpecimenJarState {
  /** Stable identity for the character — used as the svg viewBox label. */
  characterId: string;
  /** Display name surfaced as the aria-label of the jar. */
  characterName: string;
  /** Race silhouette layer A. Caller-supplied; falls back to bare silh. */
  raceSilhouetteSvg?: string;
  /** Class glyph layer B. Caller-supplied; omitted if absent. */
  classGlyphSvg?: string;
  /** Alignment 2-letter code (LG/CG/CN/CE/NE/LE/LN/NN/NG). Drives layer C tint. */
  alignment?: string;
  /** Active meters — drive layer D procedural overlays. */
  meters: CharacterMeters;
  /** Condition ids (e.g. ["marked_by_attention", "salt_rimed"]). Drives layer E. */
  conditions?: string[];
}

export interface RecomposeFlags {
  veined: boolean;
  fatigued: boolean;
  haloed: boolean;
  tideBloomEdge: boolean;
}

/**
 * Pure derivation: meters → which layer-D effects are active. Exported so
 * tests can assert the threshold rules in isolation, and so other surfaces
 * (PORTRAIT_RECOMPOSE creator mode) can preview the same rule set.
 */
export function computeRecomposeFlags(meters: CharacterMeters): RecomposeFlags {
  return {
    veined: meters.corruption >= SPECIMEN_JAR_THRESHOLDS.corruptionVeining,
    fatigued: meters.fatigue >= SPECIMEN_JAR_THRESHOLDS.fatigueShadow,
    haloed: meters.notice >= SPECIMEN_JAR_THRESHOLDS.noticeHalo,
    tideBloomEdge: meters.clarity < SPECIMEN_JAR_THRESHOLDS.clarityEdgeMax,
  };
}

/**
 * Compose the jar SVG markup. Returns a complete <svg>…</svg> string ready
 * to assign to innerHTML. Pure function — no DOM side-effects.
 *
 * Layer order (back-to-front):
 *   - jar chrome (base SPECIMEN_JAR_SVG envelope)
 *   - alignment tint (via CSS class on outer wrapper — see classFor*)
 *   - race silhouette
 *   - class glyph
 *   - veining overlay (corruption ≥ 4)
 *   - tide-bloom edge (clarity < 4)
 *   - lantern halo (notice ≥ 7)
 *   - fatigue droop (fatigue ≥ 7 — subtle Y-translate on silhouette)
 *   - condition pins at the rim
 */
export function composeSpecimenJarSvg(state: SpecimenJarState): string {
  const flags = computeRecomposeFlags(state.meters);
  const layers: string[] = [];

  // Jar chrome — extract the inner content of the canonical SPECIMEN_JAR_SVG
  // motif (without the outer <svg> tags so we can compose into our own root).
  const jarInner = SPECIMEN_JAR_SVG
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "");
  layers.push(`<g class="jar-chrome" aria-hidden="true">${jarInner}</g>`);

  if (state.raceSilhouetteSvg) {
    const droopY = flags.fatigued ? 4 : 0;
    layers.push(
      `<g class="layer-race" transform="translate(0 ${droopY})">${state.raceSilhouetteSvg}</g>`,
    );
  } else {
    // Default neutral silhouette so the jar isn't empty when the design
    // layer hasn't shipped a race asset for this character form yet.
    const droopY = flags.fatigued ? 4 : 0;
    layers.push(
      `<g class="layer-race" transform="translate(0 ${droopY})">` +
        `<ellipse cx="60" cy="${68 + droopY}" rx="12" ry="10" fill="#4A5A6A" opacity="0.42"/>` +
        `</g>`,
    );
  }

  if (state.classGlyphSvg) {
    layers.push(`<g class="layer-class">${state.classGlyphSvg}</g>`);
  }

  if (flags.veined) {
    // Cross-hatched drowned-red veining — kept thin so it composes with the
    // tide-bloom edge without overwhelming the silhouette. Two repeating
    // gradients at opposing angles, matching the wireframe spec.
    layers.push(
      `<g class="layer-veining" aria-hidden="true">` +
        `<defs>` +
        `<pattern id="vein-${state.characterId}" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">` +
        `<line x1="0" y1="0" x2="0" y2="24" stroke="#8A2E2E" stroke-width="0.4" opacity="0.55"/>` +
        `</pattern>` +
        `</defs>` +
        `<rect x="46" y="18" width="28" height="82" fill="url(#vein-${state.characterId})"/>` +
        `</g>`,
    );
  }

  if (flags.tideBloomEdge) {
    layers.push(
      `<g class="layer-clarity" aria-hidden="true">` +
        `<path d="M48 18 L72 18 L74 24 L72 100 L48 100 L46 24 Z" ` +
        `fill="none" stroke="#6B3F8E" stroke-width="1.4" opacity="0.55"/>` +
        `</g>`,
    );
  }

  if (flags.haloed) {
    layers.push(
      `<g class="layer-notice" aria-hidden="true">` +
        `<ellipse cx="60" cy="32" rx="18" ry="9" fill="none" stroke="#E8B85C" stroke-width="0.8" opacity="0.7"/>` +
        `</g>`,
    );
  }

  if (state.conditions && state.conditions.length > 0) {
    const max = Math.min(state.conditions.length, 5);
    for (let i = 0; i < max; i++) {
      const condition = state.conditions[i];
      const y = 26 + i * 14;
      layers.push(
        `<g class="layer-condition" data-condition-id="${condition}" transform="translate(82 ${y})">` +
          `<circle cx="0" cy="0" r="5" fill="#F5EFE0" stroke="#4A5A6A" stroke-width="0.8"/>` +
          `<text x="0" y="2" text-anchor="middle" font-family="JetBrains Mono, monospace" ` +
          `font-size="5" fill="#4A5A6A">${conditionGlyph(condition)}</text>` +
          `</g>`,
      );
    }
  }

  const stateAttrs = [
    flags.veined && `data-veined="true"`,
    flags.fatigued && `data-fatigued="true"`,
    flags.haloed && `data-haloed="true"`,
    flags.tideBloomEdge && `data-tide-bloom-edge="true"`,
    state.alignment && `data-alignment="${state.alignment}"`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" ` +
    `role="img" aria-label="${escapeXml(state.characterName)} · specimen jar" ` +
    `data-character-id="${state.characterId}" ${stateAttrs}>` +
    layers.join("") +
    `</svg>`
  );
}

/**
 * Map a condition_id to a 3-letter glyph for the rim pin. This is a tiny
 * subset (the v0.6 condition list has 25+); unknown ids fall back to the
 * first 3 uppercased letters of the id. Matches the NOTICE_07 wireframe
 * glyph rule (MRK for marked_by_attention, SLT for salt_rimed, etc.).
 */
function conditionGlyph(conditionId: string): string {
  const explicit: Record<string, string> = {
    marked_by_attention: "MRK",
    salt_rimed: "SLT",
    rebuked: "RCG",
    sworn: "SWR",
    cursed: "CUR",
    bonded_to_marrow_saint_ilyra: "BMI",
  };
  if (explicit[conditionId]) return explicit[conditionId];
  return conditionId.replace(/[^a-z]/g, "").slice(0, 3).toUpperCase();
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&apos;",
  );
}

// ----------------------------------------------------------------------------
// DOM wrapper — produces a host element with the jar SVG injected and a
// data-recompose-key attribute the caller can use to detect when state has
// changed enough to retrigger the 80ms crossfade. Reduced-motion respected
// via the existing UI-system data attribute.
// ----------------------------------------------------------------------------

export interface SpecimenJarElementOptions {
  /** Whether to render the 80ms crossfade on recompose. Defaults to true,
   *  but the consumer should pass `false` when prefersReducedMotion(). */
  animate?: boolean;
}

export function createSpecimenJar(
  state: SpecimenJarState,
  options: SpecimenJarElementOptions = {},
): HTMLElement {
  const host = document.createElement("div");
  host.className = "specimen-jar";
  host.dataset.characterId = state.characterId;
  host.dataset.testid = "specimen-jar";
  host.innerHTML = composeSpecimenJarSvg(state);
  // Seed the recompose key so a subsequent recomposeSpecimenJar() call with
  // the same state short-circuits as a true no-op (no flag set, no rewrite).
  host.dataset.recomposeKey = recomposeKey(state, computeRecomposeFlags(state.meters));
  if (options.animate === false) host.dataset.animate = "false";
  return host;
}

/**
 * Update an existing jar host in-place. Detects whether the recompose flags
 * actually changed; if not, this is a no-op (the SVG is not re-emitted).
 * That cheap-recompose property is important — the host runs every turn,
 * and most turns don't cross a threshold.
 */
export function recomposeSpecimenJar(
  host: HTMLElement,
  nextState: SpecimenJarState,
  options: SpecimenJarElementOptions = {},
): void {
  const prevKey = host.dataset.recomposeKey ?? "";
  const nextFlags = computeRecomposeFlags(nextState.meters);
  const nextKey = recomposeKey(nextState, nextFlags);
  if (prevKey === nextKey) return;
  host.dataset.recomposeKey = nextKey;
  if (options.animate !== false) host.dataset.recomposing = "true";
  host.innerHTML = composeSpecimenJarSvg(nextState);
  if (options.animate !== false) {
    // Drop the recomposing flag on the next animation frame so CSS can
    // crossfade. The 80ms duration lives in the consumer's stylesheet; this
    // file only signals "a recompose just happened".
    requestAnimationFrame(() => {
      host.dataset.recomposing = "false";
    });
  }
}

/**
 * Stable hash for the state subset that affects SVG output. Used by
 * `recomposeSpecimenJar` to short-circuit no-op renders.
 */
function recomposeKey(state: SpecimenJarState, flags: RecomposeFlags): string {
  return [
    state.characterId,
    state.raceSilhouetteSvg ? "race+" : "race-",
    state.classGlyphSvg ? "class+" : "class-",
    state.alignment ?? "",
    flags.veined ? "v" : "",
    flags.fatigued ? "f" : "",
    flags.haloed ? "h" : "",
    flags.tideBloomEdge ? "t" : "",
    (state.conditions ?? []).slice(0, 5).join(","),
  ].join("|");
}
