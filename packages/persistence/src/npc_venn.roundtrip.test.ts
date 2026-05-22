/**
 * Per-NPC roundtrip test — Venn Hook (Phase 24d §6a.4 Venn commit).
 *
 * Pattern transfer test: cleric/devout (Ilyra) → magistrate (Orro) →
 * broker (Venn). Verifies NPC T handler holds for memory_archetype="broker"
 * + ambition_tick cadence "trade_season_8x_year" + 5-entry closing_conditions
 * shape (Q-ILYRA-2 ceiling = 5).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { npcHandler, isNpcBundleAStub } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "..", "test-fixtures", "npc_venn_fixture.json");
const FIXTURE = JSON.parse(readFileSync(fixturePath, "utf8"));
const engineVenn = FIXTURE.engineShape;

describe("NPC handler / Venn Hook roundtrip (Phase 24d 6a.4 broker archetype)", () => {
  it("toSnake produces a schema-conformant row with broker Bundle A", () => {
    const row = npcHandler.toSnake(engineVenn);
    expect(row.npc_id).toBe("npc-venn-hook");
    expect(row.faction_id).toBe("fac-merchant-tide-league");
    expect(row.location_id).toBe("loc-tide-league-brokers-office");

    // Broker-profile stats: high Sense/Grace/Mind; moderate Will; low Authority
    expect((row.stats as { sense: number }).sense).toBe(14);
    expect((row.stats as { authority: number }).authority).toBe(4); // lower than magistrate (7) / Ilyra (6)
    expect((row.derived_stats as { dex: number }).dex).toBe(12);
    expect((row.derived_stats as { wis: number }).wis).toBe(14);

    // Bundle A: broker archetype + mercantile cadence
    expect(row.memory_archetype).toBe("broker");
    expect((row.ambition_tick as { cadence: string }).cadence).toBe("trade_season_8x_year");

    // kill_for threshold "warning" (lowest tier; survival-only)
    expect((row.want_model as { kill_for: { threshold: string; target_class: string } }).kill_for.threshold).toBe("warning");
    expect((row.want_model as { kill_for: { target_class: string } }).kill_for.target_class).toBe("individual");

    // 5 closing_conditions (Q-ILYRA-2 ceiling tested here)
    expect((row.closing_conditions as unknown[])).toHaveLength(5);
    expect((row.schedule_nesting as { nested_under_institution_id: string }).nested_under_institution_id)
      .toBe("inst-merchant-tide-league");
  });

  it("isNpcBundleAStub returns FALSE for Venn", () => {
    expect(isNpcBundleAStub(npcHandler.toSnake(engineVenn))).toBe(false);
  });

  it("toCamel restores engine shape — broker-archetype semantic identity", () => {
    const row = npcHandler.toSnake(engineVenn);
    const restored = npcHandler.toCamel(row);
    expect(restored.id).toBe(engineVenn.id);
    expect(restored.factionId).toBe(engineVenn.factionId);
    expect(restored.stats).toEqual(engineVenn.stats);
    expect(restored.derivedStats).toEqual(engineVenn.derivedStats);
    expect(restored.tags).toEqual(engineVenn.tags);
    expect(restored._bundleAStub).toBe(false);
    expect(restored.memoryArchetype).toBe("broker");
    expect(restored.wantModel).toEqual(engineVenn.wantModel);
    expect(restored.knowledgeTriLayer).toEqual(engineVenn.knowledgeTriLayer);
    expect(restored.closingConditions).toEqual(engineVenn.closingConditions);
    expect(restored.ambitionTick).toEqual(engineVenn.ambitionTick);
    expect(restored.scheduleNesting).toEqual(engineVenn.scheduleNesting);
  });

  it("closing_conditions: 5 entries cover all 5 npc_closing_state enum members + 3 player_reachable", () => {
    const row = npcHandler.toSnake(engineVenn);
    const cc = row.closing_conditions as Array<{ kind: string; player_reachable: boolean }>;
    expect(cc).toHaveLength(5);
    const kinds = cc.map((c) => c.kind).sort();
    // All 5 npc_closing_state enum values represented (full coverage in Venn)
    expect(kinds).toEqual(["death_state", "passover_state", "special_state", "success_state", "transfer_state"]);
    expect(cc.filter((c) => c.player_reachable === true)).toHaveLength(3);
    // Death's binding rule
    expect(cc.filter((c) => c.kind === "death_state")).toHaveLength(1);
  });

  it("audience-conditional barter refusal honors broker-vs-magistrate civic boundary", () => {
    const row = npcHandler.toSnake(engineVenn);
    const barter = (row.want_model as { barter: Array<{ offered: string; refusal_if_audience_includes?: string[] }> }).barter;
    const auditWarning = barter.find((b) => b.offered.includes("Bell Court audit"));
    expect(auditWarning).toBeDefined();
    expect(auditWarning?.refusal_if_audience_includes).toContain("npc-bell-magistrate-orro");
  });

  it("transfer_state OMITS transfer_target_npc_id (Q-ILYRA-4 compliance)", () => {
    const row = npcHandler.toSnake(engineVenn);
    const cc = row.closing_conditions as Array<{ kind: string; transfer_target_npc_id?: string | null }>;
    const transfer = cc.find((c) => c.kind === "transfer_state");
    expect(transfer && "transfer_target_npc_id" in transfer).toBe(false);
  });

  it("memory_archetype + cadence are valid v0.8 ENUM members", () => {
    const row = npcHandler.toSnake(engineVenn);
    expect([
      "peasant", "soldier", "scholar", "devout", "magistrate",
      "broker", "aspirant_divine", "child", "contradiction_bearing",
    ]).toContain(row.memory_archetype);
    const cadence = (row.ambition_tick as { cadence: string }).cadence;
    expect([
      "seasonal_4x_year", "monthly", "irregular_per_assignment",
      "liturgical_12x_year", "civic_6x_year", "trade_season_8x_year",
      "theological_irregular", "special",
    ]).toContain(cadence);
  });
});
