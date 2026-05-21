/**
 * Phase 21 / OPS-502 — Daily-cap counter + per-session token budget.
 *
 * Backed by Supabase Postgres (via the postgres SDK pointed at POSTGRES_URL).
 * Atomic UPSERT on opex_state per UTC date. Lazy reset: first read of a new
 * date creates the row with daily_spend_usd=0.
 *
 * Race-condition discipline: Postgres UPDATE ... RETURNING is atomic across
 * concurrent Vercel function invocations. We also support a `cap_buffer_pct`
 * (default 10%) so the soft-cap fires before the hard $/day ceiling — this
 * absorbs the ~10ms window where two concurrent invocations might both read
 * "under cap" simultaneously and both proceed.
 *
 * Note: porsager's `postgres` returns arrays directly (not { rows: [...] }).
 */
import { sql } from "./db.js";

export interface OpexStateRow {
  utc_date: string;
  daily_spend_usd: number;
  daily_cap_usd: number;
}

export interface SessionBudgetRow {
  session_id: string;
  tokens_consumed: number;
  tokens_budget: number;
}

function utcDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get current daily spend; lazy-creates the row for today if missing.
 * Idempotent. Safe under concurrency.
 */
export async function getDailySpend(dailyCapUsd: number): Promise<OpexStateRow> {
  const date = utcDateToday();
  // INSERT-OR-IGNORE pattern via ON CONFLICT DO NOTHING; then SELECT.
  await sql`
    INSERT INTO opex_state (utc_date, daily_spend_usd, daily_cap_usd)
    VALUES (${date}, 0, ${dailyCapUsd})
    ON CONFLICT (utc_date) DO NOTHING
  `;
  const rows = await sql<OpexStateRow[]>`
    SELECT utc_date::text AS utc_date,
           daily_spend_usd::float8 AS daily_spend_usd,
           daily_cap_usd::float8   AS daily_cap_usd
    FROM opex_state
    WHERE utc_date = ${date}
  `;
  return rows[0];
}

/**
 * Atomic bump on daily spend counter. Returns the new total.
 * Updates last_updated. daily_cap_usd preserved (set when row created).
 */
export async function bumpDailySpend(amountUsd: number): Promise<number> {
  const date = utcDateToday();
  const rows = await sql<{ new_total: number }[]>`
    UPDATE opex_state
    SET daily_spend_usd = daily_spend_usd + ${amountUsd},
        last_updated = NOW()
    WHERE utc_date = ${date}
    RETURNING daily_spend_usd::float8 AS new_total
  `;
  if (rows.length === 0) {
    throw new Error(
      `opex_state row for ${date} missing; call getDailySpend() first to initialize`
    );
  }
  return rows[0].new_total;
}

/**
 * Check whether the soft cap is hit. Uses cap_buffer_pct (default 0.1 = 90% of cap).
 */
export async function isOverSoftCap(
  dailyCapUsd: number,
  capBufferPct: number = 0.1
): Promise<boolean> {
  const state = await getDailySpend(dailyCapUsd);
  const softCap = state.daily_cap_usd * (1 - capBufferPct);
  return state.daily_spend_usd >= softCap;
}

/**
 * Get or create per-session token budget. Lazy-creates if missing.
 */
export async function getSessionBudget(
  sessionId: string,
  defaultBudget: number
): Promise<SessionBudgetRow> {
  await sql`
    INSERT INTO opex_session_budget (session_id, tokens_consumed, tokens_budget)
    VALUES (${sessionId}, 0, ${defaultBudget})
    ON CONFLICT (session_id) DO NOTHING
  `;
  const rows = await sql<SessionBudgetRow[]>`
    SELECT session_id, tokens_consumed, tokens_budget
    FROM opex_session_budget
    WHERE session_id = ${sessionId}
  `;
  return rows[0];
}

/**
 * Bump session token consumption. Returns new total.
 */
export async function bumpSessionTokens(sessionId: string, tokens: number): Promise<number> {
  const rows = await sql<{ tokens_consumed: number }[]>`
    UPDATE opex_session_budget
    SET tokens_consumed = tokens_consumed + ${tokens},
        last_updated = NOW()
    WHERE session_id = ${sessionId}
    RETURNING tokens_consumed
  `;
  if (rows.length === 0) {
    throw new Error(
      `opex_session_budget row for ${sessionId} missing; call getSessionBudget() first`
    );
  }
  return rows[0].tokens_consumed;
}

/**
 * Whether the session is over its token budget.
 */
export async function isSessionOverBudget(
  sessionId: string,
  defaultBudget: number
): Promise<boolean> {
  const row = await getSessionBudget(sessionId, defaultBudget);
  return row.tokens_consumed >= row.tokens_budget;
}
