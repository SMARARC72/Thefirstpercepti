#!/usr/bin/env node
/**
 * Content Build Pipeline
 * Compiles Ink narrative files using inkjs-compiler and validates world data.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "fs";
import { dirname, join, relative, extname, basename } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const contentDir = join(rootDir, "content");
const outputDir = join(contentDir, "_compiled");
const webPublicDir = join(rootDir, "apps", "web", "public", "content", "_compiled");

// Ensure output directories exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}
if (!existsSync(webPublicDir)) {
  mkdirSync(webPublicDir, { recursive: true });
}

const compilerPath = join(rootDir, "node_modules", "inkjs", "bin", "inkjs-compiler.js");

/**
 * Find all .ink files recursively
 */
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
 * Simple Ink preprocessor: resolves INCLUDE statements by inlining
 */
function preprocessInk(sourcePath, visited = new Set()) {
  if (visited.has(sourcePath)) {
    throw new Error(`Circular include detected: ${sourcePath}`);
  }
  visited.add(sourcePath);

  const dir = dirname(sourcePath);
  let content = readFileSync(sourcePath, "utf-8");

  // Replace INCLUDE statements with inlined content
  content = content.replace(/^INCLUDE\s+(.+)$/gm, (match, includePath) => {
    const resolved = join(dir, includePath.trim());
    if (!existsSync(resolved)) {
      console.warn(`  Warning: Included file not found: ${resolved}`);
      return `// MISSING INCLUDE: ${includePath}`;
    }
    return preprocessInk(resolved, new Set(visited));
  });

  return content;
}

/**
 * Compile a single Ink file using inkjs-compiler
 */
function compileInkFile(inputPath) {
  const relPath = relative(contentDir, inputPath);
  const baseName = basename(inputPath, ".ink");
  const outputPath = join(outputDir, `${baseName}.json`);
  const webOutputPath = join(webPublicDir, `${baseName}.json`);

  console.log(`Building: ${relPath}`);

  // Preprocess to resolve includes
  const preprocessed = preprocessInk(inputPath);

  // Write to temp file for compiler (compiler outputs beside input)
  const tmpName = `ink-build-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const tmpInk = join(tmpdir(), `${tmpName}.ink`);
  writeFileSync(tmpInk, preprocessed, "utf-8");

  // Run inkjs-compiler
  execFileSync(process.execPath, [compilerPath, tmpInk], {
    stdio: "pipe",
    encoding: "utf-8",
  });

  // Read compiled output (compiler writes input.ink.json beside input)
  const tmpJson = join(tmpdir(), `${tmpName}.ink.json`);
  const compiledRaw = readFileSync(tmpJson, "utf-8").replace(/^\uFEFF/, "");
  const compiledJson = JSON.parse(compiledRaw);

  // Add metadata for the engine
  compiledJson._metadata = {
    sourceFile: relPath,
    compiledAt: new Date().toISOString(),
    knots: extractKnots(preprocessed),
    variables: extractVariables(preprocessed),
    externalFunctions: extractExternalFunctions(preprocessed),
  };

  const output = JSON.stringify(compiledJson, null, 2);
  writeFileSync(outputPath, output);
  writeFileSync(webOutputPath, output);
  console.log(`  → ${relative(rootDir, outputPath)}`);
  return outputPath;
}

/**
 * Build metadata-only JSON for non-standalone Ink files
 */
function buildMetadataFile(inputPath) {
  const relPath = relative(contentDir, inputPath);
  const baseName = basename(inputPath, ".ink");
  const outputPath = join(outputDir, `${baseName}.json`);
  const webOutputPath = join(webPublicDir, `${baseName}.json`);

  console.log(`Metadata: ${relPath}`);

  const preprocessed = preprocessInk(inputPath);
  const metadata = {
    version: "2.0",
    sourceFile: relPath,
    compiledAt: new Date().toISOString(),
    storyContent: preprocessed,
    metadata: {
      knots: extractKnots(preprocessed),
      variables: extractVariables(preprocessed),
      externalFunctions: extractExternalFunctions(preprocessed),
    },
  };

  const output = JSON.stringify(metadata, null, 2);
  writeFileSync(outputPath, output);
  writeFileSync(webOutputPath, output);
  console.log(`  → ${relative(rootDir, outputPath)}`);
  return outputPath;
}

function extractKnots(content) {
  const knots = [];
  const regex = /^===\s+(\w+)/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    knots.push(match[1]);
  }
  return knots;
}

function extractVariables(content) {
  const vars = [];
  const regex = /^VAR\s+(\w+)/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    vars.push(match[1]);
  }
  return vars;
}

function extractExternalFunctions(content) {
  const funcs = [];
  const regex = /^EXTERNAL\s+(\w+)/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    funcs.push(match[1]);
  }
  return funcs;
}

/**
 * Copy world data JSON files to output
 */
function copyWorldData() {
  const worldDataDir = join(contentDir, "world-data");
  if (!existsSync(worldDataDir)) return;

  const outputWorldDir = join(outputDir, "world-data");
  const webWorldDir = join(webPublicDir, "world-data");
  if (!existsSync(outputWorldDir)) mkdirSync(outputWorldDir, { recursive: true });
  if (!existsSync(webWorldDir)) mkdirSync(webWorldDir, { recursive: true });

  for (const entry of readdirSync(worldDataDir)) {
    const fullPath = join(worldDataDir, entry);
    if (statSync(fullPath).isFile() && extname(entry) === ".json") {
      const content = readFileSync(fullPath, "utf-8");
      writeFileSync(join(outputWorldDir, entry), content);
      writeFileSync(join(webWorldDir, entry), content);
      console.log(`Copied: ${entry}`);
    }
  }
}

/**
 * Build audio presets
 */
function buildAudioPresets() {
  const presetsDir = join(contentDir, "audio-presets");
  if (!existsSync(presetsDir)) return;

  const outputAudioDir = join(outputDir, "audio-presets");
  const webAudioDir = join(webPublicDir, "audio-presets");
  if (!existsSync(outputAudioDir)) mkdirSync(outputAudioDir, { recursive: true });
  if (!existsSync(webAudioDir)) mkdirSync(webAudioDir, { recursive: true });

  const presets = {};
  for (const entry of readdirSync(presetsDir)) {
    const fullPath = join(presetsDir, entry);
    if (statSync(fullPath).isFile() && extname(entry) === ".json") {
      const name = basename(entry, ".json");
      presets[name] = JSON.parse(readFileSync(fullPath, "utf-8"));
    }
  }

  const output = JSON.stringify(presets, null, 2);
  writeFileSync(join(outputAudioDir, "presets.json"), output);
  writeFileSync(join(webAudioDir, "presets.json"), output);
  console.log(`Built: audio-presets/presets.json (${Object.keys(presets).length} presets)`);
}

// ── Main ──
console.log("═══════════════════════════════════════");
console.log("  Content Build Pipeline");
console.log("═══════════════════════════════════════\n");

const inkFiles = findInkFiles(contentDir);
const mainInk = inkFiles.find((f) => basename(f) === "main.ink");

if (mainInk) {
  compileInkFile(mainInk);
} else {
  console.log("No main.ink found. Skipping narrative compilation.");
}

// Generate metadata stubs for all other .ink files so the engine can inspect them
for (const file of inkFiles) {
  if (basename(file) !== "main.ink") {
    buildMetadataFile(file);
  }
}

copyWorldData();
buildAudioPresets();

console.log("\n✓ Content build complete.");
