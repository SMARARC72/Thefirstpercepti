import { describe, it, expect } from "vitest";
import { blankCreation, createGameFromCreation, submitCommand } from "./game";
import type { GameState, SuggestedAction } from "@first-perception/types";

function validCreation() {
  return {
    ...blankCreation(),
    step: 5 as const,
    name: "Test",
    form: "human" as const,
    formDescription: "A test form",
    perception: "A dry footprint",
    dominantSense: "sight" as const,
    capabilityClaim: "I can endure",
    primaryDomain: "lore" as const,
    posture: "seeker" as const,
    postureDescription: "A test posture",
    optionalDetails: "None",
    desiredItem: "an iron token",
    fear: "nothing",
    leftBehind: "nothing",
  };
}

describe("createGameFromCreation", () => {
  it("produces a valid shared GameState", () => {
    const game = createGameFromCreation(validCreation());

    expect(game.seed).toBeTypeOf("number");
    expect(game.turnCount).toBe(0);
    expect(game.day).toBe(1);
    expect(game.phaseIndex).toBe(0);
    expect(game.currentLocationId).toBeTruthy();
    expect(game.locations.length).toBeGreaterThan(0);
    expect(game.regions.length).toBeGreaterThan(0);
    expect(game.player.id).toBe("player");
    expect(game.player.name).toBe("Test");
    expect(game.player.hp).toBe(game.player.maxHp);
    expect(game.player.focus).toBe(game.player.maxFocus);
    expect(Array.isArray(game.player.inventory)).toBe(true);
    expect(game.player.inventory.length).toBeGreaterThan(0);
    expect(game.player.inventory[0].name).toBeTruthy();
    expect(Array.isArray(game.player.conditions)).toBe(true);
    expect(game.player.conditions[0].name).toBeTruthy();
    expect(Array.isArray(game.npcs)).toBe(true);
    expect(game.npcs.length).toBeGreaterThan(0);
    expect(game.npcs[0].locationId).toBe(game.currentLocationId);
    expect(Array.isArray(game.suggestedActions)).toBe(true);
    expect(game.suggestedActions.length).toBeGreaterThan(0);
    expect(game.suggestedActions[0]).toHaveProperty("label");
    expect(game.suggestedActions[0]).toHaveProperty("command");
    expect(game.gameOver).toBe(false);
    expect(Array.isArray(game.tale)).toBe(true);
    expect(game.tale[0].id).toBeTruthy();
    expect(game.tale[0].tags).toBeDefined();
    expect(Array.isArray(game.journal)).toBe(true);
    expect(game.journal[0].id).toBeTruthy();
    expect(game.journal[0].category).toBeTruthy();
    expect(Array.isArray(game.factions)).toBe(true);
    expect(Array.isArray(game.consequences)).toBe(true);
    expect(Array.isArray(game.rumors)).toBe(true);
  });

  it("produces deterministic state for same inputs", () => {
    const game1 = createGameFromCreation(validCreation());
    const game2 = createGameFromCreation(validCreation());
    expect(game1.seed).toBe(game2.seed);
    expect(game1.player.name).toBe(game2.player.name);
    expect(game1.player.stats).toEqual(game2.player.stats);
    expect(game1.world.location).toBe(game2.world.location);
  });
});

describe("submitCommand", () => {
  it("advances turn count and updates state", () => {
    const game = createGameFromCreation(validCreation());
    const initialTurn = game.turnCount;
    const next = submitCommand(game, "look around");

    expect(next.turnCount).toBe(initialTurn + 1);
    expect(next.world.phaseIndex).not.toBe(game.world.phaseIndex);
    expect(next.fate.length).toBeGreaterThan(0);
    expect(next.tale.length).toBeGreaterThan(0);
    expect(next.lastFeedback).toBeTruthy();
    expect(next.suggestedActions.length).toBeGreaterThan(0);
  });

  it("handles rest command", () => {
    const game = createGameFromCreation(validCreation());
    game.player.hp = 1;
    const next = submitCommand(game, "rest");

    expect(next.turnCount).toBe(1);
    expect(next.player.hp).toBeGreaterThan(1);
    expect(next.tale.length).toBeGreaterThan(0);
  });

  it("handles combat command", () => {
    const game = createGameFromCreation(validCreation());
    const next = submitCommand(game, "attack the threat");

    expect(next.turnCount).toBe(1);
    expect(next.fate.length).toBeGreaterThan(0);
    expect(next.tale.length).toBeGreaterThan(0);
  });

  it("handles help command without advancing turn", () => {
    const game = createGameFromCreation(validCreation());
    const next = submitCommand(game, "help");

    expect(next.turnCount).toBe(0);
    expect(next.lastFeedback.toLowerCase()).toContain("look");
  });

  it("handles unknown command gracefully", () => {
    const game = createGameFromCreation(validCreation());
    const next = submitCommand(game, "do something impossible");

    expect(next.turnCount).toBe(1);
    expect(next.tale.length).toBeGreaterThan(0);
    expect(next.lastFeedback).toBeTruthy();
  });
});

describe("GameState integrity", () => {
  it("maintains location sync after commands", () => {
    const game = createGameFromCreation(validCreation());
    const next = submitCommand(game, "look around");

    const location = next.locations.find((l) => l.id === next.currentLocationId);
    expect(location).toBeDefined();
    expect(location?.name).toBe(next.world.location);
  });

  it(" TaleEntry has required fields after command", () => {
    const game = createGameFromCreation(validCreation());
    const next = submitCommand(game, "listen");

    const entry = next.tale[0];
    expect(entry.id).toBeTruthy();
    expect(entry.turn).toBe(1);
    expect(entry.title).toBeTruthy();
    expect(entry.body).toBeTruthy();
    expect(entry.tone).toMatch(/^(quiet|warning|danger|success|cosmic)$/);
    expect(Array.isArray(entry.tags)).toBe(true);
  });
});
