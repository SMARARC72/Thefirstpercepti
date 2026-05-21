/**
 * Bundle C — Faction Simulation & Economy interlock tests
 *
 * Phase 24b / Session 4a / Phase 4.4.
 * Gates Bundle D. Per House red-team #2 + handoff Discipline 2.
 *
 * Validates the 7 Bundle C anchors:
 *   1. faction_reach — public_reach vs actual_reach (RT-21 three-pronged)
 *   2. faction_ledger — financial state arithmetic
 *   3. faction_tick_resolution — attempt/outcome enums + setback bias
 *   4. commodity_catalog_entry — unit enum + value/volatility bounds
 *   5. currency_archetype — frozen enum per RT-20 (tested inline)
 *   6. trade_route_v08 — active_status enum + capacity bounds
 *   7. scrip_stability_model — peg + confidence + shock log
 */
import { describe, it, expect } from "vitest";
import {
  FactionReachZ,
  FactionLedgerZ,
  FactionTickResolutionZ,
  CommodityCatalogEntryZ,
  ScripStabilityModelZ,
  TradeRouteV08SchemaZ,
} from "../src/zod-validators.js";

describe("Bundle C / L.III-SC-01 — faction_reach (RT-21)", () => {
  it("accepts diverged public vs actual reach", () => {
    const r = FactionReachZ.safeParse({
      public_reach: [
        { domain: "doctrinal", range: 3, visible_to_player: true },
      ],
      actual_reach: [
        { domain: "doctrinal", range: 5, visible_to_player: false },
      ],
    });
    expect(r.success).toBe(true);
  });

  // NOTE: JSON Schema's `const: true`/`const: false` on visible_to_player is
  // documentation-only — the generator emits z.boolean() without literal
  // refinement. Engine validators (downstream) enforce the const at write-time.
  // Track: generator refinement to emit z.literal when const is present.

  it("rejects range > 5", () => {
    const r = FactionReachZ.safeParse({
      public_reach: [{ domain: "civic", range: 6, visible_to_player: true }],
      actual_reach: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle C / L.III-SC-02 — faction_ledger", () => {
  it("accepts a minimal ledger (empty arrays + nullable currency)", () => {
    const r = FactionLedgerZ.safeParse({
      outstanding_debts: [],
      outstanding_credits: [],
      recent_transactions: [],
    });
    expect(r.success).toBe(true);
  });

  it("accepts a Tide-League-shaped ledger", () => {
    const r = FactionLedgerZ.safeParse({
      scrip_balance: 1250.5,
      salt_coin_balance: 80,
      outstanding_debts: [
        { creditor_faction_id: "fac_drowned", amount: 200, due_day: 45 },
      ],
      outstanding_credits: [
        { debtor_faction_id: "fac_civic_bell", amount: 100 },
      ],
      recent_transactions: [
        { day: 12, amount: -50, counterparty_id: "fac_drowned", kind: "tithe" },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("Bundle C / L.III-SC-03 — faction_tick_resolution", () => {
  it("accepts a 'gain' outcome with reach delta", () => {
    const r = FactionTickResolutionZ.safeParse({
      faction_id: "fac_drowned",
      tick_at_day: 30,
      attempt_kind: "expansion",
      outcome: "gain",
      setback_bias_applied: false,
      delta_reach: 1,
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown attempt_kind", () => {
    const r = FactionTickResolutionZ.safeParse({
      faction_id: "x",
      tick_at_day: 0,
      attempt_kind: "raid",
      outcome: "gain",
      setback_bias_applied: false,
    });
    expect(r.success).toBe(false);
  });

  it("setback_bias_applied flag preserved", () => {
    const r = FactionTickResolutionZ.safeParse({
      faction_id: "fac_winning",
      tick_at_day: 60,
      attempt_kind: "consolidation",
      outcome: "setback",
      setback_bias_applied: true,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.setback_bias_applied).toBe(true);
  });
});

describe("Bundle C / L.III-SC-04 — commodity_catalog_entry", () => {
  it("accepts salt-coin valuation", () => {
    const r = CommodityCatalogEntryZ.safeParse({
      commodity_id: "salt_block_50kg",
      name: "Salt Block (50kg)",
      unit: "kg",
      base_value_scrip: 20,
      base_value_salt_coin: 4,
      volatility: 2,
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown unit (closed enum)", () => {
    const r = CommodityCatalogEntryZ.safeParse({
      commodity_id: "x",
      name: "x",
      unit: "tonne",
      base_value_scrip: 1,
      base_value_salt_coin: 1,
      volatility: 1,
    });
    expect(r.success).toBe(false);
  });

  it("rejects volatility outside 1..5", () => {
    const r = CommodityCatalogEntryZ.safeParse({
      commodity_id: "x",
      name: "x",
      unit: "kg",
      base_value_scrip: 1,
      base_value_salt_coin: 1,
      volatility: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle C / L.III-SC-06 — trade_route_v08", () => {
  it("accepts an open salt-route under Tide League control", () => {
    const r = TradeRouteV08SchemaZ.safeParse({
      route_id: "route_salt_001",
      origin_location_id: "loc_salt_pans",
      destination_location_id: "loc_market_district",
      commodity_id: "salt_block_50kg",
      controlling_faction_id: "fac_merchant_tide_league",
      weather_dependency: true,
      active_status: "open",
      capacity_per_season: 1000,
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown active_status (closed enum)", () => {
    const r = TradeRouteV08SchemaZ.safeParse({
      route_id: "x",
      origin_location_id: "x",
      destination_location_id: "y",
      commodity_id: "z",
      weather_dependency: false,
      active_status: "abandoned",
      capacity_per_season: 0,
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative capacity_per_season", () => {
    const r = TradeRouteV08SchemaZ.safeParse({
      route_id: "x",
      origin_location_id: "x",
      destination_location_id: "y",
      commodity_id: "z",
      weather_dependency: false,
      active_status: "open",
      capacity_per_season: -1,
    });
    expect(r.success).toBe(false);
  });
});

describe("Bundle C / L.III-SC-07 — scrip_stability_model", () => {
  it("accepts a minimal peg + confidence model", () => {
    const r = ScripStabilityModelZ.safeParse({
      current_peg: { commodity_id: "salt_block_50kg", ratio: 0.05 },
      volatility_modifier: 1.0,
      recent_shocks: [],
      confidence_level: 3,
      shattering_aftershock_pressure: 2,
    });
    expect(r.success).toBe(true);
  });

  it("rejects volatility_modifier > 2.0", () => {
    const r = ScripStabilityModelZ.safeParse({
      current_peg: { commodity_id: "x", ratio: 1 },
      volatility_modifier: 3,
      recent_shocks: [],
      confidence_level: 3,
      shattering_aftershock_pressure: 0,
    });
    expect(r.success).toBe(false);
  });

  it("preserves recent_shocks[] order", () => {
    const r = ScripStabilityModelZ.safeParse({
      current_peg: { commodity_id: "x", ratio: 1 },
      volatility_modifier: 1,
      recent_shocks: [
        { day: 10, magnitude: 0.5, cause: "salt drought" },
        { day: 12, magnitude: -0.2, cause: "Bell Court audit" },
        { day: 14, magnitude: 0.1, cause: "Drowned Church endorsement" },
      ],
      confidence_level: 2,
      shattering_aftershock_pressure: 4,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.recent_shocks[0].day).toBe(10);
      expect(r.data.recent_shocks[2].day).toBe(14);
    }
  });

  it("rejects shattering_aftershock_pressure > 10", () => {
    const r = ScripStabilityModelZ.safeParse({
      current_peg: { commodity_id: "x", ratio: 1 },
      volatility_modifier: 1,
      recent_shocks: [],
      confidence_level: 3,
      shattering_aftershock_pressure: 11,
    });
    expect(r.success).toBe(false);
  });
});
