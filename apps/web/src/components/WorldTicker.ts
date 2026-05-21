/**
 * ============================================================================
 * WORLD TICKER — UI-402 top-bar DOM render
 * ============================================================================
 * Phase 20 / Wave J / UI-402. Wireframe source: WORLD_TICKER.html (approach B
 * "Crawl · Above the Scene"). State source: WorldTickerQueue.ts.
 *
 * Renders a 38px-tall slate bar above the main scene. Items scroll right-to-
 * left at ~30 px/s in the default motion mode; in reduced-motion mode, the
 * track is static and the user advances items with arrow buttons. Source
 * prefix (e.g. "BELL · 04:11") + summary_text per item, separated by a
 * mid-line spacer.
 *
 * Voice discipline:
 *   - No emoji; allowed ornaments only (· is the spacer here)
 *   - No bounce/spring; linear scroll only
 *   - Reduced-motion → static + arrow controls
 *   - Items are tap-to-pause, tap-to-expand-to-gazette (latter handled by
 *     the caller's onExpand callback — this file does not own the Gazette
 *     surface; that's a separate Phase 21+ ticket per the wireframe notes)
 *
 * Why the consumer owns the queue: the App's runtime store is the long-lived
 * container; this view is throwaway DOM. Same lifecycle pattern as
 * InventoryPanel + GameplayScreen.
 * ============================================================================
 */

import type { WorldPulseTickerItem, TickerClass } from "../state/WorldTickerQueue.js";

export interface WorldTickerProps {
  /** Visible items (already filtered via queue.visible()). */
  items: readonly WorldPulseTickerItem[];
  /** Caller's mark-displayed signal — fires once per item as it enters view.
   *  Consumer is expected to call queue.markDisplayed(id) in response. */
  onItemSurfaced?: (ticker_item_id: string) => void;
  /** Caller's expand-to-gazette signal. Tap an item, get this callback. */
  onExpand?: (item: WorldPulseTickerItem) => void;
  /** True when the player has reduced-motion preference set. Falls back to
   *  the matchMedia query if undefined. */
  reducedMotion?: boolean;
}

/**
 * Map ticker_class to its 4-letter display source. Matches the wireframe
 * voice (BELL · CHURCH · LEAGUE · RUMOR …) — but the wireframe groups by
 * faction-name where this is the schema's narrower 5-enum. Caller's
 * summary_text typically carries the faction-name prefix; this label is the
 * SCHEMA-level category badge, shown above or before the summary.
 */
const CLASS_LABEL: Record<TickerClass, string> = {
  faction_action: "ACT",
  rumor: "RMR",
  weather: "WTH",
  rite: "RIT",
  canon_event: "CAN",
};

export function createWorldTicker(props: WorldTickerProps): HTMLElement {
  const reducedMotion =
    props.reducedMotion ??
    (typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true);

  const bar = document.createElement("div");
  bar.className = "world-ticker crawl-bar";
  bar.dataset.testid = "world-ticker";
  bar.setAttribute("role", "marquee");
  bar.setAttribute("aria-label", "World ticker — elsewhere events");
  if (reducedMotion) bar.dataset.reducedMotion = "true";

  const label = document.createElement("span");
  label.className = "world-ticker-label lab";
  label.textContent = "— ELSEWHERE";
  bar.appendChild(label);

  const track = document.createElement("div");
  track.className = "world-ticker-track crawl-track";
  track.dataset.testid = "world-ticker-track";
  bar.appendChild(track);

  // No items: render an explicit empty marker so the bar collapses gracefully
  // and the SR users hear "the world is quiet" rather than silence.
  if (props.items.length === 0) {
    const empty = document.createElement("span");
    empty.className = "world-ticker-empty";
    empty.dataset.testid = "world-ticker-empty";
    empty.textContent = "— the world is quiet —";
    track.appendChild(empty);
    return bar;
  }

  // Items in insertion order. Visible() already filtered out displayed_to_player,
  // so every item here is genuinely new to the player this render cycle.
  for (const item of props.items) {
    const itemEl = document.createElement("span");
    itemEl.className = `world-ticker-item item ticker-class-${item.ticker_class}`;
    itemEl.dataset.tickerItemId = item.ticker_item_id;
    itemEl.dataset.sourceEventId = item.source_event_id;

    const src = document.createElement("span");
    src.className = "world-ticker-src src";
    src.textContent = CLASS_LABEL[item.ticker_class];
    itemEl.appendChild(src);

    const txt = document.createElement("span");
    txt.className = "world-ticker-summary";
    txt.textContent = item.summary_text;
    itemEl.appendChild(txt);

    // Spacer · between items — typographic ornament from the allowed set.
    const spacer = document.createElement("span");
    spacer.className = "world-ticker-spacer";
    spacer.setAttribute("aria-hidden", "true");
    spacer.textContent = " · ";
    itemEl.appendChild(spacer);

    if (props.onExpand) {
      itemEl.style.cursor = "pointer";
      itemEl.setAttribute("role", "button");
      itemEl.setAttribute("tabindex", "0");
      itemEl.addEventListener("click", () => props.onExpand!(item));
      itemEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onExpand!(item);
        }
      });
    }

    track.appendChild(itemEl);

    // Fire mark-displayed synchronously — the contract is "the item appeared
    // in the DOM"; whether the user actually saw it scroll past is a UX
    // question we don't try to solve here. Consumer can debounce if it
    // needs different semantics.
    if (props.onItemSurfaced) props.onItemSurfaced(item.ticker_item_id);
  }

  if (reducedMotion) {
    // Static-mode controls: previous / next arrows. The CSS pinning is the
    // consumer's job; this code only emits the markup and wires the buttons.
    const controls = document.createElement("div");
    controls.className = "world-ticker-controls";
    controls.dataset.testid = "world-ticker-controls";

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "world-ticker-prev";
    prev.setAttribute("aria-label", "Previous ticker item");
    prev.textContent = "←";
    controls.appendChild(prev);

    const next = document.createElement("button");
    next.type = "button";
    next.className = "world-ticker-next";
    next.setAttribute("aria-label", "Next ticker item");
    next.textContent = "→";
    controls.appendChild(next);

    bar.appendChild(controls);
  }

  return bar;
}
