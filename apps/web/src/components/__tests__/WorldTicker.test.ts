/**
 * @vitest-environment happy-dom
 */
// ============================================================================
// World Pulse Ticker tests — UI-402
// ============================================================================
// Phase 20 / Wave J. Two surfaces under test:
//   - WorldTickerQueue: FIFO ordering, expiry sweep, displayed_to_player gating
//   - WorldTicker: DOM render, reduced-motion controls, surface signal
//
// Wireframe contract: WORLD_TICKER.html approach B. Schema contract:
// schema_pack_v0.6.json $defs.world_pulse_ticker_item.
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { WorldTickerQueue, type WorldPulseTickerItem } from "../../state/WorldTickerQueue.js";
import { createWorldTicker } from "../WorldTicker.js";

const T_NOW = "2026-05-20T19:00:00Z";
const T_PLUS_1H = "2026-05-20T20:00:00Z";
const T_PLUS_2H = "2026-05-20T21:00:00Z";
const T_PAST = "2026-05-20T18:00:00Z";

function item(overrides: Partial<WorldPulseTickerItem> = {}): WorldPulseTickerItem {
  return {
    ticker_item_id: "tkr_1",
    source_event_id: "evt_1",
    summary_text: "the Court bell struck once outside its hour",
    ticker_class: "canon_event",
    expires_at: T_PLUS_1H,
    ...overrides,
  };
}

describe("WorldTickerQueue — FIFO ordering", () => {
  it("preserves insertion order in visible()", () => {
    const q = new WorldTickerQueue();
    q.enqueue(item({ ticker_item_id: "a" }), T_NOW);
    q.enqueue(item({ ticker_item_id: "b" }), T_NOW);
    q.enqueue(item({ ticker_item_id: "c" }), T_NOW);
    expect(q.visible(T_NOW).map((it) => it.ticker_item_id)).toEqual(["a", "b", "c"]);
  });

  it("dedupes on ticker_item_id; second enqueue returns duplicate_id", () => {
    const q = new WorldTickerQueue();
    expect(q.enqueue(item({ ticker_item_id: "x" }), T_NOW).enqueued).toBe(true);
    const r = q.enqueue(item({ ticker_item_id: "x" }), T_NOW);
    expect(r.enqueued).toBe(false);
    expect(r.reason).toBe("duplicate_id");
    expect(q.size).toBe(1);
  });

  it("rejects summary_text > 80 chars (schema cap)", () => {
    const q = new WorldTickerQueue();
    const r = q.enqueue(item({ summary_text: "x".repeat(81) }), T_NOW);
    expect(r.enqueued).toBe(false);
    expect(r.reason).toBe("summary_too_long");
  });

  it("rejects items whose expires_at is already in the past", () => {
    const q = new WorldTickerQueue();
    const r = q.enqueue(item({ expires_at: T_PAST }), T_NOW);
    expect(r.enqueued).toBe(false);
    expect(r.reason).toBe("expired_on_arrival");
  });

  it("evicts oldest items (FIFO) when maxSize is exceeded", () => {
    const q = new WorldTickerQueue(3);
    q.enqueue(item({ ticker_item_id: "a" }), T_NOW);
    q.enqueue(item({ ticker_item_id: "b" }), T_NOW);
    q.enqueue(item({ ticker_item_id: "c" }), T_NOW);
    q.enqueue(item({ ticker_item_id: "d" }), T_NOW);
    expect(q.size).toBe(3);
    expect(q.all().map((it) => it.ticker_item_id)).toEqual(["b", "c", "d"]);
  });

  it("evicted items can re-enqueue (no duplicate-id false-positive)", () => {
    const q = new WorldTickerQueue(2);
    q.enqueue(item({ ticker_item_id: "a" }), T_NOW);
    q.enqueue(item({ ticker_item_id: "b" }), T_NOW);
    q.enqueue(item({ ticker_item_id: "c" }), T_NOW); // evicts "a"
    expect(q.enqueue(item({ ticker_item_id: "a" }), T_NOW).enqueued).toBe(true);
  });
});

describe("WorldTickerQueue — expiry sweep", () => {
  it("sweepExpired removes items past expires_at and returns the count", () => {
    const q = new WorldTickerQueue();
    q.enqueue(item({ ticker_item_id: "a", expires_at: T_PLUS_1H }), T_NOW);
    q.enqueue(item({ ticker_item_id: "b", expires_at: T_PLUS_2H }), T_NOW);
    expect(q.sweepExpired(T_PLUS_1H)).toBe(0);
    // T_PLUS_1H is exactly the expiry of "a"; the sweep uses strict > so it
    // is removed at the boundary.
    expect(q.size).toBe(2);
    const ahead = "2026-05-20T20:00:01Z";
    expect(q.sweepExpired(ahead)).toBe(1);
    expect(q.all().map((it) => it.ticker_item_id)).toEqual(["b"]);
  });

  it("visible() filters expired items without mutating the queue", () => {
    const q = new WorldTickerQueue();
    q.enqueue(item({ ticker_item_id: "a", expires_at: T_PLUS_1H }), T_NOW);
    q.enqueue(item({ ticker_item_id: "b", expires_at: T_PLUS_2H }), T_NOW);
    expect(q.visible("2026-05-20T20:30:00Z").map((it) => it.ticker_item_id)).toEqual(["b"]);
    expect(q.size).toBe(2); // not mutated
  });

  it("sweepExpired releases the seenIds slot so the id can re-enqueue", () => {
    const q = new WorldTickerQueue();
    q.enqueue(item({ ticker_item_id: "a", expires_at: T_PLUS_1H }), T_NOW);
    q.sweepExpired("2026-05-20T22:00:00Z");
    expect(q.enqueue(item({ ticker_item_id: "a", expires_at: "2026-05-21T00:00:00Z" }), T_NOW).enqueued).toBe(true);
  });
});

