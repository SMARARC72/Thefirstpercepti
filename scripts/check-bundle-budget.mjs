#!/usr/bin/env node
/**
 * Bundle Budget Gate
 *
 * Reads `apps/web/dist/assets/*` and fails the build if any tracked
 * asset exceeds its raw or gzip budget. Anchored at the post-Phase-10
 * floor with deliberate growth headroom (~6 kB raw main.js, ~3 kB gzip).
 *
 * Phase 11+ additions that push past a budget have to either optimise
 * the change or raise the budget here in a separate commit — both leave
 * an audit trail.
 *
 * No new dependencies; gzip sizes computed via Node's built-in zlib.
 *
 * Exit 0: every tracked asset is within budget.
 * Exit 1: at least one asset is over.
 * Exit 2: tracked file is missing (build hasn't run or output renamed).
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const distAssetsDir = join(rootDir, "apps", "web", "dist", "assets");

// Tracked assets — entries match the asset *prefix* (the hash suffix
// changes every build, so we glob-match instead).
const BUDGETS = [
  { prefix: "main-", ext: ".js", raw: 220_000, gzip: 65_000 },
  { prefix: "main-", ext: ".css", raw: 55_000, gzip: 12_000 },
  { prefix: "vendor-", ext: ".js", raw: 470_000, gzip: 130_000 },
];

function findAsset(prefix, ext) {
  if (!existsSync(distAssetsDir)) return null;
  for (const name of readdirSync(distAssetsDir)) {
    if (name.startsWith(prefix) && name.endsWith(ext)) {
      return join(distAssetsDir, name);
    }
  }
  return null;
}

function fmtKb(bytes) {
  return `${(bytes / 1000).toFixed(2)} kB`;
}

function check({ prefix, ext, raw, gzip }) {
  const path = findAsset(prefix, ext);
  if (!path) {
    return {
      label: `${prefix}*${ext}`,
      status: "missing",
      detail: `no file matched ${prefix}*${ext} under apps/web/dist/assets/`,
    };
  }
  const buf = readFileSync(path);
  const gzBuf = gzipSync(buf);
  const overRaw = buf.length > raw;
  const overGzip = gzBuf.length > gzip;
  return {
    label: path.split("/").pop(),
    status: overRaw || overGzip ? "over" : "ok",
    raw: buf.length,
    gzip: gzBuf.length,
    rawBudget: raw,
    gzipBudget: gzip,
    overRaw,
    overGzip,
  };
}

console.log("═══════════════════════════════════════");
console.log("  Bundle Budget Gate");
console.log("═══════════════════════════════════════");

let hadMissing = false;
let hadOver = false;
for (const budget of BUDGETS) {
  const r = check(budget);
  if (r.status === "missing") {
    console.error(`✗ ${r.label}: ${r.detail}`);
    hadMissing = true;
    continue;
  }
  const rawFlag = r.overRaw ? "OVER" : "ok";
  const gzipFlag = r.overGzip ? "OVER" : "ok";
  const line = [
    `  ${r.label}:`,
    `raw ${fmtKb(r.raw)} / ${fmtKb(r.rawBudget)} [${rawFlag}]`,
    `gzip ${fmtKb(r.gzip)} / ${fmtKb(r.gzipBudget)} [${gzipFlag}]`,
  ].join("  ");
  if (r.status === "over") {
    console.error(line);
    if (r.overRaw) {
      console.error(`    → raw over by ${fmtKb(r.raw - r.rawBudget)}`);
    }
    if (r.overGzip) {
      console.error(`    → gzip over by ${fmtKb(r.gzip - r.gzipBudget)}`);
    }
    hadOver = true;
  } else {
    console.log(line);
  }
}

if (hadMissing) {
  console.error("\n✗ Bundle budget gate: missing tracked asset(s).");
  console.error("  Run `npm run build` first.");
  process.exit(2);
}

if (hadOver) {
  console.error("\n✗ Bundle budget gate: at least one asset exceeds budget.");
  console.error("  Either optimise the change or raise the budget in");
  console.error("  scripts/check-bundle-budget.mjs (with a justification in");
  console.error("  the commit message + docs/BASELINE_METRICS.md update).");
  process.exit(1);
}

console.log("\n✓ All tracked assets within budget.");
