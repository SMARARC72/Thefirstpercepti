/**
 * @vitest-environment happy-dom
 */
// ============================================================================
// SpecimenJar — Procedural recompose tests
// ============================================================================
// Phase 20 / Wave J / UI-401. Covers:
//   - Threshold rules (PORTRAIT_RECOMPOSE.html lines 108-111)
//   - SVG output composes the canonical layers in the right order
//   - Recompose key short-circuits no-op renders (cheap-recompose property)
//   - Reduced-motion path skips the crossfade signal
//   - Snapshot of rendered SVG for a canonical Khojen D14 state
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import {
  composeSpecimenJarSvg,
  computeRecomposeFlags,
  createSpecimenJar,
  recomposeSpecimenJar,
  SPECIMEN_JAR_THRESHOLDS,
  type SpecimenJarState,
  type CharacterMeters,
} from "../SpecimenJar.js";

const meters = (m: Partial<CharacterMeters> = {}): CharacterMeters => ({
  corruption: 0,
  fatigue: 0,
  notice: 0,
  clarity: 5,
  debt: 0,
  ...m,
});

const baseState: SpecimenJarState = {
  characterId: "khojen",
  characterName: "Khojen",
  meters: meters(),
};

describe("computeRecomposeFlags — threshold rules", () => {
  it("all-zero meters → no layer-D effects active", () => {
    expect(computeRecomposeFlags(meters())).toEqual({
      veined: false,
      fatigued: false,
      haloed: false,
      tideBloomEdge: false,
    });
  });

  it("corruption ≥ 4 → veined", () => {
    expect(computeRecomposeFlags(meters({ corruption: 4 })).veined).toBe(true);
    expect(computeRecomposeFlags(meters({ corruption: 3 })).veined).toBe(false);
  });

  it("fatigue ≥ 7 → fatigued", () => {
    expect(computeRecomposeFlags(meters({ fatigue: 7 })).fatigued).toBe(true);
    expect(computeRecomposeFlags(meters({ fatigue: 6 })).fatigued).toBe(false);
  });

  it("notice ≥ 7 → haloed", () => {
    expect(computeRecomposeFlags(meters({ notice: 7 })).haloed).toBe(true);
    expect(computeRecomposeFlags(meters({ notice: 6 })).haloed).toBe(false);
  });

  it("clarity < 4 → tideBloomEdge", () => {
    expect(computeRecomposeFlags(meters({ clarity: 3 })).tideBloomEdge).toBe(true);
    expect(computeRecomposeFlags(meters({ clarity: 4 })).tideBloomEdge).toBe(false);
  });

  it("thresholds match the wireframe constants exactly", () => {
    // PORTRAIT_RECOMPOSE.html:108-111 — these MUST stay in lockstep with the
    // wireframe. If a designer changes the threshold in the wireframe, both
    // sides change in the same commit.
    expect(SPECIMEN_JAR_THRESHOLDS).toEqual({
      corruptionVeining: 4,
      fatigueShadow: 7,
      noticeHalo: 7,
      clarityEdgeMax: 4,
    });
  });

  it("Khojen D14 canonical state → all 4 layer-D effects active", () => {
    // PORTRAIT_RECOMPOSE.html:99-103 — Khojen at D14: corruption 7, fatigue 8,
    // notice 7, clarity 3, debt 4. All four meter rules fire.
    const flags = computeRecomposeFlags(meters({
      corruption: 7,
      fatigue: 8,
      notice: 7,
      clarity: 3,
      debt: 4,
    }));
    expect(flags).toEqual({
      veined: true,
      fatigued: true,
      haloed: true,
      tideBloomEdge: true,
    });
  });
});

