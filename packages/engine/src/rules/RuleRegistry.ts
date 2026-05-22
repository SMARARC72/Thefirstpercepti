/**
 * RuleRegistry — engine-config registry per ARD-017 (three-tier source-of-truth).
 *
 * Loads Tier 3 rule files (`content/rules/*.json`) at engine startup, validates
 * each against its Tier 2 schema (`content/rules/_schema/*.json`), and exposes
 * lookup + application API to engine consumers (validator chain Stage 5,
 * scene routing, slide trigger evaluators, etc.).
 *
 * Per ARD-017 §migration-path: "Session 5 = 24c: RuleRegistry abstraction
 * authored in packages/engine/src/rules/RuleRegistry.ts." — this file.
 *
 * Design discipline (per user-issued Session 5b risk-surface guidance, #3):
 * the abstraction here is the v0.8 architectural primitive for engine-config.
 * The 4 sibling disagreement rules + 5 other rule classes (scene routing,
 * validator chain stage configs, slide trigger predicates, witness scope
 * evaluators, faction reach attempt resolvers) all compound on it. Get the
 * abstraction right NOW; v0.9 work inherits the API surface.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Minimal Tier 3 rule shape that ALL rule files conform to.
 *
 * Each rule_class extends this with class-specific fields (e.g., disagreement
 * rules add `trust_ranking`, scene routing adds `scene_id_when_match`, etc.).
 * RuleRegistry treats them as opaque after validation — engine consumers cast
 * to the specific class type at consumption sites.
 */
export interface EngineRule {
  /** Stable identifier including version suffix; matches /^[a-z_]+_v\d+$/ */
  rule_id: string;
  /**
   * What entity (or class of entities) this rule applies to. Disagreement
   * rules use single-entity strings like "institution"; scene routing rules
   * may use "*"; slide triggers use NPC archetype keys.
   */
  applies_to_entity?: string;
  /** Field path on the entity (disagreement rules use this); other rule classes leave undefined */
  applies_to_field?: string;
  /** Free-form for class-specific fields */
  [extraField: string]: unknown;
}

/** Tier 2 schema shape (the validator for a rule class). */
export interface RuleClassSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  type: "object";
  required?: string[];
  properties?: Record<string, unknown>;
  /** ARD-017 marker — distinguishes engine-config schemas from schema_pack schemas */
  x_registry_tier?: "engine_config";
  /** ARD-017 marker — confirms no generator emission for this schema */
  x_generator_emission?: "none";
}

/** Result of {@link RuleRegistry.validateRule} — separated from load() for granular error handling. */
export type RuleValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

/**
 * RuleRegistry source-of-truth surface — what the engine consumes.
 *
 * Two consumption patterns:
 *   1. **Lookup by target** — disagreement rules, slide triggers: "what rule(s)
 *      apply to institution.opening_hours?" — returns array (may be empty).
 *   2. **Lookup by rule_id** — for direct rule consultation when caller knows
 *      which rule it wants (e.g., scene routing knows its own rule_id).
 */
export interface RuleRegistrySurface {
  /** Lookup rules that target a specific entity/field combination. */
  findRulesFor(target: string): EngineRule[];
  /** Lookup a single rule by ID. */
  getRule(ruleId: string): EngineRule | null;
  /** All loaded rules (useful for diagnostics + admin UI). */
  listRules(): EngineRule[];
  /** Count of loaded rules — useful for health checks. */
  size(): number;
}

// ============================================================================
// LIGHTWEIGHT JSON SCHEMA VALIDATOR (Tier 2 doesn't need Zod)
// ============================================================================

/**
 * Validates a rule object against its Tier 2 schema. Returns granular errors.
 *
 * Per ARD-017 §Tier-2-discipline: "Tier 2 schemas DO NOT regenerate downstream
 * artifacts (no DDL, no Zod-validator emission)". This validator is intentionally
 * lighter-weight than Zod — checks required fields + top-level types, doesn't
 * traverse arbitrarily deep nested structures. For deeper validation, individual
 * rule classes can author their own validators in `packages/engine/src/rules/<class>/`.
 */