describe("WorldTickerQueue — displayed_to_player gating", () => {
  it("markDisplayed flips the flag and hides items from visible()", () => {
    const q = new WorldTickerQueue();
    q.enqueue(item({ ticker_item_id: "a" }), T_NOW);
    q.enqueue(item({ ticker_item_id: "b" }), T_NOW);
    q.markDisplayed("a");
    expect(q.visible(T_NOW).map((it) => it.ticker_item_id)).toEqual(["b"]);
  });

  it("all() still surfaces displayed items (Gazette read)", () => {
    const q = new WorldTickerQueue();
    q.enqueue(item({ ticker_item_id: "a" }), T_NOW);
    q.markDisplayed("a");
    expect(q.all().map((it) => it.ticker_item_id)).toEqual(["a"]);
  });

  it("markDisplayed is idempotent and ignores unknown ids", () => {
    const q = new WorldTickerQueue();
    q.enqueue(item({ ticker_item_id: "a" }), T_NOW);
    q.markDisplayed("a", "a", "unknown");
    expect(q.visible(T_NOW)).toHaveLength(0);
    expect(q.size).toBe(1);
  });

  it("hydrate restores items and re-derives seenIds", () => {
    const q = new WorldTickerQueue();
    q.hydrate([item({ ticker_item_id: "a" }), item({ ticker_item_id: "b" })]);
    expect(q.size).toBe(2);
    expect(q.enqueue(item({ ticker_item_id: "a" }), T_NOW).enqueued).toBe(false);
  });
});

describe("WorldTicker — DOM render", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a marquee bar with the elsewhere label", () => {
    const bar = createWorldTicker({ items: [] });
    expect(bar.dataset.testid).toBe("world-ticker");
    expect(bar.getAttribute("role")).toBe("marquee");
    expect(bar.querySelector(".world-ticker-label")?.textContent).toBe("— ELSEWHERE");
  });

  it("empty state surfaces an explicit 'the world is quiet' marker", () => {
    const bar = createWorldTicker({ items: [] });
    expect(bar.querySelector('[data-testid="world-ticker-empty"]')?.textContent).toBe(
      "— the world is quiet —",
    );
  });

  it("renders one item element per ticker item, preserving order", () => {
    const items: WorldPulseTickerItem[] = [
      item({ ticker_item_id: "a", summary_text: "first" }),
      item({ ticker_item_id: "b", summary_text: "second" }),
    ];
    const bar = createWorldTicker({ items });
    const els = bar.querySelectorAll(".world-ticker-item");
    expect(els).toHaveLength(2);
    expect((els[0] as HTMLElement).dataset.tickerItemId).toBe("a");
    expect((els[1] as HTMLElement).dataset.tickerItemId).toBe("b");
  });

  it("class label uses the schema enum 4-letter code", () => {
    const bar = createWorldTicker({
      items: [
        item({ ticker_class: "rumor" }),
        item({ ticker_item_id: "tkr_2", ticker_class: "rite" }),
      ],
    });
    const srcs = Array.from(bar.querySelectorAll(".world-ticker-src")).map((el) => el.textContent);
    expect(srcs).toEqual(["RMR", "RIT"]);
  });

  it("fires onItemSurfaced for every item it renders", () => {
    const surfaced: string[] = [];
    createWorldTicker({
      items: [
        item({ ticker_item_id: "a" }),
        item({ ticker_item_id: "b" }),
      ],
      onItemSurfaced: (id) => surfaced.push(id),
    });
    expect(surfaced).toEqual(["a", "b"]);
  });

  it("click on an item fires onExpand with the full ticker payload", () => {
    const expanded: WorldPulseTickerItem[] = [];
    const bar = createWorldTicker({
      items: [item({ ticker_item_id: "a" })],
      onExpand: (it) => expanded.push(it),
    });
    (bar.querySelector(".world-ticker-item") as HTMLElement).click();
    expect(expanded).toHaveLength(1);
    expect(expanded[0].ticker_item_id).toBe("a");
  });

  it("reduced-motion → adds controls + data flag, no marquee animation", () => {
    const bar = createWorldTicker({
      items: [item({ ticker_item_id: "a" })],
      reducedMotion: true,
    });
    expect(bar.dataset.reducedMotion).toBe("true");
    expect(bar.querySelector('[data-testid="world-ticker-controls"]')).not.toBeNull();
    expect(bar.querySelector(".world-ticker-prev")?.getAttribute("aria-label")).toBe("Previous ticker item");
  });

  it("default motion mode does NOT render controls", () => {
    const bar = createWorldTicker({
      items: [item({ ticker_item_id: "a" })],
      reducedMotion: false,
    });
    expect(bar.querySelector('[data-testid="world-ticker-controls"]')).toBeNull();
  });

  it("integrates cleanly with the queue: only visible() items render", () => {
    const q = new WorldTickerQueue();
    q.enqueue(item({ ticker_item_id: "a" }), T_NOW);
    q.enqueue(item({ ticker_item_id: "b" }), T_NOW);
    q.markDisplayed("a");
    const bar = createWorldTicker({ items: q.visible(T_NOW) });
    const els = Array.from(bar.querySelectorAll(".world-ticker-item")) as HTMLElement[];
    expect(els.map((el) => el.dataset.tickerItemId)).toEqual(["b"]);
  });
});
