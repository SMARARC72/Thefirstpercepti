/**
 * Per-NPC roundtrip test — Watchwoman Tess Voryn (Phase 24d §6a.4, closes 6a.4).
 *
 * Pattern: soldier (early-career variant) + Bell Court Sea-watch sub-faction
 * (loyalty 3, uncertain) + Cynical fingerprint (slide-candidate per L.VI).
 * PO.II-authored partner of Caleth (paired dockside patrol).
 *
 * Distinct from Caleth (Vested senior): Voryn is junior with NO death_state
 * (lethal-risk content rests on Caleth per Codex pairing). Closing conditions:
 * success → Vested slide; transfer → Fugitive slide; passover → quiet competence.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { npcHandler, isNpcBundleAStub } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "..", "test-fixtures", "npc_seawatch_voryn_fixture.json");
const FIXTURE = JSON.parse(readFileSync(fixturePath, "utf8"));
const engineVoryn = FIXTURE.engineShape;

describe("NPC handler / Watchwoman Tess Voryn roundtrip (Phase 24d 6a.4 soldier+Cynical PO.II)", () => {
  it("toSnake produces a schema-conformant row with soldier Bundle A (junior variant)", () => {
    const row = npcHandler.toSnake(engineVoryn);
    expect(row.npc_id).toBe("npc-seawatch-tess-voryn");
    expect(row.faction_id).toBe("fac-civic-bell-court");
    expect(row.location_id).toBe("loc-greywake-dockside");

    // Junior-watch stats: moderate Body 11, decent Sense 12 + Grace 12, lower Authority 4
    expect((row.stats as { body: number }).body).toBe(11);
    expect((row.stats as { grace: number }).grace).toBe(12);
    expect((row.stats as { authority: number }).authority).toBe(4);
    expect((row.stats as { will: number }).will).toBe(9);

    // Bundle A: soldier + civic_6x_year cadence (per civic cycle introspection)
    expect(row.memory_archetype).toBe("soldier");
    expect((row.ambition_tick as { cadence: string }).cadence).toBe("civic_6x_year");

    // kill_for "lethal_risk" — pre-commitment uncertain threshold
    expect((row.want_model as { kill_for: { threshold: string } }).kill_for.threshold)
      .toBe("lethal_risk");

    // 3 closing_conditions (Q-ILYRA-2 lighter Bundle A for Sea-watch)
    expect((row.closing_conditions as unknown[])).toHaveLength(3);
  });

  it("isNpcBundleAStub returns FALSE (fully-authored PO.II Cynical, not scenery-stub)", () => {
    expect(isNpcBundleAStub(npcHandler.toSnake(engineVoryn))).toBe(false);
  });

  it("toCamel restores engine shape — Cynical fingerprint + uncertain belief preserved", () => {
    const row = npcHandler.toSnake(engineVoryn);
    const restored = npcHandler.toCamel(row);
    expect(restored.id).toBe(engineVoryn.id);
    expect(restored.factionId).toBe(engineVoryn.factionId);
    expect(restored.stats).toEqual(engineVoryn.stats);
    expect(restored.derivedStats).toEqual(engineVoryn.derivedStats);
    expect(restored.tags).toEqual(engineVoryn.tags);
    expect(restored._bundleAStub).toBe(false);
    expect(restored.memoryArchetype).toBe("soldier");
    expect(restored.wantModel).toEqual(engineVoryn.wantModel);
    expect(restored.knowledgeTriLayer).toEqual(engineVoryn.knowledgeTriLayer);
    expect(restored.closingConditions).toEqual(engineVoryn.closingConditions);
    expect(restored.ambitionTick).toEqual(engineVoryn.ambitionTick);
    expect(restored.scheduleNesting).toEqual(engineVoryn.scheduleNesting);
  });

  it("closing_conditions: NO death_state (junior; lethal-risk content rests on Caleth); ≥1 player_reachable", () => {
    const row = npcHandler.toSnake(engineVoryn);
    const cc = row.closing_conditions as Array<{ kind: string; player_reachable: boolean }>;
    expect(cc).toHaveLength(3);
    expect(cc.find((c) => c.kind === "death_state")).toBeUndefined(); // junior never lethal-risk in slice
    const kinds = cc.map((c) => c.kind).sort();
    expect(kinds).toEqual(["passover_state", "success_state", "transfer_state"]);
    // All 3 player_reachable (junior outcomes all driven by player relationship)
    expect(cc.filter((c) => c.player_reachable === true)).toHaveLength(3);
  });

  it("transfer_state OMITS transfer_target_npc_id (Q-ILYRA-4: HC contradiction is content-driven, target not fixed)", () => {
    const row = npcHandler.toSnake(engineVoryn);
    const cc = row.closing_conditions as Array<{ kind: string; transfer_target_npc_id?: string }>;
    const transfer = cc.find((c) => c.kind === "transfer_state");
    expect(transfer).toBeDefined();
    expect("transfer_target_npc_id" in (transfer as object)).toBe(false);
  });

  it("passover_state ships residue_drive (quiet competence; intensity 2)", () => {
    const row = npcHandler.toSnake(engineVoryn);
    const cc = row.closing_conditions as Array<{ kind: string; residue_drive?: { intensity: number; description: string } }>;
    const passover = cc.find((c) => c.kind === "passover_state");
    expect(passover?.residue_drive).toBeDefined();
    expect(passover?.residue_drive?.intensity).toBe(2);
    expect(passover?.residue_drive?.description).toMatch(/competent service without commitment/);
  });

  it("schedule_nesting nested under inst-civic-bell-court (paired with Caleth)", () => {
    const row = npcHandler.toSnake(engineVoryn);
    expect((row.schedule_nesting as { nested_under_institution_id: string }).nested_under_institution_id)
      .toBe("inst-civic-bell-court");
  });

  it("memory_archetype + cadence valid v0.8 ENUM members", () => {
    const row = npcHandler.toSnake(engineVoryn);
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
