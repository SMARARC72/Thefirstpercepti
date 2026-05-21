/**
 * Phase 22.6 / WIRING-403 — derive a NoticeBanner-ready slice from game state.
 *
 * The runtime engine doesn't yet emit a dedicated `notice` meter. Until it
 * does, we read the highest notice-ladder condition the player carries and
 * use that as both the current notice value and the rung. Returns null when
 * no rung condition is active (notice < 7) so the caller can simply omit
 * the banner.
 *
 * Authority is also a future-meter; we read it from the player's CoreStat
 * `authority` (already exists in the runtime Stats block) clamped to 0..10.
 */
import type { GameState } from "@first-perception/types";
import type { FactionAwareness } from "../components/NoticeBanner.js";
import type { NoticeRung } from "./NoticeLadder.js";

const CONDITION_TO_RUNG: Record<string, NoticeRung> = {
  marked_by_attention: 7,
  recognized_but_not_yet_named: 8,
  named_by_not_yet_named: 9,
  convergence_pending: 10,
};

export interface NoticeBannerSlice {
  rung: NoticeRung;
  notice: number;
  authority: number;
  factions: FactionAwareness[];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function deriveNoticeBannerSlice(game: GameState): NoticeBannerSlice | null {
  let rung: NoticeRung | 0 = 0;
  for (const c of game.player.conditions ?? []) {
    const r = CONDITION_TO_RUNG[c.typeId];
    if (r && r > rung) rung = r;
  }
  if (rung === 0) return null;

  // Faction awareness proxy — until the awareness ledger lands, use the
  // existing `fear` value clamped to 0..10. Sorted desc so the bar lists
  // the most-aware faction first; capped at 4 by the component itself.
  const factions: FactionAwareness[] = (game.factions ?? [])
    .map((f) => ({
      factionId: f.id,
      factionName: f.name,
      awareness: clamp(Math.round(f.fear ?? 0), 0, 10),
    }))
    .filter((f) => f.awareness > 0)
    .sort((a, b) => b.awareness - a.awareness);

  return {
    rung,
    notice: rung, // best available proxy until the meter system lands
    authority: clamp(game.player.stats?.authority ?? 0, 0, 10),
    factions,
  };
}
