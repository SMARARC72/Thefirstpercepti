import { describe, it, expect } from "vitest";
import { combatReducer, moveReducer } from "../src/reducers/index.js";
import { applyPatches } from "../src/state-adapter.js";
import { SeededRNG } from "../src/engine/DiceEngine.js";
import { makeGameState } from "./fixtures.js";

function rngFor(seed: number): SeededRNG {
  return new SeededRNG(seed);
}

describe("moveReducer — Silent Passage gating (bug: && / || precedence)", () => {
  it("never emits Silent Passage when the verb is not sneak, regardless of roll band", () => {
    let sawStrongOrCriticalSuccess = false;
    for (let seed = 1; seed <= 50; seed++) {
      const game = makeGameState();
      const result = moveReducer(game, "go to greywake market", rngFor(seed));
      const band = result.rolls[0]?.band;
      if (band === "strong_success" || band === "critical_success") {
        sawStrongOrCriticalSuccess = true;
      }
      const hasSilentPassage = result.narrative.some(
        (t) => t.title === "Silent Passage",
      );
      expect(hasSilentPassage).toBe(false);
    }
    expect(sawStrongOrCriticalSuccess).toBe(true);
  });

  it("emits Silent Passage when sneaking on a successful band", () => {
    let sawSilentPassage = false;
    for (let seed = 1; seed <= 100; seed++) {
      const game = makeGameState();
      const result = moveReducer(game, "sneak to greywake market", rngFor(seed));
      if (result.narrative.some((t) => t.title === "Silent Passage")) {
        sawSilentPassage = true;
        break;
      }
    }
    expect(sawSilentPassage).toBe(true);
  });
});

describe("combatReducer — failure narrative includes the counterstrike (bug: silent retaliation)", () => {
  it("when failure damages the player, the tale entry mentions the npc and the damage", () => {
    let sawFailureWithNpc = false;
    for (let seed = 1; seed <= 100; seed++) {
      const game = makeGameState();
      const result = combatReducer(game, "attack sister mourn", rngFor(seed));
      if (result.rolls[0]?.band !== "failure") continue;
      const after = applyPatches(game, result.patches);
      const playerHpDelta = game.player.hp - after.player.hp;
      if (playerHpDelta <= 0) continue;
      sawFailureWithNpc = true;
      const blob = result.narrative.map((t) => `${t.title} ${t.body}`).join(" | ").toLowerCase();
      expect(blob).toMatch(/mourn|answers|counter/);
    }
    expect(sawFailureWithNpc).toBe(true);
  });
});

describe("combatReducer — partial_failure does not damage permanent stats (bug: stats/body decrement)", () => {
  it("on Graze, the npc's permanent body stat is unchanged and hp is decremented by 1", () => {
    let sawPartialFailure = false;
    for (let seed = 1; seed <= 200; seed++) {
      const game = makeGameState();
      const npcBefore = game.npcs.find((n) => n.id === "npc-mourn")!;
      const result = combatReducer(game, "attack sister mourn", rngFor(seed));
      if (result.rolls[0]?.band !== "partial_failure") continue;
      sawPartialFailure = true;
      const after = applyPatches(game, result.patches);
      const npcAfter = after.npcs.find((n) => n.id === "npc-mourn")!;
      expect(npcAfter.stats.body).toBe(npcBefore.stats.body);
      expect(npcAfter.hp).toBe(npcBefore.hp - 1);
      const blob = result.narrative.map((t) => `${t.title} ${t.body}`).join(" | ").toLowerCase();
      expect(blob).toContain("graze");
    }
    expect(sawPartialFailure).toBe(true);
  });
});
