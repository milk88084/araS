# Transactions Chart Page Design

**Date:** 2026-04-08  
**Status:** Approved

## Overview

Replace the placeholder "即將推出" in `apps/web/app/(finance)/transactions/page.tsx` with a full Profit & Loss statistics page featuring two tabs and bar charts, closely matching the provided reference screenshots.

## Data Layer

### New: ValueSnapshot (packages/shared/src/schemas/finance.ts)

```ts
export const ValueSnapshotSchema = z.object({
  id: z.string(),
  date: z.string(), // ISO date string
  totalAssets: z.number(),
  totalLiabilities: z.number(),
});
export type ValueSnapshot = z.infer<typeof ValueSnapshotSchema>;
```

### Store Changes (apps/web/store/useFinanceStore.ts)

- Add `valueSnapshots: ValueSnapshot[]` to state
- Add `addValueSnapshot` action (internal, not exposed to UI)
- Auto-call after `addAsset`, `updateAsset`, `addLiability`, `updateLiability` — append a snapshot with the current summed totalAssets and totalLiabilities at that moment
- Persisted in localStorage via existing `persist` middleware

## Component Architecture

```
apps/web/app/(finance)/transactions/page.tsx   ← main page, data + state
apps/web/components/finance/
  ├─ PnlChart.tsx           ← income/expense bar chart
  └─ InvestmentChart.tsx    ← totalAssets/netWorth bar chart
```

- `page.tsx` owns: tab state, range state, data filtering, aggregation
- Chart components are pure presentational: accept `data[]` prop, render Recharts `BarChart`
- No chart component touches the store directly

## Page Layout

Matches reference screenshots exactly:

1. **Tab switcher** (top) — pill-style toggle
   - Left: 投資 (My Investment) — active color `#5856D6`
   - Right: 收支 (My Liquidity) — active color `#34C759`

2. **Date range text** — e.g. `Nov 2025 – Apr 2026`

3. **Summary text** (two lines):
   - Investment: `Total account change is $X , Total profit is $Y`
   - Liquidity: `Total income is $X , Total expense is $Y`

4. **Legend** — colored square + label, two items side by side

5. **Bar chart** (Recharts `BarChart`)
   - Grouped bars (two bars per period)
   - Y-axis: left side, formatted as `80k / 40k / 0`
   - Axes: right + bottom black border lines (`CartesianAxis`)
   - Horizontal grid lines only (no vertical)
   - X-axis: period labels (month name or week)

6. **Time range selector** (bottom) — gray pill container, white active pill
   - Options: `5w` / `6m` / `1y` / `4y`

## Visual Specs

| Element       | Investment Tab                        | Liquidity Tab             |
| ------------- | ------------------------------------- | ------------------------- |
| Tab active bg | `#5856D6`                             | `#34C759`                 |
| Bar 1 color   | `#a8a4e8` (light purple, totalAssets) | `#34C759` (green, income) |
| Bar 2 color   | `#5856D6` (dark purple, netWorth)     | `#c7c7cc` (gray, expense) |
| Bar 1 label   | Account Change                        | Income                    |
| Bar 2 label   | Open P&L                              | Expense                   |

## Aggregation Logic

| Range | Group by       | Period label        |
| ----- | -------------- | ------------------- |
| 5w    | Week (Mon–Sun) | `Week 1`, `Week 2`… |
| 6m    | Month          | `Nov`, `Dec`…       |
| 1y    | Month          | `Nov`, `Dec`…       |
| 4y    | Year           | `2023`, `2024`…     |

- Liquidity: sum `transaction.amount` where `transaction.type === 'income'` / `'expense'` per period
- Investment: from `valueSnapshots[]`, take the latest snapshot per period. netWorth = totalAssets − totalLiabilities

## Dependencies

- Install: `recharts` in `apps/web`
- No backend changes — store is localStorage-only

## Files to Create / Modify

| File                                              | Action                                    |
| ------------------------------------------------- | ----------------------------------------- |
| `packages/shared/src/schemas/finance.ts`          | Add `ValueSnapshot` schema + type         |
| `packages/shared/src/schemas/index.ts`            | Export new schema                         |
| `apps/web/store/useFinanceStore.ts`               | Add `valueSnapshots`, auto-snapshot logic |
| `apps/web/app/(finance)/transactions/page.tsx`    | Full rewrite                              |
| `apps/web/components/finance/PnlChart.tsx`        | Create                                    |
| `apps/web/components/finance/InvestmentChart.tsx` | Create                                    |
| `apps/web/package.json`                           | Add `recharts` dependency                 |
