/**
 * Per-variant roundtrip test — items-v06 oneOf book (Phase 24d §6a.5).
 *
 * Book has no variant-specific required fields; description_long carries the
 * book's content. Field Journal exercises the canonical slice book — passive
 * effect commits player entries to Tale Log at end of scene.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { itemHandler, itemVariantHandlers } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(join(__dirname, "..", "test-fixtures", "item_book_fixture.json"), "utf8"));
const engineItem = FIXTURE.engineShape;

describe("itemHandler / book variant roundtrip (Phase 24d 6a.5 Q-CLOSURE-4)", () => {
  it("toSnake routes book; effects_passive_structured (tale-log writer) preserved", () => {
    const row = itemHandler.toSnake(engineItem);
    expect(row.item_id).toBe("item_field_journal_blank");
    expect(row.type).toBe("book");
    expect((row.effects_passive_structured as unknown[])).toHaveLength(1);
    for (const k of Object.keys(row)) expect(k).not.toMatch(/[A-Z]/);
  });

  it("toCamel reverses lossless", () => {
    expect(itemHandler.toCamel(itemHandler.toSnake(engineItem))).toEqual(engineItem);
  });

  it("variant handler exported + bespoke", () => {
    expect(itemVariantHandlers.book).toBeDefined();
    expect(itemVariantHandlers.book.toSnake(engineItem).type).toBe("book");
  });
});
