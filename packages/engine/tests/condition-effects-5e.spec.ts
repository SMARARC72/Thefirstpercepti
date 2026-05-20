import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  evaluateConditions5e,
  getCondition5e,
  loadConditions5e,
  type ActiveCondition5e,
  type Condition5eDef,
  type Condition5eId,
} from '../src/condition-effects-5e.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONTENT_JSON_PATH = resolve(__dirname, '../../../content/world-data/conditions-5e.json');

const ALL_IDS: Condition5eId[] = [
  'blinded',
  'charmed',
  'deafened',
  'exhaustion',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
];

describe('loadConditions5e', () => {
  it('returns the full SRD catalog with 15 entries', () => {
    const all = loadConditions5e();
    expect(all).toHaveLength(15);
  });

  it('every id is unique', () => {
    const all = loadConditions5e();
    const ids = all.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry passes structural validation', () => {
    const all = loadConditions5e();
    for (const def of all) {
      expect(typeof def.id).toBe('string');
      expect(typeof def.label).toBe('string');
      expect(['sensory', 'mental', 'physical', 'metaphysical']).toContain(def.category);
      expect(typeof def.hasLevels).toBe('boolean');
      expect(typeof def.description).toBe('string');
      expect(def.description.length).toBeGreaterThan(0);
      expect(typeof def.recoveryVector).toBe('string');
      expect(Array.isArray(def.effects)).toBe(true);
      expect(def.effects.length).toBeGreaterThan(0);
      for (const eff of def.effects) {
        expect(typeof eff.narrative).toBe('string');
        expect(eff.narrative.length).toBeGreaterThan(0);
      }
      if (def.hasLevels) {
        expect(def.maxLevel).toBe(6);
        expect(def.effects).toHaveLength(6);
        const levels = def.effects.map((e) => e.level).sort();
        expect(levels).toEqual([1, 2, 3, 4, 5, 6]);
      } else {
        expect(def.effects).toHaveLength(1);
      }
    }
  });

  it('contains every SRD condition id', () => {
    const all = loadConditions5e();
    const ids = new Set(all.map((c) => c.id));
    for (const expected of ALL_IDS) {
      expect(ids.has(expected)).toBe(true);
    }
  });

  it('embedded data matches the authored JSON content', () => {
    const jsonText = readFileSync(CONTENT_JSON_PATH, 'utf-8');
    const fromDisk = JSON.parse(jsonText) as Condition5eDef[];
    const fromEngine = loadConditions5e();
    expect(fromEngine).toEqual(fromDisk);
  });
});

describe('getCondition5e', () => {
  it('returns the definition for a known id', () => {
    const def = getCondition5e('blinded');
    expect(def.id).toBe('blinded');
    expect(def.label).toBe('Blinded');
  });

  it('throws on unknown id', () => {
    expect(() => getCondition5e('unknown' as Condition5eId)).toThrow(/Unknown 5e condition/);
  });
});

describe('evaluateConditions5e — empty + neutral default', () => {
  it('returns the neutral default for an empty stack', () => {
    const r = evaluateConditions5e([]);
    expect(r.hasAdvantage.size).toBe(0);
    expect(r.hasDisadvantage.size).toBe(0);
    expect(r.savingThrowDisadvantage.size).toBe(0);
    expect(r.speedMultiplier).toBe(1);
    expect(r.cantTakeActions).toBe(false);
    expect(r.cantTakeReactions).toBe(false);
    expect(r.autoFailStrengthDexSaves).toBe(false);
    expect(r.hpMaxMultiplier).toBe(1);
    expect(r.unconscious).toBe(false);
  });
});

