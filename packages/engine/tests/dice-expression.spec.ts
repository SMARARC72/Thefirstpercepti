import { describe, expect, it } from 'vitest';

import { parseDiceExpression, rollDice } from '../src/dice-expression';

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fixedSequence(values: number[]): () => number {
  let index = 0;
  return () => {
    if (index >= values.length) {
      throw new Error(`fixedSequence exhausted after ${values.length} calls`);
    }
    const v = values[index];
    index += 1;
    return v;
  };
}

describe('parseDiceExpression', () => {
  it('parses NdM with no modifier', () => {
    expect(parseDiceExpression('1d20')).toMatchObject({
      count: 1,
      sides: 20,
      modifier: 0,
      raw: '1d20',
    });
    expect(parseDiceExpression('2d6')).toMatchObject({ count: 2, sides: 6, modifier: 0 });
    expect(parseDiceExpression('4d6')).toMatchObject({ count: 4, sides: 6, modifier: 0 });
  });

  it('parses positive and negative modifiers', () => {
    expect(parseDiceExpression('2d6+3')).toMatchObject({ count: 2, sides: 6, modifier: 3 });
    expect(parseDiceExpression('1d8-2')).toMatchObject({ count: 1, sides: 8, modifier: -2 });
    expect(parseDiceExpression('3d8+10')).toMatchObject({ count: 3, sides: 8, modifier: 10 });
  });

  it('parses keep-highest and keep-lowest', () => {
    expect(parseDiceExpression('4d6kh3').keep).toEqual({ mode: 'kh', count: 3 });
    expect(parseDiceExpression('2d20kh1').keep).toEqual({ mode: 'kh', count: 1 });
    expect(parseDiceExpression('2d20kl1').keep).toEqual({ mode: 'kl', count: 1 });
  });

  it('preserves the raw expression', () => {
    expect(parseDiceExpression('2d6+3').raw).toBe('2d6+3');
    expect(parseDiceExpression('1D20+5').raw).toBe('1D20+5');
  });

  it('is case-insensitive', () => {
    expect(parseDiceExpression('1D20+5')).toMatchObject({ count: 1, sides: 20, modifier: 5 });
    expect(parseDiceExpression('4D6KH3').keep).toEqual({ mode: 'kh', count: 3 });
  });

  it('tolerates whitespace', () => {
    expect(parseDiceExpression('1d20 + 5')).toMatchObject({ count: 1, sides: 20, modifier: 5 });
    expect(parseDiceExpression('  2d6  -  2  ')).toMatchObject({ count: 2, sides: 6, modifier: -2 });
  });

  it('rejects malformed expressions', () => {
    expect(() => parseDiceExpression('')).toThrow();
    expect(() => parseDiceExpression('   ')).toThrow();
    expect(() => parseDiceExpression('abc')).toThrow();
    expect(() => parseDiceExpression('throwing a bone')).toThrow();
    expect(() => parseDiceExpression('d')).toThrow();
    expect(() => parseDiceExpression('d20')).toThrow();
    expect(() => parseDiceExpression('1d')).toThrow();
  });

  it('rejects zero dice or zero-sided dice', () => {
    expect(() => parseDiceExpression('0d20')).toThrow();
    expect(() => parseDiceExpression('1d0')).toThrow();
    expect(() => parseDiceExpression('1d1')).toThrow();
  });

  it('rejects malformed or impossible keep clauses', () => {
    expect(() => parseDiceExpression('1d20kh')).toThrow();
    expect(() => parseDiceExpression('1d20kh0')).toThrow();
    expect(() => parseDiceExpression('1d20kh1')).toThrow();
    expect(() => parseDiceExpression('1d20kh3')).toThrow();
    expect(() => parseDiceExpression('2d20kh2')).toThrow();
    expect(() => parseDiceExpression('2d20kh3')).toThrow();
  });
});

