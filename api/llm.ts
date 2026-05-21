import type { IncomingMessage, ServerResponse } from "node:http";
import type { LLMProvider, LLMRequest, LLMResponse } from "@first-perception/llm-client";
import { callLLM } from "@first-perception/llm-client/middleware";
import { apiError, apiOk } from "@first-perception/persistence";
import { readJsonBody, withErrors } from "./_lib/repo.js";
import {
  LLMRouterUnavailable,
  normalizeModel,
  resolveFallback,
  resolvePrimary,
} from "./_lib/llm-router.js";

interface LLMRequestEnvelope {
  request?: LLMRequest;
  provider?: LLMProvider;
  /**
   * Phase 22.5 / OPS-511 — when set, the request is dispatched through the
   * Phase 21 throttle middleware (callLLM) which enforces the daily cap,
   * per-session token budget, and writes an opex_event ledger entry per call.
   * Tier (premium/mid/cheap) and model selection come from tier_policy.json
   * for the given agent; the `provider` field is ignored on this path.
   * The legacy provider-routing path below is preserved for callers that
   * haven't migrated yet (no breaking change).
   */
  agent?: string;
  session_id?: string;
  /**
   * Phase 22.6 — when set alongside `agent`, override tier-policy model
   * selection and force a specific model_id. Useful for ad-hoc smoke
   * testing of a single provider (e.g. force_model_id:"gpt-4o-mini" to
   * exercise OpenAI without putting it in any agent's tier chain).
   * Production traffic should leave this unset — let tier_policy decide.
   */
  force_model_id?: string;
}

export default withErrors(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(apiError(`Method ${req.method} not allowed`, "bad_request")));
    return;
  }

  const envelope = await readJsonBody<LLMRequestEnvelope>(req);
  if (!envelope?.request?.messages?.length) {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify(apiError("request.messages is required and must be non-empty", "bad_request")),
    );
    return;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Phase 22.5 / OPS-511 — agent-tagged path: route through throttle.
  // Daily cap, per-session budget, opex_event ledger writes.
  // ─────────────────────────────────────────────────────────────────────
  if (envelope.agent) {
    try {
      const messages = envelope.request.messages;
      const systemMsg = messages.find((m) => m.role === "system");
      const nonSystem = messages.filter((m) => m.role !== "system");
      const throttleResult = await callLLM(
        {
          agent: envelope.agent as Parameters<typeof callLLM>[0]["agent"],
          session_id: envelope.session_id,
          force_model_id: envelope.force_model_id,
        },
        {
          system: systemMsg?.content,
          messages: nonSystem.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          max_tokens: envelope.request.max_tokens,
          temperature: envelope.request.temperature,
          response_format: envelope.request.response_format ? "json_object" : "text",
        },
      );

      // callLLM never throws — it returns model_id="graceful_fallback" /
      // finish_reason="error" when the fallback chain is exhausted.
      const isGraceful = throttleResult.model_id === "graceful_fallback";
      const llmResponse: LLMResponse = {
        id: `tfp-${Date.now().toString(36)}`,
        content: throttleResult.content,
        usage: {
          prompt_tokens: throttleResult.tokens_in,
          completion_tokens: throttleResult.tokens_out,
          total_tokens: throttleResult.tokens_in + throttleResult.tokens_out,
        },
        latencyMs: 0,
      };
      res.statusCode = isGraceful ? 503 : 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.setHeader("x-llm-throttle", isGraceful ? "graceful_fallback" : "active");
      res.setHeader("x-llm-model", throttleResult.model_id);
      res.setHeader("x-llm-tier", throttleResult.effective_tier);
      if (throttleResult.fell_back_from_primary) {
        res.setHeader("x-llm-fell-back", "true");
      }
      if (isGraceful && throttleResult.diagnostics) {
        // Surface the per-attempt failure mode for ad-hoc smoke testing.
        // Header values are URL-encoded so quotes / newlines don't break HTTP framing.
        res.setHeader(
          "x-llm-last-error",
          encodeURIComponent(throttleResult.diagnostics.last_error ?? "").slice(0, 480),
        );
        res.setHeader("x-llm-last-error-kind", throttleResult.diagnostics.last_error_kind ?? "unknown");
        res.setHeader("x-llm-chain-attempted", throttleResult.diagnostics.chain_attempted.join(","));
      }
      res.end(JSON.stringify(apiOk(llmResponse)));
      return;
    } catch (err) {
      // Throttle path is meant to be no-throw; a real exception here means
      // ClientRegistry or opex pool errored out. Surface in a header and
      // fall through to the legacy router so the call doesn't 500.
      res.setHeader(
        "x-llm-throttle",
        `error:${((err as Error).message ?? "unknown").slice(0, 80)}`,
      );
    }
  }

  const provider: LLMProvider = envelope.provider ?? "auto";

  let resolved;
  try {
    resolved = resolvePrimary(provider);
  } catch (err) {
    if (err instanceof LLMRouterUnavailable) {
      res.statusCode = 503;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify(apiError(err.message, "unavailable")));
      return;
    }
    throw err;
  }

  const normalizedRequest: LLMRequest = {
    ...envelope.request,
    model: normalizeModel(envelope.request.model, resolved.provider),
  };

  let response: LLMResponse;
  let providerUsed: "claude" | "kimi" = resolved.provider;
  let failoverFrom: "claude" | "kimi" | undefined;

  try {
    response = await resolved.client.complete(normalizedRequest);
  } catch (primaryErr) {
    const fallback = resolveFallback(provider, resolved.provider);
    if (!fallback) throw primaryErr;
    failoverFrom = resolved.provider;
    providerUsed = fallback.provider;
    const fallbackRequest: LLMRequest = {
      ...envelope.request,
      model: normalizeModel(envelope.request.model, fallback.provider),
    };
    response = await fallback.client.complete(fallbackRequest);
  }

  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-llm-provider", providerUsed);
  if (failoverFrom) res.setHeader("x-llm-failover-from", failoverFrom);
  res.end(JSON.stringify(apiOk(response)));
});
