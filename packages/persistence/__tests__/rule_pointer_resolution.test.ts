/**
 * Phase 24d / 6a.9.1 — static rule_id pointer validation only.
 *
 * Walks seeded JSON + schema_pack_v0.8.json, collects engine-config rule_id
 * pointers, asserts each resolves to an existing file with a declared $schema
 * that itself exists. Validates rule-file structural shape against declared
 * schema (required fields + enum compliance). Pure file-system + JSON parsing;
 * no engine instantiation, no RuleRegistry loading, no Stage 5 hook, no
 * dialogue surface wiring.
 *
 * Runtime RuleRegistry validation remains Session 7.
 *
 * Per Khoja canonical 6a.9.1 spec (Phase F dispatch 2026-05-25):
 *   - Pointer resolution: every discovered rule_id resolves to exactly one
 *     file. No fuzzy matching. No case-insensitive mercy.
 *   - $schema resolution: every rule file declares $schema; resolves to
 *     content/rules/_schema/<schema file>.
 *   - Static shape validation: every rule file validates against declared
 *     schema (local schema validator; do NOT load engine RuleRegistry
 *     runtime behavior).
 *   - Orphan detection + classification.
 *   - Namespace collision detection.
 *
 * Out of scope (Session 7 = Phase 24e):
 *   - Runtime RuleRegistry boot wiring
 *   - Stage 5 runtime consult
 *   - Dialogue/surface disagreement hooks
 *   - Per-rule consumer wiring across engine code
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve as pathResolve, dirname as pathDirname, basename as pathBasename } from "node:path";

// Repo root resolution: this test file lives at packages/persistence/__tests__/
// so repo root is 3 levels up.
const REPO_ROOT = pathResolve(__dirname, "..", "..", "..");
const SCHEMA_PACK_PATH = pathResolve(REPO_ROOT, "content/schemas/schema_pack_v0.8.json");
const CONTENT_RULES_DIR = pathResolve(REPO_ROOT, "content/rules");
const CONTENT_RULES_SCHEMA_DIR = pathResolve(REPO_ROOT, "content/rules/_schema");

interface EngineRulePointer {
  rule_file: string;
  rule_schema_file: string;
  anchor: string;
  rationale: string;
}

interface RuleFile {
  $schema: string;
  rule_id: string;
  [k: string]: unknown;
}

interface SchemaFile {
  $schema: string;
  $id?: string;
  required?: string[];
  properties?: Record<string, { type?: string; enum?: string[]; [k: string]: unknown }>;
  [k: string]: unknown;
}

function loadSchemaPackPointers(): EngineRulePointer[] {
  const raw = JSON.parse(readFileSync(SCHEMA_PACK_PATH, "utf8")) as {
    x_engine_rule_registry_pointers?: EngineRulePointer[];
  };
  return raw.x_engine_rule_registry_pointers ?? [];
}

function loadRuleFile(repoRelativePath: string): RuleFile {
  const absPath = pathResolve(REPO_ROOT, repoRelativePath);
  return JSON.parse(readFileSync(absPath, "utf8")) as RuleFile;
}

function loadSchemaFile(repoRelativePath: string): SchemaFile {
  const absPath = pathResolve(REPO_ROOT, repoRelativePath);
  return JSON.parse(readFileSync(absPath, "utf8")) as SchemaFile;
}

/**
 * Static structural validation: required fields present + enum compliance on
 * declared properties. Local validator only — no engine instantiation.
 */
function validateRuleAgainstSchema(rule: RuleFile, schema: SchemaFile): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const required = schema.required ?? [];
  for (const field of required) {
    if (!(field in rule)) reasons.push(`missing required field: ${field}`);
  }
  const properties = schema.properties ?? {};
  for (const [propName, propSchema] of Object.entries(properties)) {
    if (!(propName in rule)) continue;
    const value = (rule as Record<string, unknown>)[propName];
    if (propSchema.enum && typeof value === "string" && !propSchema.enum.includes(value)) {
      reasons.push(`field ${propName}: value "${value}" not in enum ${JSON.stringify(propSchema.enum)}`);
    }
    if (propSchema.type === "string" && value !== undefined && typeof value !== "string") {
      reasons.push(`field ${propName}: expected string, got ${typeof value}`);
    }
    if (propSchema.type === "boolean" && value !== undefined && typeof value !== "boolean") {
      reasons.push(`field ${propName}: expected boolean, got ${typeof value}`);
    }
    if (propSchema.type === "array" && value !== undefined && !Array.isArray(value)) {
      reasons.push(`field ${propName}: expected array, got ${typeof value}`);
    }
  }
  return { ok: reasons.length === 0, reasons };
}

