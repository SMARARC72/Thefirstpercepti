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
 * Consumption patterns:
 *   1. **Lookup by target** — disagreement rules, slide triggers: "what rule(s)
 *      apply to institution.opening_hours?" — returns array (may be empty).
 *   2. **Lookup by rule_id** — for direct rule consultation when caller knows
 *      which rule it wants (e.g., scene routing knows its own rule_id).
 *   3. **Hot-replace + remove** — for admin tooling, test isolation, and v0.9
 *      remote-rule refresh scenarios where rules need to be swapped at runtime
 *      without restarting the engine.
 *
 * **Target string contract for `findRulesFor`:**
 * The separator is `"."`. The first `.` splits the string into
 * `entity = before-first-dot` and `field = after-first-dot` (the field portion
 * is treated as opaque; further dots within it are kept). Entity names MUST NOT
 * contain dots (v0.8 enforces this via snake_case naming conventions). For
 * lookups by entity only, pass the entity name with no trailing `.field`.
 *
 * **Versioning:** rule version (e.g. `_v2`) is part of the `rule_id` string,
 * never a separate field. Callers wanting "the current version of rule X"
 * iterate via {@link listRules} and inspect rule_id suffixes.
 */
export interface RuleRegistrySurface {
  /** Lookup rules that target a specific entity (e.g. `"institution"`) or entity.field. */
  findRulesFor(target: string): EngineRule[];
  /** Lookup a single rule by ID. */
  getRule(ruleId: string): EngineRule | null;
  /** All loaded rules (useful for diagnostics + admin UI). */
  listRules(): EngineRule[];
  /** Count of loaded rules — useful for health checks. */
  size(): number;
  /** Remove a rule by ID. Returns true if it existed. For hot-reload + test isolation. */
  removeRule(ruleId: string): boolean;
}

// ============================================================================
// SCHEMA CLASS NAME DERIVATION
// ============================================================================

/**
 * Derive a Tier 2 schema class name from a Tier 3 rule's `$schema` field.
 *
 * Convention (per ARD-017 + Phase 4.10 ratified pattern): Tier 3 rule files
 * declare their schema via a relative path like
 *   "$schema": "./_schema/disagreement_rule.json"
 *
 * The class name is the file basename without `.json` extension —
 * `"disagreement_rule"` in the example above. Returns `null` if the rule has
 * no `$schema` or the path is non-standard (caller must provide schemaClassName
 * explicitly to {@link RuleRegistry.addRule}).
 *
 * Stable derivation matters because Phase 5c's filesystem loader reads the
 * `$schema` field per rule file to look up the registered Tier 2 schema —
 * having this helper as a pure function keeps the loader thin and testable.
 */
export function deriveSchemaClassName(rule: { $schema?: unknown }): string | null {
  if (typeof rule.$schema !== "string") return null;
  const path = rule.$schema;
  // Match the final path segment, stripping .json
  const m = path.match(/(?:^|[\\/])([A-Za-z0-9_-]+)\.json$/);
  return m ? m[1] : null;
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
 *
 * **Validation depth — explicit non-coverage (Phase 24c §5c.0 audit):**
 *   - Top-level `required` fields: CHECKED (string presence).
 *   - `rule_id` non-empty: CHECKED.
 *   - Nested-object required fields (e.g. `trust_ranking[0].source_kind`): NOT checked.
 *   - Type assertions per field: NOT checked (no `type: "string"` enforcement).
 *   - Enum value membership: NOT checked.
 *   - additionalProperties: NOT checked.
 *
 * Rule classes that need deep validation should author a class-specific
 * validator alongside their schema in `content/rules/_schema/` and run it
 * separately. The intent here is "fail loudly on missing top-level fields";
 * everything finer-grained belongs to the rule class's own discipline.
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
   * Add a Tier 3 rule object. Validates against registered schema if one can
   * be resolved. Resolution order:
   *   1. Explicit `schemaClassName` parameter (highest priority — caller knows best)
   *   2. Auto-derived from rule's `$schema` field via {@link deriveSchemaClassName}
   *      (the natural path for filesystem-loaded rules)
   *   3. None → skip validation, add unconditionally (caller is responsible)
   *
   * Throws on validation failure when `strictValidation` is true (default).
   */
  addRule(rule: EngineRule, schemaClassName?: string): void {
    const resolvedClassName =
      schemaClassName ?? deriveSchemaClassName(rule as { $schema?: unknown });
    if (resolvedClassName) {
      const schema = this.schemasByClass.get(resolvedClassName);
      if (schema) {
        const result = validateRuleAgainstSchema(rule as Record<string, unknown>, schema);
        if (!result.valid) {
          this.loadErrors.push({ ruleId: rule.rule_id, errors: result.errors });
          if (this.strictValidation) {
            throw new Error(
              `Rule '${rule.rule_id}' failed Tier 2 validation against schema '${resolvedClassName}':\n  ` +
                result.errors.join("\n  "),
            );
          }
          return; // skip add when non-strict + invalid
        }
      }
    }
    this.rules.set(rule.rule_id, rule);
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
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
