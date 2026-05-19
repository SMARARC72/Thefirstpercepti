import type {
  KimiClientOptions,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMMessage,
  CircuitBreakerState,
} from "./types.js";
import { MODELS, type ModelTier } from "./types.js";

const DEFAULT_BASE_URL = "https://api.moonshot.cn/v1";
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60000;

export class KimiClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;
  private onRequest?: (req: LLMRequest) => void;
  private onResponse?: (res: LLMResponse) => void;
  private onError?: (err: Error) => void;
  private circuit: CircuitBreakerState = {
    failures: 0,
    lastFailureAt: 0,
    isOpen: false,
  };

  constructor(options: KimiClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.onRequest = options.onRequest;
    this.onResponse = options.onResponse;
    this.onError = options.onError;
  }

  /**
   * Send a single completion request.
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (this.circuit.isOpen) {
      const sinceLastFailure = Date.now() - this.circuit.lastFailureAt;
      if (sinceLastFailure > CIRCUIT_BREAKER_RESET_MS) {
        this.circuit = { failures: 0, lastFailureAt: 0, isOpen: false };
      } else {
        throw new Error(
          `Circuit breaker open. Try again in ${Math.ceil((CIRCUIT_BREAKER_RESET_MS - sinceLastFailure) / 1000)}s.`
        );
      }
    }

    this.onRequest?.(request);
    const start = performance.now();

    let lastError: Error | undefined;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this._send(request);
        this.onResponse?.(response);
        this._recordSuccess();
        return response;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.onError?.(lastError);

        if (attempt < this.maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    this._recordFailure();
    throw lastError ?? new Error("LLM request failed after retries");
  }

  /**
   * Stream a completion, yielding chunks as they arrive.
   */
  async *stream(request: LLMRequest): AsyncGenerator<LLMStreamChunk, LLMResponse, unknown> {
    const start = performance.now();
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...request, stream: true }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "unknown");
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    if (!res.body) {
      throw new Error("No response body for stream");
    }

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

            if (json.usage) {
              usage = json.usage;
            }

            const delta = json.choices?.[0]?.delta?.content ?? "";
            const finishReason = json.choices?.[0]?.finish_reason ?? undefined;

            if (delta || finishReason) {
              fullContent += delta;
              yield { delta, finishReason };
            }
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const latencyMs = Math.round(performance.now() - start);
    const response: LLMResponse = {
      id: responseId || `stream-${Date.now()}`,
      content: fullContent,
      usage,
      latencyMs,
    };

    this.onResponse?.(response);
    return response;
  }

  /**
   * Convenience: build a simple completion from system + user messages.
   */
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

    if (options.jsonMode) {
      request.response_format = { type: "json_object" };
    }

    return this.complete(request);
  }

  private async _send(request: LLMRequest): Promise<LLMResponse> {
    const start = performance.now();
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "unknown");
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    const json = await res.json();
    const choice = json.choices?.[0];
    const latencyMs = Math.round(performance.now() - start);

    return {
      id: json.id || `req-${Date.now()}`,
      content: choice?.message?.content ?? "",
      usage: json.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      latencyMs,
    };
  }

  private _recordSuccess(): void {
    this.circuit.failures = 0;
  }

  private _recordFailure(): void {
    this.circuit.failures += 1;
    this.circuit.lastFailureAt = Date.now();
    if (this.circuit.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuit.isOpen = true;
    }
  }
}
