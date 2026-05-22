/**
 * Per-variant roundtrip test — items-v06 oneOf tool (Phase 24d §6a.5).
 *
 * Tool has no variant-specific required fields; effects_passive_structured
 * carries trigger semantics. Witness Bell exercises the canonical slice tool
 * shape — rings on canon_event detection within 30ft.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { itemHandler, itemVariantHandlers } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(join(__dirname, "..", "test-fixtures", "item_tool_fixture.json"), "utf8"));
const engineItem = FIXTURE.engineShape;

describe("itemHandler / tool variant roundtrip (Phase 24d 6a.5 Q-CLOSURE-4)", () => {
  it("toSnake routes tool; effects_passive_structured preserved", () => {
    const row = itemHandler.toSnake(engineItem);
    expect(row.item_id).toBe("item_witness_bell");
    expect(row.type).toBe("tool");
    expect((row.effects_passive_structured as unknown[])).toHaveLength(1);
    for (const k of Object.keys(row)) expect(k).not.toMatch(/[A-Z]/);
  });

  it("toCamel reverses lossless", () => {
    expect(itemHandler.toCamel(itemHandler.toSnake(engineItem))).toEqual(engineItem);
  });

  it("variant handler exported + bespoke", () => {
    expect(itemVariantHandlers.tool).toBeDefined();
    expect(itemVariantHandlers.tool.toSnake(engineItem).type).toBe("tool");
  });
});
