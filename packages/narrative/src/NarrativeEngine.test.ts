import { describe, it, expect } from "vitest";
import { NarrativeEngine } from "./NarrativeEngine.js";
import { MemoryRepository } from "@first-perception/persistence";
import type { GameState, WorldEvent } from "@first-perception/persistence";

/**
 * Integration: prepareWorldMemory should read recent world_event rows
 * via the repo, summarize them, and prime the WorldMemoryCache so the
 * Ink `recall(location_id)` external would return the summary instead
 * of the deterministic fallback.
 *
 * We don't call initialize() (that would try to fetch Ink JSON), so
 * we never invoke a story method — only the world-memory path is
 * exercised here.
 */

function makeEvent(overrides: Partial<WorldEvent> = {}): WorldEvent {
  return {
    eventId: "e1",
    campaignId: "camp-1",
    eventTypeId: "player_turn",
    actorType: "player",
    verb: "approached",
    description: "You approached the fountain.",
    locationId: "loc-fountain",
    isPublic: true,
    isPlayerFacing: true,
    importance: 5,
    turnNumber: 1,
    timestamp: Date.now(),
    ...overrides,
  };
}

function minimalGameState(): GameState {
  // The narrative package doesn't import the full game shape — only
  // what prepareWorldMemory touches: currentLocationId. We satisfy
  // the type by casting through unknown so the test stays free of
  // the full GameState fixture (which lives in the engine package
  // tests).
  return {
    currentLocationId: "loc-fountain",
  } as unknown as GameState;
}

describe("NarrativeEngine.prepareWorldMemory", () => {
  it("populates the recall cache from the repo", async () => {
    const engine = new NarrativeEngine();
    const repo = new MemoryRepository();
    await repo.recordEvent(makeEvent({ eventId: "e1", importance: 5 }));
    await repo.recordEvent(
      makeEvent({ eventId: "e2", description: "A witness paid you to look away.", importance: 7 }),
    );

    await engine.prepareWorldMemory(minimalGameState(), { repo });

    const cache = engine.getWorldMemory();
    const recalled = cache.getRecall("loc-fountain");
    // Importance-ranked summary should mention the highest-importance event's body.
    expect(recalled.toLowerCase()).toContain("witness");
  });

  it("is a no-op when no repo is provided", async () => {
    const engine = new NarrativeEngine();
    await engine.prepareWorldMemory(minimalGameState(), {});
    const cache = engine.getWorldMemory();
    // Cache miss → fallback string.
    const recalled = cache.getRecall("loc-fountain");
    expect(recalled.toLowerCase()).toContain("nothing");
  });

  it("swallows repo errors so a persistence outage cannot block a turn", async () => {
    const engine = new NarrativeEngine();
    const repo = new MemoryRepository();
    // Replace getEventsAtLocation with a thrower.
    repo.getEventsAtLocation = async () => {
      throw new Error("DB down");
    };
    // Should not throw.
    await expect(engine.prepareWorldMemory(minimalGameState(), { repo })).resolves.toBeUndefined();
  });

  it("uses a generic fallback when the repo returns zero events", async () => {
    const engine = new NarrativeEngine();
    const repo = new MemoryRepository();
    await engine.prepareWorldMemory(minimalGameState(), { repo });
    const cache = engine.getWorldMemory();
    const recalled = cache.getRecall("loc-fountain");
    expect(recalled.toLowerCase()).toContain("nothing");
  });
});
