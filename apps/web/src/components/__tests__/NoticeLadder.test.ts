/**
 * @vitest-environment happy-dom
 */
// ============================================================================
// Notice Ladder tests — UI-403
// ============================================================================
// Phase 20 / Wave J. Two surfaces:
//   - NoticeLadder (state machine): transitions, multi-rung crossings,
//     condition appends, x12_apotheosis routing at rung 10 / Authority ≥ 9
//   - NoticeBanner (DOM): meter + badge + faction rows + apotheosis gate
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import {
  transitionNoticeLadder,
  rungBannerCopy,
  NOTICE_LADDER_RUNGS,
  NOTICE_LADDER_SCENES,
  NOTICE_LADDER_CONDITIONS,
  AUTHORITY_APOTHEOSIS_THRESHOLD,
} from "../../state/NoticeLadder.js";
import { createNoticeBanner } from "../NoticeBanner.js";

describe("NoticeLadder — state machine", () => {
  it("notice unchanged → no events, no scene routed", () => {
    const r = transitionNoticeLadder({
      previousNotice: 5,
      nextNotice: 5,
      authority: 0,
      highestRungEntered: 0,
    });
    expect(r.events).toHaveLength(0);
    expect(r.sceneRouted).toBeNull();
    expect(r.conditionsAppended).toEqual([]);
  });

  it("notice decreasing → no rungs fire (one-way ladder)", () => {
    const r = transitionNoticeLadder({
      previousNotice: 8,
      nextNotice: 6,
      authority: 0,
      highestRungEntered: 8,
    });
    expect(r.events).toHaveLength(0);
    expect(r.sceneRouted).toBeNull();
    expect(r.nextState.notice).toBe(6);
    expect(r.nextState.highestRungEntered).toBe(8); // persists
  });

  it("crossing rung 7 alone fires murmur + marked_by_attention", () => {
    const r = transitionNoticeLadder({
      previousNotice: 6,
      nextNotice: 7,
      authority: 0,
      highestRungEntered: 0,
    });
    expect(r.conditionsAppended).toEqual(["marked_by_attention"]);
    expect(r.sceneRouted).toBe("notice_07_murmur");
    expect(r.events.map((e) => e.kind)).toEqual([
      "rung_entered",
      "condition_appended",
      "scene_routed",
    ]);
    expect(r.nextState.highestRungEntered).toBe(7);
  });

  it("multi-rung crossing (6 → 9) fires 7, 8, 9 in order, scene = last (highest)", () => {
    const r = transitionNoticeLadder({
      previousNotice: 6,
      nextNotice: 9,
      authority: 0,
      highestRungEntered: 0,
    });
    expect(r.conditionsAppended).toEqual([
      "marked_by_attention",
      "recognized_but_not_yet_named",
      "named_by_not_yet_named",
    ]);
    expect(r.sceneRouted).toBe("notice_09_confrontation");
    // Three rungs × three event kinds each.
    expect(r.events).toHaveLength(9);
    expect(r.nextState.highestRungEntered).toBe(9);
  });

  it("crossing rung 10 + authority < 9 → standard convergence", () => {
    const r = transitionNoticeLadder({
      previousNotice: 9,
      nextNotice: 10,
      authority: 8,
      highestRungEntered: 9,
    });
    expect(r.sceneRouted).toBe("notice_10_convergence");
    expect(r.apotheosis).toBe(false);
  });

  it("crossing rung 10 + authority ≥ 9 → routes to x12_apotheosis", () => {
    const r = transitionNoticeLadder({
      previousNotice: 9,
      nextNotice: 10,
      authority: AUTHORITY_APOTHEOSIS_THRESHOLD,
      highestRungEntered: 9,
    });
    expect(r.sceneRouted).toBe("x12_apotheosis");
    expect(r.apotheosis).toBe(true);
    expect(r.events.at(-1)).toMatchObject({
      kind: "apotheosis_routed",
      scene: "x12_apotheosis",
      rung: 10,
    });
  });

  it("authority = 10 also routes to x12_apotheosis (≥ threshold)", () => {
    const r = transitionNoticeLadder({
      previousNotice: 9,
      nextNotice: 10,
      authority: 10,
      highestRungEntered: 9,
    });
    expect(r.apotheosis).toBe(true);
  });

  it("re-crossing an already-entered rung does NOT fire it again", () => {
    // Player dipped from 9 → 6 → 9. The rung 7/8/9 conditions persist
    // (highestRungEntered carries the high-water mark). Re-crossing them
    // is a no-op for the ladder.
    const r = transitionNoticeLadder({
      previousNotice: 6,
      nextNotice: 9,
      authority: 0,
      highestRungEntered: 9,
    });
    expect(r.conditionsAppended).toEqual([]);
    expect(r.sceneRouted).toBeNull();
    expect(r.nextState.highestRungEntered).toBe(9);
  });

  it("ladder partial re-entry: previous 5, highest 7, next 9 → only 8 and 9 fire", () => {
    const r = transitionNoticeLadder({
      previousNotice: 5,
      nextNotice: 9,
      authority: 0,
      highestRungEntered: 7,
    });
    expect(r.conditionsAppended).toEqual([
      "recognized_but_not_yet_named",
      "named_by_not_yet_named",
    ]);
    expect(r.sceneRouted).toBe("notice_09_confrontation");
  });

  it("constants are intact (regression guard against accidental rename)", () => {
    expect(NOTICE_LADDER_RUNGS).toEqual([7, 8, 9, 10]);
    expect(NOTICE_LADDER_SCENES[7]).toBe("notice_07_murmur");
    expect(NOTICE_LADDER_SCENES[10]).toBe("notice_10_convergence");
    expect(NOTICE_LADDER_CONDITIONS[7]).toBe("marked_by_attention");
    expect(NOTICE_LADDER_CONDITIONS[10]).toBe("convergence_pending");
    expect(AUTHORITY_APOTHEOSIS_THRESHOLD).toBe(9);
  });

  it("rungBannerCopy returns title + condition + non-empty copy for each rung", () => {
    for (const rung of NOTICE_LADDER_RUNGS) {
      const { title, condition, copy } = rungBannerCopy(rung);
      expect(title.length).toBeGreaterThan(0);
      expect(condition.length).toBeGreaterThan(0);
      expect(copy.length).toBeGreaterThan(20);
    }
  });
});

