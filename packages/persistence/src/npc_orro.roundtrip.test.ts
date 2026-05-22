/**
 * Per-NPC roundtrip test — Bell-Magistrate Orro (Phase 24d §6a.4 Orro commit).
 *
 * Pattern transfer test: cleric (Ilyra) → magistrate (Orro). Verifies the
 * NPC T handler holds for memory_archetype = "magistrate" + ambition_tick
 * cadence "civic_6x_year" + 4-entry closing_conditions shape.
 *
 * Disciplines 1 + 2 (three-form seed + roundtrip) + 6 (NOT triggered — Orro
 * is named-slice, not scenery) + 8 (NOT triggered — knowledge_tri_layer.
 * believes is schema-native; no public.belief rows seeded).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { npcHandler, isNpcBundleAStub } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "..", "test-fixtures", "npc_orro_fixture.json");
const FIXTURE = JSON.parse(readFileSync(fixturePath, "utf8"));
const engineOrro = FIXTURE.engineShape;

describe("NPC handler / Orro roundtrip (Phase 24d 6a.4 magistrate archetype)", () => {
  it("toSnake produces a schema-conformant row with magistrate Bundle A overrides honored", () => {
    const row = npcHandler.toSnake(engineOrro);
    expect(row.npc_id).toBe("npc-bell-magistrate-orro");
    expect(row.name).toBe("Bell-Magistrate Orro");
    expect(row.faction_id).toBe("fac-civic-bell-court");
    expect(row.location_id).toBe("loc-bell-court-precinct");
    expect(row.role).toBe("Senior Magistrate of the Civic Bell Court");
    expect(row.hp).toEqual({ current: 18, max: 18 });

    // Magistrate-profile stats: high Mind/Authority/Will/Sense
    expect((row.stats as { mind: number }).mind).toBe(14);
    expect((row.stats as { authority: number }).authority).toBe(7);
    expect((row.derived_stats as { int: number }).int).toBe(14);

    // Bundle A: magistrate archetype + civic cadence
    expect(row.memory_archetype).toBe("magistrate");
    expect((row.ambition_tick as { cadence: string }).cadence).toBe("civic_6x_year");
    expect((row.want_model as { drive: { intensity: number } }).drive.intensity).toBe(4); // magistrate, not eschatological
    expect((row.want_model as { kill_for: { threshold: string; target_class: string } }).kill_for.threshold).toBe("critical");
    expect((row.want_model as { kill_for: { target_class: string } }).kill_for.target_class).toBe("institution");
    expect((row.closing_conditions as unknown[])).toHaveLength(4);
    expect((row.schedule_nesting as { nested_under_institution_id: string }).nested_under_institution_id)
      .toBe("inst-civic-bell-court");
  });

  it("isNpcBundleAStub returns FALSE for Orro (fully-authored magistrate)", () => {
    const row = npcHandler.toSnake(engineOrro);
    expect(isNpcBundleAStub(row)).toBe(false);
  });

  it("toCamel restores engine shape — magistrate-archetype semantic identity", () => {
    const row = npcHandler.toSnake(engineOrro);
    const restored = npcHandler.toCamel(row);
    expect(restored.id).toBe(engineOrro.id);
    expect(restored.factionId).toBe(engineOrro.factionId);
    expect(restored.stats).toEqual(engineOrro.stats);
    expect(restored.derivedStats).toEqual(engineOrro.derivedStats);
    expect(restored.tags).toEqual(engineOrro.tags);
    expect(restored._bundleAStub).toBe(false);
    expect(restored.memoryArchetype).toBe("magistrate");
    expect(restored.wantModel).toEqual(engineOrro.wantModel);
    expect(restored.knowledgeTriLayer).toEqual(engineOrro.knowledgeTriLayer);
    expect(restored.closingConditions).toEqual(engineOrro.closingConditions);
    expect(restored.ambitionTick).toEqual(engineOrro.ambitionTick);
    expect(restored.scheduleNesting).toEqual(engineOrro.scheduleNesting);
  });

  it("closing_conditions: 4 entries, 2 player_reachable, includes passover_state + transfer_state shapes", () => {
    const row = npcHandler.toSnake(engineOrro);
    const cc = row.closing_conditions as Array<{ kind: string; player_reachable: boolean; residue_drive?: object }>;
    expect(cc).toHaveLength(4);
    expect(cc.filter((c) => c.player_reachable === true)).toHaveLength(2); // success + transfer
    const kinds = cc.map((c) => c.kind);
    expect(kinds).toContain("success_state");
    expect(kinds).toContain("death_state");
    expect(kinds).toContain("transfer_state");
    expect(kinds).toContain("passover_state");
    // passover_state ships residue_drive per schema
    const passover = cc.find((c) => c.kind === "passover_state");
    expect(passover?.residue_drive).toBeDefined();
  });

  it("transfer_state OMITS transfer_target_npc_id (per Q-ILYRA-4 + pattern-check Finding 2)", () => {
    const row = npcHandler.toSnake(engineOrro);
    const cc = row.closing_conditions as Array<{ kind: string; transfer_target_npc_id?: string | null }>;
    const transfer = cc.find((c) => c.kind === "transfer_state");
    expect(transfer).toBeDefined();
    expect(transfer && "transfer_target_npc_id" in transfer).toBe(false);
  });

  it("memory_archetype = magistrate (valid v0.8 ENUM)", () => {
    const row = npcHandler.toSnake(engineOrro);
    expect([
      "peasant", "soldier", "scholar", "devout", "magistrate",
      "broker", "aspirant_divine", "child", "contradiction_bearing",
    ]).toContain(row.memory_archetype);
  });

  it("ambition_tick.cadence = civic_6x_year (valid v0.8 ENUM; pattern-check Finding 1 confirmed)", () => {
    const row = npcHandler.toSnake(engineOrro);
    const cadence = (row.ambition_tick as { cadence: string }).cadence;
    expect([
      "seasonal_4x_year", "monthly", "irregular_per_assignment",
      "liturgical_12x_year", "civic_6x_year", "trade_season_8x_year",
      "theological_irregular", "special",
    ]).toContain(cadence);
  });
});
