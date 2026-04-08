# Transactions Chart Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder transactions page with a Profit & Loss statistics page featuring Investment and Liquidity bar charts using Recharts, matching the provided reference screenshots.

**Architecture:** Pure frontend, localStorage-based. A new `ValueSnapshot` type is auto-recorded to the store whenever assets/liabilities change, enabling the Investment chart. A pure aggregation utility module groups raw store data into chart-ready points. Two presentational chart components receive aggregated data as props.

**Tech Stack:** Next.js 15, React 19, Recharts 2.x, Zustand (persist), Zod, Vitest + jsdom

---

## File Map

| File                                              | Action  | Responsibility                                                                        |
| ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| `packages/shared/src/schemas/finance.ts`          | Modify  | Add `ValueSnapshot` schema + type                                                     |
| `apps/web/store/useFinanceStore.ts`               | Modify  | Add `valueSnapshots[]` state + auto-snapshot in add/update/delete actions             |
| `apps/web/lib/chartAggregation.ts`                | Create  | Pure functions: `aggregateTransactions`, `aggregateSnapshots`, `getRangeDisplayLabel` |
| `apps/web/tests/lib/chartAggregation.test.ts`     | Create  | Unit tests for aggregation logic                                                      |
| `apps/web/components/finance/PnlChart.tsx`        | Create  | Recharts bar chart for income/expense                                                 |
| `apps/web/components/finance/InvestmentChart.tsx` | Create  | Recharts bar chart for totalAssets/netWorth                                           |
| `apps/web/app/(finance)/transactions/page.tsx`    | Rewrite | Tab state, range state, data wiring, layout                                           |
| `apps/web/package.json`                           | Modify  | Add `recharts` dependency                                                             |

---

## Task 1: Install Recharts

**Files:**

- Modify: `apps/web/package.json`

- [ ] **Step 1: Install recharts**

```bash
cd apps/web && pnpm add recharts
```

Expected: `recharts` appears in `apps/web/package.json` dependencies.

- [ ] **Step 2: Verify type-check passes**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "build(web): add recharts dependency"
```

---

## Task 2: Add ValueSnapshot to Shared Schema

**Files:**

- Modify: `packages/shared/src/schemas/finance.ts`

`ValueSnapshot` is auto-appended to the store whenever asset/liability values change, enabling the Investment chart to show historical data.

- [ ] **Step 1: Add schema to `packages/shared/src/schemas/finance.ts`**

Add this block at the end of the file (before the last line):

```ts
// ValueSnapshot — auto-recorded on every asset/liability mutation
export const ValueSnapshotSchema = z.object({
  id: z.string(),
  date: z.string(), // ISO string, e.g. "2026-04-08T10:00:00.000Z"
  totalAssets: z.number(),
  totalLiabilities: z.number(),
});
export type ValueSnapshot = z.infer<typeof ValueSnapshotSchema>;
```

- [ ] **Step 2: Verify type-check passes**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors. (`ValueSnapshot` is auto-exported via `export * from "./finance"` in `packages/shared/src/schemas/index.ts`.)

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/schemas/finance.ts
git commit -m "feat(shared): add ValueSnapshot schema"
```

---

## Task 3: Update Store with valueSnapshots + Auto-Snapshot

**Files:**

- Modify: `apps/web/store/useFinanceStore.ts`

Auto-snapshot is triggered on every add/update/delete of assets and liabilities. The snapshot captures totals _after_ the mutation, computed inside `set()` so it's always consistent.

- [ ] **Step 1: Rewrite `apps/web/store/useFinanceStore.ts`**

```ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Asset,
  Liability,
  Transaction,
  PortfolioItem,
  ValueSnapshot,
  CreateAsset,
  UpdateAsset,
  CreateLiability,
  UpdateLiability,
  CreateTransaction,
  CreatePortfolioItem,
} from "@repo/shared";

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

interface FinanceState {
  assets: Asset[];
  liabilities: Liability[];
  transactions: Transaction[];
  portfolio: PortfolioItem[];
  valueSnapshots: ValueSnapshot[];
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  addAsset: (data: CreateAsset) => Promise<void>;
  updateAsset: (id: string, data: UpdateAsset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addLiability: (data: CreateLiability) => Promise<void>;
  updateLiability: (id: string, data: UpdateLiability) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;
  addTransaction: (data: CreateTransaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addPortfolioItem: (data: CreatePortfolioItem) => Promise<void>;
  deletePortfolioItem: (id: string) => Promise<void>;
}

function makeSnapshot(assets: Asset[], liabilities: Liability[]): ValueSnapshot {
  return {
    id: uuid(),
    date: now(),
    totalAssets: assets.reduce((s, a) => s + a.value, 0),
    totalLiabilities: liabilities.reduce((s, l) => s + l.balance, 0),
  };
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      assets: [],
      liabilities: [],
      transactions: [],
      portfolio: [],
      valueSnapshots: [],
      loading: false,
      error: null,

      fetchAll: async () => {
        // 本地模式：資料已在 localStorage，無需 fetch
      },

      addAsset: async (data) => {
        const asset: Asset = {
          id: uuid(),
          name: data.name,
          category: data.category,
          value: data.value,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => {
          const newAssets = [asset, ...s.assets];
          return {
            assets: newAssets,
            valueSnapshots: [...s.valueSnapshots, makeSnapshot(newAssets, s.liabilities)],
          };
        });
      },

      updateAsset: async (id, data) => {
        set((s) => {
          const newAssets = s.assets.map((a) =>
            a.id === id
              ? {
                  ...a,
                  name: data.name ?? a.name,
                  category: data.category ?? a.category,
                  value: data.value ?? a.value,
                  updatedAt: now(),
                }
              : a
          );
          return {
            assets: newAssets,
            valueSnapshots: [...s.valueSnapshots, makeSnapshot(newAssets, s.liabilities)],
          };
        });
      },

      deleteAsset: async (id) => {
        set((s) => {
          const newAssets = s.assets.filter((a) => a.id !== id);
          return {
            assets: newAssets,
            valueSnapshots: [...s.valueSnapshots, makeSnapshot(newAssets, s.liabilities)],
          };
        });
      },

      addLiability: async (data) => {
        const liability: Liability = {
          id: uuid(),
          name: data.name,
          category: data.category,
          balance: data.balance,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => {
          const newLiabilities = [liability, ...s.liabilities];
          return {
            liabilities: newLiabilities,
            valueSnapshots: [...s.valueSnapshots, makeSnapshot(s.assets, newLiabilities)],
          };
        });
      },

      updateLiability: async (id, data) => {
        set((s) => {
          const newLiabilities = s.liabilities.map((l) =>
            l.id === id
              ? {
                  ...l,
                  name: data.name ?? l.name,
                  category: data.category ?? l.category,
                  balance: data.balance ?? l.balance,
                  updatedAt: now(),
                }
              : l
          );
          return {
            liabilities: newLiabilities,
            valueSnapshots: [...s.valueSnapshots, makeSnapshot(s.assets, newLiabilities)],
          };
        });
      },

      deleteLiability: async (id) => {
        set((s) => {
          const newLiabilities = s.liabilities.filter((l) => l.id !== id);
          return {
            liabilities: newLiabilities,
            valueSnapshots: [...s.valueSnapshots, makeSnapshot(s.assets, newLiabilities)],
          };
        });
      },

      addTransaction: async (data) => {
        const tx: Transaction = {
          id: uuid(),
          type: data.type,
          amount: data.amount,
          category: data.category,
          source: data.source,
          note: data.note ?? null,
          date: data.date,
          createdAt: now(),
        };
        set((s) => ({ transactions: [tx, ...s.transactions] }));
      },

      deleteTransaction: async (id) => {
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
      },

      addPortfolioItem: async (data) => {
        const item: PortfolioItem = {
          id: uuid(),
          symbol: data.symbol,
          name: data.name,
          avgCost: data.avgCost,
          shares: data.shares,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ portfolio: [item, ...s.portfolio] }));
      },

      deletePortfolioItem: async (id) => {
        set((s) => ({ portfolio: s.portfolio.filter((p) => p.id !== id) }));
      },
    }),
    {
      name: "finance-store",
    }
  )
);
```

