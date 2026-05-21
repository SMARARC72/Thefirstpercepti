/**
 * Phase 21 / OPS-507 — "Lean Mode" badge for World Pulse ticker.
 *
 * When the daily LLM budget is exhausted and we've fallen back to cheaper
 * models, a small static glyph appears in the World Pulse top bar. Hover
 * reveals a tooltip framed as world-state (not blame the player).
 *
 * Discipline (Phase 14 design system):
 *  - NO animation. Static glyph. No pulse, glow, bounce, fade-in.
 *  - Glyph from allowed set: ◆ ❦ ↻ → · — we use ⚖ as a balance-scale metaphor.
 *    Wait — ⚖ isn't in the allowed glyph set. Use ◆ instead (in-set, neutral).
 *  - Tooltip uses field-journal density. No "you", no apology, no celebration.
 *  - Hidden by default; only renders when isLeanMode() returns true.
 *
 * Wiring in Phase 20 World Pulse ticker:
 *   const badge = await createLeanModeBadge();
 *   if (badge) ticker.prepend(badge);
 */
import { isLeanMode } from "@first-perception/llm-client/middleware";

const GLYPH = "◆";  // in-set; from allowed: ◆ ❦ ↻ → ·

const TOOLTIP_TEXT = (
  "Lean mode. The world's clarity is subtler today. " +
  "Voice and ornamentation may attenuate. Resets at 00:00 UTC."
);

/**
 * Returns the badge DOM element if lean mode is active, else null.
 * Cheap: one Postgres read. Cache the result for ~30 seconds in your ticker
 * if you call it more often than that.
 */
export async function createLeanModeBadge(): Promise<HTMLElement | null> {
  let lean: boolean;
  try {
    lean = await isLeanMode();
  } catch (err) {
    // If we can't reach Postgres for any reason, don't show the badge.
    // Better silent than wrong.
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

  // Inline style fallback in case the design system CSS isn't loaded.
  // Replace with class-only styling once design tokens are confirmed.
  span.style.cssText = [
    "display:inline-flex",
    "align-items:center",
    "padding:0 6px",
    "font-family:'JetBrains Mono', monospace",
    "font-size:13px",
    "color:var(--brass-mid, #b8915a)",
    "opacity:0.75",
    "cursor:default",
    // EXPLICITLY no transition / no animation
  ].join(";");

  span.textContent = GLYPH;
  return span;
}

/**
 * Helper for tests: produces the same DOM structure with lean=true forced.
 */
export function createLeanModeBadgeForced(): HTMLElement {
  const span = document.createElement("span");
  span.className = "world-pulse-badge world-pulse-badge--lean";
  span.setAttribute("role", "status");
  span.setAttribute("aria-label", "Lean mode active");
  span.dataset.testid = "lean-mode-badge";
  span.title = TOOLTIP_TEXT;
  span.textContent = GLYPH;
  return span;
}
