/**
 * Naming translation layer tests — Phase 24c §5b.5 Pass 1.
 *
 * Per-entity round-trip discipline: input → toSnake → toCamel → input
 * (deep equality). Verifies handlers are pure + lossless for the shallow
 * Pass 1 mapping.
 */
import { describe, it, expect } from "vitest";
import {
  camelToSnake,
  snakeToCamel,
  remapKeys,
  worldPulseHandler,
  intentHandler,
  turnResponseHandler,
  agentPhaseResultHandler,
  stateDiffHandler,
  entityChangesHandler,
  entityAdditionHandler,
  entityRemovalHandler,
  NAMING_HANDLERS,
} from "./naming.js";

describe("naming / camelToSnake + snakeToCamel", () => {
  it("camelToSnake handles single-word, multi-word, leading-cap", () => {
    expect(camelToSnake("name")).toBe("name");
    expect(camelToSnake("fooBar")).toBe("foo_bar");
    expect(camelToSnake("fooBarBaz")).toBe("foo_bar_baz");
    expect(camelToSnake("URL")).toBe("_u_r_l"); // edge case: all-caps becomes leading-underscored
  });

  it("snakeToCamel handles single, multi, leading underscore", () => {
    expect(snakeToCamel("name")).toBe("name");
    expect(snakeToCamel("foo_bar")).toBe("fooBar");
    expect(snakeToCamel("foo_bar_baz")).toBe("fooBarBaz");
  });

  it("round-trip identity on canonical camelCase keys", () => {
    const cases = ["id", "name", "actionEconomy", "bonusAction", "hpBlock", "stateDiff"];
    for (const c of cases) {
      expect(snakeToCamel(camelToSnake(c))).toBe(c);
    }
  });
});

describe("naming / remapKeys", () => {
  it("applies mapper to every top-level key", () => {
    const input = { fooBar: 1, bazQux: "two" };
    const out = remapKeys(input, camelToSnake);
    expect(out).toEqual({ foo_bar: 1, baz_qux: "two" });
  });

  it("does not mutate the input", () => {
    const input = { fooBar: 1 };
    remapKeys(input, camelToSnake);
    expect(input).toEqual({ fooBar: 1 });
  });

  it("does not recurse into nested objects (Pass 1 shallow scope)", () => {
    const input = { outerKey: { innerKey: 1 } };
    const out = remapKeys(input, camelToSnake);
    expect(out).toEqual({ outer_key: { innerKey: 1 } });
  });
});

describe("naming / Pass 1 handler round-trips", () => {
  const cases = [
    { name: "worldPulse", handler: worldPulseHandler, sample: { tickerItemId: "t1", payload: "x" } },
    { name: "intent", handler: intentHandler, sample: { actionType: "speak", targetId: "n1" } },
    { name: "turnResponse", handler: turnResponseHandler, sample: { narrationText: "...", suggestedActions: [] } },
    { name: "agentPhaseResult", handler: agentPhaseResultHandler, sample: { agentName: "narrator", phaseIndex: 1 } },
    { name: "stateDiff", handler: stateDiffHandler, sample: { entityChanges: {}, addedEntities: [], removedEntities: [] } },
    { name: "entityChanges", handler: entityChangesHandler, sample: { changedFields: ["a", "b"] } },
    { name: "entityAddition", handler: entityAdditionHandler, sample: { newEntityId: "e1" } },
    { name: "entityRemoval", handler: entityRemovalHandler, sample: { removedEntityId: "e1" } },
  ];

  for (const { name, handler, sample } of cases) {
    it(`${name} round-trips lossless (Pass 1 shallow)`, () => {
      const persisted = handler.toSnake(sample);
      const restored = handler.toCamel(persisted);
      expect(restored).toEqual(sample);
    });

    it(`${name}.toSnake produces snake_case top-level keys`, () => {
      const persisted = handler.toSnake(sample);
      for (const k of Object.keys(persisted)) {
        expect(k).not.toMatch(/[A-Z]/);
      }
    });
  }
});

describe("naming / NAMING_HANDLERS registry", () => {
  it("exposes 9 Pass 1 handler entries", () => {
    expect(Object.keys(NAMING_HANDLERS)).toHaveLength(9);
  });

  it("each registered handler has toSnake + toCamel", () => {
    for (const [name, h] of Object.entries(NAMING_HANDLERS)) {
      expect(typeof h.toSnake, `${name}.toSnake`).toBe("function");
      expect(typeof h.toCamel, `${name}.toCamel`).toBe("function");
    }
  });

  it("intent + alternativeIntent share the same handler (per addendum)", () => {
    expect(NAMING_HANDLERS.intent).toBe(NAMING_HANDLERS.alternativeIntent);
  });
});