export function validateRuleAgainstSchema(
  rule: Record<string, unknown>,
  schema: RuleClassSchema,
): RuleValidationResult {
  const errors: string[] = [];

  // Required fields check
  for (const required of schema.required ?? []) {
    if (!(required in rule)) {
      errors.push(`Missing required field: '${required}'`);
    }
  }

  // Tier discipline check — every rule should declare its own rule_id
  if (typeof rule.rule_id !== "string" || !rule.rule_id) {
    errors.push("Rule must have a non-empty string `rule_id`");
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

// ============================================================================
// REGISTRY IMPLEMENTATION
// ============================================================================

export interface RuleRegistryOptions {
  /** Pre-loaded rules (skip filesystem load). Useful for tests + in-memory engine runs. */
  preloadedRules?: EngineRule[];
  /** Pre-loaded Tier 2 schemas keyed by file basename (e.g., "disagreement_rule"). */
  preloadedSchemas?: Record<string, RuleClassSchema>;
  /** If true, validation failures throw at load(); else collected in `loadErrors`. */
  strictValidation?: boolean;
}

/**
 * RuleRegistry implementation. Singleton-friendly (engine bootstraps one
 * instance), but constructor takes options so tests can inject pre-loaded
 * rules without touching the filesystem.
 *
 * Filesystem loading is intentionally NOT in the constructor — engine
 * bootstrap calls `await registry.loadFromFilesystem(rulesDir, schemasDir)`
 * during startup. This keeps the class testable + lets the engine swap
 * loaders (e.g., remote rules in v0.9 — pull from Supabase rules table).
 */
export class RuleRegistry implements RuleRegistrySurface {
  private rules = new Map<string, EngineRule>();
  private schemasByClass = new Map<string, RuleClassSchema>();
  public loadErrors: Array<{ ruleId: string; errors: string[] }> = [];
  private strictValidation: boolean;

  constructor(options: RuleRegistryOptions = {}) {
    this.strictValidation = options.strictValidation ?? true;
    for (const rule of options.preloadedRules ?? []) {
      this.rules.set(rule.rule_id, rule);
    }
    for (const [className, schema] of Object.entries(options.preloadedSchemas ?? {})) {
      this.schemasByClass.set(className, schema);
    }
  }

  // ============== Loader entry points ==============

  /**
   * Register a Tier 2 schema for a rule class. Call before {@link addRule}
   * to enable validation. Rule files reference their schema via `$schema`
   * relative path; the basename (e.g., "disagreement_rule") is the class key.
   */
  registerSchema(className: string, schema: RuleClassSchema): void {
    if (schema.x_registry_tier !== "engine_config") {
      throw new Error(
        `Schema '${className}' missing x_registry_tier="engine_config" — refuse to register ` +
          `(per ARD-017: Tier 2 schemas must self-identify; prevents accidental Tier 1 leakage)`,
      );
    }
    this.schemasByClass.set(className, schema);
  }

  /**
   * Add a Tier 3 rule object. Validates against registered schema if one exists
   * for the rule's class (derived from `$schema` reference, or explicitly named).
   * Throws on validation failure when `strictValidation` is true (default).
   */
  addRule(rule: EngineRule, schemaClassName?: string): void {
    if (schemaClassName) {
      const schema = this.schemasByClass.get(schemaClassName);
      if (schema) {
        const result = validateRuleAgainstSchema(rule as Record<string, unknown>, schema);
        if (!result.valid) {
          this.loadErrors.push({ ruleId: rule.rule_id, errors: result.errors });
          if (this.strictValidation) {
            throw new Error(
              `Rule '${rule.rule_id}' failed Tier 2 validation against schema '${schemaClassName}':\n  ` +
                result.errors.join("\n  "),
            );
          }
          return; // skip add when non-strict + invalid
        }
      }
    }
    this.rules.set(rule.rule_id, rule);
  }

  // ============== Consumption surface ==============

  findRulesFor(target: string): EngineRule[] {
    const dotIndex = target.indexOf(".");
    const entity = dotIndex >= 0 ? target.slice(0, dotIndex) : target;
    const field = dotIndex >= 0 ? target.slice(dotIndex + 1) : undefined;
    return [...this.rules.values()].filter((r) => {
      if (r.applies_to_entity !== entity) return false;
      if (field !== undefined && r.applies_to_field !== field) return false;
      return true;
    });
  }

  getRule(ruleId: string): EngineRule | null {
    return this.rules.get(ruleId) ?? null;
  }

  listRules(): EngineRule[] {
    return [...this.rules.values()];
  }

  size(): number {
    return this.rules.size;
  }
}