describe("NoticeBanner — DOM render", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the banner with rung + condition data attributes", () => {
    const banner = createNoticeBanner({ rung: 7, notice: 7 });
    expect(banner.dataset.testid).toBe("notice-banner");
    expect(banner.dataset.rung).toBe("7");
    expect(banner.dataset.condition).toBe("marked_by_attention");
  });

  it("renders 11 meter segments and marks the threshold for the current rung", () => {
    const banner = createNoticeBanner({ rung: 9, notice: 9 });
    const segs = banner.querySelectorAll("[data-testid='notice-meter'] .seg");
    expect(segs).toHaveLength(11);
    expect(segs[9].classList.contains("threshold")).toBe(true);
  });

  it("badge text uses the rung's 3-letter glyph", () => {
    expect(
      createNoticeBanner({ rung: 7, notice: 7 }).querySelector(
        "[data-testid='notice-banner-badge']",
      )?.textContent,
    ).toBe("MRK");
    expect(
      createNoticeBanner({ rung: 10, notice: 10 }).querySelector(
        "[data-testid='notice-banner-badge']",
      )?.textContent,
    ).toBe("CVG");
  });

  it("faction awareness rows render the bar fill from the awareness number", () => {
    const banner = createNoticeBanner({
      rung: 7,
      notice: 7,
      factions: [
        { factionId: "fct_bell_court", factionName: "Civic Bell Court", awareness: 5 },
        { factionId: "fct_drowned_church", factionName: "Drowned Church", awareness: 4 },
        { factionId: "fct_tide_league", factionName: "Merchant Tide League", awareness: 1 },
      ],
    });
    const rows = banner.querySelectorAll(".notice-banner-factions .pulse-row");
    expect(rows).toHaveLength(3);
    expect((rows[0] as HTMLElement).dataset.factionId).toBe("fct_bell_court");
    expect((rows[0].querySelector("i") as HTMLElement).classList.contains("aware")).toBe(true);
    expect((rows[2].querySelector("i") as HTMLElement).classList.contains("aware")).toBe(false);
  });

  it("rung 10 + authority < 9 → renders the standard RETURN action only", () => {
    const banner = createNoticeBanner({ rung: 10, notice: 10, authority: 8 });
    expect(banner.dataset.apotheosisGate).toBe("false");
    expect(banner.querySelector("[data-testid='notice-banner-return']")).not.toBeNull();
    expect(banner.querySelector("[data-testid='notice-banner-apotheosis-accept']")).toBeNull();
  });

  it("rung 10 + authority ≥ 9 → renders APOTHEOSIS accept/refuse pair", () => {
    const accepted: boolean[] = [];
    const refused: boolean[] = [];
    const banner = createNoticeBanner({
      rung: 10,
      notice: 10,
      authority: 9,
      onApotheosisAccept: () => accepted.push(true),
      onApotheosisRefuse: () => refused.push(true),
    });
    expect(banner.dataset.apotheosisGate).toBe("true");
    expect(banner.querySelector("[data-testid='notice-banner-return']")).toBeNull();
    (banner.querySelector("[data-testid='notice-banner-apotheosis-accept']") as HTMLButtonElement).click();
    (banner.querySelector("[data-testid='notice-banner-apotheosis-refuse']") as HTMLButtonElement).click();
    expect(accepted).toEqual([true]);
    expect(refused).toEqual([true]);
  });

  it("inspect button fires onInspect when supplied", () => {
    const calls: number[] = [];
    const banner = createNoticeBanner({ rung: 7, notice: 7, onInspect: () => calls.push(1) });
    (banner.querySelector(".notice-banner-inspect") as HTMLButtonElement).click();
    expect(calls).toEqual([1]);
  });

  it("aria-label on root encodes the rung + title for screen readers", () => {
    const banner = createNoticeBanner({ rung: 8, notice: 8 });
    expect(banner.getAttribute("aria-label")).toBe("Notice 8 — Acknowledgment");
  });
});
