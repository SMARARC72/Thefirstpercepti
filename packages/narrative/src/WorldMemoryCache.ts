/**
 * Session-scoped store that bridges the async Postgres / LLM layer
 * and the synchronous Ink externals.
 *
 * The orchestrator (or main.ts) populates the cache before continuing
 * a scene — e.g., calls `recall(locationId)` against Postgres and stores
 * the resulting summary. When the Ink runtime then hits
 * `~ temp r = recall("loc-fountain")`, the binding reads from the
 * pre-warmed cache and returns instantly.
 *
 * Cache misses return a deterministic fallback string so authored
 * content never crashes, even when offline / unconfigured.
 */
export class WorldMemoryCache {
  private recallByLocation = new Map<string, string>();
  private llmGenerations = new Map<string, string>();
  /** Hooks that fire on cache miss so callers can populate lazily. */
  private onRecallMiss?: (locationId: string) => void;
  private onLLMMiss?: (prompt: string) => void;

  setRecallHook(fn: (locationId: string) => void): void {
    this.onRecallMiss = fn;
  }

  setLLMHook(fn: (prompt: string) => void): void {
    this.onLLMMiss = fn;
  }

  setRecall(locationId: string, summary: string): void {
    this.recallByLocation.set(locationId, summary);
  }

  getRecall(locationId: string): string {
    const cached = this.recallByLocation.get(locationId);
    if (cached !== undefined) return cached;
    this.onRecallMiss?.(locationId);
    return defaultRecallFallback(locationId);
  }

  setLLMGeneration(prompt: string, text: string): void {
    this.llmGenerations.set(promptKey(prompt), text);
  }

  getLLMGeneration(prompt: string): string {
    const cached = this.llmGenerations.get(promptKey(prompt));
    if (cached !== undefined) return cached;
    this.onLLMMiss?.(prompt);
    return deterministicFallback(prompt);
  }

  clear(): void {
    this.recallByLocation.clear();
    this.llmGenerations.clear();
  }

  recallCount(): number {
    return this.recallByLocation.size;
  }

  generationCount(): number {
    return this.llmGenerations.size;
  }
}

/** Stable cache key — small normalisation so casing/whitespace don't fragment. */
export function promptKey(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Fallback used when no recall data exists for a location (first
 * visit, repo offline, or no events yet). Kept generic so it slots
 * into any cosmic-horror passage.
 */
function defaultRecallFallback(_locationId: string): string {
  return "Nothing in particular comes to memory here.";
}

/**
 * Deterministic placeholder for `llm_generate(prompt)`. Picks one of a
 * small set of fragments seeded by the prompt's hash so authored Ink
 * can render *something* while the real generator is offline. The
 * orchestrator may overwrite this for next time via setLLMGeneration.
 */
const FALLBACK_FRAGMENTS = [
  "The detail hangs there, unfinished, like a sentence the world started but did not complete.",
  "Something here resists description; you note its shape without naming it.",
  "The moment refuses easy words.",
  "The image rises and is gone before you can fix it in mind.",
  "What you see does not quite arrive — it lingers at the edge of certainty.",
];

function deterministicFallback(prompt: string): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i += 1) {
    hash = (hash << 5) - hash + prompt.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_FRAGMENTS[Math.abs(hash) % FALLBACK_FRAGMENTS.length];
}
