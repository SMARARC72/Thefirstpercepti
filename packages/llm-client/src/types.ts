/**
 * Core types for the LLM client package.
 */

export type ModelTier = "fast" | "balanced" | "deep";

export interface ModelConfig {
  id: string;
  contextWindow: number;
  costPer1kTokens: number; // in RMB / 1000 tokens
}

export const MODELS: Record<ModelTier, ModelConfig> = {
  fast: { id: "moonshot-v1-8k", contextWindow: 8192, costPer1kTokens: 0.006 },
  balanced: { id: "moonshot-v1-32k", contextWindow: 32768, costPer1kTokens: 0.024 },
  deep: { id: "moonshot-v1-128k", contextWindow: 131072, costPer1kTokens: 0.12 },
};

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature: number;
  max_tokens: number;
  stream?: boolean;
  response_format?: { type: "json_object" };
}

export interface LLMResponse {
  id: string;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latencyMs: number;
}

export interface LLMStreamChunk {
  delta: string;
  finishReason?: string;
}

export interface PromptTemplate<Context, Output> {
  id: string;
  systemPrompt: string;
  buildUserPrompt: (ctx: Context) => string;
  outputSchema: OutputSchema<Output>;
  maxTokens: number;
  temperature: number;
  model: ModelTier;
}

export interface OutputSchema<T> {
  parse: (raw: string) => T;
  description: string;
}

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  promptHash: string;
  stateHash: string;
}

export interface SafetyCheck {
  passed: boolean;
  reason?: string;
  severity?: "low" | "medium" | "high";
}

export interface KimiClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  onRequest?: (req: LLMRequest) => void;
  onResponse?: (res: LLMResponse) => void;
  onError?: (err: Error) => void;
}

export interface PromptBuilderOptions {
  maxContextTokens?: number;
  truncationStrategy?: "head" | "tail" | "middle";
}

export interface CacheManagerOptions {
  maxSize?: number;
  defaultTtlMs?: number;
}

export interface TokenBudget {
  maxPerTurn: number;
  maxPerMinute: number;
  currentTurnUsage: number;
  currentMinuteUsage: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureAt: number;
  isOpen: boolean;
}
