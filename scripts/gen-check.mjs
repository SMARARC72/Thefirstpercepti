#!/usr/bin/env node
/**
 * gen-check.mjs — CI gate verifying all three generators are in sync with schema_pack.
 *
 * Per ARD-009: schema_pack is canonical; generated artifacts (TS types + DDL + Zod)
 * must round-trip identically on every regeneration.
 *
 * Behavior:
 *   1. Run gen:types (existing) + gen:ddl (new) + gen:zod (new) in sequence
 *   2. Diff each output file against the committed git version
 *   3. Exit 0 if all match; exit non-zero with structured diff if any differ
 *
 * Usage:
 *   npm run gen:check
 *
 * Wired in package.json as the unified check (replaces gen:types:check).
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const ARTIFACTS = [
  {
    name: "TS types",
    generator: "npm run gen:types",
    file: "packages/types/src/generated.ts",
  },
  {
    name: "Postgres DDL",
    generator: "npm run gen:ddl",
    file: "database/schema.postgres.generated.sql",
  },
  {
    name: "Zod validators",
    generator: "npm run gen:zod",
    file: "packages/types/src/zod-validators.ts",
  },
];

let failures = 0;

console.log("=== gen-check: regenerating all artifacts ===");
for (const art of ARTIFACTS) {
  console.log(`\n→ ${art.name}: ${art.generator}`);
  try {
    execSync(art.generator, { cwd: ROOT, stdio: "inherit" });
  } catch (err) {
    console.error(`  ✗ generator failed for ${art.name}`);
    failures++;
    continue;
  }
}

console.log("\n=== gen-check: diffing against committed ===");
for (const art of ARTIFACTS) {
  const filePath = resolve(ROOT, art.file);
  if (!existsSync(filePath)) {
    console.error(`  ✗ ${art.name}: file does not exist at ${art.file}`);
    failures++;
    continue;
  }

  try {
    // git diff --exit-code: returns 0 if no diff, non-zero if diff exists or file untracked
    execSync(`git diff --exit-code -- "${art.file}"`, { cwd: ROOT, stdio: "pipe" });
    console.log(`  ✓ ${art.name}: in sync`);
  } catch (err) {
    // Check if file is untracked (new file expected on first run)
    try {
      const status = execSync(`git status --porcelain -- "${art.file}"`, { cwd: ROOT, encoding: "utf8" });
      if (status.startsWith("??")) {
        console.warn(`  ⚠ ${art.name}: untracked (first run? commit + re-check)`);
        failures++;
        continue;
      }
    } catch {
      // ignore
    }
    console.error(`  ✗ ${art.name}: DRIFTED — diff vs committed:`);
    try {
      execSync(`git diff -- "${art.file}"`, { cwd: ROOT, stdio: "inherit" });
    } catch {}
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n✗ gen-check: ${failures} artifact(s) failed or drifted`);
  console.error(`  → re-run \`npm run gen:types && npm run gen:ddl && npm run gen:zod\` and commit the regenerated files`);
  process.exit(1);
} else {
  console.log("\n✓ gen-check: all 3 artifacts in sync with schema_pack");
  process.exit(0);
}
