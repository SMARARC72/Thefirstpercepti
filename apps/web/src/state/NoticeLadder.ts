/**
 * ============================================================================
 * NOTICE LADDER — UI-403 state machine
 * ============================================================================
 * Phase 20 / Wave J / UI-403. Wireframe sources: NOTICE_07/08/09/10.html.
 * Scene sources: Phase 18 content/narrative/scenes/notice_07..10.ink + x12_apotheosis.ink.
 *
 * The Notice Ladder is a four-rung escalation triggered when Notice crosses
 * each integer threshold from 7 to 10. Per R-82 (Notice Ladder spec):
 *   - 7   murmur — faction asks after you (notice_07_murmur)
 *   - 8   acknowledgment — NPC names that you are named (notice_08_acknowledgment)
 *   - 9   confrontation — Bell Court intercepts (notice_09_confrontation)
 *   - 10  convergence — multi-faction (notice_10_convergence)
 *
 * Convergence routing — the load-bearing rule per HANDOFF.md and notice_10.ink:
 *
 *   if Authority >= 9 at rung 10 → x12_apotheosis (the Form-of-Ending)
 *
 * Recovery: Notice can drop, but the conditions acquired at each rung do NOT
 * automatically remove with the meter. Per the Phase 19 condition shape,
 * conditions persist until a canon-event-absolution removes them.
 *
 * This file owns the PURE state machine: rung transitions, condition fires,
 * scene routing decisions. NoticeBanner.ts owns the DOM banner.
 * ============================================================================
 */

export const NOTICE_LADDER_RUNGS = [7, 8, 9, 10] as const;
export type NoticeRung = (typeof NOTICE_LADDER_RUNGS)[number];

export const NOTICE_LADDER_SCENES: Record<NoticeRung, string> = {
  7: "notice_07_murmur",
  8: "notice_08_acknowledgment",
  9: "notice_09_confrontation",
  10: "notice_10_convergence",
};

/**
 * Conditions appended when the corresponding rung is crossed (going up).
 * Mirrors NOTICE_07 wireframe approach A "condition acquired" and the .ink
 * scene `add_journal_entry` content.
 */
export const NOTICE_LADDER_CONDITIONS: Record<NoticeRung, string> = {
  7: "marked_by_attention",
  8: "recognized_but_not_yet_named",
  9: "named_by_not_yet_named",
  10: "convergence_pending",
};

/** Display label for the rung — shown in the banner header. */
export const NOTICE_LADDER_TITLES: Record<NoticeRung, string> = {
  7: "Marked",
  8: "Acknowledgment",
  9: "Confrontation",
  10: "Convergence",
};

/**
 * Authority threshold above which rung-10 convergence routes to x12_apotheosis
 * instead of the standard convergence choices. Locked at 9 by Phase 18
 * notice_10.ink:25 and HANDOFF.md UI-403.
 */
export const AUTHORITY_APOTHEOSIS_THRESHOLD = 9;

export type LadderEventKind =
  | "rung_entered"
  | "condition_appended"
  | "scene_routed"
  | "apotheosis_routed";

export interface LadderEvent {
  kind: LadderEventKind;
  rung: NoticeRung;
  /** Scene id (e.g. "notice_08_acknowledgment" or "x12_apotheosis"). */
  scene?: string;
  /** Condition id (e.g. "marked_by_attention"). */
  condition?: string;
}

export interface NoticeLadderState {
  /** Current notice meter value, 0..10. */
  notice: number;
  /** Current authority meter value, 0..10. */
  authority: number;
  /** Highest rung ever entered. Even if notice drops, this stays — rungs are
   *  one-way (the conditions persist; the ladder has been climbed). */
  highestRungEntered: NoticeRung | 0;
}

export interface TransitionInput {
  previousNotice: number;
  nextNotice: number;
  authority: number;
  /** Previously-recorded highest rung. Pass 0 if first turn. */
  highestRungEntered: NoticeRung | 0;
}

