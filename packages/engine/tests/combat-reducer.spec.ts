/**
 * Phase 9a combat reducer tests.
 *
 * Covers the three additions:
 *   - 5e action economy gating (action / bonusAction / reaction)
 *   - Proficiency bonus folded into attack rolls
 *   - Dice-expression damage rolls on hit, with triumph doubling dice
 *
 * Other Phase-8d invariants (RollBand→TaleTone consistency) live in
 * `roll-band-consistency.spec.ts`; the bugfix tests in
 * `reducer-bugfixes.spec.ts` continue to lock in the graze / counterstrike
 * split.
 */

import { describe, expect, it } from 'vitest';
import type {
  GameState,
  Item,
  NpcState,
  Player,
} from '@first-perception/types';
import { combatReducer, resetActionEconomyPatches } from '../src/reducers/combatReducer';
import { applyPatches } from '../src/state-adapter';
import { SeededRNG } from '../src/engine/DiceEngine';
import { makeGameState, makePlayer, makeNpc } from './fixtures';

class FixedDieRNG extends SeededRNG {
  constructor(
    private readonly fixedDie: number,
    private readonly fixedNext: number = 0.99,
    seed = 1
  ) {
    super(seed);
  }
  override rollDie(_faces: number): number {
    return this.fixedDie;
  }
  override next(): number {
    return this.fixedNext;
  }
}

function makeGameWithPlayer(playerOverrides: Partial<Player> = {}, npcOverrides: Partial<NpcState> = {}): GameState {
  const npc = makeNpc({
    id: 'npc-target',
    name: 'Iron Wraith',
    disposition: 'hostile',
    dialogueState: { body: 2, grace: 2, ruin: 0, hp: 8, trust: 0 },
    ...npcOverrides,
  });
  return makeGameState({
    player: {
      proficiencyBonus: 2,
      hitDice: { current: 1, max: 1, die: 'd8' },
      savingThrowProficiencies: [],
      attunementSlots: { used: 0, max: 3 },
      actionEconomy: { action: true, bonusAction: true, reaction: true },
      ...playerOverrides,
    },
    npcs: [npc],
  });
}

// =============================================================================
// ACTION ECONOMY
// =============================================================================

