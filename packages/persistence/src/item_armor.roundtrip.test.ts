/**
 * Per-variant roundtrip test — items-v06 oneOf armor (Phase 24d §6a.5 Q-CLOSURE-4).
 *
 * Validates bespoke armor variant handler: armor_ac_base required; dex_cap +
 * strength_min + stealth_disadvantage optional. Dispatcher routes via item.type.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { itemHandler, itemVariantHandlers } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(join(__dirname, "..", "test-fixtures", "item_armor_fixture.json"), "utf8"));
const engineItem = FIXTURE.engineShape;

describe("itemHandler / armor variant roundtrip (Phase 24d 6a.5 Q-CLOSURE-4)", () => {
  it("toSnake routes to armor handler + required armor_ac_base present", () => {
    const row = itemHandler.toSnake(engineItem);
    expect(row.item_id).toBe("itm_leather_armor");
    expect(row.type).toBe("armor");
    expect(row.armor_ac_base).toBe(11);
    expect(row.armor_dex_cap).toBe(99);
    for (const k of Object.keys(row)) expect(k).not.toMatch(/[A-Z]/);
  });

  it("toCamel reverses lossless", () => {
    expect(itemHandler.toCamel(itemHandler.toSnake(engineItem))).toEqual(engineItem);
  });

  it("toSnake throws if armorAcBase missing", () => {
    expect(() => itemHandler.toSnake({ ...engineItem, armorAcBase: undefined })).toThrow(/armorAcBase/);
  });

  it("toCamel throws if armor_ac_base missing", () => {
    const row = itemHandler.toSnake(engineItem);
    delete (row as Record<string, unknown>).armor_ac_base;
    expect(() => itemHandler.toCamel(row)).toThrow(/armor_ac_base/);
  });

  it("variant handler exported + bespoke (not behind generic)", () => {
    expect(itemVariantHandlers.armor).toBeDefined();
    expect(itemVariantHandlers.armor.toSnake(engineItem).type).toBe("armor");
  });
});
