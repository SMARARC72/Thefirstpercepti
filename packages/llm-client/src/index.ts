// Browser-safe entry point. Server-only adapters (AnthropicClient,
// MoonshotClient) live at @first-perception/llm-client/server so they
// don't drag api-key handling into the web bundle.

// Provider-agnostic interface + browser client.
export { ProxyLLMClient, ProxyLLMError } from "./ProxyLLMClient.js";
export type { ProxyLLMClientOptions } from "./ProxyLLMClient.js";
export type { LLMClient, LLMProvider, LLMResponseMeta } from "./LLMClient.js";

// Prompt assembly, response parsing, safety, caching, accounting.
export { PromptBuilder } from "./PromptBuilder.js";
export { ResponseParser, ParseError } from "./ResponseParser.js";
export { SafetyFilter } from "./SafetyFilter.js";
export { CacheManager } from "./CacheManager.js";
export { TokenCounter } from "./TokenCounter.js";

// Context assembly.
export { WorldContextAssembler } from "./WorldContextAssembler.js";
export type { WorldContext } from "./WorldContextAssembler.js";

// Prompt templates.
export * from "./templates/index.js";

// Wire types (used across browser + server).
export type {
  ModelTier,
  ModelConfig,
  LLMMessage,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  PromptTemplate,
  OutputSchema,
  CacheEntry,
  SafetyCheck,
  KimiClientOptions,
  PromptBuilderOptions,
  CacheManagerOptions,
  TokenBudget,
  CircuitBreakerState,
} from "./types.js";
export type { UsageRecord } from "./TokenCounter.js";
export { MODELS } from "./types.js";
