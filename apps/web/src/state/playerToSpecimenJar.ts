/**
 * Phase 22.6 / WIRING-401 — derive a SpecimenJarState from the runtime Player.
 *
 * The Phase 19 MetersBlock schema (fatigue/clarity/debt/notice/corruption) is
 * spec'd but the runtime Player object in apps/web/src has not yet had those
 * fields plumbed. Until it does, this selector reconstructs what it can from
 * what already exists in state:
 *
 *   - conditions   → passed through as typeIds; a few notice-ladder typeIds
 *                    also lift `notice` to the matching rung so the lantern
 *                    halo lights up the moment a rung condition is appended.
 *   - corruption   → 0 (runtime has stats.ruin but no documented 0..10 map)
 *   - fatigue      → derived from hp deficit so a wounded character looks
 *                    visibly tired (≥70% missing hp → fatigued threshold)
 *   - clarity      → defaults to 5 (mid-band; no edge tint)
 *   - debt         → 0
 *
 * When the meter system lands, swap this for a direct `player.meters` read.
 */
import type { Player } from "@first-perception/types";
import type { CharacterMeters, SpecimenJarState } from "../components/SpecimenJar.js";

const NOTICE_LADDER_CONDITION_RUNG: Record<string, number> = {
  marked_by_attention: 7,
  recognized_but_not_yet_named: 8,
  named_by_not_yet_named: 9,
  convergence_pending: 10,
};

function deriveNoticeFromConditions(conditionTypeIds: string[]): number {
  let max = 0;
  for (const id of conditionTypeIds) {
    const rung = NOTICE_LADDER_CONDITION_RUNG[id];
    if (rung && rung > max) max = rung;
  }
  return max;
}

function deriveFatigueFromHp(hp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  const missingRatio = 1 - hp / maxHp;
  if (missingRatio >= 0.7) return 7;
  if (missingRatio >= 0.5) return 5;
  return 0;
}

export function playerToSpecimenJarState(player: Player): SpecimenJarState {
  const conditionTypeIds = (player.conditions ?? []).map((c) => c.typeId);
  const meters: CharacterMeters = {
    corruption: 0,
    fatigue: deriveFatigueFromHp(player.hp, player.maxHp),
    notice: deriveNoticeFromConditions(conditionTypeIds),
    clarity: 5,
    debt: 0,
  };
  return {
    characterId: player.id,
    characterName: player.name,
    meters,
    conditions: conditionTypeIds,
  };
}