- [ ] **Step 2: Verify type-check passes**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/store/useFinanceStore.ts
git commit -m "feat(web): add valueSnapshots with auto-snapshot to finance store"
```

---

## Task 4: Write Aggregation Utilities (TDD)

**Files:**

- Create: `apps/web/lib/chartAggregation.ts`
- Create: `apps/web/tests/lib/chartAggregation.test.ts`

Pure functions with no side effects. Each function takes raw store data and a range string, returns chart-ready arrays.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/tests/lib/chartAggregation.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @repo/web test -- tests/lib/chartAggregation.test.ts
```

Expected: FAIL — `Cannot find module '../../lib/chartAggregation'`

- [ ] **Step 3: Implement `apps/web/lib/chartAggregation.ts`**

```ts
import type { Transaction, ValueSnapshot } from "@repo/shared";

export type Range = "5w" | "6m" | "1y" | "4y";

export interface LiquidityPoint {
  period: string;
  income: number;
  expense: number;
}

export interface InvestmentPoint {
  period: string;
  totalAssets: number;
  netWorth: number;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns an internal grouping key for a date given a range. */
function dateToPeriodKey(date: Date, range: Range): string {
  if (range === "5w") {
    return getMondayOfWeek(date).toISOString().slice(0, 10); // "2025-11-03"
  }
  if (range === "4y") {
    return `${date.getFullYear()}`;
  }
  // 6m, 1y → "YYYY-MM"
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Formats an internal key to a display label. */
function formatPeriodLabel(key: string, range: Range): string {
  if (range === "5w") {
    const d = new Date(`${key}T00:00:00`);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  if (range === "4y") return key;
  // "2025-11" → "Nov"
  const m = parseInt(key.split("-")[1], 10) - 1;
  return MONTHS[m];
}

/** Builds the ordered list of internal period keys for a given range. */
function buildPeriods(range: Range): string[] {
  const now = new Date();
  const keys: string[] = [];

  if (range === "5w") {
    const d = getMondayOfWeek(now);
    d.setDate(d.getDate() - 28); // 4 weeks back
    for (let i = 0; i < 5; i++) {
      keys.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 7);
    }
  } else if (range === "6m") {
    const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    for (let i = 0; i < 6; i++) {
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      d.setMonth(d.getMonth() + 1);
    }
  } else if (range === "1y") {
    const d = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    for (let i = 0; i < 12; i++) {
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      d.setMonth(d.getMonth() + 1);
    }
  } else {
    // 4y
    for (let i = 3; i >= 0; i--) {
      keys.push(`${now.getFullYear() - i}`);
    }
  }

  return keys;
}

/** Aggregates transactions into per-period income/expense totals. */
export function aggregateTransactions(transactions: Transaction[], range: Range): LiquidityPoint[] {
  const keys = buildPeriods(range);
  const map = new Map<string, { income: number; expense: number }>();
  keys.forEach((k) => map.set(k, { income: 0, expense: 0 }));

  for (const t of transactions) {
    const d = new Date(t.date);
    const key = dateToPeriodKey(d, range);
    if (!map.has(key)) continue;
    const entry = map.get(key)!;
    if (t.type === "income") entry.income += t.amount;
    else entry.expense += t.amount;
  }

  return keys.map((key) => ({
    period: formatPeriodLabel(key, range),
    income: map.get(key)!.income,
    expense: map.get(key)!.expense,
  }));
}

/** Aggregates value snapshots into per-period totalAssets/netWorth (latest snapshot wins per period). */
export function aggregateSnapshots(snapshots: ValueSnapshot[], range: Range): InvestmentPoint[] {
  const keys = buildPeriods(range);
  const keySet = new Set(keys);
  const map = new Map<string, ValueSnapshot>();

  for (const s of snapshots) {
    const d = new Date(s.date);
    const key = dateToPeriodKey(d, range);
    if (!keySet.has(key)) continue;
    const existing = map.get(key);
    if (!existing || s.date > existing.date) {
      map.set(key, s);
    }
  }

  return keys.map((key) => {
    const snap = map.get(key);
    return {
      period: formatPeriodLabel(key, range),
      totalAssets: snap?.totalAssets ?? 0,
      netWorth: snap ? snap.totalAssets - snap.totalLiabilities : 0,
    };
  });
}

/** Returns a human-readable date range label, e.g. "Nov 2025 – Apr 2026". */
export function getRangeDisplayLabel(range: Range): string {
  const keys = buildPeriods(range);
  if (keys.length === 0) return "";
  const first = keys[0];
  const last = keys[keys.length - 1];

  function keyToDisplay(key: string): string {
    if (range === "5w") {
      const d = new Date(`${key}T00:00:00`);
      return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    }
    if (range === "4y") return key;
    const [year, month] = key.split("-");
    return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
  }

  return `${keyToDisplay(first)} – ${keyToDisplay(last)}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @repo/web test -- tests/lib/chartAggregation.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/chartAggregation.ts apps/web/tests/lib/chartAggregation.test.ts
