/**
 * @first-perception/opex — barrel export.
 * Phase 21 / Wave K. Daily-cap + per-session-budget + opex_event ledger.
 */
export {
  getDailySpend,
  bumpDailySpend,
  isOverSoftCap,
  getSessionBudget,
  bumpSessionTokens,
  isSessionOverBudget,
} from "./OpexState.js";

export type { OpexStateRow, SessionBudgetRow } from "./OpexState.js";

export {
  recordOpexEvent,
} from "./OpexEvent.js";

export type {
  AgentId,
  Tier,
  FallbackReason,
  OpexEventInput,
} from "./OpexEvent.js";
