/**
 * Phase 21 / OPS-505 — Shared client contract.
 *
 * All four LLM clients (Anthropic, Kimi, DeepSeek, Mistral) implement
 * this same interface so the throttle middleware can swap them transparently.
 */

export interface LLMRequest {
  model_id: string;
  system?: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  max_tokens?: number;
  temperature?: number;
  response_format?: "text" | "json_object";
  /** Abort signal for fail-fast on timeout. */
  signal?: AbortSignal;
}

export interface LLMResponse {
  content: string;
  model_id: string;
  tokens_in: number;
  tokens_out: number;
  finish_reason?: "stop" | "length" | "tool_call" | "error";
  /** Raw provider response for debug/logging. Not for hot-path use. */
  raw?: unknown;
}

export interface LLMClient {
  /** Provider identifier — "anthropic" | "moonshot" | "deepseek" | "mistral". */
  readonly provider: string;
  /** Whether this client can serve the given model_id. */
  supports(modelId: string): boolean;
  /** Make the call. Throws on network error or HTTP failure. */
  call(req: LLMRequest): Promise<LLMResponse>;
}

export class LLMClientError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "LLMClientError";
  }
}
