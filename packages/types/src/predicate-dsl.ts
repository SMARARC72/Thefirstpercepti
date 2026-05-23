/**
 * Phase 6a.5.8.2 #18 — subplot_admission_policy predicate DSL.
 *
 * Formalizes the predicate strings used in subplot_admission_policy.admission_rules
 * (accepts_quest_if / rejects_quest_if). Authored ad-hoc during 6a.6 P-01
 * commit 1; this module locks the grammar + provides a parser + Zod schema.
 *
 * Grammar (flat — no parenthesized grouping):
 *
 *   predicate ::= or_expr
 *   or_expr   ::= and_expr ('OR' and_expr)*
 *   and_expr  ::= not_expr ('AND' not_expr)*
 *   not_expr  ::= 'NOT' atom | atom
 *   atom      ::= key (':' value)*
 *   key       ::= [a-z][a-z0-9_]*
 *   value     ::= [a-zA-Z0-9_-]+
 *
 * Operator precedence: NOT > AND > OR (standard Boolean).
 * Whitespace skipped between tokens.
 * Tokens AND / OR / NOT are case-SENSITIVE uppercase (matches existing
 * P-01 corpus convention).
 *
 * Examples (all valid):
 *   involves_npc:npc-marrow-saint-ilyra
 *   involves_faction_action:fac-civic-bell-court:strike_emergent_name_claim
 *   involves_npc:npc-x OR involves_location:loc-y
 *   quest_archetype:economic AND involves_faction:fac-z AND NOT involves_npc:npc-w
 *   purely_economic_with_no_doctrinal_axis
 *
 * v0.9 enhancement candidates (NOT in v0.8):
 *   - Parenthesized grouping: (A OR B) AND C
 *   - Quoted values with spaces: involves_quest_named:"The Hook"
 *   - Numeric atoms: pressure:>5
 *
 * If a predicate fails to parse, the engine cannot resolve it at first-read;
 * Zod-validation at content-author time catches this before runtime.
 */

import { z } from "zod";

// ============================================================================
// AST types
// ============================================================================

export type PredicateAst =
  | { kind: "atom"; key: string; values: string[] }
  | { kind: "not"; operand: PredicateAst }
  | { kind: "and"; operands: PredicateAst[] }
  | { kind: "or"; operands: PredicateAst[] };

// ============================================================================
// Tokenizer
// ============================================================================

type Token =
  | { kind: "AND" }
  | { kind: "OR" }
  | { kind: "NOT" }
  | { kind: "COLON" }
  | { kind: "IDENT"; value: string }
  | { kind: "EOF" };

const KEY_RE = /^[a-z][a-z0-9_]*$/;
const VALUE_RE = /^[a-zA-Z0-9_-]+$/;
// WORD_RE permissive: accepts identifiers AND digit-led values; key/value
// well-formedness enforced separately by KEY_RE / VALUE_RE in the parser.
const WORD_RE = /^[a-zA-Z0-9_-]+/;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
    if (c === ":") { tokens.push({ kind: "COLON" }); i++; continue; }
    // Word match — could be an operator (AND/OR/NOT, case-sensitive) or an identifier
    const match = input.slice(i).match(WORD_RE);
    if (!match) {
      throw new Error(`Predicate DSL: unexpected character '${c}' at position ${i}`);
    }
    const word = match[0];
    i += word.length;
    if (word === "AND") tokens.push({ kind: "AND" });
    else if (word === "OR") tokens.push({ kind: "OR" });
    else if (word === "NOT") tokens.push({ kind: "NOT" });
    else tokens.push({ kind: "IDENT", value: word });
  }
  tokens.push({ kind: "EOF" });
  return tokens;
}

// ============================================================================
// Parser (recursive descent)
// ============================================================================

class Parser {
  pos = 0;
  constructor(public tokens: Token[]) {}

  peek(): Token { return this.tokens[this.pos]; }
  consume(): Token { return this.tokens[this.pos++]; }
  expect(kind: Token["kind"]): Token {
    const t = this.consume();
    if (t.kind !== kind) {
      throw new Error(`Predicate DSL: expected ${kind} at position ${this.pos - 1}, got ${t.kind}`);
    }
    return t;
  }

  // or_expr ::= and_expr ('OR' and_expr)*
  parseOr(): PredicateAst {
    const first = this.parseAnd();
    if (this.peek().kind !== "OR") return first;
    const operands: PredicateAst[] = [first];
    while (this.peek().kind === "OR") {
      this.consume();
      operands.push(this.parseAnd());
    }
    return { kind: "or", operands };
  }

  // and_expr ::= not_expr ('AND' not_expr)*
  parseAnd(): PredicateAst {
    const first = this.parseNot();
    if (this.peek().kind !== "AND") return first;
    const operands: PredicateAst[] = [first];
    while (this.peek().kind === "AND") {
      this.consume();
      operands.push(this.parseNot());
    }
    return { kind: "and", operands };
  }

  // not_expr ::= 'NOT' atom | atom
  parseNot(): PredicateAst {
    if (this.peek().kind === "NOT") {
      this.consume();
      return { kind: "not", operand: this.parseAtom() };
    }
    return this.parseAtom();
  }

  // atom ::= key (':' value)*
  parseAtom(): PredicateAst {
    const keyTok = this.consume();
    if (keyTok.kind !== "IDENT") {
      throw new Error(`Predicate DSL: expected identifier at position ${this.pos - 1}, got ${keyTok.kind}`);
    }
    const key = keyTok.value;
    if (!KEY_RE.test(key)) {
      throw new Error(`Predicate DSL: invalid key '${key}' (must match ${KEY_RE.source})`);
    }
    const values: string[] = [];
    while (this.peek().kind === "COLON") {
      this.consume();
      const valTok = this.consume();
      if (valTok.kind !== "IDENT") {
        throw new Error(`Predicate DSL: expected value after ':' at position ${this.pos - 1}, got ${valTok.kind}`);
      }
      if (!VALUE_RE.test(valTok.value)) {
        throw new Error(`Predicate DSL: invalid value '${valTok.value}' (must match ${VALUE_RE.source})`);
      }
      values.push(valTok.value);
    }
    return { kind: "atom", key, values };
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a predicate string into an AST. Throws on syntax error.
 */
export function parsePredicate(input: string): PredicateAst {
  if (input.trim() === "") {
    throw new Error("Predicate DSL: empty predicate");
  }
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  const ast = parser.parseOr();
  if (parser.peek().kind !== "EOF") {
    throw new Error(`Predicate DSL: trailing tokens at position ${parser.pos}`);
  }
  return ast;
}

/**
 * Validate a predicate string. Returns true if parseable, false otherwise.
 */
export function isValidPredicate(input: string): boolean {
  try { parsePredicate(input); return true; } catch { return false; }
}

/**
 * Zod schema for predicate strings. Validates grammar via parser.
 * Use in subplot_admission_policy.admission_rules.{accepts_quest_if,rejects_quest_if}.
 */
export const PredicateStringZ = z.string().refine(isValidPredicate, {
  message: "Invalid subplot_admission_policy predicate DSL string (see predicate-dsl.ts grammar).",
});

/**
 * Zod schema for an admission_rule (subplot_admission_policy.admission_rules[]).
 * Both accepts_quest_if + rejects_quest_if predicates validated against grammar.
 */
export const AdmissionRulePredicateZ = z.object({
  rule_id: z.string().min(1),
  accepts_quest_if: PredicateStringZ,
  rejects_quest_if: PredicateStringZ,
}).strict();
