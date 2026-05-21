/**
 * Phase 21 / OPS-509 — opex package tests.
 *
 * Mocks the postgres SDK at the module boundary. Note: porsager's `postgres`
 * returns arrays directly (not { rows: [...] }).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// We mock at the singleton in src/db.ts so all callers see the mock.
const sqlMock = vi.fn();

vi.mock("../src/db.js", () => ({
  sql: sqlMock,
}));

beforeEach(() => {
  sqlMock.mockReset();
  vi.resetModules();
});

describe("getDailySpend", () => {
  it("lazy-creates row for new date and returns it", async () => {
    sqlMock.mockResolvedValueOnce([]);                          // INSERT ... DO NOTHING
    sqlMock.mockResolvedValueOnce([                              // SELECT
      { utc_date: "2026-05-20", daily_spend_usd: 0, daily_cap_usd: 5.0 },
    ]);

    const { getDailySpend } = await import("../src/OpexState.js");
    const result = await getDailySpend(5.0);

    expect(result.daily_spend_usd).toBe(0);
    expect(result.daily_cap_usd).toBe(5.0);
    expect(sqlMock).toHaveBeenCalledTimes(2);
  });
});

describe("bumpDailySpend", () => {
  it("returns new total after atomic UPDATE RETURNING", async () => {
    sqlMock.mockResolvedValueOnce([{ new_total: 1.25 }]);

    const { bumpDailySpend } = await import("../src/OpexState.js");
    const newTotal = await bumpDailySpend(0.25);

    expect(newTotal).toBe(1.25);
  });

  it("throws if row missing (caller forgot to lazy-init)", async () => {
    sqlMock.mockResolvedValueOnce([]);

    const { bumpDailySpend } = await import("../src/OpexState.js");
    await expect(bumpDailySpend(0.1)).rejects.toThrow(/missing/);
  });
});

describe("isOverSoftCap", () => {
  it("returns true at 92% with default 10% buffer", async () => {
    sqlMock.mockResolvedValueOnce([]);                          // upsert
    sqlMock.mockResolvedValueOnce([
      { utc_date: "2026-05-20", daily_spend_usd: 4.6, daily_cap_usd: 5.0 },
    ]);

    const { isOverSoftCap } = await import("../src/OpexState.js");
    expect(await isOverSoftCap(5.0, 0.1)).toBe(true);
  });

  it("returns false at 50% with default buffer", async () => {
    sqlMock.mockResolvedValueOnce([]);
    sqlMock.mockResolvedValueOnce([
      { utc_date: "2026-05-20", daily_spend_usd: 2.5, daily_cap_usd: 5.0 },
    ]);

    const { isOverSoftCap } = await import("../src/OpexState.js");
    expect(await isOverSoftCap(5.0, 0.1)).toBe(false);
  });
});

describe("session budget", () => {
  it("lazy-creates session budget row", async () => {
    sqlMock.mockResolvedValueOnce([]);
    sqlMock.mockResolvedValueOnce([
      { session_id: "s1", tokens_consumed: 0, tokens_budget: 250_000 },
    ]);

    const { getSessionBudget } = await import("../src/OpexState.js");
    const result = await getSessionBudget("s1", 250_000);
    expect(result.tokens_consumed).toBe(0);
    expect(result.tokens_budget).toBe(250_000);
  });

  it("isSessionOverBudget true when consumed >= budget", async () => {
    sqlMock.mockResolvedValueOnce([]);
    sqlMock.mockResolvedValueOnce([
      { session_id: "s1", tokens_consumed: 250_000, tokens_budget: 250_000 },
    ]);

    const { isSessionOverBudget } = await import("../src/OpexState.js");
    expect(await isSessionOverBudget("s1", 250_000)).toBe(true);
  });
});

describe("recordOpexEvent", () => {
  it("does not throw on Postgres failure (best-effort ledger)", async () => {
    sqlMock.mockRejectedValueOnce(new Error("connection refused"));
    const { recordOpexEvent } = await import("../src/OpexEvent.js");
    const eventId = await recordOpexEvent({
      agent: "narrator",
      model_id: "claude-sonnet-4-6",
      tier: "premium",
      tokens_in: 100,
      tokens_out: 50,
      est_cost_usd: 0.01,
      success: true,
    });
    expect(eventId).toMatch(/^[0-9a-f-]+$/);
  });
});
