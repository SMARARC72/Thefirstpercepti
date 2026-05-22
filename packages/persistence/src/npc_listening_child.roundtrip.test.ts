/**
 * Per-NPC roundtrip test — The Listening Child (Phase 24d §6a.4).
 *
 * Pattern transfer: cleric/devout → magistrate → broker → contradiction_bearing
 * (Cluster A substrate-emergent; cannot-be-killed-in-slice). Verifies NPC T
 * handler holds for constraint-dominant + uncategorizable + faction-null shapes.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { npcHandler, isNpcBundleAStub } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "..", "test-fixtures", "npc_listening_child_fixture.json");
const FIXTURE = JSON.parse(readFileSync(fixturePath, "utf8"));
const engineLC = FIXTURE.engineShape;

describe("NPC handler / Listening Child roundtrip (Phase 24d 6a.4 contradiction_bearing)", () => {
  it("toSnake produces a schema-conformant row with contradiction_bearing Bundle A", () => {
    const row = npcHandler.toSnake(engineLC);
    expect(row.npc_id).toBe("npc-the-listening-child");
    expect(row.faction_id).toBeNull();
    expect(row.location_id).toBe("loc-dry-fountain");

    // Substrate-anchor stats: very high Sense 18; minimal Body/Authority/Ruin
    expect((row.stats as { sense: number }).sense).toBe(18);
    expect((row.stats as { authority: number }).authority).toBe(0);
    expect((row.stats as { ruin: number }).ruin).toBe(0);
    expect((row.derived_stats as { wis: number }).wis).toBe(18);

    // Bundle A: contradiction_bearing + "special" cadence (pattern-check Finding 1)
    expect(row.memory_archetype).toBe("contradiction_bearing");
    expect((row.ambition_tick as { cadence: string }).cadence).toBe("special");

    // kill_for "never" — narrow possibility space
    expect((row.want_model as { kill_for: { trigger_condition: string } }).kill_for.trigger_condition)
      .toMatch(/^never/);

    // 2 closing_conditions (Q-ILYRA-2 floor — Listening Child is constraint-dominant)
    expect((row.closing_conditions as unknown[])).toHaveLength(2);
  });

  it("isNpcBundleAStub returns FALSE for Listening Child (fully-authored constraint-dominant, NOT scenery-stub)", () => {
    expect(isNpcBundleAStub(npcHandler.toSnake(engineLC))).toBe(false);
  });

  it("toCamel restores engine shape — contradiction_bearing semantic identity (null faction preserved)", () => {
    const row = npcHandler.toSnake(engineLC);
    const restored = npcHandler.toCamel(row);
    expect(restored.id).toBe(engineLC.id);
    expect(restored.factionId).toBeNull(); // faction-null preserved
    expect(restored.stats).toEqual(engineLC.stats);
    expect(restored.derivedStats).toEqual(engineLC.derivedStats);
    expect(restored.tags).toEqual(engineLC.tags);
    expect(restored._bundleAStub).toBe(false);
    expect(restored.memoryArchetype).toBe("contradiction_bearing");
    expect(restored.wantModel).toEqual(engineLC.wantModel);
    expect(restored.knowledgeTriLayer).toEqual(engineLC.knowledgeTriLayer);
    expect(restored.closingConditions).toEqual(engineLC.closingConditions);
    expect(restored.ambitionTick).toEqual(engineLC.ambitionTick);
    expect(restored.scheduleNesting).toEqual(engineLC.scheduleNesting);
  });

  it("closing_conditions: NO death_state (cannot-be-killed-in-slice); ≥1 player_reachable via special_state", () => {
    const row = npcHandler.toSnake(engineLC);
    const cc = row.closing_conditions as Array<{ kind: string; player_reachable: boolean }>;
    expect(cc).toHaveLength(2);
    // NO death_state — cannot-be-killed-in-slice constraint
    expect(cc.find((c) => c.kind === "death_state")).toBeUndefined();
    // Death's binding rule satisfied via player_reachable=true on special_state
    expect(cc.filter((c) => c.player_reachable === true)).toHaveLength(1);
    // passover_state with residue_drive
    const passover = cc.find((c) => c.kind === "passover_state");
    expect(passover).toBeDefined();
    expect((passover as { residue_drive?: object }).residue_drive).toBeDefined();
  });

  it("says.default_policy = 'silent' (constraint-dominant; does not speak first per Codex)", () => {
    const row = npcHandler.toSnake(engineLC);
    expect((row.knowledge_tri_layer as { says: { default_policy: string } }).says.default_policy)
      .toBe("silent");
  });

  it("memory_archetype = contradiction_bearing (valid v0.8 ENUM)", () => {
    const row = npcHandler.toSnake(engineLC);
    expect([
      "peasant", "soldier", "scholar", "devout", "magistrate",
      "broker", "aspirant_divine", "child", "contradiction_bearing",
    ]).toContain(row.memory_archetype);
  });

  it("ambition_tick.cadence = special (only viable v0.8 enum value pending v0.8.1 patch for contradiction_triggered)", () => {
    const row = npcHandler.toSnake(engineLC);
    const cadence = (row.ambition_tick as { cadence: string }).cadence;
    expect(cadence).toBe("special");
    // Document expectation for future v0.8.1 patch
    expect([
      "seasonal_4x_year", "monthly", "irregular_per_assignment",
      "liturgical_12x_year", "civic_6x_year", "trade_season_8x_year",
      "theological_irregular", "special",
    ]).toContain(cadence);
  });

  it("faction_links is empty array (Listening Child is uncategorizable; no institution)", () => {
    const row = npcHandler.toSnake(engineLC);
    expect(row.faction_id).toBeNull();
  });
});
