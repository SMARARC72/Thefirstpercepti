/**
 * RuleRegistry tests — Phase 24c §Session 5b Risk #3.
 *
 * Verifies the ARD-017 RuleRegistry abstraction:
 *   1. Schema registration enforces Tier 2 markers
 *   2. Rule add validates against registered schemas
 *   3. findRulesFor() entity/field disambiguation
 *   4. getRule() and listRules() consumption patterns
 *   5. Strict vs non-strict validation modes
 *
 * Smoke-tests against the actual Phase 4.10 rule
 * (opening_hours_disagreement_rule) + its schema.
 */
import { describe, it, expect } from "vitest";
import {
  RuleRegistry,
  validateRuleAgainstSchema,
  deriveSchemaClassName,
  type EngineRule,
  type RuleClassSchema,
  type RuleRegistryFs,
} from "./RuleRegistry.js";

// Fixture: minimal Tier 2 schema following ARD-017 conventions
const disagreementRuleSchema: RuleClassSchema = {
  type: "object",
  required: ["rule_id", "applies_to_entity", "applies_to_field"],
  x_registry_tier: "engine_config",
  x_generator_emission: "none",
  properties: {
    rule_id: { /* type: string */ },
    applies_to_entity: {},
    applies_to_field: {},
    resolution_strategy: {},
  },
};

// Fixture: the Phase 4.10 ratified rule
const openingHoursRule: EngineRule = {
  rule_id: "opening_hours_disagreement_rule_v1",
  applies_to_entity: "institution",
  applies_to_field: "opening_hours",
  resolution_strategy: "highest_trust_source",
  fallback_strategy: "surface_disagreement",
  trust_ranking: [
    { source_kind: "institution_canonical_record", trust: 10 },
    { source_kind: "rumor", trust: 2 },
  ],
  side_effects_on_disagreement: [],
  validator_chain_stage_5_hook: true,
};

describe("RuleRegistry / validateRuleAgainstSchema", () => {
  it("accepts rule satisfying all required fields", () => {
    const result = validateRuleAgainstSchema(openingHoursRule as Record<string, unknown>, disagreementRuleSchema);
    expect(result.valid).toBe(true);
  });

  it("rejects rule missing required fields", () => {
    const bad = { rule_id: "x_v1" }; // missing applies_to_entity + applies_to_field
    const result = validateRuleAgainstSchema(bad, disagreementRuleSchema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("Missing required field: 'applies_to_entity'");
      expect(result.errors).toContain("Missing required field: 'applies_to_field'");
    }
  });

  it("rejects rule missing rule_id (always required regardless of schema)", () => {
    const bad = { applies_to_entity: "x", applies_to_field: "y" };
    const result = validateRuleAgainstSchema(bad, disagreementRuleSchema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("rule_id"))).toBe(true);
    }
  });
});

describe("RuleRegistry / schema registration discipline", () => {
  it("refuses schemas without x_registry_tier='engine_config' (Tier 2 leakage guard)", () => {
    const reg = new RuleRegistry();
    const badSchema: RuleClassSchema = {
      type: "object",
      required: [],
      // NO x_registry_tier — would be a Tier 1 schema_pack fragment
    };
    expect(() => reg.registerSchema("rogue_schema", badSchema)).toThrow(
      /x_registry_tier="engine_config"/,
    );
  });

  it("accepts schemas with the engine_config marker", () => {
    const reg = new RuleRegistry();
    expect(() => reg.registerSchema("disagreement_rule", disagreementRuleSchema)).not.toThrow();
  });
});

