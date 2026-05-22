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
  // Pass 2 handlers
  playerHandler,
  npcHandler,
  locationHandler,
  regionHandler,
  factionHandler,
  itemHandler,
  rumorHandler,
  beliefHandler,
  consequenceHandler,
  eventHandler,
  campaignHandler,
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

describe("naming / Pass 2 shallow-remap handlers (round-trip)", () => {
  // 9 handlers still using shallow camel↔snake remap (Pass 2 stubs awaiting
  // bespoke adapters when their persistence wiring fires first read/write).
  // Belief + NPC have FULL bespoke adapters tested separately below.
  const cases = [
    { name: "player", handler: playerHandler, sample: { id: "p1", name: "Khojen", firstPerception: "salt" } },
    { name: "location", handler: locationHandler, sample: { id: "loc_market", regionId: "greywake", parentLocationId: undefined } },
    { name: "region", handler: regionHandler, sample: { id: "greywake", name: "Greywake", dangerModifier: 2 } },
    { name: "faction", handler: factionHandler, sample: { id: "fac_drowned", name: "Drowned Church", jurisdictionalStrength: 7 } },
    { name: "item", handler: itemHandler, sample: { id: "itm_bell", name: "Drowned Bell", itemCategory: "key" } },
    { name: "rumor", handler: rumorHandler, sample: { id: "rmr_001", sourceNpcId: "npc_orro", emergedAtDay: 4 } },
    { name: "consequence", handler: consequenceHandler, sample: { id: "csq_001", triggerKind: "time", scheduledAtDay: 5 } },
    { name: "event", handler: eventHandler, sample: { id: "evt_001", actorId: "npc_orro", eventKind: "speech" } },
    { name: "campaign", handler: campaignHandler, sample: { id: "campaign_khojen", activeCharacterId: "p1" } },
  ];

  for (const { name, handler, sample } of cases) {
    it(`${name} round-trips lossless (Pass 2 shallow stub)`, () => {
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

describe("naming / beliefHandler — REFERENCE PATTERN for bespoke adapters (RISK #1)", () => {
  const engineBelief = {
    id: "bel_unnamed_001",
    statement: "The Unnamed walks among us.",
    isTrue: true,
    confidence: "high",
    supportingEvidence: ["evt_witness_001", "evt_witness_002"],
    contradictingEvidence: ["evt_recantation_001"],
    gameplayImpact: "Drowned Church reveres bearer.",
  };
  const ctx = { holderType: "npc" as const, holderId: "npc_ilyra" };

  it("toSnake requires BeliefPersistenceContext (throws without)", () => {
    expect(() => beliefHandler.toSnake(engineBelief)).toThrow(/BeliefPersistenceContext/);
  });

  it("toSnake maps engine fields to schema-shaped row with adapters", () => {
    const row = beliefHandler.toSnake(engineBelief, ctx);
    expect(row.belief_id).toBe("bel_unnamed_001");
    expect(row.holder_type).toBe("npc");
    expect(row.holder_id).toBe("npc_ilyra");
    expect(row.claim).toBe("The Unnamed walks among us.");
    expect(row.truth_status).toBe("true"); // isTrue: boolean → truth_status: enum
    expect(row.confidence).toBe(80); // "high" → 80 per BELIEF_CONFIDENCE_TO_INT
    expect(row.source_ids).toEqual([
      "evt_witness_001",
      "evt_witness_002",
      "evt_recantation_001",
    ]); // supporting + contradicting merged
  });

  it("toSnake handles each ConfidenceLevel enum band", () => {
    const bands: Array<[string, number]> = [
      ["certain", 95], ["high", 80], ["medium", 50], ["low", 25], ["doubtful", 10],
    ];
    for (const [band, expected] of bands) {
      const row = beliefHandler.toSnake({ ...engineBelief, confidence: band }, ctx);
      expect(row.confidence, `band=${band}`).toBe(expected);
    }
  });

  it("toCamel restores engine shape (modulo holder context which doesn't survive)", () => {
    const row = beliefHandler.toSnake(engineBelief, ctx);
    const restored = beliefHandler.toCamel(row);
    expect(restored.id).toBe("bel_unnamed_001");
    expect(restored.statement).toBe("The Unnamed walks among us.");
    expect(restored.isTrue).toBe(true);
    expect(restored.confidence).toBe("high"); // 80 → "high" via beliefConfidenceFromInt
    // supporting + contradicting can't unmerge — documented data loss
    expect(restored.supportingEvidence).toEqual([
      "evt_witness_001", "evt_witness_002", "evt_recantation_001",
    ]);
    expect(restored.contradictingEvidence).toEqual([]);
  });

  it("toCamel exposes raw truthStatus for engine code needing nuance beyond boolean", () => {
    const partialRow = {
      belief_id: "bel_x", claim: "x", truth_status: "partial", confidence: 50,
    };
    const restored = beliefHandler.toCamel(partialRow);
    expect(restored.truthStatus).toBe("partial");
    expect(restored.isTrue).toBe(false); // boolean collapses partial→false
  });

  it("toCamel confidence integer round-trips to nearest band", () => {
    const cases: Array<[number, string]> = [
      [95, "certain"], [80, "high"], [50, "medium"], [25, "low"], [10, "doubtful"],
      [70, "high"], [40, "medium"], [99, "certain"], [0, "doubtful"],
    ];
    for (const [int, band] of cases) {
      const restored = beliefHandler.toCamel({ belief_id: "b", confidence: int });
      expect(restored.confidence, `int=${int}`).toBe(band);
    }
  });
});

describe("naming / npcHandler — Bundle A sentinel-NULL JSONB defaults (RISK #2)", () => {
  const stubNpc = {
    id: "npc_market_seller",
    name: "Market Seller",
    description: "An unnamed stall-holder.",
    role: "vendor",
    factionId: "fac_market_guild",
    locationId: "loc_market_district",
    hp: 8,
    maxHp: 8,
    stats: { body: 8, grace: 10, sense: 8, mind: 8, will: 8, presence: 8, authority: 1, ruin: 1, creation: 1 },
    derivedStats: { str: 8, dex: 10, con: 8, int: 8, wis: 8, cha: 8 },
    tags: ["market", "vendor"],
  };

  it("toSnake populates all 6 Bundle A REQUIRED fields with sentinel-NULL stubs", () => {
    const row = npcHandler.toSnake(stubNpc);
    expect(row.want_model).toMatchObject({ _stub: true, _status: "awaiting_narrative_depth" });
    expect(row.knowledge_tri_layer).toMatchObject({ knows: [], says: [], believes: [], _stub: true });
    expect(Array.isArray(row.closing_conditions)).toBe(true);
    expect((row.closing_conditions as unknown[]).length).toBeGreaterThanOrEqual(2); // schema requires ≥2
    expect(row.memory_archetype).toBe("peasant"); // safe default
    expect(row.ambition_tick).toMatchObject({ _stub: true });
    expect(row.schedule_nesting).toMatchObject({ _stub: true });
  });

  it("toSnake passes through Phase 4a.5 REQUIRED stats / derived_stats / tags", () => {
    const row = npcHandler.toSnake(stubNpc);
    expect(row.stats).toEqual(stubNpc.stats);
    expect(row.derived_stats).toEqual(stubNpc.derivedStats);
    expect(row.tags).toEqual(stubNpc.tags);
  });

  it("toSnake hp number → hp_block {current, max}", () => {
    const row = npcHandler.toSnake(stubNpc);
    expect(row.hp).toEqual({ current: 8, max: 8 });
  });

  it("toSnake honors caller-provided Bundle A overrides over stubs", () => {
    const enrichedNpc = {
      ...stubNpc,
      wantModel: { primary_want: "redemption", _stub: false },
      memoryArchetype: "magistrate",
    };
    const row = npcHandler.toSnake(enrichedNpc);
    expect(row.want_model).toEqual({ primary_want: "redemption", _stub: false });
    expect(row.memory_archetype).toBe("magistrate");
  });

  it("toCamel surfaces _bundleAStub=true when stub flag detected", () => {
    const row = npcHandler.toSnake(stubNpc);
    const restored = npcHandler.toCamel(row);
    expect(restored._bundleAStub).toBe(true);
    // stub fields should be null-erased for engine convenience
    expect(restored.wantModel).toBeNull();
    expect(restored.knowledgeTriLayer).toBeNull();
  });

  it("toCamel surfaces real Bundle A data when not stubbed", () => {
    const enrichedRow = {
      npc_id: "npc_x", name: "X", role: "r",
      hp: { current: 10, max: 10 }, stats: {}, derived_stats: {}, tags: [],
      want_model: { primary_want: "y", _stub: false },
      knowledge_tri_layer: { knows: ["k1"], says: [], believes: [], _stub: false },
      closing_conditions: [{ condition_kind: "real" }],
      memory_archetype: "magistrate",
      ambition_tick: { cadence: "daily" },
      schedule_nesting: { local_pattern: "real" },
    };
    const restored = npcHandler.toCamel(enrichedRow);
    expect(restored._bundleAStub).toBe(false);
    expect(restored.wantModel).toEqual({ primary_want: "y", _stub: false });
    expect(restored.memoryArchetype).toBe("magistrate");
  });
});

describe("naming / NAMING_HANDLERS registry", () => {
  it("exposes 20 handler entries (9 Pass 1 + 11 Pass 2)", () => {
    expect(Object.keys(NAMING_HANDLERS)).toHaveLength(20);
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

  it("registry includes all 11 Pass 2 Category T entries from §3 recategorization", () => {
    const pass2Keys = ["player", "npc", "location", "region", "faction", "item",
      "rumor", "belief", "consequence", "event", "campaign"] as const;
    for (const k of pass2Keys) {
      expect(NAMING_HANDLERS[k], `missing handler: ${k}`).toBeDefined();
    }
  });
});
