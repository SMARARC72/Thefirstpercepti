/**
 * Phase 21 / OPS-502 — Per-LLM-call ledger writer.
 *
 * Every callLLM invocation produces one opex_event row. Append-only.
 * Used by FinOps queries (cost-per-day, cost-per-agent, fallback rate).
 *
 * Failure discipline: writes are best-effort. Postgres failure here MUST NOT
 * throw — the LLM call already succeeded; we just lost a ledger entry.
 */
import { sql } from "./db.js";
import { randomUUID } from "node:crypto";

export type AgentId =
  | "narrator"
  | "state_manager"
  | "validator_input"
  | "validator_rules"
  | "validator_consistency"
  | "validator_progression"
  | "validator_contradiction"
  | "validator_boundary"
  | "form_of_ending"
  | "postcard"
  | "voice_evaluator"
  | "other";

export type Tier = "premium" | "mid" | "cheap";

export type FallbackReason =
  | "daily_cap_hit"
  | "session_budget_exhausted"
  | "primary_failure"
  | "manual_override"
  | "tier_policy_default"
  | null;

export interface OpexEventInput {
  agent: AgentId;
  model_id: string;
  tier: Tier;
  tokens_in: number;
  tokens_out: number;
  est_cost_usd: number;
  fallback_reason?: FallbackReason;
  success: boolean;
  error_kind?: string | null;
  session_id?: string | null;
  latency_ms?: number;
}

/**
 * Write one opex_event row. Returns event_id (UUID).
 * Failures here MUST NOT throw — log and continue.
 */
export async function recordOpexEvent(input: OpexEventInput): Promise<string> {
  const eventId = randomUUID();
  try {
    await sql`
      INSERT INTO opex_event (
        event_id, agent, model_id, tier,
        tokens_in, tokens_out, est_cost_usd,
        fallback_reason, success, error_kind,
        session_id, latency_ms
      ) VALUES (
        ${eventId}, ${input.agent}, ${input.model_id}, ${input.tier},
        ${input.tokens_in}, ${input.tokens_out}, ${input.est_cost_usd},
        ${input.fallback_reason ?? null}, ${input.success}, ${input.error_kind ?? null},
        ${input.session_id ?? null}, ${input.latency_ms ?? null}
      )
    `;
  } catch (err) {
    console.warn("[opex] failed to record event:", err);
  }
  return eventId;
}
