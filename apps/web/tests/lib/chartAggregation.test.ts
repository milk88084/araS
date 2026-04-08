import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  aggregateTransactions,
  aggregateSnapshots,
  getRangeDisplayLabel,
} from "../../lib/chartAggregation";
import type { Transaction, ValueSnapshot } from "@repo/shared";

// Fixed "today": 2026-04-08 UTC
const FIXED_NOW = new Date("2026-04-08T10:00:00.000Z");

describe("aggregateTransactions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("returns 6 periods for 6m range", () => {
    const result = aggregateTransactions([], "6m");
    expect(result).toHaveLength(6);
  });

  it("returns 12 periods for 1y range", () => {
    const result = aggregateTransactions([], "1y");
    expect(result).toHaveLength(12);
  });

  it("returns 5 periods for 5w range", () => {
    const result = aggregateTransactions([], "5w");
    expect(result).toHaveLength(5);
  });

  it("returns 4 periods for 4y range", () => {
    const result = aggregateTransactions([], "4y");
    expect(result).toHaveLength(4);
  });

  it("groups income and expense by month for 6m", () => {
    const txs: Transaction[] = [
      {
        id: "1",
        type: "income",
        amount: 5000,
        category: "salary",
        source: "daily",
        note: null,
        date: "2026-04-01",
        createdAt: "2026-04-01",
      },
      {
        id: "2",
        type: "expense",
        amount: 2000,
        category: "food",
        source: "daily",
        note: null,
        date: "2026-04-02",
        createdAt: "2026-04-02",
      },
      {
        id: "3",
        type: "income",
        amount: 3000,
        category: "salary",
        source: "daily",
        note: null,
        date: "2026-03-15",
        createdAt: "2026-03-15",
      },
    ];
    const result = aggregateTransactions(txs, "6m");
    const apr = result.find((r) => r.period === "Apr");
    const mar = result.find((r) => r.period === "Mar");
    expect(apr?.income).toBe(5000);
    expect(apr?.expense).toBe(2000);
    expect(mar?.income).toBe(3000);
    expect(mar?.expense).toBe(0);
  });

  it("excludes transactions outside the range", () => {
    const old: Transaction = {
      id: "old",
      type: "income",
      amount: 99999,
      category: "old",
      source: "daily",
      note: null,
      date: "2024-01-01",
      createdAt: "2024-01-01",
    };
    const result = aggregateTransactions([old], "6m");
    expect(result.every((r) => r.income === 0)).toBe(true);
  });

  it("last period label is Apr for 6m from 2026-04-08", () => {
    const result = aggregateTransactions([], "6m");
    expect(result.at(-1)?.period).toBe("Apr");
  });
});

describe("aggregateSnapshots", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("returns 6 periods for 6m range", () => {
    const result = aggregateSnapshots([], "6m");
    expect(result).toHaveLength(6);
  });

  it("uses latest snapshot per period and computes netWorth", () => {
    const snapshots: ValueSnapshot[] = [
      { id: "1", date: "2026-04-01T08:00:00.000Z", totalAssets: 100000, totalLiabilities: 10000 },
      { id: "2", date: "2026-04-07T10:00:00.000Z", totalAssets: 120000, totalLiabilities: 10000 },
      { id: "3", date: "2026-03-15T10:00:00.000Z", totalAssets: 80000, totalLiabilities: 5000 },
    ];
    const result = aggregateSnapshots(snapshots, "6m");
    const apr = result.find((r) => r.period === "Apr");
    const mar = result.find((r) => r.period === "Mar");
    expect(apr?.totalAssets).toBe(120000);
    expect(apr?.netWorth).toBe(110000);
    expect(mar?.totalAssets).toBe(80000);
    expect(mar?.netWorth).toBe(75000);
  });

  it("returns zeros for periods with no snapshots", () => {
    const result = aggregateSnapshots([], "6m");
    expect(result.every((r) => r.totalAssets === 0 && r.netWorth === 0)).toBe(true);
  });
});

describe("getRangeDisplayLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("returns correct label for 6m from 2026-04-08", () => {
    expect(getRangeDisplayLabel("6m")).toBe("Nov 2025 – Apr 2026");
  });

  it("returns correct label for 4y from 2026-04-08", () => {
    expect(getRangeDisplayLabel("4y")).toBe("2023 – 2026");
  });
});
