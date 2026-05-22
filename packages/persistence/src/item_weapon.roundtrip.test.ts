/**
 * Per-variant roundtrip test — items-v06 oneOf weapon (Phase 24d §6a.5 Q-CLOSURE-4).
 *
 * Verifies the bespoke weapon variant handler in itemHandler dispatch:
 *   - toSnake validates required damageDice + damageType
 *   - toCamel validates required damage_dice + damage_type
 *   - roundtrip is lossless
 *   - dispatcher routes via item.type discriminator
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { itemHandler, itemVariantHandlers, DEFERRED_ITEM_VARIANTS } from "./naming.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(join(__dirname, "..", "test-fixtures", "item_weapon_fixture.json"), "utf8"));
const engineItem = FIXTURE.engineShape;

describe("itemHandler / weapon variant roundtrip (Phase 24d 6a.5 Q-CLOSURE-4)", () => {
  it("toSnake routes to weapon handler + produces snake_case row with required fields", () => {
    const row = itemHandler.toSnake(engineItem);
    expect(row.item_id).toBe("itm_dagger");
    expect(row.type).toBe("weapon");
    expect(row.damage_dice).toBe("1d4");
    expect(row.damage_type).toBe("piercing");
    // No camelCase keys leaked through
    for (const k of Object.keys(row)) expect(k).not.toMatch(/[A-Z]/);
  });

  it("toCamel reverses to engine shape; roundtrip lossless", () => {
    const row = itemHandler.toSnake(engineItem);
    const restored = itemHandler.toCamel(row);
    expect(restored).toEqual(engineItem);
  });

  it("toSnake throws if required damageDice is missing", () => {
    const broken = { ...engineItem, damageDice: undefined };
    expect(() => itemHandler.toSnake(broken)).toThrow(/damageDice/);
  });

  it("toSnake throws if required damageType is missing", () => {
    const broken = { ...engineItem, damageType: undefined };
    expect(() => itemHandler.toSnake(broken)).toThrow(/damageType/);
  });

  it("toCamel throws if row missing damage_dice", () => {
    const row = itemHandler.toSnake(engineItem);
    delete (row as Record<string, unknown>).damage_dice;
    expect(() => itemHandler.toCamel(row)).toThrow(/damage_dice/);
  });

  it("dispatcher throws v0.9 message for deferred shield variant", () => {
    const fake = { ...engineItem, type: "shield" };
    expect(() => itemHandler.toSnake(fake)).toThrow(/deferred to v0\.9/);
  });

  it("variant handler exported + callable directly (bespoke pattern; not behind generic interface)", () => {
    expect(itemVariantHandlers.weapon).toBeDefined();
    const direct = itemVariantHandlers.weapon.toSnake(engineItem);
    expect(direct.type).toBe("weapon");
  });

  it("DEFERRED_ITEM_VARIANTS includes shield + ammunition + key (v0.9 backlog)", () => {
    expect([...DEFERRED_ITEM_VARIANTS]).toEqual(["shield", "ammunition", "key"]);
  });
});
