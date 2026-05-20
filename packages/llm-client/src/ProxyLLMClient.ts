import type { LLMClient, LLMProvider } from "./LLMClient.js";
import type { LLMRequest, LLMResponse, LLMStreamChunk, ModelTier } from "./types.js";

export interface ProxyLLMClientOptions {
  /** Defaults to "" (same-origin). */
  baseUrl?: string;
  /** Forced provider override; defaults to "auto" (server picks). */
  provider?: LLMProvider;
  /** Default timeout for non-streaming requests. */
  timeoutMs?: number;
  /** Streaming timeout. Streams can run long; default 90 s. */
  streamTimeoutMs?: number;
  /** Test injection. */
  fetchImpl?: typeof fetch;
}

/**
 * Browser-side LLMClient. Forwards every call to /api/llm (or
 * /api/llm/stream) so the real provider keys stay server-side.
 *
 * The server may transparently fail over (Claude → Kimi). When that
 * happens the response's `x-llm-provider` and `x-llm-failover-from`
 * headers carry the breadcrumb; this client surfaces them through
 * the `lastMeta` field so callers can attribute latency.
 */
export class ProxyLLMClient implements LLMClient {
  private readonly baseUrl: string;
  private readonly provider: LLMProvider;
  private readonly timeoutMs: number;
  private readonly streamTimeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  /** Filled in after each call so callers can read the provider used. */
  public lastMeta: {
    provider?: "claude" | "kimi";
    cached?: boolean;
    failoverFrom?: "claude" | "kimi";
  } = {};

  constructor(options: ProxyLLMClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "";
    this.provider = options.provider ?? "auto";
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.streamTimeoutMs = options.streamTimeoutMs ?? 90_000;
    const f = options.fetchImpl ?? globalThis.fetch;
    if (!f) throw new Error("ProxyLLMClient: no fetch available");
    this.fetchImpl = f.bind(globalThis);
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/llm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request, provider: this.provider }),
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        let detail = res.statusText;
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) detail = parsed.error;
        } catch {
          // ignore
        }
        throw new ProxyLLMError(res.status, detail);
      }
      const payload = JSON.parse(text) as { ok: true; data: LLMResponse } | { ok: false; error: string };
      if (!payload.ok) throw new ProxyLLMError(500, payload.error);
      this.lastMeta = {
        provider: (res.headers.get("x-llm-provider") ?? undefined) as "claude" | "kimi" | undefined,
        cached: res.headers.get("x-llm-cached") === "1",
        failoverFrom: (res.headers.get("x-llm-failover-from") ?? undefined) as
          | "claude"
          | "kimi"
          | undefined,
      };
      return payload.data;
    } finally {
      clearTimeout(timer);
    }
  }

  async *stream(
    request: LLMRequest,
  ): AsyncGenerator<LLMStreamChunk, LLMResponse, unknown> {
    const start = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.streamTimeoutMs);
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/llm/stream`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request, provider: this.provider }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => res.statusText);
        throw new ProxyLLMError(res.status, detail);
      }
      this.lastMeta = {
        provider: (res.headers.get("x-llm-provider") ?? undefined) as "claude" | "kimi" | undefined,
        cached: false,
        failoverFrom: (res.headers.get("x-llm-failover-from") ?? undefined) as
          | "claude"
          | "kimi"
          | undefined,
      };

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      let responseId = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;
            try {
              const json = JSON.parse(trimmed.slice(6));
              if (json.id) responseId = json.id;
              if (json.usage) usage = json.usage;
              const delta: string = json.delta ?? "";
              const finishReason: string | undefined = json.finishReason;
              if (delta || finishReason) {
                fullContent += delta;
                yield { delta, finishReason };
              }
            } catch {
              // Ignore malformed SSE lines.
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        id: responseId || `proxy-stream-${Date.now()}`,
        content: fullContent,
        usage,
        latencyMs: Math.round(performance.now() - start),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async chat(options: {
    system: string;
    user: string;
    model?: ModelTier;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }): Promise<LLMResponse> {
    // The server fills in the real per-provider model id. We just send
    // the logical tier as the model field; the proxy normalizes it.
    const request: LLMRequest = {
      model: options.model ?? "balanced",
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 512,
    };
    if (options.jsonMode) request.response_format = { type: "json_object" };
    return this.complete(request);
  }
}

export class ProxyLLMError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Proxy LLM HTTP ${status}: ${body}`);
    this.name = "ProxyLLMError";
  }
}
