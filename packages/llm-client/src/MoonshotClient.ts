import type { LLMClient } from "./LLMClient.js";
import type {
  CircuitBreakerState,
  KimiClientOptions,
  LLMMessage,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from "./types.js";
import { MODELS, type ModelTier } from "./types.js";

const DEFAULT_BASE_URL = "https://api.moonshot.cn/v1";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000;

/**
 * Adapter for the Moonshot (Kimi) Chat Completions API. OpenAI-compatible
 * wire format, so this is essentially a thin wrapper around fetch with
 * retry, timeout, and circuit-breaker semantics.
 *
 * Intended to run on the server (the /api/llm route) so the API key
 * never enters the browser bundle. In the browser, use ProxyLLMClient.
 */
export class MoonshotClient implements LLMClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly onRequest?: (req: LLMRequest) => void;
  private readonly onResponse?: (res: LLMResponse) => void;
  private readonly onError?: (err: Error) => void;
  private circuit: CircuitBreakerState = { failures: 0, lastFailureAt: 0, isOpen: false };

  constructor(options: KimiClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.onRequest = options.onRequest;
    this.onResponse = options.onResponse;
    this.onError = options.onError;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (this.circuit.isOpen) {
      const since = Date.now() - this.circuit.lastFailureAt;
      if (since > CIRCUIT_BREAKER_RESET_MS) {
        this.circuit = { failures: 0, lastFailureAt: 0, isOpen: false };
      } else {
        throw new Error(
          `Moonshot circuit breaker open. Retry in ${Math.ceil(
            (CIRCUIT_BREAKER_RESET_MS - since) / 1000,
          )}s`,
        );
      }
    }

    this.onRequest?.(request);
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this._send(request);
        this.onResponse?.(response);
        this.circuit.failures = 0;
        return response;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.onError?.(lastError);
        if (this._isClientError(lastError)) break;
        if (attempt < this.maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    this._recordFailure();
    throw lastError ?? new Error("Moonshot request failed after retries");
  }

  async *stream(
    request: LLMRequest,
  ): AsyncGenerator<LLMStreamChunk, LLMResponse, unknown> {
    const start = performance.now();
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify({ ...request, stream: true }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new MoonshotHttpError(res.status, body || res.statusText);
    }
    if (!res.body) throw new Error("Moonshot stream returned no body");

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
            responseId = json.id ?? responseId;
            if (json.usage) usage = json.usage;
            const delta: string = json.choices?.[0]?.delta?.content ?? "";
            const finishReason: string | undefined = json.choices?.[0]?.finish_reason ?? undefined;
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

    const response: LLMResponse = {
      id: responseId || `moonshot-stream-${Date.now()}`,
      content: fullContent,
      usage,
      latencyMs: Math.round(performance.now() - start),
    };
    this.onResponse?.(response);
    return response;
  }

  async chat(options: {
    system: string;
    user: string;
    model?: ModelTier;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }): Promise<LLMResponse> {
    const tier = MODELS[options.model ?? "balanced"];
    const messages: LLMMessage[] = [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ];
    const request: LLMRequest = {
      model: tier.id,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 512,
    };
    if (options.jsonMode) request.response_format = { type: "json_object" };
    return this.complete(request);
  }

  private async _send(request: LLMRequest): Promise<LLMResponse> {
    const start = performance.now();
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new MoonshotHttpError(res.status, body || res.statusText);
    }

    const json = await res.json();
    const choice = json.choices?.[0];
    return {
      id: json.id || `moonshot-${Date.now()}`,
      content: choice?.message?.content ?? "",
      usage: json.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      latencyMs: Math.round(performance.now() - start),
    };
  }

  private _headers(): Record<string, string> {
    return {
      authorization: `Bearer ${this.apiKey}`,
      "content-type": "application/json",
    };
  }

  private _isClientError(err: Error): boolean {
    return err instanceof MoonshotHttpError && err.status >= 400 && err.status < 500;
  }

  private _recordFailure(): void {
    this.circuit.failures += 1;
    this.circuit.lastFailureAt = Date.now();
    if (this.circuit.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuit.isOpen = true;
    }
  }
}

export class MoonshotHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Moonshot HTTP ${status}: ${body}`);
    this.name = "MoonshotHttpError";
  }
}

/**
 * Backwards-compatible alias. Old code imported `KimiClient`; new code
 * should import `MoonshotClient`. Kept for one phase, then removed.
 *
 * @deprecated Use MoonshotClient (or, in the browser, ProxyLLMClient).
 */
export const KimiClient = MoonshotClient;
