/**
 * Phase 21 / OPS-505 — Client registry.
 *
 * Selects the right LLMClient for a given model_id. Lazy-instantiates clients
 * so missing env vars don't fail startup for clients you're not using.
 *
 * Adding a new provider:
 *   1. Implement LLMClient in src/clients/<NewClient>.ts
 *   2. Register it here in `getClientForModel()`
 *   3. Add to model_pricing.json
 *   4. Optionally add to tier_policy.json fallback chains
 */
import type { LLMClient, LLMRequest, LLMResponse } from "./types.js";
import { LLMClientError } from "./types.js";
import { DeepSeekClient } from "./DeepSeekClient.js";
import { MistralClient } from "./MistralClient.js";
import { AnthropicClient } from "../AnthropicClient.js";
import { MoonshotClient } from "../MoonshotClient.js";
import type {
  LLMRequest as LegacyLLMRequest,
  LLMResponse as LegacyLLMResponse,
} from "../types.js";

// Phase 22.5 / OPS-511 — adapters bridging the pre-Phase-21 client interface
// (complete(legacyRequest)) to the Phase 21 throttle interface
// (call(req: LLMRequest) → LLMResponse). The legacy clients use camelCase
// `model`, return `usage.{prompt_tokens, completion_tokens}`, and expect
// system messages threaded into the `messages` array with role "system".
// The new interface uses snake_case `model_id`, returns `tokens_in/out`,
// and accepts `system` as a top-level field.

function legacyToLLMRequest(req: LLMRequest): LegacyLLMRequest {
  const messages = [...req.messages];
  if (req.system && messages[0]?.role !== "system") {
    messages.unshift({ role: "system", content: req.system });
  }
  return {
    model: req.model_id,
    messages,
    temperature: req.temperature ?? 0.7,
    max_tokens: req.max_tokens ?? 4096,
    response_format: req.response_format === "json_object" ? { type: "json_object" } : undefined,
  };
}

function legacyToLLMResponse(modelId: string, raw: LegacyLLMResponse): LLMResponse {
  return {
    content: raw.content,
    model_id: modelId,
    tokens_in: raw.usage?.prompt_tokens ?? 0,
    tokens_out: raw.usage?.completion_tokens ?? 0,
    finish_reason: "stop",
    raw,
  };
}

class AnthropicAdapter implements LLMClient {
  readonly provider = "anthropic";
  constructor(private readonly inner: AnthropicClient) {}
  supports(modelId: string): boolean {
    return modelId.startsWith("claude-");
  }
  async call(req: LLMRequest): Promise<LLMResponse> {
    const legacy = legacyToLLMRequest(req);
    const result = await this.inner.complete(legacy);
    return legacyToLLMResponse(req.model_id, result);
  }
}

class MoonshotAdapter implements LLMClient {
  readonly provider = "moonshot";
  constructor(private readonly inner: MoonshotClient) {}
  supports(modelId: string): boolean {
    return modelId.startsWith("kimi-") || modelId.startsWith("moonshot-");
  }
  async call(req: LLMRequest): Promise<LLMResponse> {
    // Phase 21 tier_policy maps to "kimi-k2"; legacy client expects raw model
    // ID strings like "moonshot-v1-32k". The k2 alias maps to the largest
    // current Moonshot offering per the Phase 21 fallback chain rationale.
    const legacy = legacyToLLMRequest({
      ...req,
      model_id: req.model_id === "kimi-k2" ? "moonshot-v1-128k" : req.model_id,
    });
    const result = await this.inner.complete(legacy);
    return legacyToLLMResponse(req.model_id, result);
  }
}

// Look up an env var by canonical UPPERCASE name, tolerating case
// variations and the MOONSHOOT typo. Mirrors the helper in
// api/_lib/llm-router.ts — keep them in sync if you change the rules.
function findEnvVar(canonical: string): string | undefined {
  if (process.env[canonical]) return process.env[canonical];
  const targets = new Set<string>([canonical.toLowerCase()]);
  if (canonical === "MOONSHOT_API_KEY") {
    targets.add("moonshoot_api_key");
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v && targets.has(k.toLowerCase())) return v;
  }
  return undefined;
}

const cache = new Map<string, LLMClient>();

function get(provider: string, factory: () => LLMClient): LLMClient {
  let c = cache.get(provider);
  if (!c) {
    c = factory();
    cache.set(provider, c);
  }
  return c;
}

export function getClientForModel(modelId: string): LLMClient {
  // Order: most-specific first.
  if (modelId.startsWith("claude-")) {
    return get("anthropic", () => {
      const apiKey = findEnvVar("ANTHROPIC_API_KEY");
      if (!apiKey) {
        throw new LLMClientError(
          "ANTHROPIC_API_KEY not set; cannot route claude-* model",
          "anthropic",
        );
      }
      return new AnthropicAdapter(new AnthropicClient({ apiKey }));
    });
  }
  if (modelId.startsWith("kimi-") || modelId.startsWith("moonshot-")) {
    return get("moonshot", () => {
      const apiKey = findEnvVar("MOONSHOT_API_KEY");
      if (!apiKey) {
        throw new LLMClientError(
          "MOONSHOT_API_KEY not set; cannot route kimi-/moonshot- model",
          "moonshot",
        );
      }
      return new MoonshotAdapter(new MoonshotClient({ apiKey }));
    });
  }
  if (modelId.startsWith("deepseek-")) {
    return get("deepseek", () => new DeepSeekClient());
  }
  if (modelId.startsWith("mistral-")) {
    return get("mistral", () => new MistralClient());
  }
  throw new LLMClientError(
    `No client registered for model_id "${modelId}". Add to ClientRegistry.getClientForModel().`,
    "unknown",
  );
}

/** For tests — inject a mock client. */
export function registerClient(provider: string, client: LLMClient): void {
  cache.set(provider, client);
}

/** For tests — clear all cached clients. */
export function resetRegistry(): void {
  cache.clear();
}
