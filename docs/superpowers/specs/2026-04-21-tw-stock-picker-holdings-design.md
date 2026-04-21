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
4. `00933B` (and any other known API gaps) are covered by a local fallback list.
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

### Local fallback constant

```ts
const TW_FALLBACK_STOCKS: StockItem[] = [
  { code: "00933B", name: "國泰10年以上投資級金融債券ETF基金" },
];
```

Fallback entries are spliced into search results **only** when the API returns zero matches for the exact uppercased query string as a code. They are never shown in the default holdings view (unless the user already holds them, in which case they appear via the `holdings` prop).

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
