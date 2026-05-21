-- Phase 21 / OPS-501 + OPS-502: opex throttle tables on Vercel Postgres.
-- Run once per environment. Idempotent (IF NOT EXISTS).

-- Daily cumulative spend. Primary key is the UTC date.
-- Lazy reset: on first read of a new date, an UPSERT creates the row at 0.
CREATE TABLE IF NOT EXISTS opex_state (
  utc_date          DATE         PRIMARY KEY,
  daily_spend_usd   NUMERIC(10,4) NOT NULL DEFAULT 0,
  daily_cap_usd     NUMERIC(10,4) NOT NULL,
  last_updated      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Per-session token budget tracking. Lives alongside game session state.
CREATE TABLE IF NOT EXISTS opex_session_budget (
  session_id        TEXT         PRIMARY KEY,
  tokens_consumed   INTEGER      NOT NULL DEFAULT 0,
  tokens_budget     INTEGER      NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_updated      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Per-LLM-call ledger. Append-only. One row per LLM invocation.
-- Indexed by date + agent for cost-analysis queries.
CREATE TABLE IF NOT EXISTS opex_event (
  event_id          TEXT         PRIMARY KEY,
  timestamp         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  agent             TEXT         NOT NULL,
  model_id          TEXT         NOT NULL,
  tier              TEXT         NOT NULL CHECK (tier IN ('premium','mid','cheap')),
  tokens_in         INTEGER      NOT NULL,
  tokens_out        INTEGER      NOT NULL,
  est_cost_usd      NUMERIC(10,6) NOT NULL,
  fallback_reason   TEXT         NULL,
  success           BOOLEAN      NOT NULL,
  error_kind        TEXT         NULL,
  session_id        TEXT         NULL,
  latency_ms        INTEGER      NULL
);

CREATE INDEX IF NOT EXISTS opex_event_date_agent_idx
  ON opex_event (DATE(timestamp), agent);

CREATE INDEX IF NOT EXISTS opex_event_session_idx
  ON opex_event (session_id) WHERE session_id IS NOT NULL;

-- Optional cleanup: drop session budgets older than 7 days.
-- Run via cron or manually. Not required for correctness.
-- DELETE FROM opex_session_budget WHERE created_at < NOW() - INTERVAL '7 days';