describe('evaluateConditions5e — single-condition round-trips', () => {
  it('blinded: attackers advantage + own-attacks disadvantage', () => {
    const r = evaluateConditions5e([{ id: 'blinded' }]);
    expect(r.hasAdvantage.has('attackers-against-self')).toBe(true);
    expect(r.hasDisadvantage.has('own-attacks')).toBe(true);
    expect(r.speedMultiplier).toBe(1);
    expect(r.unconscious).toBe(false);
  });

  it('charmed: no mechanical advantage/disadvantage flags (social-only)', () => {
    const r = evaluateConditions5e([{ id: 'charmed' }]);
    expect(r.hasAdvantage.size).toBe(0);
    expect(r.hasDisadvantage.size).toBe(0);
    expect(r.speedMultiplier).toBe(1);
  });

  it('deafened: no attack flags (sense-only)', () => {
    const r = evaluateConditions5e([{ id: 'deafened' }]);
    expect(r.hasAdvantage.size).toBe(0);
    expect(r.hasDisadvantage.size).toBe(0);
  });

  it('frightened: disadvantage on ability checks and attacks', () => {
    const r = evaluateConditions5e([{ id: 'frightened' }]);
    expect(r.hasDisadvantage.has('ability-checks')).toBe(true);
    expect(r.hasDisadvantage.has('own-attacks')).toBe(true);
  });

  it('grappled: speed zero', () => {
    const r = evaluateConditions5e([{ id: 'grappled' }]);
    expect(r.speedMultiplier).toBe(0);
    expect(r.cantTakeActions).toBe(false);
  });

  it('incapacitated: no actions, no reactions', () => {
    const r = evaluateConditions5e([{ id: 'incapacitated' }]);
    expect(r.cantTakeActions).toBe(true);
    expect(r.cantTakeReactions).toBe(true);
  });

  it('invisible: no attack flags at the resolver level (advantage handled by combat context)', () => {
    const r = evaluateConditions5e([{ id: 'invisible' }]);
    expect(r.hasAdvantage.size).toBe(0);
    expect(r.hasDisadvantage.size).toBe(0);
  });

  it('paralyzed: auto-fail STR/DEX saves, attackers advantage, no actions/reactions, speed 0', () => {
    const r = evaluateConditions5e([{ id: 'paralyzed' }]);
    expect(r.autoFailStrengthDexSaves).toBe(true);
    expect(r.hasAdvantage.has('attackers-against-self')).toBe(true);
    expect(r.cantTakeActions).toBe(true);
    expect(r.cantTakeReactions).toBe(true);
    expect(r.speedMultiplier).toBe(0);
  });

  it('petrified: hpMaxMultiplier remains 1 (NOT halved — that is exhaustion 4)', () => {
    const r = evaluateConditions5e([{ id: 'petrified' }]);
    expect(r.hpMaxMultiplier).toBe(1);
    expect(r.autoFailStrengthDexSaves).toBe(true);
    expect(r.hasAdvantage.has('attackers-against-self')).toBe(true);
    expect(r.cantTakeActions).toBe(true);
    expect(r.cantTakeReactions).toBe(true);
    expect(r.speedMultiplier).toBe(0);
    expect(r.savingThrowDisadvantage.has('strength')).toBe(true);
    expect(r.savingThrowDisadvantage.has('dexterity')).toBe(true);
    expect(r.unconscious).toBe(false);
  });

  it('poisoned: disadvantage on ability checks and attacks', () => {
    const r = evaluateConditions5e([{ id: 'poisoned' }]);
    expect(r.hasDisadvantage.has('ability-checks')).toBe(true);
    expect(r.hasDisadvantage.has('own-attacks')).toBe(true);
  });

  it('prone: own-attacks disadvantage', () => {
    const r = evaluateConditions5e([{ id: 'prone' }]);
    expect(r.hasDisadvantage.has('own-attacks')).toBe(true);
  });

  it('restrained: speed 0, attackers advantage, own-attacks disadvantage, dex save disadvantage', () => {
    const r = evaluateConditions5e([{ id: 'restrained' }]);
    expect(r.speedMultiplier).toBe(0);
    expect(r.hasAdvantage.has('attackers-against-self')).toBe(true);
    expect(r.hasDisadvantage.has('own-attacks')).toBe(true);
    expect(r.savingThrowDisadvantage.has('dexterity')).toBe(true);
  });

  it('stunned: no actions/reactions, attackers advantage, auto-fail STR/DEX saves', () => {
    const r = evaluateConditions5e([{ id: 'stunned' }]);
    expect(r.cantTakeActions).toBe(true);
    expect(r.cantTakeReactions).toBe(true);
    expect(r.hasAdvantage.has('attackers-against-self')).toBe(true);
    expect(r.autoFailStrengthDexSaves).toBe(true);
    expect(r.savingThrowDisadvantage.has('strength')).toBe(true);
    expect(r.savingThrowDisadvantage.has('dexterity')).toBe(true);
  });

  it('unconscious: unconscious flag set, attackers advantage, speed 0, no actions', () => {
    const r = evaluateConditions5e([{ id: 'unconscious' }]);
    expect(r.unconscious).toBe(true);
    expect(r.hasAdvantage.has('attackers-against-self')).toBe(true);
    expect(r.cantTakeActions).toBe(true);
    expect(r.cantTakeReactions).toBe(true);
    expect(r.speedMultiplier).toBe(0);
    expect(r.autoFailStrengthDexSaves).toBe(true);
  });
});

