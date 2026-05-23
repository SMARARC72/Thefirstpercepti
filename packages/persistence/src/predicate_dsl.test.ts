/**
 * Phase 6a.5.8.2 #18 — predicate DSL tests.
 *
 * Source: @first-perception/types/src/predicate-dsl.ts. Tests live here in
 * persistence because packages/types vitest has a pre-existing config issue
 * (logged as v0.8.1 hygiene; not in 6a.5.8 scope).
 *
 * Validates parser + Zod schema against the actual P-01 corpus authored in
 * 6a.6 commit 1 plus negative cases.
 */
import { describe, it, expect } from "vitest";
import {
  parsePredicate,
  isValidPredicate,
  PredicateStringZ,
  AdmissionRulePredicateZ,
} from "@first-perception/types";

describe("predicate-dsl / parser (Phase 6a.5.8.2 #18)", () => {
  it("parses a bare atom", () => {
    const ast = parsePredicate("purely_economic_with_no_doctrinal_axis");
    expect(ast).toEqual({ kind: "atom", key: "purely_economic_with_no_doctrinal_axis", values: [] });
  });

  it("parses a key:value atom", () => {
    const ast = parsePredicate("involves_npc:npc-marrow-saint-ilyra");
    expect(ast).toEqual({ kind: "atom", key: "involves_npc", values: ["npc-marrow-saint-ilyra"] });
  });

  it("parses a compound key:value:value atom", () => {
    const ast = parsePredicate("involves_faction_action:fac-civic-bell-court:strike_emergent_name_claim");
    expect(ast).toEqual({
      kind: "atom",
      key: "involves_faction_action",
      values: ["fac-civic-bell-court", "strike_emergent_name_claim"],
    });
  });

  it("parses an OR chain (3 atoms)", () => {
    const ast = parsePredicate(
      "involves_npc:npc-marrow-saint-ilyra OR involves_location:loc-greywake-dry-fountain OR involves_substrate:the_unnamed_responsiveness",
    );
    expect(ast.kind).toBe("or");
    if (ast.kind !== "or") throw new Error("type narrow");
    expect(ast.operands).toHaveLength(3);
    expect(ast.operands[0]).toEqual({ kind: "atom", key: "involves_npc", values: ["npc-marrow-saint-ilyra"] });
  });

  it("parses an AND chain with NOT (precedence NOT > AND > OR)", () => {
    const ast = parsePredicate(
      "quest_archetype:economic AND involves_faction:fac-merchant-tide-league AND NOT involves_npc:npc-marrow-saint-ilyra",
    );
    expect(ast.kind).toBe("and");
    if (ast.kind !== "and") throw new Error("type narrow");
    expect(ast.operands).toHaveLength(3);
    // 3rd operand should be NOT-wrapped
    expect(ast.operands[2].kind).toBe("not");
  });

  it("handles OR with AND children correctly (precedence)", () => {
    // a OR b AND c  parses as  a OR (b AND c)
    const ast = parsePredicate("a:1 OR b:2 AND c:3");
    expect(ast.kind).toBe("or");
    if (ast.kind !== "or") throw new Error("type narrow");
    expect(ast.operands).toHaveLength(2);
    expect(ast.operands[0]).toEqual({ kind: "atom", key: "a", values: ["1"] });
    expect(ast.operands[1].kind).toBe("and");
  });
});

describe("predicate-dsl / rejects invalid input", () => {
  it("rejects empty string", () => {
    expect(() => parsePredicate("")).toThrow(/empty/);
  });

  it("rejects bare colon", () => {
    expect(() => parsePredicate(":value")).toThrow();
  });

  it("rejects trailing operator", () => {
    expect(() => parsePredicate("a:1 AND")).toThrow();
  });

  it("rejects key starting with uppercase (grammar enforces lowercase start)", () => {
    expect(() => parsePredicate("Involves_npc:x")).toThrow(/invalid key/);
  });

  it("rejects unknown characters", () => {
    expect(() => parsePredicate("a:1 & b:2")).toThrow();
  });

  it("isValidPredicate returns false for invalid input (no throw)", () => {
    expect(isValidPredicate("")).toBe(false);
    expect(isValidPredicate(":value")).toBe(false);
  });

  it("isValidPredicate returns true for the P-01 admission_rules", () => {
    expect(isValidPredicate("involves_npc:npc-marrow-saint-ilyra OR involves_location:loc-greywake-dry-fountain OR involves_substrate:the_unnamed_responsiveness")).toBe(true);
    expect(isValidPredicate("purely_economic_with_no_doctrinal_axis")).toBe(true);
    expect(isValidPredicate("involves_faction_action:fac-civic-bell-court:strike_emergent_name_claim")).toBe(true);
    expect(isValidPredicate("purely_procedural_with_no_succession_axis")).toBe(true);
    expect(isValidPredicate("involves_faction:fac-merchant-tide-league AND involves_mediation_role:drowned_church_or_bell_court")).toBe(true);
    expect(isValidPredicate("quest_archetype:economic AND involves_faction:fac-merchant-tide-league AND NOT involves_npc:npc-marrow-saint-ilyra")).toBe(true);
  });
});

describe("predicate-dsl / Zod schema integration", () => {
  it("PredicateStringZ accepts valid predicate", () => {
    const r = PredicateStringZ.safeParse("involves_npc:npc-x");
    expect(r.success).toBe(true);
  });

  it("PredicateStringZ rejects invalid predicate", () => {
    const r = PredicateStringZ.safeParse("");
    expect(r.success).toBe(false);
  });

  it("AdmissionRulePredicateZ validates a P-01 rule row", () => {
    const r = AdmissionRulePredicateZ.safeParse({
      rule_id: "p01_admit_ilyra_or_unnamed_involvement",
      accepts_quest_if: "involves_npc:npc-marrow-saint-ilyra OR involves_location:loc-greywake-dry-fountain",
      rejects_quest_if: "purely_economic_with_no_doctrinal_axis",
    });
    expect(r.success).toBe(true);
  });

  it("AdmissionRulePredicateZ rejects empty rule_id", () => {
    const r = AdmissionRulePredicateZ.safeParse({
      rule_id: "",
      accepts_quest_if: "a:b",
      rejects_quest_if: "c:d",
    });
    expect(r.success).toBe(false);
  });

  it("AdmissionRulePredicateZ rejects invalid predicate strings", () => {
    const r = AdmissionRulePredicateZ.safeParse({
      rule_id: "r",
      accepts_quest_if: "::: garbage",
      rejects_quest_if: "c:d",
    });
    expect(r.success).toBe(false);
  });
});
