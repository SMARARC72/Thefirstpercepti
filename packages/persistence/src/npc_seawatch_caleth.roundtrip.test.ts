/**
 * Per-NPC roundtrip test — Sergeant Mer Caleth (Phase 24d §6a.4, closes 6a.4).
 *
 * Pattern: soldier archetype + Bell Court Sea-watch sub-faction (loyalty 4) +
 * Vested fingerprint. PO.II-authored partner of Voryn (paired dockside patrol).
 *
 * Distinct from Orro (magistrate): Caleth is institutional vested-watch
 * (running out retirement clock); Orro is institutional magistrate (civic
 * authority drive). Both nested under inst-civic-bell-court, different roles.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { npcHandler, isNpcBundleAStub } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "..", "test-fixtures", "npc_seawatch_caleth_fixture.json");
const FIXTURE = JSON.parse(readFileSync(fixturePath, "utf8"));
const engineCaleth = FIXTURE.engineShape;

describe("NPC handler / Sergeant Mer Caleth roundtrip (Phase 24d 6a.4 soldier+Vested PO.II)", () => {
  it("toSnake produces a schema-conformant row with soldier Bundle A", () => {
    const row = npcHandler.toSnake(engineCaleth);
    expect(row.npc_id).toBe("npc-seawatch-sergeant-mer-caleth");
    expect(row.faction_id).toBe("fac-civic-bell-court");
    expect(row.location_id).toBe("loc-greywake-dockside");

    // Senior-watch stats: solid Body 14, high Sense 14 + Will 13 + Authority 8
    expect((row.stats as { body: number }).body).toBe(14);
    expect((row.stats as { sense: number }).sense).toBe(14);
    expect((row.stats as { will: number }).will).toBe(13);
    expect((row.stats as { authority: number }).authority).toBe(8);
    expect((row.stats as { grace: number }).grace).toBe(9); // stiff arm = reduced

    // Bundle A: soldier + irregular_per_assignment cadence (running out clock)
    expect(row.memory_archetype).toBe("soldier");
    expect((row.ambition_tick as { cadence: string }).cadence).toBe("irregular_per_assignment");

    // kill_for "legal force first" — institutional restraint
    expect((row.want_model as { kill_for: { threshold: string } }).kill_for.threshold)
      .toMatch(/legal force first/);

    // 3 closing_conditions (Q-ILYRA-2 lighter Bundle A for Sea-watch)
    expect((row.closing_conditions as unknown[])).toHaveLength(3);
  });

  it("isNpcBundleAStub returns FALSE (fully-authored PO.II Vested, not scenery-stub)", () => {
    expect(isNpcBundleAStub(npcHandler.toSnake(engineCaleth))).toBe(false);
  });

  it("toCamel restores engine shape — Vested fingerprint semantic identity", () => {
    const row = npcHandler.toSnake(engineCaleth);
    const restored = npcHandler.toCamel(row);
    expect(restored.id).toBe(engineCaleth.id);
    expect(restored.factionId).toBe(engineCaleth.factionId);
    expect(restored.stats).toEqual(engineCaleth.stats);
    expect(restored.derivedStats).toEqual(engineCaleth.derivedStats);
    expect(restored.tags).toEqual(engineCaleth.tags);
    expect(restored._bundleAStub).toBe(false);
    expect(restored.memoryArchetype).toBe("soldier");
    expect(restored.wantModel).toEqual(engineCaleth.wantModel);
    expect(restored.knowledgeTriLayer).toEqual(engineCaleth.knowledgeTriLayer);
    expect(restored.closingConditions).toEqual(engineCaleth.closingConditions);
    expect(restored.ambitionTick).toEqual(engineCaleth.ambitionTick);
    expect(restored.scheduleNesting).toEqual(engineCaleth.scheduleNesting);
  });

  it("closing_conditions: 3 entries — success + passover (both player_reachable) + death (NOT player_reachable, low probability)", () => {
    const row = npcHandler.toSnake(engineCaleth);
    const cc = row.closing_conditions as Array<{ kind: string; player_reachable: boolean }>;
    expect(cc).toHaveLength(3);
    const kinds = cc.map((c) => c.kind).sort();
    expect(kinds).toEqual(["death_state", "passover_state", "success_state"]);
    expect(cc.filter((c) => c.player_reachable === true)).toHaveLength(2); // success + passover
    expect(cc.find((c) => c.kind === "death_state")?.player_reachable).toBe(false);
  });

  it("passover_state ships residue_drive (Drowned Church informant slide; intensity 3)", () => {
    const row = npcHandler.toSnake(engineCaleth);
    const cc = row.closing_conditions as Array<{ kind: string; residue_drive?: { intensity: number; description: string } }>;
    const passover = cc.find((c) => c.kind === "passover_state");
    expect(passover?.residue_drive).toBeDefined();
    expect(passover?.residue_drive?.intensity).toBe(3);
    expect(passover?.residue_drive?.description).toMatch(/Drowned Church/);
  });

  it("schedule_nesting nested under inst-civic-bell-court (Sea-watch sub-faction)", () => {
    const row = npcHandler.toSnake(engineCaleth);
    expect((row.schedule_nesting as { nested_under_institution_id: string }).nested_under_institution_id)
      .toBe("inst-civic-bell-court");
  });

  it("memory_archetype + cadence valid v0.8 ENUM members", () => {
    const row = npcHandler.toSnake(engineCaleth);
    expect([
      "peasant", "soldier", "scholar", "devout", "magistrate",
      "broker", "aspirant_divine", "child", "contradiction_bearing",
    ]).toContain(row.memory_archetype);
    expect([
      "seasonal_4x_year", "monthly", "irregular_per_assignment",
      "liturgical_12x_year", "civic_6x_year", "trade_season_8x_year",
      "theological_irregular", "special",
    ]).toContain((row.ambition_tick as { cadence: string }).cadence);
  });
});
