import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorageRepository } from "./LocalStorageRepository.js";
import type { SaveSlot, LegacyRecord, WorldEvent, NPCMemory } from "./types.js";

/**
 * Minimal in-memory localStorage shim so we can run this against
 * the Node test runner. We attach it to globalThis before each test
 * so the import-time `typeof localStorage === "undefined"` check in
 * the repository's init() passes.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

function makeSlot(overrides: Partial<SaveSlot> = {}): SaveSlot {
  return {
    saveId: "save-1",
    campaignId: "camp-1",
    slotNumber: 1,
    saveName: "Slot 1",
    playerId: "player-1",
    worldStateBlob: JSON.stringify({ test: true }),
    playTimeSeconds: 0,
    isAutoSave: false,
    isCheckpoint: false,
    timestamp: 1_000,
    ...overrides,
  };
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage();
});

describe("LocalStorageRepository — saves", () => {
  it("round-trips a save slot through localStorage", async () => {
    const repo = new LocalStorageRepository();
    await repo.init();
    await repo.saveSnapshot(makeSlot({ saveId: "a", timestamp: 100 }));
    await repo.saveSnapshot(makeSlot({ saveId: "b", timestamp: 200 }));

    const slots = await repo.listSnapshots("camp-1");
    expect(slots).toHaveLength(2);
    // Newer first.
    expect(slots[0].saveId).toBe("b");
  });

  it("upserts by saveId — second save with the same id replaces the first", async () => {
    const repo = new LocalStorageRepository();
    await repo.init();
    await repo.saveSnapshot(makeSlot({ saveId: "a", saveName: "first" }));
    await repo.saveSnapshot(makeSlot({ saveId: "a", saveName: "second" }));
    const slots = await repo.listSnapshots("camp-1");
    expect(slots).toHaveLength(1);
    expect(slots[0].saveName).toBe("second");
  });

  it("deleteSnapshot removes the slot", async () => {
    const repo = new LocalStorageRepository();
    await repo.init();
    await repo.saveSnapshot(makeSlot());
    await repo.deleteSnapshot("save-1");
    expect(await repo.listSnapshots("camp-1")).toHaveLength(0);
  });
});

describe("LocalStorageRepository — legacies", () => {
  it("persists legacies newest-first across instance recreation", async () => {
    const repo1 = new LocalStorageRepository();
    await repo1.init();
    const base: LegacyRecord = {
      legacyId: "l1",
      characterName: "Test",
      vector: "unknown",
      epitaph: "An end.",
      turnsSurvived: 3,
      worldSnapshot: "{}",
      timestamp: 1,
    };
    await repo1.recordLegacy({ ...base, legacyId: "l1" });
    await repo1.recordLegacy({ ...base, legacyId: "l2" });

    // New instance reads the same backing store.
    const repo2 = new LocalStorageRepository();
    await repo2.init();
    const list = await repo2.listLegacies(5);
    expect(list.map((l) => l.legacyId)).toEqual(["l2", "l1"]);
  });
});

describe("LocalStorageRepository — session-scoped data", () => {
  it("recordEvent + getEventsAtLocation live in-memory and reset between instances", async () => {
    const repo1 = new LocalStorageRepository();
    await repo1.init();
    const event: WorldEvent = {
      eventId: "e1",
      campaignId: "camp-1",
      eventTypeId: "player_turn",
      actorType: "player",
      verb: "look",
      description: "You look around.",
      locationId: "loc-fountain",
      isPublic: true,
      isPlayerFacing: true,
      importance: 3,
      turnNumber: 1,
      timestamp: 1,
    };
    await repo1.recordEvent(event);
    const atLocation = await repo1.getEventsAtLocation("loc-fountain", 5);
    expect(atLocation).toHaveLength(1);

    const repo2 = new LocalStorageRepository();
    await repo2.init();
    expect(await repo2.getEventsAtLocation("loc-fountain", 5)).toHaveLength(0);
  });

  it("forgetOldMemories marks low-importance, non-core memories below threshold", async () => {
    const repo = new LocalStorageRepository();
    await repo.init();
    const base: NPCMemory = {
      memoryId: "m1",
      campaignId: "camp-1",
      npcId: "npc-1",
      memoryType: "event",
      description: "test",
      emotionalValence: 0,
      emotionalIntensity: 0.5,
      importanceScore: 0.2,
      decayRate: 0.01,
      timesRecalled: 0,
      isForgotten: false,
      isCoreMemory: false,
      formedTurn: 1,
      timestamp: 0,
    };
    await repo.addNPCMemory({ ...base, memoryId: "m1", importanceScore: 0.1 });
    await repo.addNPCMemory({ ...base, memoryId: "m2", importanceScore: 0.6 });
    await repo.addNPCMemory({ ...base, memoryId: "m3", importanceScore: 0.05, isCoreMemory: true });
    const forgotten = await repo.forgetOldMemories("npc-1", 10, 0.3);
    expect(forgotten).toBe(1); // only m1 (m2 too important, m3 core)
  });
});
