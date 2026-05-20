export interface ParsedDice {
  count: number;
  sides: number;
  modifier: number;
  keep?: { mode: 'kh' | 'kl'; count: number };
  raw: string;
}

export interface DiceRoll {
  expression: string;
  parsed: ParsedDice;
  individualRolls: number[];
  keptRolls: number[];
  total: number;
}

const EXPRESSION_PATTERN = /^(\d+)d(\d+)(?:(kh|kl)(\d+))?([+-]\d+)?$/;

export function parseDiceExpression(expr: string): ParsedDice {
  if (typeof expr !== 'string') {
    throw new Error(`Invalid dice expression: expected string, got ${typeof expr}`);
  }

  const raw = expr;
  const normalized = expr.replace(/\s+/g, '').toLowerCase();

  if (normalized.length === 0) {
    throw new Error('Invalid dice expression: empty string');
  }

  const match = normalized.match(EXPRESSION_PATTERN);
  if (!match) {
    throw new Error(
      `Invalid dice expression: "${expr}". Expected forms: NdM, NdM+K, NdM-K, NdMkhX, NdMklX.`,
    );
  }

  const count = Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);
  const keepMode = match[3] as 'kh' | 'kl' | undefined;
  const keepCount = match[4] ? Number.parseInt(match[4], 10) : undefined;
  const modifier = match[5] ? Number.parseInt(match[5], 10) : 0;

  if (count < 1) {
    throw new Error(`Invalid dice expression "${expr}": dice count must be >= 1, got ${count}.`);
  }
  if (sides < 2) {
    throw new Error(`Invalid dice expression "${expr}": die sides must be >= 2, got ${sides}.`);
  }

  const parsed: ParsedDice = { count, sides, modifier, raw };

  if (keepMode !== undefined) {
    if (keepCount === undefined) {
      throw new Error(`Invalid dice expression "${expr}": keep clause missing count.`);
    }
    if (keepCount < 1) {
      throw new Error(
        `Invalid dice expression "${expr}": keep count must be >= 1, got ${keepCount}.`,
      );
    }
    if (keepCount >= count) {
      // 5e advantage is `2d20kh1`, not `1d20kh1` — keeping all (or more than all) dice is a no-op
      // and almost always a typo (`1d20kh3`, `1d20kh1`), so refuse it loudly.
      throw new Error(
        `Invalid dice expression "${expr}": keep count (${keepCount}) must be less than dice count (${count}).`,
      );
    }
    parsed.keep = { mode: keepMode, count: keepCount };
  }

  return parsed;
}

export function rollDice(expr: string, rng: () => number): DiceRoll {
  const parsed = parseDiceExpression(expr);

  const individualRolls: number[] = [];
  for (let i = 0; i < parsed.count; i += 1) {
    const sample = rng();
    individualRolls.push(Math.floor(sample * parsed.sides) + 1);
  }

  let keptRolls: number[];
  if (parsed.keep) {
    const sorted = [...individualRolls].sort((a, b) => a - b);
    keptRolls =
      parsed.keep.mode === 'kh'
        ? sorted.slice(sorted.length - parsed.keep.count)
        : sorted.slice(0, parsed.keep.count);
  } else {
    keptRolls = [...individualRolls];
  }

  const sum = keptRolls.reduce((acc, value) => acc + value, 0);
  const total = sum + parsed.modifier;

  return {
    expression: expr,
    parsed,
    individualRolls,
    keptRolls,
    total,
  };
}
