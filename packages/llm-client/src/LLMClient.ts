import type { LLMRequest, LLMResponse, LLMStreamChunk } from "./types.js";
import type { ModelTier } from "./types.js";

/**
 * Provider-agnostic LLM client. Three implementations live in this package:
 *   - AnthropicClient — talks to api.anthropic.com (server-side only).
 *   - MoonshotClient  — talks to api.moonshot.cn (server-side only).
 *   - ProxyLLMClient  — browser-side; calls the /api/llm endpoint, which
 *                       picks a provider and runs the request server-side.
 *                       Keys never leave the server.
 *
 * Calling code (TurnOrchestrator, NPCSubagent, GMNarrator, FactionSubagent)
 * accepts this interface, not a concrete implementation, so tests can swap
 * a stub in and prod swaps the proxy for direct adapters server-side.
 */
export interface LLMClient {
  /** Single non-streaming completion. */
  complete(request: LLMRequest): Promise<LLMResponse>;

  /** Stream chunks; final return value is the full assembled LLMResponse. */
  stream(request: LLMRequest): AsyncGenerator<LLMStreamChunk, LLMResponse, unknown>;

  /** Convenience wrapper for a system + user pair. */
  chat(options: {
    system: string;
    user: string;
    model?: ModelTier;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }): Promise<LLMResponse>;
}

/**
 * Logical provider name used by ProxyLLMClient and the /api/llm route to
 * negotiate which backend handles a request.
 *   - "auto"     — server decides (Anthropic if key present, else Moonshot)
 *   - "claude"   — force Anthropic; fail if key missing
 *   - "kimi"     — force Moonshot; fail if key missing
 */
export type LLMProvider = "auto" | "claude" | "kimi";

/** Optional metadata attached by the proxy on every response. */
export interface LLMResponseMeta {
  provider: "claude" | "kimi";
  /** Whether the response came from cache. */
  cached: boolean;
  /** If a failover happened, the original provider attempted first. */
  failoverFrom?: "claude" | "kimi";
}