describe('combatReducer — action economy gate', () => {
  it('consumes the action slot on a default attack', () => {
    const game = makeGameWithPlayer();
    const result = combatReducer(game, 'attack iron wraith', new FixedDieRNG(10));
    const after = applyPatches(game, result.patches);
    expect(after.player.actionEconomy?.action).toBe(false);
    expect(after.player.actionEconomy?.bonusAction).toBe(true);
    expect(after.player.actionEconomy?.reaction).toBe(true);
  });

  it('consumes the bonus-action slot for quick strikes / off-hand attacks', () => {
    const game = makeGameWithPlayer();
    const result = combatReducer(game, 'quick strike iron wraith', new FixedDieRNG(10));
    const after = applyPatches(game, result.patches);
    expect(after.player.actionEconomy?.action).toBe(true);
    expect(after.player.actionEconomy?.bonusAction).toBe(false);
    expect(after.player.actionEconomy?.reaction).toBe(true);
  });

  it('consumes the reaction slot on riposte / parry / counter verbs', () => {
    const game = makeGameWithPlayer();
    const result = combatReducer(game, 'riposte iron wraith', new FixedDieRNG(10));
    const after = applyPatches(game, result.patches);
    expect(after.player.actionEconomy?.action).toBe(true);
    expect(after.player.actionEconomy?.bonusAction).toBe(true);
    expect(after.player.actionEconomy?.reaction).toBe(false);
  });

  it('refuses an attack when the action slot is already spent', () => {
    const game = makeGameWithPlayer({
      actionEconomy: { action: false, bonusAction: true, reaction: true },
    });
    const result = combatReducer(game, 'attack iron wraith', new FixedDieRNG(20));
    // No roll on a refused verb — the gate fires before any die hits the table.
    expect(result.rolls.length).toBe(0);
    expect(result.feedback.toLowerCase()).toContain('action');
    const after = applyPatches(game, result.patches);
    // Slot stays false; no patches should flip it.
    expect(after.player.actionEconomy?.action).toBe(false);
    expect(result.narrative[0]?.title).toBe('No Slot Left');
    expect(result.narrative[0]?.tone).toBe('warning');
  });

  it('refuses a bonus-action verb when the bonus-action slot is spent', () => {
    const game = makeGameWithPlayer({
      actionEconomy: { action: true, bonusAction: false, reaction: true },
    });
    const result = combatReducer(game, 'quick strike iron wraith', new FixedDieRNG(20));
    expect(result.rolls.length).toBe(0);
    expect(result.narrative[0]?.title).toBe('No Slot Left');
    expect(result.feedback.toLowerCase()).toContain('bonus action');
  });

  it('surrender bypasses the action economy entirely', () => {
    const game = makeGameWithPlayer({
      actionEconomy: { action: false, bonusAction: false, reaction: false },
    });
    const result = combatReducer(game, 'surrender', new FixedDieRNG(1));
    expect(result.feedback.toLowerCase()).toContain('surrender');
    // No economy patch on surrender — it's a narrative resignation, not a
    // mechanical combat verb.
    const econPatches = result.patches.filter((p) => p.path.startsWith('/player/actionEconomy'));
    expect(econPatches.length).toBe(0);
  });

  it('defaults missing actionEconomy on the player snapshot to all-available', () => {
    const game = makeGameWithPlayer({ actionEconomy: undefined });
    const result = combatReducer(game, 'attack iron wraith', new FixedDieRNG(10));
    // The reducer should NOT refuse — it should treat missing economy as full.
    expect(result.rolls.length).toBe(1);
  });

  it('initialises actionEconomy on the snapshot when consuming a slot from a missing-field Player', () => {
    // Regression for Codex P2 on PR #12: nested-path patches like
    // `/player/actionEconomy/action` are dropped silently when the
    // intermediate object doesn't exist, which would no-op the gate
    // for any Player constructed without actionEconomy (the apps/web
    // createGameFromCreation path). The fix is a full-object replace;
    // this test locks that in by applying the patches and asserting a
    // second attack on the same turn IS refused.
    const game = makeGameWithPlayer({ actionEconomy: undefined });
    const first = combatReducer(game, 'attack iron wraith', new FixedDieRNG(10));
    const after = applyPatches(game, first.patches);
    expect(after.player.actionEconomy).toEqual({
      action: false,
      bonusAction: true,
      reaction: true,
    });
    const second = combatReducer(after, 'attack iron wraith', new FixedDieRNG(10));
    // Second attack on the same turn must hit the spent-slot gate.
    expect(second.feedback.toLowerCase()).toContain("already taken your action");
    expect(second.rolls.length).toBe(0);
  });

  it('resetActionEconomyPatches returns patches that restore all slots to true', () => {
    const game = makeGameWithPlayer({
      actionEconomy: { action: false, bonusAction: false, reaction: false },
    });
    const after = applyPatches(game, resetActionEconomyPatches());
    expect(after.player.actionEconomy).toEqual({
      action: true,
      bonusAction: true,
      reaction: true,
    });
  });
});

// =============================================================================
// PROFICIENCY BONUS
// =============================================================================

describe('combatReducer — proficiency bonus is folded into the attack roll', () => {
  it('roll.modifier reflects stat + proficiencyBonus on a default attack', () => {
    const game = makeGameWithPlayer({
      stats: { ...makePlayer().stats, body: 3 },
      proficiencyBonus: 2,
    });
    const result = combatReducer(game, 'attack iron wraith', new FixedDieRNG(10));
    expect(result.rolls.length).toBe(1);
    // body=3 + PB=2 = +5
    expect(result.rolls[0].modifier).toBe(5);
    expect(result.rolls[0].total).toBe(15); // die=10 + 5
  });

  it('a higher proficiencyBonus shifts the attack total accordingly', () => {
    const lowPB = makeGameWithPlayer({ stats: { ...makePlayer().stats, body: 3 }, proficiencyBonus: 2 });
    const highPB = makeGameWithPlayer({ stats: { ...makePlayer().stats, body: 3 }, proficiencyBonus: 6 });
    const r1 = combatReducer(lowPB, 'attack iron wraith', new FixedDieRNG(10));
    const r2 = combatReducer(highPB, 'attack iron wraith', new FixedDieRNG(10));
    expect(r2.rolls[0].total - r1.rolls[0].total).toBe(4);
  });
});

