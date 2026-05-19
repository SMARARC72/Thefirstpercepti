#!/usr/bin/env node
/**
 * Deployment Script for Kimi Hosting
 * Builds production bundle and prepares for static deployment.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const webDir = join(rootDir, "apps", "web");
const distDir = join(webDir, "dist");
const contentCompiledDir = join(rootDir, "content", "_compiled");
const publicDir = join(webDir, "public");

console.log("═══════════════════════════════════════");
console.log("  Deployment Pipeline");
console.log("═══════════════════════════════════════\n");

// ── Step 1: Build Content ──
console.log("Step 1: Building content...");
const buildContent = await import("./build-content.mjs");
// build-content.mjs runs automatically when imported

// ── Step 2: Ensure public dir exists with compiled content ──
console.log("\nStep 2: Syncing compiled content to public/...");
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

const publicContentDir = join(publicDir, "content");
if (existsSync(publicContentDir)) {
  rmSync(publicContentDir, { recursive: true });
}
mkdirSync(publicContentDir, { recursive: true });

function copyDir(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

if (existsSync(contentCompiledDir)) {
  copyDir(contentCompiledDir, publicContentDir);
  console.log(`  Copied compiled content to public/content/`);
}

// ── Step 3: Build Web App ──
console.log("\nStep 3: Building web app...");
const { execSync } = await import("child_process");
try {
  execSync("npm run build", {
    cwd: webDir,
    stdio: "inherit",
  });
  console.log("  ✓ Web app built successfully");
} catch (e) {
  console.error("  ✗ Web app build failed");
  process.exit(1);
}

// ── Step 4: Verify Build ──
console.log("\nStep 4: Verifying build output...");
if (!existsSync(distDir)) {
  console.error("  ✗ dist/ directory not found");
  process.exit(1);
}

const indexHtml = join(distDir, "index.html");
if (!existsSync(indexHtml)) {
  console.error("  ✗ index.html not found in dist/");
  process.exit(1);
}

// Check bundle size
function getDirectorySize(dir) {
  let size = 0;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      size += getDirectorySize(path);
    } else {
      size += stat.size;
    }
  }
  return size;
}

const totalSize = getDirectorySize(distDir);
const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
console.log(`  ✓ dist/ size: ${totalSizeMB} MB`);

if (totalSize > 50 * 1024 * 1024) {
  console.warn("  ⚠ Warning: Bundle exceeds 50MB target");
}

// ── Step 5: Generate Deployment Manifest ──
console.log("\nStep 5: Generating deployment manifest...");
const manifest = {
  name: "The First Perception",
  version: "2.0.0",
  builtAt: new Date().toISOString(),
  bundleSize: totalSize,
  bundleSizeMB: parseFloat(totalSizeMB),
  files: [],
  entry: "index.html",
};

function listFiles(dir, base = "") {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const relPath = base ? `${base}/${entry}` : entry;
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...listFiles(path, relPath));
    } else {
      files.push({
        path: relPath,
        size: stat.size,
      });
    }
  }
  return files;
}

manifest.files = listFiles(distDir);

writeFileSync(
  join(distDir, "deploy-manifest.json"),
  JSON.stringify(manifest, null, 2)
);

console.log(`  ✓ Manifest written (${manifest.files.length} files)`);

// ── Step 6: Output Summary ──
console.log("\n═══════════════════════════════════════");
console.log("  Deployment Ready");
console.log("═══════════════════════════════════════");
console.log(`\nBuild output: ${relative(rootDir, distDir)}`);
console.log(`Total size: ${totalSizeMB} MB`);
console.log(`Entry point: index.html`);
console.log(`\nTo deploy to Kimi:`);
console.log(`  1. Upload the contents of ${relative(rootDir, distDir)}/ to your Kimi static site`);
console.log(`  2. Or run: npx kimi deploy ${relative(rootDir, distDir)}`);
console.log(`\n✓ Done.`);
