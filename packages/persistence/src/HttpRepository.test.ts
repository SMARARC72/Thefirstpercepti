import { describe, it, expect } from "vitest";
import { HttpRepository, HttpRepositoryError } from "./HttpRepository.js";
import type { SaveSlot, WorldEvent } from "./types.js";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers as object | undefined) },
  });
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
    timestamp: 0,
    ...overrides,
  };
}

describe("HttpRepository.init", () => {
  it("pings /api/health and resolves on 200", async () => {
    let pinged = false;
    const fetchImpl = (async (url: string) => {
      if (url === "/api/health") {
        pinged = true;
        return jsonResponse({ ok: true, data: { ok: true, schemaVersion: 1 } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    const repo = new HttpRepository({ fetchImpl });
    await repo.init();
    expect(pinged).toBe(true);
  });

  it("throws HttpRepositoryError on 503 so the caller can swap to a fallback", async () => {
    const fetchImpl = (async () =>
      jsonResponse({ ok: false, error: "DB down", code: "unavailable" }, { status: 503 })) as unknown as typeof fetch;
    const repo = new HttpRepository({ fetchImpl });
    await expect(repo.init()).rejects.toBeInstanceOf(HttpRepositoryError);
  });
});

describe("HttpRepository saves", () => {
  it("POSTs to /api/saves with the slot body", async () => {
    let captured: { url?: string; init?: RequestInit } = {};
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return jsonResponse({ ok: true, data: { saveId: "save-1" } });
    }) as unknown as typeof fetch;

    const repo = new HttpRepository({ fetchImpl });
    await repo.saveSnapshot(makeSlot());
    expect(captured.url).toBe("/api/saves");
    expect(captured.init?.method).toBe("POST");
    const body = JSON.parse((captured.init?.body as string) ?? "{}");
    expect(body.saveId).toBe("save-1");
  });

  it("GETs /api/saves?campaignId and returns the parsed list", async () => {
    const fetchImpl = (async (url: string) => {
      expect(url).toBe("/api/saves?campaignId=camp-1");
      return jsonResponse({
        ok: true,
        data: [makeSlot({ saveId: "a" }), makeSlot({ saveId: "b" })],
      });
    }) as unknown as typeof fetch;

    const repo = new HttpRepository({ fetchImpl });
    const list = await repo.listSnapshots("camp-1");
    expect(list).toHaveLength(2);
    expect(list[0].saveId).toBe("a");
  });

  it("DELETEs /api/saves/:id", async () => {
    let captured: { url?: string; method?: string } = {};
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured = { url, method: init.method };
      return jsonResponse({ ok: true, data: { saveId: "save-1" } });
    }) as unknown as typeof fetch;

    const repo = new HttpRepository({ fetchImpl });
    await repo.deleteSnapshot("save-1");
    expect(captured.url).toBe("/api/saves/save-1");
    expect(captured.method).toBe("DELETE");
  });
});

describe("HttpRepository world events", () => {
  function makeEvent(overrides: Partial<WorldEvent> = {}): WorldEvent {
    return {
      eventId: "evt-1",
      campaignId: "camp-1",
      eventTypeId: "player_turn",
      actorType: "player",
      verb: "approached",
      description: "You approached the fountain.",
      isPublic: true,
      isPlayerFacing: true,
      importance: 3,
      turnNumber: 1,
      timestamp: 0,
      ...overrides,
    };
  }

  it("getEventsAtLocation hits /api/world-events with locationId param", async () => {
    let captured = "";
    const fetchImpl = (async (url: string) => {
      captured = url;
      return jsonResponse({ ok: true, data: [makeEvent()] });
    }) as unknown as typeof fetch;

    const repo = new HttpRepository({ fetchImpl });
    const events = await repo.getEventsAtLocation("loc-fountain", 5);
    expect(captured).toBe("/api/world-events?locationId=loc-fountain&limit=5");
    expect(events).toHaveLength(1);
  });

  it("recordEvent POSTs the event envelope", async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      body = JSON.parse((init.body as string) ?? "{}");
      return jsonResponse({ ok: true, data: { eventId: "evt-1" } });
    }) as unknown as typeof fetch;

    const repo = new HttpRepository({ fetchImpl });
    await repo.recordEvent(makeEvent({ eventId: "evt-99" }));
    expect(body.eventId).toBe("evt-99");
    expect(body.campaignId).toBe("camp-1");
  });
});

describe("HttpRepository NPC memory", () => {
  it("forgetOldMemories POSTs to the dedicated route", async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      body = JSON.parse((init.body as string) ?? "{}");
      return jsonResponse({ ok: true, data: { forgotten: 3 } });
    }) as unknown as typeof fetch;

    const repo = new HttpRepository({ fetchImpl });
    const count = await repo.forgetOldMemories("npc-1", 50, 0.3);
    expect(body.npcId).toBe("npc-1");
    expect(body.beforeTurn).toBe(50);
    expect(body.threshold).toBe(0.3);
    expect(count).toBe(3);
  });
});
