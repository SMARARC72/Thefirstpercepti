/**
 * Per-variant roundtrip test — items-v06 oneOf wondrous (Phase 24d §6a.5).
 *
 * Wondrous has no variant-specific required fields; effects_on_attune_structured
 * + attunement_ceremony + attunement_slot_cost carry magical-item semantics.
 * Marrow-Wax Seal of Ilyra exercises sworn-attunement variant.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { itemHandler, itemVariantHandlers } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(join(__dirname, "..", "test-fixtures", "item_wondrous_fixture.json"), "utf8"));
const engineItem = FIXTURE.engineShape;

describe("itemHandler / wondrous variant roundtrip (Phase 24d 6a.5 Q-CLOSURE-4)", () => {
  it("toSnake routes wondrous; attunement_ceremony=sworn_oath + effects_on_attune preserved", () => {
    const row = itemHandler.toSnake(engineItem);
    expect(row.item_id).toBe("item_marrow_wax_seal_of_ilyra");
    expect(row.type).toBe("wondrous");
    expect(row.requires_attunement).toBe(true);
    expect(row.attunement_ceremony).toBe("sworn_oath");
    expect((row.effects_on_attune_structured as unknown[])).toHaveLength(1);
    for (const k of Object.keys(row)) expect(k).not.toMatch(/[A-Z]/);
  });

  it("toCamel reverses lossless", () => {
    expect(itemHandler.toCamel(itemHandler.toSnake(engineItem))).toEqual(engineItem);
  });

  it("variant handler exported + bespoke", () => {
    expect(itemVariantHandlers.wondrous).toBeDefined();
    expect(itemVariantHandlers.wondrous.toSnake(engineItem).type).toBe("wondrous");
  });
});