describe("composeSpecimenJarSvg — rendered SVG layers", () => {
  it("emits a <svg> with the correct viewBox and aria-label", () => {
    const svg = composeSpecimenJarSvg(baseState);
    expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 120 120"/);
    expect(svg).toContain('aria-label="Khojen · specimen jar"');
    expect(svg).toContain('data-character-id="khojen"');
  });

  it("escapes XML-unsafe characters in character names", () => {
    const svg = composeSpecimenJarSvg({ ...baseState, characterName: 'Ilyra "Marrow"' });
    expect(svg).toContain("Ilyra &quot;Marrow&quot;");
  });

  it("includes the jar chrome layer", () => {
    const svg = composeSpecimenJarSvg(baseState);
    expect(svg).toContain('class="jar-chrome"');
  });

  it("includes the default neutral silhouette when no race asset is provided", () => {
    const svg = composeSpecimenJarSvg(baseState);
    expect(svg).toContain('class="layer-race"');
  });

  it("uses caller-supplied race silhouette SVG when provided", () => {
    const svg = composeSpecimenJarSvg({
      ...baseState,
      raceSilhouetteSvg: '<path d="M 1 1" data-race="tiefling"/>',
    });
    expect(svg).toContain('data-race="tiefling"');
  });

  it("adds class glyph layer only when classGlyphSvg is provided", () => {
    expect(composeSpecimenJarSvg(baseState)).not.toContain("layer-class");
    const withClass = composeSpecimenJarSvg({
      ...baseState,
      classGlyphSvg: '<circle data-class="warlock"/>',
    });
    expect(withClass).toContain('class="layer-class"');
    expect(withClass).toContain('data-class="warlock"');
  });

  it("adds veining layer iff corruption ≥ 4", () => {
    expect(composeSpecimenJarSvg(baseState)).not.toContain("layer-veining");
    expect(
      composeSpecimenJarSvg({ ...baseState, meters: meters({ corruption: 4 }) }),
    ).toContain('class="layer-veining"');
  });

  it("adds notice halo iff notice ≥ 7", () => {
    expect(composeSpecimenJarSvg({ ...baseState, meters: meters({ notice: 6 }) }))
      .not.toContain("layer-notice");
    expect(composeSpecimenJarSvg({ ...baseState, meters: meters({ notice: 7 }) }))
      .toContain('class="layer-notice"');
  });

  it("renders one condition pin per condition, capped at 5", () => {
    const svg = composeSpecimenJarSvg({
      ...baseState,
      conditions: ["marked_by_attention", "salt_rimed", "rebuked", "sworn", "cursed", "bonded_to_marrow_saint_ilyra"],
    });
    const pins = svg.match(/data-condition-id=/g) ?? [];
    expect(pins.length).toBe(5);
    // First condition gets the explicit MRK glyph (not the fallback).
    expect(svg).toContain(">MRK<");
    expect(svg).toContain(">SLT<");
  });

  it("falls back to first 3 letters when a condition id is unknown", () => {
    const svg = composeSpecimenJarSvg({ ...baseState, conditions: ["zombified_by_practice"] });
    expect(svg).toContain(">ZOM<");
  });

  it("data attributes encode the active flags so CSS can style accordingly", () => {
    const svg = composeSpecimenJarSvg({
      ...baseState,
      meters: meters({ corruption: 7, fatigue: 8, notice: 7, clarity: 3 }),
      alignment: "CN",
    });
    expect(svg).toContain('data-veined="true"');
    expect(svg).toContain('data-fatigued="true"');
    expect(svg).toContain('data-haloed="true"');
    expect(svg).toContain('data-tide-bloom-edge="true"');
    expect(svg).toContain('data-alignment="CN"');
  });

  it("Khojen D14 canonical state — snapshot", () => {
    const svg = composeSpecimenJarSvg({
      characterId: "khojen-d14",
      characterName: "Khojen",
      alignment: "CN",
      meters: meters({ corruption: 7, fatigue: 8, notice: 7, clarity: 3, debt: 4 }),
      conditions: ["marked_by_attention", "bonded_to_marrow_saint_ilyra"],
    });
    expect(svg).toMatchSnapshot();
  });
});

describe("createSpecimenJar / recomposeSpecimenJar — DOM wrapper + cheap recompose", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("creates a host element with the testid and the svg inside", () => {
    const host = createSpecimenJar(baseState);
    document.body.appendChild(host);
    expect(host.dataset.testid).toBe("specimen-jar");
    expect(host.querySelector("svg")).not.toBeNull();
  });

  it("animate: false sets the data-animate attribute", () => {
    const host = createSpecimenJar(baseState, { animate: false });
    expect(host.dataset.animate).toBe("false");
  });

  it("recompose: no-op when nothing relevant changed", () => {
    const host = createSpecimenJar(baseState);
    const initialSvg = host.innerHTML;
    // Same state → no innerHTML rewrite, no recomposing flag.
    recomposeSpecimenJar(host, baseState);
    expect(host.innerHTML).toBe(initialSvg);
    expect(host.dataset.recomposing).toBeUndefined();
  });

  it("recompose: rewrites SVG when a meter crosses a threshold", () => {
    const host = createSpecimenJar(baseState);
    recomposeSpecimenJar(host, {
      ...baseState,
      meters: meters({ notice: 7 }),
    }, { animate: false });
    expect(host.innerHTML).toContain('class="layer-notice"');
  });

  it("recompose: signals a recompose with data-recomposing when animating", () => {
    const host = createSpecimenJar(baseState);
    recomposeSpecimenJar(host, {
      ...baseState,
      meters: meters({ corruption: 5 }),
    });
    expect(host.dataset.recomposing).toBe("true");
  });

  it("recompose: short-circuits even when irrelevant meter (debt) changes", () => {
    // debt isn't on any layer-D rule, so changing it should be a no-op for
    // recompose. This protects the host from churning the SVG on every turn.
    const host = createSpecimenJar(baseState);
    const before = host.innerHTML;
    recomposeSpecimenJar(host, {
      ...baseState,
      meters: meters({ debt: 9 }),
    });
    expect(host.innerHTML).toBe(before);
  });
});
