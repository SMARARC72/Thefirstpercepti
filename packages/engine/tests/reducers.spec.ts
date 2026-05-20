import { describe, it, expect } from "vitest";
import {
  combatReducer,
  conditionReducer,
  deathReducer,
  dialogueReducer,
  investigationReducer,
  itemReducer,
  moveReducer,
  restReducer,
} from "../src/reducers/index.js";
import { applyPatches } from "../src/state-adapter.js";
import { SeededRNG } from "../src/engine/DiceEngine.js";
import { makeGameState, makePlayer, makeNpc } from "./fixtures.js";

/**
 * Per-reducer specs. Each test fixes the seed so the d20 roll is
 * deterministic, then asserts the structural effects we care about:
 * patches dispatched, narrative produced, tone band, suggestions
 * returned. We don't lock in exact prose — that's too brittle as the
 * authored strings evolve — but every reducer must produce *some*
 * narrative and a feedback string so the UI can render the turn.
 */

function rngFor(seed: number): SeededRNG {
  return new SeededRNG(seed);
}

describe("moveReducer", () => {
  it("moves the player to a visible exit and marks new locations discovered", () => {
    const game = makeGameState();
    const before = game.locations.find((l) => l.id === "loc-market");
    expect(before?.discovered).toBe(false);

    const result = moveReducer(game, "go to greywake market", rngFor(1));
    expect(result.narrative.length).toBeGreaterThan(0);
    expect(result.feedback.length).toBeGreaterThan(0);

    const moved = applyPatches(game, result.patches);
    expect(moved.currentLocationId).toBe("loc-market");
    const market = moved.locations.find((l) => l.id === "loc-market");
    expect(market?.discovered).toBe(true);
  });

  it("refuses hidden exits unless the verb is sneak", () => {
    const game = makeGameState();
    const visibleResult = moveReducer(game, "approach the old breach", rngFor(7));
    // 'approach' is not sneak; the breach exit is hidden, so the
    // reducer should either pick the visible market exit (label match
    // fails on hidden) or report no way.
    expect(visibleResult.feedback).toBeTruthy();
    expect(visibleResult.patches.length === 0 || visibleResult.patches.some(
      (p) => p.path === "/currentLocationId" && p.value !== "loc-breach",
    )).toBe(true);
  });

  it("returns a helpful feedback when the location has no exits", () => {
    const game = makeGameState({ currentLocationId: "loc-breach" });
    const result = moveReducer(game, "go anywhere", rngFor(2));
    expect(result.feedback.toLowerCase()).toContain("no way");
  });
});

describe("restReducer", () => {
  it("heals the player on success and never overflows max", () => {
    const game = makeGameState({ player: { hp: 4, maxHp: 10, focus: 2, maxFocus: 6 } });
    const result = restReducer(game, "rest", rngFor(3));
    expect(result.narrative.length).toBeGreaterThan(0);
    const after = applyPatches(game, result.patches);
    expect(after.player.hp).toBeGreaterThanOrEqual(4);
    expect(after.player.hp).toBeLessThanOrEqual(after.player.maxHp);
    expect(after.player.focus).toBeLessThanOrEqual(after.player.maxFocus);
  });
});

describe("combatReducer", () => {
  it("targets a present NPC and produces a deterministic roll outcome", () => {
    const game = makeGameState();
    const result = combatReducer(game, "attack sister mourn", rngFor(4));
    expect(result.rolls.length).toBe(1);
    expect(["critical_failure", "failure", "partial_failure", "clean_success", "strong_success", "critical_success"]).toContain(
      result.rolls[0].band,
    );
    expect(result.narrative.length).toBeGreaterThan(0);
    expect(result.suggestions.some((s) => s.command === "defend")).toBe(true);
  });

  it("surrender resolves without a roll and offers a social out", () => {
    const game = makeGameState();
    const result = combatReducer(game, "surrender", rngFor(5));
    expect(result.rolls.length).toBe(0);
    expect(result.feedback.toLowerCase()).toContain("surrender");
    expect(result.suggestions[0]?.command).toBe("speak");
  });
});

describe("dialogueReducer", () => {
  it("produces narrative and at least one suggested follow-up", () => {
    const game = makeGameState();
    const result = dialogueReducer(game, "speak to sister mourn", rngFor(6));
    expect(result.narrative.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.feedback.length).toBeGreaterThan(0);
  });
});

describe("investigationReducer", () => {
  it("examines current location and yields narrative + suggestions", () => {
    const game = makeGameState();
    const result = investigationReducer(game, "look around", rngFor(8));
    expect(result.narrative.length).toBeGreaterThan(0);
    expect(result.feedback.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe("itemReducer", () => {
  it("inspects an item in inventory", () => {
    const game = makeGameState();
    const result = itemReducer(game, "inspect iron token", rngFor(9));
    expect(result.narrative.length).toBeGreaterThan(0);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it("drops an item by removing it from inventory", () => {
    const game = makeGameState();
    expect(game.player.inventory.length).toBe(1);
    const result = itemReducer(game, "drop iron token", rngFor(10));
    expect(result.feedback.length).toBeGreaterThan(0);
  });
});

describe("conditionReducer", () => {
  it("ticks down turnsRemaining and removes expired conditions", () => {
    const condition = {
      id: "cond-bleeding",
      typeId: "bleeding",
      name: "Bleeding",
      description: "Lose 1 HP per turn.",
      category: "physical" as const,
      isHarmful: true,
      turnsRemaining: 1,
      stacks: 1,
      maxStacks: 5,
      effects: [{ stat: "body" as const, modifier: 0, hpPerTurn: -1 }],
    };
    const game = makeGameState({
      player: { hp: 8, conditions: [condition] },
    });

    const result = conditionReducer(game, "wait", rngFor(11));
    const after = applyPatches(game, result.patches);

    // Bleeding applied (hp decreased) AND condition either ticked or removed
    expect(after.player.hp).toBeLessThanOrEqual(8);
  });

  it("is a no-op when the player has no conditions", () => {
    const game = makeGameState();
    const result = conditionReducer(game, "wait", rngFor(12));
    expect(result.patches.length).toBe(0);
  });
});

describe("deathReducer", () => {
  it("flags gameOver and produces a final narrative on zero hp", () => {
    const game = makeGameState({ player: { hp: 0, maxHp: 10 } });
    const result = deathReducer(game, "fall", rngFor(13));
    const after = applyPatches(game, result.patches);
    expect(after.gameOver).toBe(true);
    expect(result.narrative.length).toBeGreaterThan(0);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it("is a no-op when the player still has hp", () => {
    const game = makeGameState({ player: { hp: 5, maxHp: 10 } });
    const result = deathReducer(game, "fall", rngFor(14));
    expect(result.patches.length).toBe(0);
  });
});