describe("RuleRegistry / addRule + strict validation", () => {
  it("adds a valid rule with no schema registered (validation skipped)", () => {
    const reg = new RuleRegistry();
    reg.addRule(openingHoursRule);
    expect(reg.size()).toBe(1);
    expect(reg.getRule("opening_hours_disagreement_rule_v1")).toBe(openingHoursRule);
  });

  it("adds a valid rule with schema (validation passes)", () => {
    const reg = new RuleRegistry();
    reg.registerSchema("disagreement_rule", disagreementRuleSchema);
    reg.addRule(openingHoursRule, "disagreement_rule");
    expect(reg.size()).toBe(1);
  });

  it("throws on invalid rule under strict validation (default)", () => {
    const reg = new RuleRegistry();
    reg.registerSchema("disagreement_rule", disagreementRuleSchema);
    const bad: EngineRule = { rule_id: "bad_v1" }; // missing applies_to_entity + applies_to_field
    expect(() => reg.addRule(bad, "disagreement_rule")).toThrow(/failed Tier 2 validation/);
    expect(reg.size()).toBe(0);
  });

  it("collects errors instead of throwing under non-strict validation", () => {
    const reg = new RuleRegistry({ strictValidation: false });
    reg.registerSchema("disagreement_rule", disagreementRuleSchema);
    const bad: EngineRule = { rule_id: "bad_v1" };
    expect(() => reg.addRule(bad, "disagreement_rule")).not.toThrow();
    expect(reg.size()).toBe(0); // bad rule still skipped
    expect(reg.loadErrors).toHaveLength(1);
    expect(reg.loadErrors[0].ruleId).toBe("bad_v1");
  });
});

describe("RuleRegistry / findRulesFor", () => {
  it("returns rules matching entity.field target", () => {
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule] });
    const hits = reg.findRulesFor("institution.opening_hours");
    expect(hits).toHaveLength(1);
    expect(hits[0].rule_id).toBe("opening_hours_disagreement_rule_v1");
  });

  it("returns empty array when no rules match", () => {
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule] });
    expect(reg.findRulesFor("npc.location_id")).toEqual([]);
  });

  it("entity-only lookup returns all rules for that entity (any field)", () => {
    const otherRule: EngineRule = {
      rule_id: "fake_rule_v1",
      applies_to_entity: "institution",
      applies_to_field: "leadership",
    };
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule, otherRule] });
    expect(reg.findRulesFor("institution")).toHaveLength(2);
    expect(reg.findRulesFor("institution.opening_hours")).toHaveLength(1);
    expect(reg.findRulesFor("institution.leadership")).toHaveLength(1);
  });

  it("wildcard entity '*' matches any target (Phase 5c.x — scene routing pattern per ARD-017)", () => {
    const wildcardSceneRule: EngineRule = {
      rule_id: "scene_routing_universal_v1",
      applies_to_entity: "*",
      applies_to_field: "*",
      scene_id_when_match: "default_dialogue_scene",
    };
    const reg = new RuleRegistry({
      preloadedRules: [openingHoursRule, wildcardSceneRule],
    });
    // Wildcard rule matches institution.opening_hours alongside the specific rule
    const hits = reg.findRulesFor("institution.opening_hours");
    expect(hits.map((r) => r.rule_id)).toContain("scene_routing_universal_v1");
    expect(hits.map((r) => r.rule_id)).toContain("opening_hours_disagreement_rule_v1");
    // Wildcard matches an entity with no specific rule
    expect(reg.findRulesFor("npc.faction_id").map((r) => r.rule_id)).toEqual([
      "scene_routing_universal_v1",
    ]);
  });

  it("wildcard field '*' matches any field for the specified entity", () => {
    const ruleWildcardField: EngineRule = {
      rule_id: "validator_chain_npc_all_fields_v1",
      applies_to_entity: "npc",
      applies_to_field: "*",
    };
    const reg = new RuleRegistry({ preloadedRules: [ruleWildcardField] });
    expect(reg.findRulesFor("npc.location_id")).toHaveLength(1);
    expect(reg.findRulesFor("npc.hp")).toHaveLength(1);
    expect(reg.findRulesFor("npc.want_model")).toHaveLength(1);
    // Different entity does NOT match field-wildcard rule
    expect(reg.findRulesFor("faction.goals")).toHaveLength(0);
  });

  it("wildcard entity but specific field — common for cross-entity field rules", () => {
    const ruleAnyEntityCampaignField: EngineRule = {
      rule_id: "cross_entity_campaign_membership_v1",
      applies_to_entity: "*",
      applies_to_field: "campaign_id",
    };
    const reg = new RuleRegistry({ preloadedRules: [ruleAnyEntityCampaignField] });
    expect(reg.findRulesFor("npc.campaign_id")).toHaveLength(1);
    expect(reg.findRulesFor("plot.campaign_id")).toHaveLength(1);
    // Different field does NOT match
    expect(reg.findRulesFor("npc.location_id")).toHaveLength(0);
  });
});