// =============================================================================
// DICE-EXPRESSION DAMAGE
// =============================================================================

describe('combatReducer — damage rolls flow through dice-expression', () => {
  it('unarmed damage uses 1d4 + str_mod on a clean success', () => {
    // body=2 mod, PB=2 → +4 total; die=8, total=12 vs DC=12 (npc body=2, grace=2) → margin=0 → success_with_cost (graze).
    // Bump body to land on a clean success: stats.body=3, PB=2, die=8, total=13, margin=+1 → clean_success.
    const game = makeGameWithPlayer({
      stats: { ...makePlayer().stats, body: 3 },
      inventory: [], // no weapon
    });
    const result = combatReducer(game, 'attack iron wraith', new FixedDieRNG(8, 0.5));
    expect(result.rolls[0].band).toBe('clean_success');
    const narrativeBlob = result.narrative.map((n) => n.body).join(' ');
    // Damage expression: 1d4 + body=3 → "1d4+3"
    expect(narrativeBlob).toMatch(/\(1d4\+3\)/);
  });

  it('equipped weapons swap the damage die to 1d6 and stack damage-effect bonuses', () => {
    const weapon: Item = {
      id: 'item-spike',
      name: 'iron spike',
      type: 'weapon',
      description: 'A short iron spike.',
      rarity: 'common',
      effects: [{ type: 'damage', target: 'body', value: 1 }],
    };
    const game = makeGameWithPlayer(
      { stats: { ...makePlayer().stats, body: 3 }, inventory: [weapon] },
      // beef up the npc so the wound tale (which carries the expression) lands
      // instead of the slain branch.
      { dialogueState: { body: 2, grace: 2, ruin: 0, hp: 30, trust: 0 } }
    );
    const result = combatReducer(game, 'attack iron wraith', new FixedDieRNG(8, 0.5));
    const narrativeBlob = result.narrative.map((n) => n.body).join(' ');
    // body=3 mod; weapon adds +1 → damage modifier=+4, die=d6.
    expect(narrativeBlob).toMatch(/\(1d6\+4\)/);
  });

  it('a triumph (critical_success) doubles the dice count but not the modifier', () => {
    // die=20, body=3, PB=2 → total=25 vs DC=12 → margin=+13 → critical_success → triumph.
    // npc hp=8, expected damage ≥ 5 so the npc may fall; bump npc hp high enough to keep it alive
    // and reveal the "Triumph" tale title.
    const game = makeGameWithPlayer(
      { stats: { ...makePlayer().stats, body: 3 }, inventory: [] },
      { dialogueState: { body: 2, grace: 2, ruin: 0, hp: 30, trust: 0 } }
    );
    const result = combatReducer(game, 'attack iron wraith', new FixedDieRNG(20, 0.5));
    expect(result.rolls[0].band).toBe('critical_success');
    const narrativeBlob = result.narrative.map((n) => n.body).join(' ');
    // Crit canon: dice doubled (1d4 → 2d4), modifier unchanged (+3).
    expect(narrativeBlob).toMatch(/\(2d4\+3\)/);
  });

  it('rolled damage is deterministic for a fixed RNG (1d4 + str_mod with fixed dice)', () => {
    const game = makeGameWithPlayer(
      { stats: { ...makePlayer().stats, body: 1 }, inventory: [] }, // str_mod = +1
      { dialogueState: { body: 2, grace: 2, ruin: 0, hp: 10, trust: 0 } }
    );
    // d20 die=10 → total = 10 + 1 + 2 = 13 vs DC=12 → margin=+1 → clean_success.
    // Damage d4: floor(0.5 * 4) + 1 = 3; + str_mod 1 → 4. NPC starts at 10 → 6.
    const result = combatReducer(game, 'attack iron wraith', new FixedDieRNG(10, 0.5));
    expect(result.rolls[0].band).toBe('clean_success');
    const after = applyPatches(game, result.patches);
    const npcAfter = after.npcs.find((n) => n.id === 'npc-target')!;
    expect(npcAfter.hp).toBe(6);
  });
});
