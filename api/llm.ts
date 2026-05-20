import type { IncomingMessage, ServerResponse } from "node:http";
import type { LLMProvider, LLMRequest, LLMResponse } from "@first-perception/llm-client";
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
