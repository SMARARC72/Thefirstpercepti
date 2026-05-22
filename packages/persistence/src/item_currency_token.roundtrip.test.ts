/**
 * Per-variant roundtrip test — items-v06 oneOf currency_token (Phase 24d §6a.5).
 *
 * Currency_token has no variant-specific required fields; value_in_scrip /
 * value_cp / value_note define its economic role. Tide League scrip bundle
 * exercises the canonical slice currency_token shape.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { itemHandler, itemVariantHandlers } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(join(__dirname, "..", "test-fixtures", "item_currency_token_fixture.json"), "utf8"));
const engineItem = FIXTURE.engineShape;

describe("itemHandler / currency_token variant roundtrip (Phase 24d 6a.5 Q-CLOSURE-4)", () => {
  it("toSnake routes currency_token; value_in_scrip + value_note preserved", () => {
    const row = itemHandler.toSnake(engineItem);
    expect(row.item_id).toBe("item_tide_league_scrip_bundle_25");
    expect(row.type).toBe("currency_token");
    expect(row.value_in_scrip).toBe(25);
    expect(row.value_cp).toBe(0);
    expect(typeof row.value_note).toBe("string");
    for (const k of Object.keys(row)) expect(k).not.toMatch(/[A-Z]/);
  });

  it("toCamel reverses lossless", () => {
    expect(itemHandler.toCamel(itemHandler.toSnake(engineItem))).toEqual(engineItem);
  });

  it("variant handler exported + bespoke", () => {
    expect(itemVariantHandlers.currency_token).toBeDefined();
    expect(itemVariantHandlers.currency_token.toSnake(engineItem).type).toBe("currency_token");
  });
});
