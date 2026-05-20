import { describe, it, expect } from "vitest";
import { MemoryRepository } from "./MemoryRepository.js";
import type { SaveSlot, WorldEvent, NPCMemory, LegacyRecord } from "./types.js";

function makeSlot(overrides: Partial<SaveSlot> = {}): SaveSlot {
  return {
    saveId: "save-1",
    campaignId: "camp-1",
    slotNumber: 1,
    saveName: "Slot 1",
    playerId: "player-1",
    worldStateBlob: JSON.stringify({ test: true }),
    playTimeSeconds: 30,
    isAutoSave: false,
    isCheckpoint: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeEvent(overrides: Partial<WorldEvent> = {}): WorldEvent {
  return {
    eventId: "evt-1",
    campaignId: "camp-1",
    eventTypeId: "movement",
    actorType: "player",
    verb: "approached",
    description: "Approached the fountain.",
    isPublic: true,
    isPlayerFacing: true,
    importance: 3,
    turnNumber: 1,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeMemory(overrides: Partial<NPCMemory> = {}): NPCMemory {
  return {
    memoryId: "mem-1",
    campaignId: "camp-1",
    npcId: "npc-1",
    memoryType: "event",
    description: "Player approached the fountain.",
    emotionalValence: 0.2,
    emotionalIntensity: 0.5,
    importanceScore: 0.6,
    decayRate: 0.01,
    timesRecalled: 0,
    isForgotten: false,
    isCoreMemory: false,
    formedTurn: 1,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("MemoryRepository", () => {
  it("upserts and lists save snapshots scoped by campaign", async () => {
    const repo = new MemoryRepository();
    await repo.init();
    await repo.saveSnapshot(makeSlot({ saveId: "a" }));
    await repo.saveSnapshot(makeSlot({ saveId: "b" }));
    await repo.saveSnapshot(makeSlot({ saveId: "a", saveName: "renamed" }));

    const slots = await repo.listSnapshots("camp-1");
    expect(slots).toHaveLength(2);
    const renamed = slots.find((s) => s.saveId === "a");
    expect(renamed?.saveName).toBe("renamed");

    const otherCampaign = await repo.listSnapshots("camp-2");
    expect(otherCampaign).toHaveLength(0);
  });

  it("filters events by location and campaign independently", async () => {
    const repo = new MemoryRepository();
    await repo.recordEvent(makeEvent({ eventId: "e1", locationId: "loc-A" }));
    await repo.recordEvent(makeEvent({ eventId: "e2", locationId: "loc-B" }));
    await repo.recordEvent(
      makeEvent({ eventId: "e3", locationId: "loc-A", turnNumber: 5 }),
    );

    const atA = await repo.getEventsAtLocation("loc-A", 10);
    expect(atA.map((e) => e.eventId).sort()).toEqual(["e1", "e3"]);

    const recent = await repo.getRecentEvents("camp-1", 2);
    expect(recent).toHaveLength(2);
    expect(recent[0].turnNumber).toBe(5);
  });

  it("respects importance and forgotten filters on NPC memories", async () => {
    const repo = new MemoryRepository();
    await repo.addNPCMemory(makeMemory({ memoryId: "m1", importanceScore: 0.1 }));
    await repo.addNPCMemory(makeMemory({ memoryId: "m2", importanceScore: 0.9 }));
    await repo.addNPCMemory(
      makeMemory({ memoryId: "m3", importanceScore: 0.8, isForgotten: true }),
    );

    const above = await repo.getNPCMemories("npc-1", { minImportance: 0.3 });
    expect(above.map((m) => m.memoryId)).toEqual(["m2"]);

    const withForgotten = await repo.getNPCMemories("npc-1", {
      minImportance: 0.3,
      includeForgotten: true,
    });
    expect(withForgotten.map((m) => m.memoryId).sort()).toEqual(["m2", "m3"]);
  });

  it("records legacies newest-first within the limit", async () => {
    const repo = new MemoryRepository();
    const base: LegacyRecord = {
      legacyId: "l1",
      characterName: "Test",
      vector: "drowning",
      epitaph: "An end.",
      turnsSurvived: 1,
      worldSnapshot: "{}",
      timestamp: Date.now(),
    };
    await repo.recordLegacy({ ...base, legacyId: "l1" });
    await repo.recordLegacy({ ...base, legacyId: "l2" });
    const list = await repo.listLegacies(5);
    expect(list.map((l) => l.legacyId)).toEqual(["l2", "l1"]);
  });
});