describe('rollDice', () => {
  it('produces totals within range for 1d20+5 over 100 rolls', () => {
    for (let i = 0; i < 100; i += 1) {
      const roll = rollDice('1d20+5', Math.random);
      expect(roll.total).toBeGreaterThanOrEqual(6);
      expect(roll.total).toBeLessThanOrEqual(25);
      expect(roll.individualRolls).toHaveLength(1);
      expect(roll.keptRolls).toEqual(roll.individualRolls);
      expect(roll.parsed.modifier).toBe(5);
    }
  });

  it('is deterministic for the same seeded rng sequence', () => {
    const seed = 0xdecaf;
    const a = rollDice('4d6kh3', mulberry32(seed));
    const b = rollDice('4d6kh3', mulberry32(seed));
    expect(a).toEqual(b);

    const rngA = mulberry32(42);
    const rngB = mulberry32(42);
    const sequenceA = Array.from({ length: 5 }, () => rollDice('2d20kh1+3', rngA).total);
    const sequenceB = Array.from({ length: 5 }, () => rollDice('2d20kh1+3', rngB).total);
    expect(sequenceA).toEqual(sequenceB);
  });

  it('rolls 4d6kh3: rolls four, keeps the three highest, sums them', () => {
    const rng = fixedSequence([0.1, 0.5, 0.9, 0.3]);
    const roll = rollDice('4d6kh3', rng);
    // floor(0.1*6)+1=1, floor(0.5*6)+1=4, floor(0.9*6)+1=6, floor(0.3*6)+1=2
    expect(roll.individualRolls).toEqual([1, 4, 6, 2]);
    expect(roll.keptRolls.slice().sort()).toEqual([2, 4, 6]);
    expect(roll.total).toBe(2 + 4 + 6);
  });

  it('handles 4d6kh3 with a positive modifier', () => {
    const rng = fixedSequence([0.1, 0.5, 0.9, 0.3]);
    const roll = rollDice('4d6kh3+1', rng);
    expect(roll.total).toBe(2 + 4 + 6 + 1);
  });

  it('2d20kh1 is 5e advantage: max of the two d20s plus modifier', () => {
    const rng = fixedSequence([0.2, 0.8]);
    const roll = rollDice('2d20kh1+5', rng);
    // floor(0.2*20)+1=5, floor(0.8*20)+1=17
    expect(roll.individualRolls).toEqual([5, 17]);
    expect(roll.keptRolls).toEqual([17]);
    expect(roll.total).toBe(17 + 5);
  });

  it('2d20kl1 is 5e disadvantage: min of the two d20s plus modifier', () => {
    const rng = fixedSequence([0.2, 0.8]);
    const roll = rollDice('2d20kl1+5', rng);
    expect(roll.individualRolls).toEqual([5, 17]);
    expect(roll.keptRolls).toEqual([5]);
    expect(roll.total).toBe(5 + 5);
  });

  it('applies negative modifiers', () => {
    const rng = fixedSequence([0.5]);
    const roll = rollDice('1d20-3', rng);
    // floor(0.5*20)+1 = 11
    expect(roll.individualRolls).toEqual([11]);
    expect(roll.total).toBe(11 - 3);
  });

  it('rng=0 yields the minimum face (1), not 0', () => {
    const roll = rollDice('1d20', () => 0);
    expect(roll.individualRolls).toEqual([1]);
    expect(roll.total).toBe(1);

    const big = rollDice('3d100', () => 0);
    expect(big.individualRolls).toEqual([1, 1, 1]);
    expect(big.total).toBe(3);
  });

  it('rng near 1 yields the maximum face', () => {
    const almostOne = () => 0.9999999999;
    const d20 = rollDice('1d20', almostOne);
    expect(d20.individualRolls).toEqual([20]);
    expect(d20.total).toBe(20);

    const d6 = rollDice('1d6', almostOne);
    expect(d6.individualRolls).toEqual([6]);
    expect(d6.total).toBe(6);
  });

  it('exposes the parsed structure on the roll result', () => {
    const roll = rollDice('2d20kh1+5', () => 0.5);
    expect(roll.expression).toBe('2d20kh1+5');
    expect(roll.parsed.count).toBe(2);
    expect(roll.parsed.sides).toBe(20);
    expect(roll.parsed.modifier).toBe(5);
    expect(roll.parsed.keep).toEqual({ mode: 'kh', count: 1 });
    expect(roll.parsed.raw).toBe('2d20kh1+5');
  });

  it('propagates parse errors through rollDice', () => {
    expect(() => rollDice('not-a-roll', Math.random)).toThrow();
    expect(() => rollDice('1d20kh1', Math.random)).toThrow();
  });
});
