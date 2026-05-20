import { describe, it, expect } from "vitest";
import { WorldMemoryCache, promptKey } from "./WorldMemoryCache.js";

describe("WorldMemoryCache.recall", () => {
  it("returns the deterministic fallback on cache miss", () => {
    const cache = new WorldMemoryCache();
    const text = cache.getRecall("loc-fountain");
    expect(text.length).toBeGreaterThan(0);
    expect(text.toLowerCase()).toContain("nothing");
  });

  it("returns the pre-warmed summary when set", () => {
    const cache = new WorldMemoryCache();
    cache.setRecall("loc-fountain", "Three knocks under the stone.");
    expect(cache.getRecall("loc-fountain")).toBe("Three knocks under the stone.");
  });

  it("fires the miss hook so orchestrators can populate lazily", () => {
    const cache = new WorldMemoryCache();
    let missedFor: string | null = null;
    cache.setRecallHook((id) => {
      missedFor = id;
    });
    cache.getRecall("loc-archive");
    expect(missedFor).toBe("loc-archive");
  });
});

describe("WorldMemoryCache.llm_generate", () => {
  it("returns a deterministic fallback per prompt", () => {
    const cache = new WorldMemoryCache();
    const a1 = cache.getLLMGeneration("describe the fountain at dusk");
    const a2 = cache.getLLMGeneration("describe the fountain at dusk");
    expect(a1).toBe(a2);

    const b = cache.getLLMGeneration("describe the archive bells");
    // not guaranteed to differ (small fallback pool), but the same
    // prompt must always pick the same fragment.
    expect(typeof b).toBe("string");
    expect(b.length).toBeGreaterThan(0);
  });

  it("normalizes the prompt key so casing/whitespace don't fragment cache", () => {
    expect(promptKey("  Describe   the\nfountain  ")).toBe("describe the fountain");
  });

  it("returns the pre-warmed generation when set", () => {
    const cache = new WorldMemoryCache();
    cache.setLLMGeneration("describe the fountain", "Water that is not wet.");
    expect(cache.getLLMGeneration("describe the fountain")).toBe(
      "Water that is not wet.",
    );
  });
});
