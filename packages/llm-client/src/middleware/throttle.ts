/**
 * Phase 21 / OPS-506 — Throttle middleware.
 *
 * The one entry point for all LLM calls in the system. Replaces direct
 * AnthropicClient/KimiClient.call() invocations throughout the codebase.
 *
 * Flow:
 *   1. TierRouter.selectModel(agent, sessionId) → ModelSelection
 *   2. For each model in fallback_chain:
 *      a. Get client via ClientRegistry
 *      b. Invoke client.call()
 *      c. On success: bumpDailySpend + bumpSessionTokens + recordOpexEvent → return
 *      d. On retryable failure: log, try next in chain
 *      e. On non-retryable failure: log, return graceful error
 *   3. If chain exhausted: return canned "the world pauses..." narration
 *
 * This is the integration seam. Existing agents (Narrator, validators,
 * Form-of-Ending) update their call sites to invoke this instead of the
 * raw client. ~5-10 call sites total across the codebase.
 */
import { selectModel, isInFallbackMode } from "../router/TierRouter.js";
import { estimateCost } from "../router/CostEstimator.js";
import { getClientForModel } from "../clients/ClientRegistry.js";
import { LLMClientError } from "../clients/types.js";
import type { LLMRequest, LLMResponse } from "../clients/types.js";
import {
  bumpDailySpend,
  bumpSessionTokens,
  recordOpexEvent,
  getDailySpend,
  getSessionBudget,
} from "@first-perception/opex";
import type { AgentId, Tier, FallbackReason } from "@first-perception/opex";

export interface CallContext {
  agent: AgentId;
  session_id?: string;
  /** Override the auto-selected tier policy (use sparingly — testing/debug only). */
  force_model_id?: string;
}

export interface ThrottledLLMResponse extends LLMResponse {
  /** Which tier was actually used after router decision. */
  effective_tier: Tier;
  /** Reason for tier choice (default / cap hit / budget exhausted / etc.). */
  selection_reason: FallbackReason;
  /** Whether we fell back from primary to secondary/tertiary. */
  fell_back_from_primary: boolean;
  /** Daily spend BEFORE this call (for diagnostics). */
  daily_spend_before_usd: number;
  /**
   * When the fallback chain is exhausted (model_id="graceful_fallback"),
   * this surfaces the last attempt's error message + the chain attempted.
   * Aids in distinguishing missing-key vs invalid-key vs upstream-503
   * without needing access to the opex_event ledger. Undefined on success.
   */
  diagnostics?: {
    last_error?: string;
    last_error_kind?: string;
    chain_attempted: string[];
  };
}

const GRACEFUL_NARRATION_FALLBACK = (
  "The world pauses, as though listening for something that does not arrive. " +
  "Try again in a moment."
);

/**
 * The one entry point for all LLM calls. Pass the agent identity so the
 * router can apply tier policy. Pass session_id for per-session budget tracking.
 */
export async function callLLM(
  ctx: CallContext,
  req: Omit<LLMRequest, "model_id">,
): Promise<ThrottledLLMResponse> {
  const startedAt = Date.now();

  // Pre-call: lazy-init state rows so concurrent UPDATEs have something to write
  const dailyState = await getDailySpend(5.0 /* fallback if config missing */);
  const dailySpendBefore = dailyState.daily_spend_usd;
  if (ctx.session_id) {
    await getSessionBudget(ctx.session_id, 250_000);
  }

  // Route
  const selection = ctx.force_model_id
    ? { primary_model_id: ctx.force_model_id, fallback_chain: [ctx.force_model_id], effective_tier: "cheap" as Tier, default_tier: "cheap" as Tier, reason: "manual_override" as FallbackReason, policy_version: "manual" }
    : await selectModel(ctx.agent, ctx.session_id);

  let lastError: unknown = null;

  for (let attempt = 0; attempt < selection.fallback_chain.length; attempt++) {
    const modelId = selection.fallback_chain[attempt];
    const isFallback = attempt > 0;
    const fallbackReason: FallbackReason = isFallback
      ? "primary_failure"
      : selection.reason;

    try {
      const client = getClientForModel(modelId);
      const result = await client.call({ ...req, model_id: modelId });
      const latencyMs = Date.now() - startedAt;

      // Cost + budget bookkeeping
      const estCost = estimateCost(result.tokens_in, result.tokens_out, modelId);
      const totalTokens = result.tokens_in + result.tokens_out;

      // Fire-and-await in parallel — independent.
      await Promise.all([
        bumpDailySpend(estCost),
        ctx.session_id ? bumpSessionTokens(ctx.session_id, totalTokens) : Promise.resolve(),
        recordOpexEvent({
          agent: ctx.agent,
          model_id: modelId,
          tier: selection.effective_tier,
          tokens_in: result.tokens_in,
          tokens_out: result.tokens_out,
          est_cost_usd: estCost,
          fallback_reason: fallbackReason,
          success: true,
          session_id: ctx.session_id ?? null,
          latency_ms: latencyMs,
        }),
      ]);

      return {
        ...result,
        effective_tier: selection.effective_tier,
        selection_reason: selection.reason,
        fell_back_from_primary: isFallback,
        daily_spend_before_usd: dailySpendBefore,
      };
    } catch (err) {
      lastError = err;
      const isRetryable = err instanceof LLMClientError && err.retryable;
      const latencyMs = Date.now() - startedAt;

      // Record the failed attempt regardless
      await recordOpexEvent({
        agent: ctx.agent,
        model_id: modelId,
        tier: selection.effective_tier,
        tokens_in: 0,
        tokens_out: 0,
        est_cost_usd: 0,
        fallback_reason: fallbackReason,
        success: false,
        error_kind: err instanceof Error ? err.constructor.name : "unknown",
        session_id: ctx.session_id ?? null,
        latency_ms: latencyMs,
      });

      if (!isRetryable) {
        // Non-retryable: still try next in chain (e.g., auth fail on one provider, try another)
        console.warn(`[throttle] ${ctx.agent} call to ${modelId} failed (non-retryable):`, err);
      }
      // Continue to next model in chain
    }
  }

  // All fallbacks exhausted — return graceful canned narration so player UX doesn't crash.
  console.error(`[throttle] All ${selection.fallback_chain.length} fallback attempts failed for agent ${ctx.agent}. Last error:`, lastError);

  const lastErrorMessage =
    lastError instanceof Error ? lastError.message : String(lastError ?? "unknown");
  const lastErrorKind =
    lastError instanceof Error ? lastError.constructor.name : "unknown";

  return {
    content: GRACEFUL_NARRATION_FALLBACK,
    model_id: "graceful_fallback",
    tokens_in: 0,
    tokens_out: 0,
    finish_reason: "error",
    effective_tier: selection.effective_tier,
    selection_reason: selection.reason,
    fell_back_from_primary: true,
    daily_spend_before_usd: dailySpendBefore,
    diagnostics: {
      last_error: lastErrorMessage.slice(0, 500),
      last_error_kind: lastErrorKind,
      chain_attempted: [...selection.fallback_chain],
    },
  };
}

/**
 * Quick check used by World Pulse "lean mode" badge.
 */
export async function isLeanMode(): Promise<boolean> {
  return isInFallbackMode();
}
