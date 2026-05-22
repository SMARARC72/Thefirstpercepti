/**
 * Per-NPC roundtrip test — The Butcher Who Repeats (Phase 24d §6a.4).
 *
 * Pattern: contradiction_bearing (like Listening Child) + stabilization-
 * pattern + drowned-church-adjacent. Distinct from Listening Child in that
 * Butcher HAS a faction_id + HAS a death_state (catastrophic ritual-
 * tampering breaks the stabilization pattern; not cannot-be-killed).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { npcHandler, isNpcBundleAStub } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "..", "test-fixtures", "npc_butcher_fixture.json");
const FIXTURE = JSON.parse(readFileSync(fixturePath, "utf8"));
const engineButcher = FIXTURE.engineShape;

describe("NPC handler / Butcher Who Repeats roundtrip (Phase 24d 6a.4 contradiction_bearing+stabilization)", () => {
  it("toSnake produces a schema-conformant row with contradiction_bearing+stabilization Bundle A", () => {
    const row = npcHandler.toSnake(engineButcher);
    expect(row.npc_id).toBe("npc-butcher-who-repeats");
    expect(row.faction_id).toBe("fac-drowned-church"); // drowned-church-adjacent
    expect(row.location_id).toBe("loc-greywake-market-district");

    // Substrate-fragment stats: moderate Body 13, minimal Mind 5 + Will 4, high Sense 14 + Creation 6
    expect((row.stats as { body: number }).body).toBe(13);
    expect((row.stats as { mind: number }).mind).toBe(5);
    expect((row.stats as { will: number }).will).toBe(4);
    expect((row.stats as { creation: number }).creation).toBe(6);

    // Bundle A: contradiction_bearing + cadence "special"
    expect(row.memory_archetype).toBe("contradiction_bearing");
    expect((row.ambition_tick as { cadence: string }).cadence).toBe("special");

    // kill_for "never" — cannot interrupt cycle even to defend
    expect((row.want_model as { kill_for: { trigger_condition: string } }).kill_for.trigger_condition)
      .toMatch(/^never/);

    // 3 closing_conditions (Q-ILYRA-2 ceiling for Butcher)
    expect((row.closing_conditions as unknown[])).toHaveLength(3);
  });

  it("isNpcBundleAStub returns FALSE (fully-authored contradiction_bearing, not scenery-stub)", () => {
    expect(isNpcBundleAStub(npcHandler.toSnake(engineButcher))).toBe(false);
  });

  it("toCamel restores engine shape — stabilization-pattern semantic identity", () => {
    const row = npcHandler.toSnake(engineButcher);
    const restored = npcHandler.toCamel(row);
    expect(restored.id).toBe(engineButcher.id);
    expect(restored.factionId).toBe(engineButcher.factionId);
    expect(restored.stats).toEqual(engineButcher.stats);
    expect(restored.derivedStats).toEqual(engineButcher.derivedStats);
    expect(restored.tags).toEqual(engineButcher.tags);
    expect(restored._bundleAStub).toBe(false);
    expect(restored.memoryArchetype).toBe("contradiction_bearing");
    expect(restored.wantModel).toEqual(engineButcher.wantModel);
    expect(restored.knowledgeTriLayer).toEqual(engineButcher.knowledgeTriLayer);
    expect(restored.closingConditions).toEqual(engineButcher.closingConditions);
    expect(restored.ambitionTick).toEqual(engineButcher.ambitionTick);
    expect(restored.scheduleNesting).toEqual(engineButcher.scheduleNesting);
  });

  it("closing_conditions: 3 entries — special + passover (both player_reachable) + death (NOT player_reachable, requires ritual-tampering)", () => {
    const row = npcHandler.toSnake(engineButcher);
    const cc = row.closing_conditions as Array<{ kind: string; player_reachable: boolean }>;
    expect(cc).toHaveLength(3);
    const kinds = cc.map((c) => c.kind).sort();
    expect(kinds).toEqual(["death_state", "passover_state", "special_state"]);
    expect(cc.filter((c) => c.player_reachable === true)).toHaveLength(2); // special + passover
    expect(cc.find((c) => c.kind === "death_state")?.player_reachable).toBe(false);
  });

  it("Butcher distinct from Listening Child: HAS faction_id + HAS death_state (stabilization-pattern can be catastrophically broken)", () => {
    const row = npcHandler.toSnake(engineButcher);
    expect(row.faction_id).not.toBeNull();
    const cc = row.closing_conditions as Array<{ kind: string }>;
    expect(cc.some((c) => c.kind === "death_state")).toBe(true);
  });

  it("passover_state ships residue_drive with intensity 1 (substrate-dispersed; no real residue)", () => {
    const row = npcHandler.toSnake(engineButcher);
    const cc = row.closing_conditions as Array<{ kind: string; residue_drive?: { intensity: number } }>;
    const passover = cc.find((c) => c.kind === "passover_state");
    expect(passover?.residue_drive).toBeDefined();
    expect(passover?.residue_drive?.intensity).toBe(1);
  });

  it("memory_archetype + cadence valid v0.8 ENUM members", () => {
    const row = npcHandler.toSnake(engineButcher);
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
