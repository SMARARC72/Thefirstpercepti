#!/usr/bin/env node
/**
 * Content Validator — Ink Scene Routing
 *
 * Walks every .ink file under content/narrative/, collects every knot
 * definition and every `-> knot` divert, and reports any divert that
 * does not resolve to a defined knot or one of the reserved Ink tokens.
 *
 * Also checks the four synthetic-jump construction sites in
 * packages/narrative/src/NarrativeEngine.ts:
 *   - combat_<encounterId>      (enterCombat)
 *   - dialogue_<npcId>          (enterDialogue)
 *   - consequence_<consequenceId> (triggerConsequence)
 *   - legacy_death              (enterLegacy — hardcoded fallback)
 *
 * Exit code 0 on clean; 1 on any unresolved jump or missing required
 * synthetic-jump fallback. No new dependencies.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { dirname, join, relative, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const contentDir = join(rootDir, "content");
const narrativeDir = join(contentDir, "narrative");
const npcsPath = join(contentDir, "world-data", "npcs.json");

// Reserved Ink divert targets that always resolve.
const RESERVED_TARGETS = new Set(["DONE", "END"]);

const KNOT_REGEX = /^\s*={2,}\s*(\w+)\s*={0,}\s*$/;
// -> target with optional dotted stitch (foo.bar). Skip the function-
// return marker `->->` by requiring the target to start with a letter
// or underscore.
const DIVERT_REGEX = /->\s*([A-Za-z_]\w*(?:\.\w+)*)/g;

function findInkFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && entry !== "_compiled") {
      findInkFiles(fullPath, files);
    } else if (stat.isFile() && extname(entry) === ".ink") {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Strip /* ... *\/ and // comments. Block comments are collapsed to
 * spaces so line numbers stay stable.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, "");
}

function parseInk(filePath) {
  const lines = stripComments(readFileSync(filePath, "utf-8")).split("\n");
  const knots = [];
  const diverts = [];

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const knot = line.match(KNOT_REGEX);
    if (knot) {
      knots.push(knot[1]);
      return;
    }
    DIVERT_REGEX.lastIndex = 0;
    let m;
    while ((m = DIVERT_REGEX.exec(line)) !== null) {
      diverts.push({ target: m[1], line: lineNo });
    }
  });

  return { knots, diverts };
}

function loadNpcIds() {
  try {
    const data = JSON.parse(readFileSync(npcsPath, "utf-8"));
    return Array.isArray(data)
      ? data.map((n) => n.id).filter((id) => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function dialogueKnotCandidates(npcId) {
  // npcs.json uses hyphens (npc-sister-mourn); ink knots use underscores
  // (dialogue_sister_mourn). Check both shapes plus a stripped-prefix form.
  return [
    `dialogue_${npcId}`,
    `dialogue_${npcId.replace(/^npc-/, "").replace(/-/g, "_")}`,
    `dialogue_${npcId.replace(/-/g, "_")}`,
  ];
}

// ── Main ──
console.log("═══════════════════════════════════════");
console.log("  Content Routing Validator");
console.log("═══════════════════════════════════════\n");

const inkFiles = findInkFiles(narrativeDir);
if (inkFiles.length === 0) {
  console.error("No .ink files found under content/narrative/");
  process.exit(1);
}

const fileParses = new Map();
const allKnots = new Set();
for (const file of inkFiles) {
  const parsed = parseInk(file);
  fileParses.set(file, parsed);
  for (const name of parsed.knots) allKnots.add(name);
}

const errors = [];
const warnings = [];

// 1. Every divert target must resolve to a known knot.
for (const [filePath, parsed] of fileParses) {
  const relPath = relative(rootDir, filePath);
  for (const { target, line } of parsed.diverts) {
    if (RESERVED_TARGETS.has(target)) continue;
    // `knot.stitch` resolves if either component is defined.
    const head = target.split(".")[0];
    if (allKnots.has(target) || allKnots.has(head)) continue;
    errors.push(`${relPath}:${line}: -> ${target} (not defined)`);
  }
}

// 2. Required synthetic-jump fallbacks from NarrativeEngine.ts.
if (!allKnots.has("legacy_death")) {
  errors.push(
    `synthetic-jump: required knot "legacy_death" missing (hardcoded fallback in NarrativeEngine.enterLegacy)`
  );
}

const PREFIX_CHECKS = [
  { prefix: "combat_", site: "NarrativeEngine.enterCombat" },
  { prefix: "dialogue_", site: "NarrativeEngine.enterDialogue" },
  { prefix: "consequence_", site: "NarrativeEngine.triggerConsequence" },
];
for (const { prefix, site } of PREFIX_CHECKS) {
  let found = false;
  for (const k of allKnots) {
    if (k.startsWith(prefix)) {
      found = true;
      break;
    }
  }
  if (!found) {
    errors.push(
      `synthetic-jump: no knot with prefix "${prefix}*" exists (required for ${site})`
    );
  }
}

// 3. Soft check: NPCs without a dedicated dialogue knot. Engine falls
//    back to default copy, so warn rather than fail.
for (const id of loadNpcIds()) {
  const candidates = dialogueKnotCandidates(id);
  if (!candidates.some((c) => allKnots.has(c))) {
    warnings.push(
      `dialogue fallback: no knot for NPC "${id}" (tried ${candidates.join(", ")}; engine will use default)`
    );
  }
}

// ── Report ──
const totalDiverts = [...fileParses.values()].reduce(
  (sum, p) => sum + p.diverts.length,
  0
);
console.log(`Scanned ${inkFiles.length} .ink file(s).`);
console.log(`Knots defined: ${allKnots.size}`);
console.log(`Diverts checked: ${totalDiverts}`);

if (warnings.length > 0) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  - ${w}`);
}

if (errors.length > 0) {
  console.error(`\nErrors (${errors.length}):`);
  for (const e of errors) console.error(`  ${e}`);
  console.error("\n✗ Content routing validation failed.");
  process.exit(1);
}

console.log("\n✓ Content routing OK.");
process.exit(0);
