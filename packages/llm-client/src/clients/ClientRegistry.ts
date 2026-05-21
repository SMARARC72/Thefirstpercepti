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
import type { LLMClient } from "./types.js";
import { LLMClientError } from "./types.js";
import { DeepSeekClient } from "./DeepSeekClient.js";
import { MistralClient } from "./MistralClient.js";

// NOTE: Anthropic + Kimi clients already exist in this package from earlier
// phases. We import them here without re-defining. If their exports moved,
// update these import paths.
// import { AnthropicClient } from "./AnthropicClient.js";
// import { KimiClient } from "./KimiClient.js";

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
    // Existing Anthropic client — import is gated until you confirm export path.
    // For Phase 21 mirror, throw a clear error so we don't accidentally regress.
    throw new LLMClientError(
      `Claude routing through this registry is pending wire-up. Update ClientRegistry.ts ` +
      `to import from the existing AnthropicClient in this package.`,
      "anthropic",
    );
  }
  if (modelId.startsWith("kimi-")) {
    throw new LLMClientError(
      `Kimi routing through this registry is pending wire-up. Update ClientRegistry.ts ` +
      `to import from the existing KimiClient in this package.`,
      "moonshot",
    );
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