describe("Phase 24d / 6a.9.1 — static rule_id pointer validation only", () => {
  it("static rule_id pointer validation only resolves all seeded rule_id references", () => {
    const pointers = loadSchemaPackPointers();
    expect(pointers.length).toBeGreaterThan(0);
    for (const pointer of pointers) {
      const ruleFileAbs = pathResolve(REPO_ROOT, pointer.rule_file);
      const schemaFileAbs = pathResolve(REPO_ROOT, pointer.rule_schema_file);
      expect(existsSync(ruleFileAbs), `rule_file does not resolve: ${pointer.rule_file}`).toBe(true);
      expect(existsSync(schemaFileAbs), `rule_schema_file does not resolve: ${pointer.rule_schema_file}`).toBe(true);
      const ruleData = loadRuleFile(pointer.rule_file);
      expect(typeof ruleData.rule_id, `rule_file ${pointer.rule_file} missing string rule_id`).toBe("string");
      expect(ruleData.rule_id.length).toBeGreaterThan(0);
    }
  });

  it("static rule_id pointer validation only verifies each rule file declares an existing schema", () => {
    const pointers = loadSchemaPackPointers();
    for (const pointer of pointers) {
      const ruleData = loadRuleFile(pointer.rule_file);
      expect(typeof ruleData.$schema, `rule file ${pointer.rule_file} missing string $schema`).toBe("string");
      const ruleFileDir = pathDirname(pathResolve(REPO_ROOT, pointer.rule_file));
      // Rule files declare relative paths to local schemas.
      const declaredSchemaAbs = pathResolve(ruleFileDir, ruleData.$schema);
      expect(existsSync(declaredSchemaAbs), `rule file ${pointer.rule_file} $schema does not resolve: ${ruleData.$schema}`).toBe(true);
      // Cross-check: declared $schema points at the same file the pointer's rule_schema_file points at.
      const pointerSchemaAbs = pathResolve(REPO_ROOT, pointer.rule_schema_file);
      expect(declaredSchemaAbs, `rule file $schema and pointer rule_schema_file disagree for ${pointer.rule_file}`).toBe(pointerSchemaAbs);
    }
  });

  it("static rule_id pointer validation only confirms each rule file structurally validates against its declared schema", () => {
    const pointers = loadSchemaPackPointers();
    for (const pointer of pointers) {
      const ruleData = loadRuleFile(pointer.rule_file);
      const schemaData = loadSchemaFile(pointer.rule_schema_file);
      const result = validateRuleAgainstSchema(ruleData, schemaData);
      expect(result.ok, `rule file ${pointer.rule_file} fails structural validation: ${result.reasons.join("; ")}`).toBe(true);
    }
  });

  it("static rule_id pointer validation only confirms no orphan rule files in content/rules/", () => {
    const pointers = loadSchemaPackPointers();
    const referencedRuleFiles = new Set(
      pointers.map((p) => pathResolve(REPO_ROOT, p.rule_file))
    );
    const ruleFilesOnDisk = readdirSync(CONTENT_RULES_DIR)
      .filter((name) => name.endsWith(".json"))
      .map((name) => pathResolve(CONTENT_RULES_DIR, name));
    const orphans = ruleFilesOnDisk.filter((path) => !referencedRuleFiles.has(path));
    expect(orphans, `orphan rule files (not referenced by x_engine_rule_registry_pointers): ${orphans.map((p) => pathBasename(p)).join(", ")}`).toEqual([]);
  });

  it("static rule_id pointer validation only confirms no namespace collisions across rule_id values", () => {
    const pointers = loadSchemaPackPointers();
    const seenIds = new Set<string>();
    const collisions: string[] = [];
    for (const pointer of pointers) {
      const ruleData = loadRuleFile(pointer.rule_file);
      if (seenIds.has(ruleData.rule_id)) collisions.push(ruleData.rule_id);
      seenIds.add(ruleData.rule_id);
    }
    expect(collisions, `rule_id collisions detected: ${collisions.join(", ")}`).toEqual([]);
  });

  it("static rule_id pointer validation only confirms each schema file in content/rules/_schema/ declares the canonical JSON Schema draft-2020-12 URL", () => {
    const schemaFilesOnDisk = readdirSync(CONTENT_RULES_SCHEMA_DIR)
      .filter((name) => name.endsWith(".json"))
      .map((name) => pathResolve(CONTENT_RULES_SCHEMA_DIR, name));
    expect(schemaFilesOnDisk.length).toBeGreaterThan(0);
    for (const schemaPath of schemaFilesOnDisk) {
      const data = JSON.parse(readFileSync(schemaPath, "utf8")) as { $schema?: string };
      expect(data.$schema, `schema file ${pathBasename(schemaPath)} missing $schema declaration`).toBe(
        "https://json-schema.org/draft/2020-12/schema"
      );
    }
  });
});
