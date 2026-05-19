import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, ".");
const contentDir = join(rootDir, "content");
const inputPath = join(contentDir, "narrative", "main.ink");

function preprocessInk(sourcePath, visited = new Set()) {
  if (visited.has(sourcePath)) {
    throw new Error(`Circular include detected: ${sourcePath}`);
  }
  visited.add(sourcePath);
  const dir = dirname(sourcePath);
  let content = readFileSync(sourcePath, "utf-8");
  content = content.replace(/^INCLUDE\s+(.+)$/gm, (match, includePath) => {
    const resolved = join(dir, includePath.trim());
    if (!existsSync(resolved)) {
      return `// MISSING INCLUDE: ${includePath}`;
    }
    return preprocessInk(resolved, new Set(visited));
  });
  return content;
}

import { existsSync } from "fs";
const preprocessed = preprocessInk(inputPath);
writeFileSync("debug.ink", preprocessed);
const lines = preprocessed.split("\n");
console.log("Line 208:", lines[207]);
console.log("Line 209:", lines[208]);
console.log("Line 210:", lines[209]);
console.log("Line 211:", lines[210]);
