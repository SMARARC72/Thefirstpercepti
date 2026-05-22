/**
 * Per-NPC roundtrip test — Marrow-Saint Ilyra (Phase 24d §6a.4 first commit).
 *
 * Discipline 2 + Discipline 7 (amended): NPC T handler IS exercised at
 * first-write because seed-author derived stats live in the fixture; this
 * test verifies the handler's toSnake/toCamel preserves identity on the
 * fields the handler MAPS. Bundle A REQUIRED stack fields pass through via
 * the override-honoring path (npcHandler.toSnake honors caller-provided
 * Bundle A — NOT the NPC_STUB_MARKER stub — when the engine shape supplies
 * full Bundle A payloads).
 *
 * Discipline 8: Ilyra's knowledge_tri_layer.believes uses the schema-native
 * shape (proposition/conviction/evidence_resistance), NOT the engine Belief
 * interface. Discipline 8 governs engine-Belief instances written to
 * public.belief; not exercised here.
 *
 * Discipline 6: NOT applicable — Ilyra is a fully-authored named NPC, not
 * scenery-tier. NPC_STUB_MARKER detection should return false on her row.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { npcHandler, isNpcBundleAStub } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "..", "test-fixtures", "npc_ilyra_fixture.json");
const FIXTURE = JSON.parse(readFileSync(fixturePath, "utf8"));
const engineIlyra = FIXTURE.engineShape;

describe("NPC handler / Ilyra roundtrip (Phase 24d 6a.4 Ilyra commit)", () => {
  it("toSnake produces a schema-conformant row with full Bundle A (overrides honored, not stubbed)", () => {
    const row = npcHandler.toSnake(engineIlyra);
    expect(row.npc_id).toBe("npc-marrow-saint-ilyra");
    expect(row.name).toBe("Marrow-Saint Ilyra");
    expect(row.faction_id).toBe("fac-drowned-church");
    expect(row.location_id).toBe("loc-drowned-cathedral");
    expect(row.role).toBe("Marrow-Saint of the Drowned Church");

    // hp number → hp_block {current, max}
    expect(row.hp).toEqual({ current: 24, max: 24 });

    // stats + derived_stats passthrough (Phase 4a.5 REQUIRED uniform)
    expect((row.stats as { will: number }).will).toBe(14);
    expect((row.derived_stats as { cha: number }).cha).toBe(13);

    // Bundle A: handler honors caller overrides — NOT stub markers
    expect(row.memory_archetype).toBe("devout");
    expect((row.want_model as { drive: { intensity: number } }).drive.intensity).toBe(5);
    expect((row.knowledge_tri_layer as { knows: unknown[] }).knows).toHaveLength(3);
    expect((row.closing_conditions as unknown[])).toHaveLength(3);
    expect((row.ambition_tick as { cadence: string }).cadence).toBe("theological_irregular");
    expect((row.schedule_nesting as { nested_under_institution_id: string }).nested_under_institution_id)
      .toBe("inst-drowned-church");
  });

  it("isNpcBundleAStub returns FALSE for Ilyra (fully-authored, not scenery-stub)", () => {
    const row = npcHandler.toSnake(engineIlyra);
    expect(isNpcBundleAStub(row)).toBe(false);
  });

  it("toCamel restores engine shape — handler-mapped fields preserve semantic identity", () => {
    const row = npcHandler.toSnake(engineIlyra);
    const restored = npcHandler.toCamel(row);

    // Core identity preserved
    expect(restored.id).toBe(engineIlyra.id);
    expect(restored.name).toBe(engineIlyra.name);
    expect(restored.role).toBe(engineIlyra.role);
    expect(restored.factionId).toBe(engineIlyra.factionId);
    expect(restored.locationId).toBe(engineIlyra.locationId);
    expect(restored.hp).toBe(engineIlyra.hp);
    expect(restored.maxHp).toBe(engineIlyra.maxHp);

    // Stats passthrough
    expect(restored.stats).toEqual(engineIlyra.stats);
    expect(restored.derivedStats).toEqual(engineIlyra.derivedStats);
    expect(restored.tags).toEqual(engineIlyra.tags);

    // Bundle A: handler exposes real Bundle A data (not nulled) because not stubbed
    expect(restored._bundleAStub).toBe(false);
    expect(restored.memoryArchetype).toBe("devout");
    expect(restored.wantModel).toEqual(engineIlyra.wantModel);
    expect(restored.knowledgeTriLayer).toEqual(engineIlyra.knowledgeTriLayer);
    expect(restored.closingConditions).toEqual(engineIlyra.closingConditions);
    expect(restored.ambitionTick).toEqual(engineIlyra.ambitionTick);
    expect(restored.scheduleNesting).toEqual(engineIlyra.scheduleNesting);
  });

  it("closing_conditions satisfies Death's binding rule (≥1 player_reachable=true)", () => {
    const row = npcHandler.toSnake(engineIlyra);
    const cc = row.closing_conditions as Array<{ player_reachable: boolean }>;
    expect(cc.length).toBeGreaterThanOrEqual(2);
    expect(cc.some((c) => c.player_reachable === true)).toBe(true);
  });

  it("memory_archetype is a valid v0.8 ENUM member", () => {
    const row = npcHandler.toSnake(engineIlyra);
    expect([
      "peasant", "soldier", "scholar", "devout", "magistrate",
      "broker", "aspirant_divine", "child", "contradiction_bearing",
    ]).toContain(row.memory_archetype);
  });

  it("ambition_tick.cadence is a valid v0.8 ENUM member", () => {
    const row = npcHandler.toSnake(engineIlyra);
    const cadence = (row.ambition_tick as { cadence: string }).cadence;
    expect([
      "seasonal_4x_year", "monthly", "irregular_per_assignment",
      "liturgical_12x_year", "civic_6x_year", "trade_season_8x_year",
      "theological_irregular", "special",
    ]).toContain(cadence);
  });
});