describe("RuleRegistry / listRules + size", () => {
  it("listRules returns all loaded rules", () => {
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule] });
    const list = reg.listRules();
    expect(list).toHaveLength(1);
    expect(list[0]).toBe(openingHoursRule);
  });

  it("size grows as rules are added", () => {
    const reg = new RuleRegistry();
    expect(reg.size()).toBe(0);
    reg.addRule(openingHoursRule);
    expect(reg.size()).toBe(1);
    reg.addRule({ rule_id: "second_rule_v1", applies_to_entity: "npc", applies_to_field: "x" });
    expect(reg.size()).toBe(2);
  });
});

describe("RuleRegistry / deriveSchemaClassName (Phase 5c.0 refinement)", () => {
  it("derives className from relative $schema path", () => {
    expect(deriveSchemaClassName({ $schema: "./_schema/disagreement_rule.json" })).toBe(
      "disagreement_rule",
    );
  });

  it("derives className from absolute path with forward slashes", () => {
    expect(deriveSchemaClassName({ $schema: "/content/rules/_schema/scene_routing.json" })).toBe(
      "scene_routing",
    );
  });

  it("derives className from Windows-style path", () => {
    expect(deriveSchemaClassName({ $schema: "_schema\\slide_trigger.json" })).toBe(
      "slide_trigger",
    );
  });

  it("returns null for missing $schema", () => {
    expect(deriveSchemaClassName({})).toBeNull();
  });

  it("returns null for non-standard $schema path", () => {
    expect(deriveSchemaClassName({ $schema: "https://example.com/schema" })).toBeNull();
  });
});

describe("RuleRegistry / addRule auto-derives schemaClassName from $schema", () => {
  it("uses derived class name when schemaClassName not passed", () => {
    const reg = new RuleRegistry();
    reg.registerSchema("disagreement_rule", disagreementRuleSchema);
    const ruleWithSchema = {
      ...openingHoursRule,
      $schema: "./_schema/disagreement_rule.json",
    };
    reg.addRule(ruleWithSchema as EngineRule);
    expect(reg.size()).toBe(1);
  });

  it("explicit schemaClassName overrides derivation", () => {
    const reg = new RuleRegistry();
    reg.registerSchema("disagreement_rule", disagreementRuleSchema);
    const ruleWithMismatchedSchema = {
      ...openingHoursRule,
      $schema: "./_schema/some_other_schema.json", // wrong path
    };
    // Override forces use of registered schema
    reg.addRule(ruleWithMismatchedSchema as EngineRule, "disagreement_rule");
    expect(reg.size()).toBe(1);
  });

  it("rules without $schema and without explicit param skip validation", () => {
    const reg = new RuleRegistry();
    reg.registerSchema("disagreement_rule", disagreementRuleSchema);
    // No $schema, no explicit param — validation skipped, rule added
    reg.addRule({ rule_id: "ad_hoc_rule_v1" });
    expect(reg.size()).toBe(1);
  });
});

describe("RuleRegistry / removeRule (Phase 5c.0 hot-reload surface)", () => {
  it("removes existing rule by id; returns true", () => {
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule] });
    expect(reg.removeRule("opening_hours_disagreement_rule_v1")).toBe(true);
    expect(reg.size()).toBe(0);
    expect(reg.getRule("opening_hours_disagreement_rule_v1")).toBeNull();
  });

  it("returns false for unknown rule id", () => {
    const reg = new RuleRegistry({ preloadedRules: [openingHoursRule] });
    expect(reg.removeRule("does_not_exist_v1")).toBe(false);
    expect(reg.size()).toBe(1);
  });
});

