#!/usr/bin/env node
/**
 * audit-glyphs.mjs — Tide-Stained Codex glyph discipline guard.
 *
 * Enforces: no emoji or non-allowed pictographic glyphs anywhere in apps/web.
 *
 * Allowed glyphs (per design_system/README.md brand bible):
 *   ◆  U+25C6  BLACK DIAMOND        — Authority-cost marker
 *   ❦  U+2766  FLORAL HEART         — litany prefix
 *   ↻  U+21BB  CLOCKWISE ARROW      — Wonderland-warp
 *   →  U+2192  RIGHTWARDS ARROW     — button arrow
 *   ·  U+00B7  MIDDLE DOT           — interpunct
 *
 * Always permitted (general typographic chrome):
 *   © ® ™ — – ' ' " " …
 *
 * Phase 14 / Wave C / UI-104. Run via `npm run audit:glyphs`.
 * CI fails if violations found.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const TARGET = resolve(ROOT, "apps/web");

const ALLOWED = new Set(["◆", "❦", "↻", "→", "·", "©", "®", "™", "—", "–", "‘", "’", "“", "”", "…"]);

const VALID_EXTS = new Set([".ts", ".tsx", ".html", ".css", ".json", ".md", ".mjs", ".js"]);

function isFlaggable(ch) {
  if (ALLOWED.has(ch)) return false;
  const cp = ch.codePointAt(0);
  // Emoji + symbol ranges that aren't in ALLOWED
  if (cp >= 0x1F300 && cp <= 0x1FAFF) return true;
  if (cp >= 0x2600 && cp <= 0x27BF) return true;
  if (cp >= 0x1F000 && cp <= 0x1F2FF) return true;
  if (cp >= 0x2300 && cp <= 0x23FF) return true;
  if (cp >= 0x1F3FB && cp <= 0x1F3FF) return true;  // skin-tone modifiers
  if (cp === 0xFE0F) return true;                    // emoji variation selector
  return false;
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walk(full);
    } else {
      const ext = entry.slice(entry.lastIndexOf("."));
      if (VALID_EXTS.has(ext)) yield full;
    }
  }
}

const violations = [];
for (const path of walk(TARGET)) {
  let content;
  try { content = readFileSync(path, "utf8"); } catch { continue; }
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (isFlaggable(ch)) {
        violations.push({
          path: path.replace(ROOT + "/", ""),
          line: i + 1,
          glyph: ch,
          codepoint: "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"),
          context: lines[i].trim().slice(0, 100),
        });
        break;
      }
    }
  }
}

if (violations.length === 0) {
  console.log("✅ Tide-Stained glyph audit: 0 violations in apps/web.");
  process.exit(0);
}

console.error("❌ Tide-Stained glyph audit: " + violations.length + " violation(s) found in apps/web:");
console.error("");
console.error("Allowed glyphs: ◆ ❦ ↻ → · (per design_system brand bible).");
console.error("");
for (const v of violations) {
  console.error("  " + v.path + ":" + v.line + " [" + v.codepoint + "] '" + v.glyph + "'");
  console.error("    " + v.context);
}
console.error("");
console.error("Replace with an allowed glyph or remove. See packages/ui-system/README.md");
process.exit(1);
