/**
 * Phase 22 / A11Y-602 patch — Lean Mode badge contrast fix.
 *
 * Phase 21 originally used `brass-mid` (#b8915a, off-palette) which gave
 * 3.99:1 contrast on salt-bleach. Below WCAG 2.1 AA normal-text threshold.
 *
 * Fix: use `saltline` (#4A5A6A) — established secondary-text color, palette-
 * canonical, contrast 6.18:1 on salt-bleach (AA). Same semantic meaning
 * (subtle but legible), no off-palette color.
 *
 * Discipline (per Phase 14 design system):
 *  - NO animation. Static glyph. No pulse, glow, bounce, fade-in.
 *  - Glyph from allowed set: ◆ ❦ ↻ → · — using ◆ (in-set, neutral).
 *  - Tooltip uses field-journal density. No "you", no apology, no celebration.
 *  - Hidden by default; only renders when isLeanMode() returns true.
 */
import { isLeanMode } from "@first-perception/llm-client/middleware";

const GLYPH = "◆";  // in-set; from allowed: ◆ ❦ ↻ → ·

const TOOLTIP_TEXT = (
  "Lean mode. The world's clarity is subtler today. " +
  "Voice and ornamentation may attenuate. Resets at 00:00 UTC."
);

/**
 * Returns the badge DOM element if lean mode is active, else null.
 */
export async function createLeanModeBadge(): Promise<HTMLElement | null> {
  let lean: boolean;
  try {
    lean = await isLeanMode();
  } catch (err) {
    console.warn("[LeanModeBadge] isLeanMode failed; suppressing badge:", err);
    return null;
  }

  if (!lean) return null;

  const span = document.createElement("span");
  span.className = "world-pulse-badge world-pulse-badge--lean";
  span.setAttribute("role", "status");
  span.setAttribute("aria-label", "Lean mode active");
  span.dataset.testid = "lean-mode-badge";
  span.title = TOOLTIP_TEXT;

  // Inline style: palette-canonical saltline (#4A5A6A) on salt-bleach (#F5EFE0)
  // gives 6.18:1 contrast — WCAG 2.1 AA pass for normal text.
  // No transitions, no animations (Phase 22 a11y + Phase 14 motion discipline).
  span.style.cssText = [
    "display:inline-flex",
    "align-items:center",
    "padding:0 6px",
    "font-family:'JetBrains Mono', monospace",
    "font-size:13px",
    "color:var(--saltline, #4A5A6A)",    // FIXED: was brass-dim (3.99:1 fail)
    "opacity:1",                          // FIXED: was 0.75; with saltline we don't need to dim
    "cursor:default",
    // EXPLICITLY no transition / no animation
  ].join(";");

  span.textContent = GLYPH;
  return span;
}

export function createLeanModeBadgeForced(): HTMLElement {
  const span = document.createElement("span");
  span.className = "world-pulse-badge world-pulse-badge--lean";
  span.setAttribute("role", "status");
  span.setAttribute("aria-label", "Lean mode active");
  span.dataset.testid = "lean-mode-badge";
  span.title = TOOLTIP_TEXT;
  span.style.cssText = "color:var(--saltline, #4A5A6A);opacity:1";
  span.textContent = GLYPH;
  return span;
}
