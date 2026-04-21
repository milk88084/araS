# TW Stock Picker — Holdings-First Design

**Date:** 2026-04-21  
**Scope:** `StockPickerPage` (台股 market only) + `AccountFormPage`

---

## Problem

The Taiwan stock picker currently fetches the full TWSE list on every open, even when the user just wants to re-add a stock they already hold. This is slow and unnecessary. Additionally, the bond ETF `00933B` is absent from the TWSE API response, making it impossible to add.

---

## Goals

1. Default view shows only the user's existing TW holdings — no API call on open.
2. API is only called when the user types a search query (debounced 300 ms).
3. Clearing the search returns to the holdings view.
4. Bond ETFs such as `00933B` are covered by adding the TPEx (OTC/上櫃) exchange endpoint and merging it with the existing TWSE data.
5. Re-opening the picker after a selection always returns to the holdings view (query cleared).

---

## Architecture

### Prop change — `StockPickerPage`

```ts
interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (stock: StockItem) => void;
  market: string;
  color: string;
  holdings?: StockItem[]; // NEW — existing user positions for this market
}
```

### Internal state changes — `StockPickerPage`

| State                    | Purpose                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| `apiStocks: StockItem[]` | Results from the last debounced API fetch (replaces the old `stocks` state) |
| `query: string`          | Search input; cleared on open                                               |

The old `fetchedMarket` ref and on-open fetch are removed for 台股. Other markets (美股, 加密貨幣, 貴金屬) keep their existing on-open fetch behaviour unchanged.

### Display logic

```
query === ""
  → show `holdings` prop
  → empty state: "尚無台股持倉" (if holdings is empty)

query !== "" (台股 only)
  → debounce 300 ms
  → fetch /api/stocks/tw, filter by query
  → if zero results match exact code → splice in TW_FALLBACK_STOCKS matches
  → show filtered results
  → empty state: "找不到「{query}」相關股票"
```

Non-台股 markets: behaviour unchanged (fetch all on open, filter client-side).

### TPEx endpoint merge (replaces static fallback)

**Investigation findings:**

- `00933B` (國泰10Y+金融債) is listed on **TPEx (OTC/上櫃)**, not TWSE.
- TWSE `STOCK_DAY_ALL` returns only securities traded on the current day (~1,351 records). It covers TWSE-listed securities only.
- TPEx has its own daily quotes API (`tpex_mainboard_daily_close_quotes`) with ~10,629 records including **95 bond ETFs** (all `*B`-suffix codes) absent from TWSE.
- The two markets do not overlap (e.g. TSMC `2330` is TWSE-only; `00933B` is TPEx-only).
- A static fallback for a single ticker was the wrong fix — the gap is structural (entire exchange missing).

**Fix:** Update `/api/stocks/tw` to fetch both TWSE and TPEx, then merge:

```
TWSE: https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL
      field mapping: Code → 公司代號, Name → 公司簡稱 (overridden by t187ap03_L when available)

TPEx: https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes
      field mapping: SecuritiesCompanyCode → 公司代號, CompanyName → 公司簡稱
```

Both results are merged into a single sorted array, deduplicated by code. The existing 1-hour in-memory cache applies to the merged result. The `t187ap03_L` name-override map applies to TWSE entries only (TPEx has its own names).

### Reset on close

`useEffect` on `open`: when `open` transitions to `false`, reset `query` to `""` and `apiStocks` to `[]`. This ensures re-opening always shows the holdings view.

---

## Parent change — `AccountFormPage`

```ts
const { addEntry, updateEntry, fetchAll, entries } = useFinanceStore();

const twHoldings = useMemo<StockItem[]>(() => {
  const seen = new Set<string>();
  return entries
    .filter((e) => e.subCategory === "台股" && e.stockCode)
    .filter((e) => {
      if (seen.has(e.stockCode!)) return false;
      seen.add(e.stockCode!);
      return true;
    })
    .map((e) => ({ code: e.stockCode!, name: e.name }));
}, [entries]);
```

Pass to picker:

```tsx
<StockPickerPage
  ...
  holdings={subCategoryName === "台股" ? twHoldings : undefined}
/>
```

---

## Error handling

- API fetch failure during search: show existing `"無法載入股票清單，請檢查網路連線"` error with retry button. Holdings view is unaffected by fetch errors.
- Empty holdings + no query: show a prompt — "輸入代號或名稱搜尋台股".

---

## Out of scope

- Caching API responses across searches (existing 1-hour server-side cache on `/api/stocks/tw` is sufficient).
- Changes to US stocks, crypto, or precious metals pickers.
- Editing or removing the fallback list at runtime.
