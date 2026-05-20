/**
 * Server-side LLM provider selection. Used by /api/llm and /api/llm/stream.
 *
 *   - "auto"    → Anthropic if ANTHROPIC_API_KEY is set; else Moonshot.
 *   - "claude"  → Anthropic only; throws if no key.
 *   - "kimi"    → Moonshot only; throws if no key.
 *
 * The /api/llm route may also fail over (Anthropic → Moonshot) for transient
 * errors when provider === "auto". The route decorates responses with
 * `x-llm-provider` and `x-llm-failover-from` headers so the browser can
 * attribute latency without guessing.
 */
import {
  AnthropicClient,
  MoonshotClient,
  type LLMClient,
  type LLMProvider,
} from "@first-perception/llm-client/server";

declare global {
  // eslint-disable-next-line no-var
  var __tfp_llm_anthropic: AnthropicClient | undefined;
  // eslint-disable-next-line no-var
  var __tfp_llm_moonshot: MoonshotClient | undefined;
}

export interface ResolvedClient {
  client: LLMClient;
  provider: "claude" | "kimi";
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function hasMoonshotKey(): boolean {
  return Boolean(process.env.MOONSHOT_API_KEY);
}

export function getAnthropic(): AnthropicClient {
  if (!globalThis.__tfp_llm_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    globalThis.__tfp_llm_anthropic = new AnthropicClient({ apiKey });
  }
  return globalThis.__tfp_llm_anthropic;
}

export function getMoonshot(): MoonshotClient {
  if (!globalThis.__tfp_llm_moonshot) {
    const apiKey = process.env.MOONSHOT_API_KEY;
    if (!apiKey) throw new Error("MOONSHOT_API_KEY not set");
    globalThis.__tfp_llm_moonshot = new MoonshotClient({ apiKey });
  }
  return globalThis.__tfp_llm_moonshot;
}

/**
 * Resolve the primary client for a logical provider preference. Throws
 * `LLMRouterUnavailable` if no usable key is set so the route can return
 * a structured 503.
 */
export function resolvePrimary(provider: LLMProvider = "auto"): ResolvedClient {
  if (provider === "claude") {
    if (!hasAnthropicKey()) throw new LLMRouterUnavailable("Anthropic not configured");
    return { client: getAnthropic(), provider: "claude" };
  }
  if (provider === "kimi") {
    if (!hasMoonshotKey()) throw new LLMRouterUnavailable("Moonshot not configured");
    return { client: getMoonshot(), provider: "kimi" };
  }
  if (hasAnthropicKey()) return { client: getAnthropic(), provider: "claude" };
  if (hasMoonshotKey()) return { client: getMoonshot(), provider: "kimi" };
  throw new LLMRouterUnavailable("No LLM provider configured");
}

/**
 * Resolve the failover client when the primary fails. Returns null if no
 * fallback is available or if `provider` was a forced choice.
 */
export function resolveFallback(provider: LLMProvider, used: "claude" | "kimi"): ResolvedClient | null {
  if (provider !== "auto") return null;
  if (used === "claude" && hasMoonshotKey()) {
    return { client: getMoonshot(), provider: "kimi" };
  }
  if (used === "kimi" && hasAnthropicKey()) {
    return { client: getAnthropic(), provider: "claude" };
  }
  return null;
}

/** Map a logical model tier to the per-provider model id. */
export function normalizeModel(model: string, provider: "claude" | "kimi"): string {
  if (model === "fast" || model === "balanced" || model === "deep") {
    if (provider === "claude") {
      const map = {
        fast: "claude-haiku-4-5-20251001",
        balanced: "claude-sonnet-4-6",
        deep: "claude-opus-4-7",
      } as const;
      return map[model];
    }
    const map = {
      fast: "moonshot-v1-8k",
      balanced: "moonshot-v1-32k",
      deep: "moonshot-v1-128k",
    } as const;
    return map[model];
  }
  return model;
}

export class LLMRouterUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMRouterUnavailable";
  }
}