export interface TransitionResult {
  /** Events to apply to the game state, in order. */
  events: LadderEvent[];
  /** Conditions to append to the player (deduped). */
  conditionsAppended: string[];
  /** Scene to route to next (last scene wins if multiple rungs cross at once). */
  sceneRouted: string | null;
  /** Whether the convergence routed to x12_apotheosis. */
  apotheosis: boolean;
  /** Updated state — caller should persist. */
  nextState: NoticeLadderState;
}

/**
 * Pure transition. Caller passes the meter delta + authority + last-known
 * highest rung; returns the events fired, conditions to append, and the
 * scene to route to. No mutation of input.
 *
 * Multi-rung crossings: if Notice jumps from 6 → 9 in one turn, the ladder
 * fires rungs 7, 8, and 9 in order. Each rung emits its events and
 * condition; the routed scene is the highest rung's scene (the player can't
 * be in two scenes at once; the most-recent rung wins).
 *
 * Notice decreasing: no rungs fire, no scenes route. The highestRungEntered
 * field stays — conditions persist regardless of meter recovery.
 */
export function transitionNoticeLadder(input: TransitionInput): TransitionResult {
  const events: LadderEvent[] = [];
  const conditionsAppended: string[] = [];
  let sceneRouted: string | null = null;
  let apotheosis = false;

  let highestSoFar: NoticeRung | 0 = input.highestRungEntered;

  // Notice only goes UP through the ladder. Decreases don't fire rungs.
  if (input.nextNotice <= input.previousNotice) {
    return {
      events,
      conditionsAppended,
      sceneRouted,
      apotheosis,
      nextState: {
        notice: input.nextNotice,
        authority: input.authority,
        highestRungEntered: highestSoFar,
      },
    };
  }

  for (const rung of NOTICE_LADDER_RUNGS) {
    const justCrossed = input.previousNotice < rung && input.nextNotice >= rung;
    const alreadyEntered = highestSoFar >= rung;
    if (!justCrossed || alreadyEntered) continue;

    highestSoFar = rung;
    events.push({ kind: "rung_entered", rung });
    const condition = NOTICE_LADDER_CONDITIONS[rung];
    events.push({ kind: "condition_appended", rung, condition });
    conditionsAppended.push(condition);

    // Convergence at rung 10 with Authority high enough → apotheosis route.
    // Per notice_10.ink:25 the player still has agency ("Speak the name
    // yourself"), so we route them to x12_apotheosis instead of the standard
    // convergence node.
    if (rung === 10 && input.authority >= AUTHORITY_APOTHEOSIS_THRESHOLD) {
      sceneRouted = "x12_apotheosis";
      apotheosis = true;
      events.push({ kind: "apotheosis_routed", rung, scene: "x12_apotheosis" });
    } else {
      sceneRouted = NOTICE_LADDER_SCENES[rung];
      events.push({ kind: "scene_routed", rung, scene: sceneRouted });
    }
  }

  return {
    events,
    conditionsAppended,
    sceneRouted,
    apotheosis,
    nextState: {
      notice: input.nextNotice,
      authority: input.authority,
      highestRungEntered: highestSoFar,
    },
  };
}

/**
 * Compose a banner-ready summary for a rung. Used by NoticeBanner.ts to
 * generate the italic prose block (NOTICE_07 wireframe lines 185-187). Pure
 * function — same input always returns the same output.
 */
export function rungBannerCopy(rung: NoticeRung): { title: string; condition: string; copy: string } {
  const title = NOTICE_LADDER_TITLES[rung];
  const condition = NOTICE_LADDER_CONDITIONS[rung];
  const copy = NOTICE_BANNER_COPY[rung];
  return { title, condition, copy };
}

const NOTICE_BANNER_COPY: Record<NoticeRung, string> = {
  7:
    "Salt-rime appears on your hands. Disadvantage on Stealth vs Bell Court and Drowned Church. " +
    "Decay possible at long rest if Notice falls to 6.",
  8:
    "An initiate has named that you have been named. The Marrow-Saint has been told. " +
    "Recognized-but-not-yet-named persists until canon-event-absolution.",
  9:
    "The Bell Court has accumulated a contradiction in your name beyond civic tolerance. " +
    "A summons is coming by the seventh bell.",
  10:
    "The Drowned Church, the Bell Court, and the Tide League converge in the same room. " +
    "Each addresses you. None addresses the others.",
};