describe("RuleRegistry / loadFromFilesystem (Phase 5c.1)", () => {
  // In-memory mock fs adapter — exercises the loader without touching disk.
  function mockFs(files: Record<string, unknown>): RuleRegistryFs {
    return {
      async listJson(dir: string) {
        return Object.keys(files).filter(
          (f) => f.startsWith(dir + "/") || f.startsWith(dir + "\\"),
        );
      },
      async readJson(file: string) {
        if (!(file in files)) throw new Error(`mockFs: file not found: ${file}`);
        return files[file];
      },
    };
  }

  it("loads schemas then rules; rules validate against derived schema class", async () => {
    const reg = new RuleRegistry();
    const fs = mockFs({
      "/_schema/disagreement_rule.json": disagreementRuleSchema,
      "/rules/opening_hours_disagreement_rule.json": {
        $schema: "./_schema/disagreement_rule.json",
        ...openingHoursRule,
      },
    });
    await reg.loadFromFilesystem("/rules", "/_schema", { fs });
    expect(reg.size()).toBe(1);
    expect(reg.getRule("opening_hours_disagreement_rule_v1")?.applies_to_entity).toBe(
      "institution",
    );
  });

  it("graceful on missing directories (returns empty array → 0 rules loaded)", async () => {
    const reg = new RuleRegistry();
    const fs: RuleRegistryFs = {
      async listJson() {
        throw new Error("ENOENT: no such file or directory");
      },
      async readJson() {
        throw new Error("never called");
      },
    };
    await reg.loadFromFilesystem("/nonexistent", "/nonexistent_schemas", { fs });
    expect(reg.size()).toBe(0);
  });

  it("collects per-file errors; throws end-of-load when strictValidation=true", async () => {
    const reg = new RuleRegistry();
    const fs = mockFs({
      "/_schema/disagreement_rule.json": disagreementRuleSchema,
      "/rules/bad_rule.json": {
        $schema: "./_schema/disagreement_rule.json",
        rule_id: "bad_v1",
        // missing applies_to_entity + applies_to_field
      },
    });
    await expect(reg.loadFromFilesystem("/rules", "/_schema", { fs })).rejects.toThrow(
      /accumulated/,
    );
    expect(reg.loadErrors.length).toBeGreaterThan(0);
  });

  it("non-strict mode accumulates errors without throwing", async () => {
    const reg = new RuleRegistry({ strictValidation: false });
    const fs = mockFs({
      "/_schema/disagreement_rule.json": disagreementRuleSchema,
      "/rules/bad_rule.json": {
        $schema: "./_schema/disagreement_rule.json",
        rule_id: "bad_v1",
      },
    });
    await reg.loadFromFilesystem("/rules", "/_schema", { fs });
    expect(reg.size()).toBe(0); // bad rule skipped
    expect(reg.loadErrors).toHaveLength(1);
  });

  // End-to-end fs smoke against the real opening_hours rule is deferred to
  // workspace-level integration tests (Session 5c.2+ when engine bootstrap wires
  // the loader at a stable cwd). Mock-fs tests above prove the loader's logic;
  // the real default-fs path is exercised whenever engine starts up.
});

describe("RuleRegistry / Phase 4.10 smoke (actual ratified rule)", () => {
  it("loads + validates + looks up opening_hours_disagreement_rule_v1", () => {
    const reg = new RuleRegistry();
    reg.registerSchema("disagreement_rule", disagreementRuleSchema);
    reg.addRule(openingHoursRule, "disagreement_rule");

    // Verify the engine consumption flow per ARD-017 §engine-consumption-pattern
    const rules = reg.findRulesFor("institution.opening_hours");
    expect(rules).toHaveLength(1);
    expect(rules[0].rule_id).toBe("opening_hours_disagreement_rule_v1");
    expect((rules[0] as { resolution_strategy?: string }).resolution_strategy).toBe(
      "highest_trust_source",
    );
    expect((rules[0] as { validator_chain_stage_5_hook?: boolean }).validator_chain_stage_5_hook).toBe(
      true,
    );
  });
});
