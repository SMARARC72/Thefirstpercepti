/**
 * Per-variant roundtrip test — items-v06 oneOf trinket (Phase 24d §6a.5).
 *
 * Trinket has no variant-specific required fields; effects_passive_structured
 * + acquisition_method carry semantic. Listening Child's Pebble exercises the
 * canonical slice trinket — canon-event-only acquisition, unloseable.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { itemHandler, itemVariantHandlers } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(join(__dirname, "..", "test-fixtures", "item_trinket_fixture.json"), "utf8"));
const engineItem = FIXTURE.engineShape;

describe("itemHandler / trinket variant roundtrip (Phase 24d 6a.5 Q-CLOSURE-4)", () => {
  it("toSnake routes trinket; acquisition_method = canon_event_only preserved", () => {
    const row = itemHandler.toSnake(engineItem);
    expect(row.item_id).toBe("item_listening_childs_pebble");
    expect(row.type).toBe("trinket");
    expect(row.acquisition_method).toBe("canon_event_only");
    expect((row.effects_passive_structured as unknown[])).toHaveLength(1);
    for (const k of Object.keys(row)) expect(k).not.toMatch(/[A-Z]/);
  });

  it("toCamel reverses lossless", () => {
    expect(itemHandler.toCamel(itemHandler.toSnake(engineItem))).toEqual(engineItem);
  });

  it("variant handler exported + bespoke", () => {
    expect(itemVariantHandlers.trinket).toBeDefined();
    expect(itemVariantHandlers.trinket.toSnake(engineItem).type).toBe("trinket");
  });
});
