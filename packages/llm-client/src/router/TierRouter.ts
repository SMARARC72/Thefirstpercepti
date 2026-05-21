/**
 * Phase 21 / OPS-503 — Tier router.
 *
 * For each agent call:
 *  1. Look up agent's default tier from tier_policy.json
 *  2. Check daily cap: if over soft-cap, demote tier by one step
 *  3. Check per-session budget: if over, demote tier by one step
 *  4. Walk the tier's fallback chain in order
 *  5. Return ModelSelection{ model_id, tier, reason, fallback_chain }
 *
 * Caller invokes models in order until one succeeds (handled by throttle
 * middleware). This module is pure — no I/O for routing decision except
 * Postgres reads for cap/budget checks.
 */
import { isOverSoftCap, isSessionOverBudget } from "@first-perception/opex";
import type { AgentId, Tier, FallbackReason } from "@first-perception/opex";
import policyJson from "../../config/tier_policy.json" with { type: "json" };

interface TierPolicy {
  policy_id: string;
  version: string;
  daily_cap_usd: number;
  per_session_token_budget: number;
  max_fallback_attempts: number;
  cap_buffer_pct: number;
  agent_tiers: Record<string, Tier>;
  fallback_chains: Record<Tier, string[]>;
}

const policy = policyJson as TierPolicy;

export interface ModelSelection {
  primary_model_id: string;
  fallback_chain: string[];
  effective_tier: Tier;
  default_tier: Tier;
  reason: FallbackReason;
  policy_version: string;
}

function demoteTier(t: Tier): Tier {
  if (t === "premium") return "mid";
  if (t === "mid") return "cheap";
  return "cheap";
}

export async function selectModel(
  agent: AgentId,
  sessionId?: string,
): Promise<ModelSelection> {
  const defaultTier: Tier = policy.agent_tiers[agent] ?? "cheap";
  let effectiveTier: Tier = defaultTier;
  let reason: FallbackReason = "tier_policy_default";

  // Check daily cap — only demote if we'd otherwise go premium.
  if (defaultTier === "premium") {
    const overDaily = await isOverSoftCap(policy.daily_cap_usd, policy.cap_buffer_pct);
    if (overDaily) {
      effectiveTier = demoteTier(effectiveTier);
      reason = "daily_cap_hit";
    }
  }

  // Check per-session budget — applies to any tier.
  if (sessionId) {
    const overSession = await isSessionOverBudget(sessionId, policy.per_session_token_budget);
    if (overSession && effectiveTier !== "cheap") {
      effectiveTier = demoteTier(effectiveTier);
      // Only overwrite reason if we hadn't already demoted from cap
      if (reason === "tier_policy_default") {
        reason = "session_budget_exhausted";
      }
    }
  }

  const chain = policy.fallback_chains[effectiveTier];
  if (!chain || chain.length === 0) {
    throw new Error(`No fallback chain configured for tier "${effectiveTier}"`);
  }

  return {
    primary_model_id: chain[0],
    fallback_chain: chain.slice(0, policy.max_fallback_attempts),
    effective_tier: effectiveTier,
    default_tier: defaultTier,
    reason,
    policy_version: policy.version,
  };
}

export function getPolicy(): Readonly<TierPolicy> {
  return policy;
}

/**
 * Whether the global system is currently in fallback mode (daily cap hit).
 * Cheap-to-call — used by World Pulse "lean mode" badge in apps/web.
 */
export async function isInFallbackMode(): Promise<boolean> {
  return isOverSoftCap(policy.daily_cap_usd, policy.cap_buffer_pct);
}
