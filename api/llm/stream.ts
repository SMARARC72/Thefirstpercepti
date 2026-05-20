import type { IncomingMessage, ServerResponse } from "node:http";
import type { LLMProvider, LLMRequest } from "@first-perception/llm-client";
import { apiError } from "@first-perception/persistence";
import { readJsonBody, withErrors } from "../_lib/repo.js";
import {
  LLMRouterUnavailable,
  normalizeModel,
  resolvePrimary,
} from "../_lib/llm-router.js";

interface LLMRequestEnvelope {
  request?: LLMRequest;
  provider?: LLMProvider;
}

/**
 * SSE streaming proxy. Forwards token chunks from the provider's stream
 * to the browser, framed as `data: {json}\n\n` lines that ProxyLLMClient
 * parses. Closes with `data: [DONE]`.
 *
 * No failover here — switching providers mid-stream would scramble the
 * output. If you need durability, use POST /api/llm (non-streaming).
 */
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

  res.statusCode = 200;
  res.setHeader("content-type", "text/event-stream; charset=utf-8");
  res.setHeader("cache-control", "no-store, no-transform");
  res.setHeader("connection", "keep-alive");
  res.setHeader("x-llm-provider", resolved.provider);
  res.flushHeaders?.();

  const normalizedRequest: LLMRequest = {
    ...envelope.request,
    model: normalizeModel(envelope.request.model, resolved.provider),
  };

  const stream = resolved.client.stream(normalizedRequest);
  try {
    while (true) {
      const next = await stream.next();
      if (next.done) {
        const final = next.value;
        res.write(
          `data: ${JSON.stringify({
            id: final.id,
            usage: final.usage,
            finishReason: "stop",
          })}\n\n`,
        );
        break;
      }
      const chunk = next.value;
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
  } finally {
    res.end();
  }
});
