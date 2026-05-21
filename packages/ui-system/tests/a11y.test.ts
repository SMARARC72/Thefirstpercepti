/**
 * @vitest-environment happy-dom
 *
 * Phase 22 / A11Y-604 — Accessibility test patterns.
 *
 * Tests the keyboard helpers + reduced-motion respect. happy-dom is the
 * project's standard for DOM-touching tests (matches Phase 20 surfaces).
 * For full WCAG audit, add jest-axe in Phase 23 (deferred per Phase 22 MVP scope).
 *
 * To run: npm --prefix packages/ui-system test
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  installSkipLink,
  applyRovingTabindex,
  trapFocus,
  onEscape,
  motion,
  isAllowedEasing,
  FORBIDDEN_EASINGS,
} from "../src/a11y/index.js";

// ---------- Skip link ----------
describe("installSkipLink", () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="main" tabindex="-1">Main content</main>';
  });

  it("inserts a skip link as first child of body", () => {
    const link = installSkipLink();
    expect(document.body.firstChild).toBe(link);
    expect(link.className).toBe("skip-link");
    expect(link.getAttribute("href")).toBe("#main");
  });

  it("uses custom label + target when provided", () => {
    const link = installSkipLink({ targetId: "game-canvas", label: "Skip to game" });
    expect(link.textContent).toBe("Skip to game");
    expect(link.getAttribute("href")).toBe("#game-canvas");
  });

  it("focuses target on click", () => {
    installSkipLink();
    const link = document.querySelector(".skip-link") as HTMLAnchorElement;
    const target = document.getElementById("main")!;
    link.click();
    expect(document.activeElement).toBe(target);
  });
});

// ---------- Roving tabindex ----------
describe("applyRovingTabindex", () => {
  let strip: HTMLElement;
  let tabs: HTMLElement[];

  beforeEach(() => {
    document.body.innerHTML = `
      <div role="tablist" data-roving-tabindex>
        <button role="tab" aria-selected="true">Stats</button>
        <button role="tab" aria-selected="false">Inventory</button>
        <button role="tab" aria-selected="false">Spells</button>
        <button role="tab" aria-selected="false">Conditions</button>
        <button role="tab" aria-selected="false">Path Ledger</button>
      </div>
    `;
    strip = document.querySelector("[role='tablist']") as HTMLElement;
    tabs = Array.from(strip.querySelectorAll("[role='tab']")) as HTMLElement[];
  });

  it("initializes first selected tab as the only tabbable", () => {
    applyRovingTabindex(strip);
    expect(tabs[0].getAttribute("tabindex")).toBe("0");
    expect(tabs[1].getAttribute("tabindex")).toBe("-1");
    expect(tabs[2].getAttribute("tabindex")).toBe("-1");
  });

  it("ArrowRight moves to next tab", () => {
    applyRovingTabindex(strip);
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].getAttribute("tabindex")).toBe("0");
    expect(document.activeElement).toBe(tabs[1]);
  });

  it("ArrowLeft wraps from first to last", () => {
    applyRovingTabindex(strip);
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(tabs[4].getAttribute("aria-selected")).toBe("true");
  });

  it("Home jumps to first; End jumps to last", () => {
    applyRovingTabindex(strip);
    tabs[2].focus();
    tabs[2].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(tabs[4].getAttribute("aria-selected")).toBe("true");
    tabs[4].dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
  });

  it("dispatches tab-activated event with index", () => {
    applyRovingTabindex(strip);
    const listener = vi.fn();
    strip.addEventListener("tab-activated", listener);
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail.index).toBe(1);
  });
});

// ---------- Focus trap ----------
describe("trapFocus", () => {
  let modal: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="outside">Outside</button>
      <div id="modal">
        <button id="first">First</button>
        <input id="middle" />
        <button id="last">Last</button>
      </div>
    `;
    modal = document.getElementById("modal")!;
  });

  it("focuses first focusable in the container on activation", () => {
    trapFocus(modal);
    expect(document.activeElement?.id).toBe("first");
  });

  it("Shift+Tab from first wraps to last", () => {
    trapFocus(modal);
    const first = document.getElementById("first")!;
    first.focus();
    modal.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    expect(document.activeElement?.id).toBe("last");
  });

  it("Tab from last wraps to first", () => {
    trapFocus(modal);
    const last = document.getElementById("last")!;
    last.focus();
    modal.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement?.id).toBe("first");
  });
});

// ---------- Escape handler ----------
describe("onEscape", () => {
  it("fires handler on Escape key", () => {
    const handler = vi.fn();
    const release = onEscape(handler);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(handler).toHaveBeenCalledOnce();
    release();
  });

  it("does not fire on other keys", () => {
    const handler = vi.fn();
    const release = onEscape(handler);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    release();
  });
});

// ---------- Motion + easings ----------
describe("motion", () => {
  it("prefersReducedMotion reads matchMedia", () => {
    // jsdom's matchMedia returns matches:false by default.
    expect(motion.prefersReducedMotion()).toBe(false);
  });

  it("respect() picks reduced path when matchMedia matches", () => {
    const originalMatchMedia = window.matchMedia;
    // @ts-ignore
    window.matchMedia = (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    const result = motion.respect({
      reduced: () => "snap",
      motion: () => "animate",
    });
    expect(result).toBe("snap");
    window.matchMedia = originalMatchMedia;
  });
});

describe("easing discipline", () => {
  it.each(FORBIDDEN_EASINGS)("rejects %s easing", (forbidden) => {
    expect(isAllowedEasing(forbidden as string)).toBe(false);
    expect(isAllowedEasing(`${forbidden}.out`)).toBe(false);
  });

  it("allows linear, power1, power2, steps", () => {
    expect(isAllowedEasing("linear")).toBe(true);
    expect(isAllowedEasing("power1.inOut")).toBe(true);
    expect(isAllowedEasing("power2.out")).toBe(true);
    expect(isAllowedEasing("steps(4)")).toBe(true);
  });
});
