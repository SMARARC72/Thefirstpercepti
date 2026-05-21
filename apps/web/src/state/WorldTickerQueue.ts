/**
 * ============================================================================
 * WORLD TICKER QUEUE — UI-402 model layer
 * ============================================================================
 * Phase 20 / Wave J / UI-402. Wireframe source: WORLD_TICKER.html (approach B
 * "Crawl · Above the Scene"). Schema source: schema_pack_v0.6.json $defs
 * `world_pulse_ticker_item` (lines 1046-1079).
 *
 * Responsibility split:
 *   - This file owns the QUEUE (FIFO + expiry sweep + displayed_to_player
 *     gating). Pure data, no DOM. Easy to test in isolation.
 *   - WorldTicker.ts (sibling) owns the DOM render and animation.
 *
 * Schema fields surfaced (verbatim from v0.6 $def):
 *   - ticker_item_id     stable id
 *   - source_event_id    pointer back to the canon event that spawned it
 *   - summary_text       ≤ 80 chars; displayed text
 *   - ticker_class       faction_action | rumor | weather | rite | canon_event
 *   - expires_at         ISO datetime
 *   - displayed_to_player    write-back marker; once true, we don't re-surface
 *
 * The $def isn't promoted to a top-level schema in v0.6 (per Phase 19), so
 * generated.ts doesn't emit a TypeScript interface for it. We mirror the
 * shape here as a hand-authored interface — when v0.7 promotes it to a
 * top-level entity (likely Phase 21 / Wave K), replace this with the
 * generated import.
 * ============================================================================
 */

export type TickerClass = "faction_action" | "rumor" | "weather" | "rite" | "canon_event";

export interface WorldPulseTickerItem {
  ticker_item_id: string;
  source_event_id: string;
  /** ≤ 80 chars per schema. Enforced at enqueue time. */
  summary_text: string;
  ticker_class: TickerClass;
  /** ISO-8601 timestamp; items past this are swept on the next tick. */
  expires_at: string;
  /** Set to true once the consumer (UI) has shown the item to the player.
   *  Items already marked true are filtered out of `visible()`. */
  displayed_to_player?: boolean;
}

export interface EnqueueResult {
  enqueued: boolean;
  reason?: "duplicate_id" | "summary_too_long" | "expired_on_arrival";
}

/**
 * Pure FIFO ticker queue with expiry sweep and displayed_to_player gating.
 * Order semantics: items dequeue in the order they were enqueued (insertion
 * order). The wireframe shows time-ordered display ("BELL · 04:11 …
 * CHURCH · 03:30 …") but the time prefix is part of the summary_text — the
 * queue itself is insertion-ordered. The World Director is responsible for
 * sorting on the way in if it wants a different order.
 *
 * Why a class and not a free function: state lives across turns; the queue
 * is owned by the App's runtime store (apps/web/src/main.ts). One instance
 * per game session.
 */
export class WorldTickerQueue {
  /** Insertion-ordered. Use an array for O(1) push and clear iteration order. */
  private items: WorldPulseTickerItem[] = [];

  /** Defensive dedupe — the World Director shouldn't emit two items with the
   *  same ticker_item_id, but Phase 16 validators don't enforce this and
   *  swallowing the second is friendlier than throwing in a tight loop. */
  private seenIds = new Set<string>();

  /** Optional cap on simultaneous items. Once exceeded, the oldest are
   *  evicted (FIFO) regardless of expiry. Keeps the queue bounded against
   *  a runaway World Director. Default 32; the wireframe shows ≤ 6 items
   *  in the visible crawl at any time. */
  constructor(public readonly maxSize = 32) {}

  /**
   * Add a ticker item. Idempotent on ticker_item_id. Validates summary_text
   * length (schema cap 80) and expiry. Returns an EnqueueResult so the
   * caller can log rejections without crashing the turn.
   */
  enqueue(item: WorldPulseTickerItem, nowIso: string = new Date().toISOString()): EnqueueResult {
    if (this.seenIds.has(item.ticker_item_id)) {
      return { enqueued: false, reason: "duplicate_id" };
    }
    if (item.summary_text.length > 80) {
      return { enqueued: false, reason: "summary_too_long" };
    }
    if (item.expires_at <= nowIso) {
      return { enqueued: false, reason: "expired_on_arrival" };
    }
    this.items.push({ ...item });
    this.seenIds.add(item.ticker_item_id);
    // Bound the queue. Evict from the front (FIFO). Note: evicted items are
    // forgotten — they will NOT trip duplicate-id on re-enqueue, which is
    // intentional (long-running sessions can have far more than 32 unique
    // ticker items over their lifetime).
    while (this.items.length > this.maxSize) {
      const evicted = this.items.shift();
      if (evicted) this.seenIds.delete(evicted.ticker_item_id);
    }
    return { enqueued: true };
  }

  /**
   * Drop expired items. Call once per turn (or once per wall-clock tick if
   * the consumer is wall-clock-driven). Returns the number swept.
   */
  sweepExpired(nowIso: string = new Date().toISOString()): number {
    const before = this.items.length;
    const kept: WorldPulseTickerItem[] = [];
    for (const item of this.items) {
      // An item is expired only when `now` has strictly passed `expires_at`;
      // an item at its exact expiry boundary is still valid this turn.
      if (item.expires_at >= nowIso) {
        kept.push(item);
      } else {
        this.seenIds.delete(item.ticker_item_id);
      }
    }
    this.items = kept;
    return before - this.items.length;
  }

  /**
   * The list the UI should render. Excludes expired items (idempotent —
   * does NOT mutate) and excludes items already marked displayed_to_player.
   * Wireframe approach B: the crawl shows only what hasn't been seen.
   * Approach A (gazette, at long rest) reads ALL items via `all()`.
   */
  visible(nowIso: string = new Date().toISOString()): WorldPulseTickerItem[] {
    return this.items.filter(
      (it) => it.expires_at > nowIso && !it.displayed_to_player,
    );
  }

  /**
   * All items still in the queue, regardless of displayed_to_player or
   * expiry. Used by the daily Gazette compose (wireframe approach A) which
   * surfaces seen items intentionally as "what the world chose to remember".
   */
  all(): readonly WorldPulseTickerItem[] {
    return this.items;
  }

  /**
   * Mark items as shown to the player. Idempotent. The wireframe explicitly
   * separates "appeared in the crawl" (markDisplayed) from "expired"
   * (sweepExpired) — both filter `visible()` but for different reasons.
   */
  markDisplayed(...ticker_item_ids: string[]): void {
    const set = new Set(ticker_item_ids);
    for (const item of this.items) {
      if (set.has(item.ticker_item_id)) item.displayed_to_player = true;
    }
  }

  /** For tests + persistence — restore state from a serialized snapshot. */
  hydrate(items: WorldPulseTickerItem[]): void {
    this.items = items.map((it) => ({ ...it }));
    this.seenIds = new Set(this.items.map((it) => it.ticker_item_id));
  }

  /** Clear everything. Used on game end / new run. */
  clear(): void {
    this.items = [];
    this.seenIds.clear();
  }

  get size(): number {
    return this.items.length;
  }
}
