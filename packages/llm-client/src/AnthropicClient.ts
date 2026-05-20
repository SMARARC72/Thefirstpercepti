import type { LLMClient } from "./LLMClient.js";
import type {
  CircuitBreakerState,
  LLMMessage,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  ModelTier,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.anthropic.com/v1";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000;
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Default Anthropic model IDs per logical tier. The system prompt is
 * passed as a top-level field; Anthropic does not accept `system` as
 * a message role.
 */
const DEFAULT_MODEL_BY_TIER: Record<ModelTier, string> = {
  fast: "claude-haiku-4-5-20251001",
  balanced: "claude-sonnet-4-6",
  deep: "claude-opus-4-7",
};

export interface AnthropicClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** Override the per-tier model map. */
  modelByTier?: Partial<Record<ModelTier, string>>;
  onRequest?: (req: LLMRequest) => void;
  onResponse?: (res: LLMResponse) => void;
  onError?: (err: Error) => void;
}

/**
 * Adapter for the Anthropic Messages API. Translates our OpenAI-style
 * LLMRequest into Anthropic's wire format and back. Intended to run on
 * the server; do not instantiate from the browser.
 */
export class AnthropicClient implements LLMClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly modelByTier: Record<ModelTier, string>;
  private readonly onRequest?: (req: LLMRequest) => void;
  private readonly onResponse?: (res: LLMResponse) => void;
  private readonly onError?: (err: Error) => void;
  private circuit: CircuitBreakerState = { failures: 0, lastFailureAt: 0, isOpen: false };

  constructor(options: AnthropicClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.modelByTier = { ...DEFAULT_MODEL_BY_TIER, ...options.modelByTier };
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
          `Anthropic circuit breaker open. Retry in ${Math.ceil(
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
    throw lastError ?? new Error("Anthropic request failed after retries");
  }

  async *stream(
    request: LLMRequest,
  ): AsyncGenerator<LLMStreamChunk, LLMResponse, unknown> {
    const start = performance.now();
    const { system, messages } = splitSystem(request.messages);
    const body = {
      model: this._resolveModel(request.model),
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      system,
      messages: messages.map(toAnthropicMessage),
      stream: true,
    };

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Anthropic HTTP ${res.status}: ${detail || res.statusText}`);
    }
    if (!res.body) throw new Error("Anthropic stream returned no body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let responseId = "";
    let finishReason: string | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          try {
            const parsed = JSON.parse(payload) as AnthropicStreamEvent;
            switch (parsed.type) {
              case "message_start":
                responseId = parsed.message?.id ?? responseId;
                inputTokens = parsed.message?.usage?.input_tokens ?? inputTokens;
                break;
              case "content_block_delta":
                if (parsed.delta?.type === "text_delta" && parsed.delta.text) {
                  fullContent += parsed.delta.text;
                  yield { delta: parsed.delta.text };
                }
                break;
              case "message_delta":
                if (parsed.usage?.output_tokens !== undefined) {
                  outputTokens = parsed.usage.output_tokens;
                }
                if (parsed.delta?.stop_reason) {
                  finishReason = parsed.delta.stop_reason;
                }
                break;
              case "message_stop":
                yield { delta: "", finishReason: finishReason ?? "stop" };
                break;
            }
          } catch {
            // Ignore malformed SSE lines.
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const latencyMs = Math.round(performance.now() - start);
    const response: LLMResponse = {
      id: responseId || `anthropic-stream-${Date.now()}`,
      content: fullContent,
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
      },
      latencyMs,
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
    const tier = options.model ?? "balanced";
    const request: LLMRequest = {
      model: this._resolveModel(tier),
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 512,
    };
    if (options.jsonMode) {
      // Anthropic does not have an explicit JSON mode flag; the convention
      // is to instruct the model in the system prompt. We append a short
      // instruction so the upstream parser still works.
      request.messages[0] = {
        role: "system",
        content: `${request.messages[0].content}\n\nRespond with strict JSON only. No prose, no markdown.`,
      };
    }
    return this.complete(request);
  }

  private async _send(request: LLMRequest): Promise<LLMResponse> {
    const start = performance.now();
    const { system, messages } = splitSystem(request.messages);
    const body = {
      model: this._resolveModel(request.model),
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      system,
      messages: messages.map(toAnthropicMessage),
    };

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const err = new AnthropicHttpError(res.status, detail || res.statusText);
      throw err;
    }

    const json = (await res.json()) as AnthropicMessageResponse;
    const text =
      json.content?.map((b) => (b.type === "text" ? b.text : "")).join("") ?? "";

    return {
      id: json.id ?? `anthropic-${Date.now()}`,
      content: text,
      usage: {
        prompt_tokens: json.usage?.input_tokens ?? 0,
        completion_tokens: json.usage?.output_tokens ?? 0,
        total_tokens:
          (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0),
      },
      latencyMs: Math.round(performance.now() - start),
    };
  }

  private _headers(): Record<string, string> {
    return {
      "x-api-key": this.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    };
  }

  private _resolveModel(model: string): string {
    if (model in this.modelByTier) {
      return this.modelByTier[model as ModelTier];
    }
    // Caller passed a literal model id; assume it's an Anthropic id.
    return model;
  }

  private _isClientError(err: Error): boolean {
    return (
      err instanceof AnthropicHttpError && err.status >= 400 && err.status < 500
    );
  }

  private _recordFailure(): void {
    this.circuit.failures += 1;
    this.circuit.lastFailureAt = Date.now();
    if (this.circuit.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuit.isOpen = true;
    }
  }
}

export class AnthropicHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Anthropic HTTP ${status}: ${body}`);
    this.name = "AnthropicHttpError";
  }
}

interface AnthropicMessageResponse {
  id: string;
  content?: Array<{ type: "text"; text: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

interface AnthropicStreamEvent {
  type:
    | "message_start"
    | "content_block_start"
    | "content_block_delta"
    | "content_block_stop"
    | "message_delta"
    | "message_stop"
    | "ping";
  message?: { id?: string; usage?: { input_tokens?: number } };
  delta?: { type?: "text_delta"; text?: string; stop_reason?: string };
  usage?: { output_tokens?: number };
}

function splitSystem(messages: LLMMessage[]): { system: string; messages: LLMMessage[] } {
  const systems = messages.filter((m) => m.role === "system").map((m) => m.content);
  const others = messages.filter((m) => m.role !== "system");
  return { system: systems.join("\n\n"), messages: others };
}

function toAnthropicMessage(m: LLMMessage): { role: "user" | "assistant"; content: string } {
  if (m.role === "system") {
    // shouldn't happen — system is split out — but be defensive
    return { role: "user", content: m.content };
  }
  return { role: m.role, content: m.content };
}