git commit -m "feat(web): add chart aggregation utilities with tests"
```

---

## Task 5: Create PnlChart Component

**Files:**

- Create: `apps/web/components/finance/PnlChart.tsx`

Presentational only — receives `LiquidityPoint[]`, renders a Recharts `BarChart`. Green income bars + gray expense bars. Matches the "My Liquidity" screenshot. Imports `LiquidityPoint` from `chartAggregation.ts` — do not redefine it here.

- [ ] **Step 1: Create `apps/web/components/finance/PnlChart.tsx`**

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import type { LiquidityPoint } from "../../lib/chartAggregation";

function formatY(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${value}`;
}

export function PnlChart({ data }: { data: LiquidityPoint[] }) {
  return (
    <div style={{ borderRight: "2px solid #1c1c1e", borderBottom: "2px solid #1c1c1e" }}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          barGap={2}
          barCategoryGap="35%"
          margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="#e5e5ea" />
          <XAxis
            dataKey="period"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#8e8e93" }}
          />
          <YAxis
            tickFormatter={formatY}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#8e8e93" }}
            width={36}
          />
          <Legend
            iconType="square"
            iconSize={12}
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            verticalAlign="top"
            align="left"
          />
          <Bar dataKey="income" name="Income" fill="#34c759" radius={[2, 2, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill="#c7c7cc" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/finance/PnlChart.tsx
git commit -m "feat(web): add PnlChart component for income/expense bar chart"
```

---

## Task 6: Create InvestmentChart Component

**Files:**

- Create: `apps/web/components/finance/InvestmentChart.tsx`

Same structure as `PnlChart`. Light purple (totalAssets) + dark purple (netWorth) bars. Matches the "My Investment" screenshot. Imports `InvestmentPoint` from `chartAggregation.ts` — do not redefine it here.

- [ ] **Step 1: Create `apps/web/components/finance/InvestmentChart.tsx`**

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import type { InvestmentPoint } from "../../lib/chartAggregation";

function formatY(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${value}`;
}

export function InvestmentChart({ data }: { data: InvestmentPoint[] }) {
  return (
    <div style={{ borderRight: "2px solid #1c1c1e", borderBottom: "2px solid #1c1c1e" }}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          barGap={2}
          barCategoryGap="35%"
          margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="#e5e5ea" />
          <XAxis
            dataKey="period"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#8e8e93" }}
          />
          <YAxis
            tickFormatter={formatY}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#8e8e93" }}
            width={36}
          />
          <Legend
            iconType="square"
            iconSize={12}
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            verticalAlign="top"
            align="left"
          />
          <Bar dataKey="totalAssets" name="Account Change" fill="#a8a4e8" radius={[2, 2, 0, 0]} />
          <Bar dataKey="netWorth" name="Open P&L" fill="#5856d6" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/finance/InvestmentChart.tsx
git commit -m "feat(web): add InvestmentChart component for asset/netWorth bar chart"
```

---

## Task 7: Rewrite Transactions Page

**Files:**

- Rewrite: `apps/web/app/(finance)/transactions/page.tsx`

Wires everything together. Tab state (investment/liquidity), range state (5w/6m/1y/4y), reads from store, aggregates data with `chartAggregation`, renders chart + summary + selectors.

- [ ] **Step 1: Rewrite `apps/web/app/(finance)/transactions/page.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useFinanceStore } from "../../../store/useFinanceStore";
import { PnlChart } from "../../../components/finance/PnlChart";
import { InvestmentChart } from "../../../components/finance/InvestmentChart";
import {
  aggregateTransactions,
  aggregateSnapshots,
  getRangeDisplayLabel,
  type Range,
} from "../../../lib/chartAggregation";
import { formatCurrency } from "../../../lib/format";

type Tab = "investment" | "liquidity";

const RANGES: Range[] = ["5w", "6m", "1y", "4y"];

export default function TransactionsPage() {
  const { transactions, valueSnapshots } = useFinanceStore();
  const [tab, setTab] = useState<Tab>("investment");
  const [range, setRange] = useState<Range>("6m");

  const liquidityData = useMemo(
    () => aggregateTransactions(transactions, range),
    [transactions, range]
  );

  const investmentData = useMemo(
    () => aggregateSnapshots(valueSnapshots, range),
    [valueSnapshots, range]
  );

  const rangeLabel = useMemo(() => getRangeDisplayLabel(range), [range]);

  const summaryLines = useMemo(() => {
    if (tab === "liquidity") {
      const totalIncome = liquidityData.reduce((s, d) => s + d.income, 0);
      const totalExpense = liquidityData.reduce((s, d) => s + d.expense, 0);
      return [
        `Total income is ${formatCurrency(totalIncome)} ,`,
        `Total expense is ${formatCurrency(totalExpense)}`,
      ];
    }
    const firstWithData = investmentData.find((d) => d.totalAssets > 0);
    const last = investmentData.at(-1);
    const change = (last?.totalAssets ?? 0) - (firstWithData?.totalAssets ?? 0);
    return [
      `Total account change is ${formatCurrency(change)} ,`,
      `Total profit is ${formatCurrency(last?.netWorth ?? 0)}`,
    ];
  }, [tab, liquidityData, investmentData]);

  const activeTabColor = tab === "investment" ? "#5856D6" : "#34C759";

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-6 text-xl font-bold text-[#1c1c1e]">損益統計</h1>

      {/* Tab switcher */}
      <div className="mb-6 flex rounded-full bg-[#f2f2f7] p-1">
        {(["investment", "liquidity"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-full py-2 text-[14px] font-semibold"
            style={{
              backgroundColor: tab === t ? activeTabColor : "transparent",
              color: tab === t ? "white" : "#8e8e93",
            }}
          >
            {t === "investment" ? "My Investment" : "My Liquidity"}
          </button>
        ))}
      </div>

      {/* Date range + summary */}
      <p className="mb-1 text-[13px] text-[#8e8e93]">{rangeLabel}</p>
      {summaryLines.map((line, i) => (
        <p key={i} className="text-[15px] font-medium text-[#1c1c1e]">
          {line}
        </p>
      ))}

      {/* Chart */}
      <div className="mt-5">
        {tab === "investment" ? (
          <InvestmentChart data={investmentData} />
        ) : (
          <PnlChart data={liquidityData} />
        )}
      </div>

      {/* Range selector */}
      <div className="mt-5 flex rounded-full bg-[#f2f2f7] p-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="flex-1 rounded-full py-2 text-[13px] font-semibold"
            style={{
              backgroundColor: range === r ? "white" : "transparent",
              color: range === r ? "#1c1c1e" : "#8e8e93",
              boxShadow: range === r ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
            }}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
pnpm --filter @repo/web test
```

Expected: all pass.

- [ ] **Step 4: Start dev server and manually verify**

```bash
pnpm dev
```

Open `http://localhost:3000` → navigate to 收支 tab. Verify:

- Tab switcher renders with purple Investment / green Liquidity styles
- Switching tabs updates chart and summary
- Range selector (5w / 6m / 1y / 4y) updates chart
- Add an asset on the assets page → return to 收支 → Investment tab shows a bar for current month

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(finance\)/transactions/page.tsx
git commit -m "feat(web): implement transactions chart page with investment and liquidity tabs"
```