describe('evaluateConditions5e — exhaustion stacking', () => {
  it('level 1: disadvantage on all ability checks only', () => {
    const r = evaluateConditions5e([{ id: 'exhaustion', level: 1 }]);
    expect(r.hasDisadvantage.has('ability-checks')).toBe(true);
    expect(r.speedMultiplier).toBe(1);
    expect(r.hasDisadvantage.has('own-attacks')).toBe(false);
    expect(r.hpMaxMultiplier).toBe(1);
  });

  it('level 2: includes level 1 + speed halved', () => {
    const r = evaluateConditions5e([{ id: 'exhaustion', level: 2 }]);
    expect(r.hasDisadvantage.has('ability-checks')).toBe(true);
    expect(r.speedMultiplier).toBe(0.5);
  });

  it('level 3: includes level 1+2 + attack disadvantage + save disadvantage', () => {
    const r = evaluateConditions5e([{ id: 'exhaustion', level: 3 }]);
    expect(r.hasDisadvantage.has('ability-checks')).toBe(true);
    expect(r.speedMultiplier).toBe(0.5);
    expect(r.hasDisadvantage.has('own-attacks')).toBe(true);
    expect(r.savingThrowDisadvantage.has('strength')).toBe(true);
    expect(r.savingThrowDisadvantage.has('dexterity')).toBe(true);
    expect(r.savingThrowDisadvantage.has('constitution')).toBe(true);
    expect(r.savingThrowDisadvantage.has('intelligence')).toBe(true);
    expect(r.savingThrowDisadvantage.has('wisdom')).toBe(true);
    expect(r.savingThrowDisadvantage.has('charisma')).toBe(true);
  });

  it('level 4: includes level 1–3 + hp max halved', () => {
    const r = evaluateConditions5e([{ id: 'exhaustion', level: 4 }]);
    expect(r.hasDisadvantage.has('ability-checks')).toBe(true);
    expect(r.speedMultiplier).toBe(0.5);
    expect(r.hasDisadvantage.has('own-attacks')).toBe(true);
    expect(r.hpMaxMultiplier).toBe(0.5);
  });

  it('level 5: includes level 1–4 + speed reduced to 0', () => {
    const r = evaluateConditions5e([{ id: 'exhaustion', level: 5 }]);
    expect(r.hasDisadvantage.has('ability-checks')).toBe(true);
    expect(r.speedMultiplier).toBe(0);
    expect(r.hasDisadvantage.has('own-attacks')).toBe(true);
    expect(r.hpMaxMultiplier).toBe(0.5);
  });

  it('level 6: sets unconscious flag (death)', () => {
    const r = evaluateConditions5e([{ id: 'exhaustion', level: 6 }]);
    expect(r.unconscious).toBe(true);
    expect(r.speedMultiplier).toBe(0);
    expect(r.hpMaxMultiplier).toBe(0.5);
  });
});

describe('evaluateConditions5e — combining conditions', () => {
  it('prone + restrained: set-semantics — no double-counted advantage', () => {
    const r = evaluateConditions5e([{ id: 'prone' }, { id: 'restrained' }]);
    expect(r.hasDisadvantage.has('own-attacks')).toBe(true);
    expect(r.hasAdvantage.has('attackers-against-self')).toBe(true);
    // sets must dedupe: only one 'attackers-against-self' entry
    expect(r.hasAdvantage.size).toBe(1);
    // own-attacks disadvantage flagged by both — still single entry
    expect([...r.hasDisadvantage].filter((d) => d === 'own-attacks')).toHaveLength(1);
    expect(r.speedMultiplier).toBe(0);
  });

  it('most-restrictive wins: speed 0 overrides halved when both present', () => {
    const r = evaluateConditions5e([
      { id: 'exhaustion', level: 2 }, // speedHalved
      { id: 'grappled' }, // speedReducedToZero
    ]);
    expect(r.speedMultiplier).toBe(0);
  });

  it('hpMaxMultiplier collapses to 0.5 when any source halves it', () => {
    const r = evaluateConditions5e([
      { id: 'petrified' },
      { id: 'exhaustion', level: 4 },
    ]);
    expect(r.hpMaxMultiplier).toBe(0.5);
  });

  it('combining unconscious with anything else preserves the unconscious flag', () => {
    const r = evaluateConditions5e([{ id: 'unconscious' }, { id: 'poisoned' }]);
    expect(r.unconscious).toBe(true);
    expect(r.hasDisadvantage.has('ability-checks')).toBe(true);
  });
});

describe('evaluateConditions5e — error path', () => {
  it('throws on unknown condition id', () => {
    const bad = [{ id: 'wibble' as Condition5eId }] satisfies ActiveCondition5e[];
    expect(() => evaluateConditions5e(bad)).toThrow(/Unknown 5e condition/);
  });
});
