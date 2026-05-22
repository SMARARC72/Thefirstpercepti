/**
 * Per-variant roundtrip test — items-v06 oneOf consumable (Phase 24d §6a.5).
 *
 * Consumable has no variant-specific required fields; effects_on_use_structured
 * + charges_max + charges_recover are prominent. Vial of Practiced-Name Water
 * exercises the canonical slice consumable shape.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { itemHandler, itemVariantHandlers } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(join(__dirname, "..", "test-fixtures", "item_consumable_fixture.json"), "utf8"));
const engineItem = FIXTURE.engineShape;

describe("itemHandler / consumable variant roundtrip (Phase 24d 6a.5 Q-CLOSURE-4)", () => {
  it("toSnake routes consumable; effects_on_use_structured preserved", () => {
    const row = itemHandler.toSnake(engineItem);
    expect(row.item_id).toBe("item_vial_of_practiced_name_water");
    expect(row.type).toBe("consumable");
    expect((row.effects_on_use_structured as unknown[])).toHaveLength(1);
    expect(row.charges_max).toBe(1);
    expect(row.charges_recover).toBe("consumed_on_use");
    for (const k of Object.keys(row)) expect(k).not.toMatch(/[A-Z]/);
  });

  it("toCamel reverses lossless", () => {
    expect(itemHandler.toCamel(itemHandler.toSnake(engineItem))).toEqual(engineItem);
  });

  it("variant handler exported + bespoke", () => {
    expect(itemVariantHandlers.consumable).toBeDefined();
    expect(itemVariantHandlers.consumable.toSnake(engineItem).type).toBe("consumable");
  });
});
