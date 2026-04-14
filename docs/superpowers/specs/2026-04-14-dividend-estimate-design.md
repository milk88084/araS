# Dividend Estimate Feature — Design Spec

**Date:** 2026-04-14  
**Status:** Approved

---

## Overview

Display an auto-calculated estimated annual dividend for stock holdings inside the `EntryDetailPage`. Data is fetched from Yahoo Finance — no user input or new database tables required.

---

## Scope

| Category | Supported          |
| -------- | ------------------ |
| 台股     | ✅                 |
| 美股     | ✅                 |
| 加密貨幣 | ❌ (skip silently) |
| 貴金屬   | ❌ (skip silently) |

The dividend card is only rendered for entries where `subCategory` is `"台股"` or `"美股"`.

---

## Data Source

### New API endpoint: `GET /api/stocks/dividend?symbol=<yfSymbol>`

Calls Yahoo Finance `quoteSummary` endpoint:

```
https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=summaryDetail
```

**Response shape:**

```json
{
  "dividendRate": 16.0,
  "dividendYield": 0.032
}
```

- `dividendRate` — annual dividend per share (raw number, in the stock's native currency)
- `dividendYield` — yield as a decimal (e.g. `0.032` = 3.2%)
- If Yahoo Finance has no dividend data, both fields return `null`
- If the fetch fails, the endpoint returns `{ dividendRate: null, dividendYield: null }` (no 4xx/5xx — caller handles gracefully)

---

## Calculation

```
預估年配息 = dividendRate × totalUnits
```

`totalUnits` is computed client-side from existing `EntryHistory` records (same logic used for P&L today):

```ts
const totalUnits = history
  .filter((h) => h.units != null && h.units > 0)
  .reduce((s, h) => s + (h.units ?? 0), 0);
```

Currency note:

- 台股 (`2330.TW`) — `dividendRate` is already in TWD, no conversion needed
- 美股 (`AAPL`) — `dividendRate` is in USD; multiply by the USD→TWD exchange rate using the same `/api/stocks/price?symbol=USDTWD=X` fetch already used in `AccountFormPage`

---

## UI

### Location

White card placed **between the action buttons and the "交易記錄" section** in `EntryDetailPage`.

### States

**Loading:**

```
🪙 查詢配息資料中…
```

**Has data:**

```
┌─────────────────────────────────────┐
│ 🪙 預估年配息          NT$40,000   │
│ 殖利率 3.2%  ·  每股 NT$16         │
└─────────────────────────────────────┘
```

**No data (Yahoo Finance returned null):**

```
┌─────────────────────────────────────┐
│ 🪙 預估年配息          無配息資料   │
└─────────────────────────────────────┘
```

**Not applicable (crypto / metals):**
Card not rendered at all.

---

## Changes Required

### 1. `apps/web/app/api/stocks/dividend/route.ts` — new file

- GET handler, reads `symbol` query param
- Calls Yahoo Finance `quoteSummary?modules=summaryDetail`
- Parses `dividendRate` and `dividendYield` from `summaryDetail`
- Always returns 200 with `{ dividendRate: number | null, dividendYield: number | null }`

### 2. `apps/web/components/finance/EntryDetailPage.tsx` — extend

- Add state: `dividendRate`, `dividendYield`, `dividendLoading`
- In the existing `useEffect`, if `subCategory` is `"台股"` or `"美股"`, fire an additional fetch to `/api/stocks/dividend?symbol=<yfSymbol>` where `yfSymbol` is built with the same `buildYfSymbol()` helper already used for the price fetch (e.g. `2330.TW`, `AAPL`)
- For USD dividends, re-use the existing exchange rate fetch pattern to convert to TWD
- Render the dividend card between action buttons and history list

### 3. No schema / migration changes

No new Prisma models or shared schemas needed.

---

## What This Does NOT Do

- No manual dividend entry
- No historical dividend records stored in the database
- No dividend data for 加密貨幣 or 貴金屬
- Does not affect `entry.value` (cost basis remains unchanged)
