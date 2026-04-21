# TW Stock Picker — Holdings-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 台股 stock picker show existing holdings by default, trigger the API only on search input (debounced 300 ms), and fix missing bond ETFs by merging the TPEx (OTC) exchange into `/api/stocks/tw`.

**Architecture:** Three independent changes applied in order — (1) server route gains a parallel TPEx fetch + merge, (2) `StockPickerPage` gains a `holdings` prop and debounced-search mode for 台股, (3) `AccountFormPage` derives `twHoldings` from the store and passes it down.

**Tech Stack:** Next.js 15 App Router (route handler), React 19 hooks (`useMemo`, `useEffect`, `useRef`), Zustand (`useFinanceStore`), Vitest + jsdom

---

## File Map

| Action | File                                              | What changes                                                                              |
| ------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Modify | `apps/web/app/api/stocks/tw/route.ts`             | Add TPEx parallel fetch; extract pure `mergeExchangeStocks` helper; merge + dedup results |
| Create | `apps/web/tests/api/stocksMergeTw.test.ts`        | Unit tests for `mergeExchangeStocks`                                                      |
| Modify | `apps/web/components/finance/StockPickerPage.tsx` | Add `holdings` prop; replace on-open fetch (台股) with debounced search; reset on close   |
| Modify | `apps/web/components/finance/AccountFormPage.tsx` | Derive `twHoldings` from store entries; pass to `<StockPickerPage>`                       |

---

## Task 1: Extract and test the TWSE + TPEx merge helper

**Files:**

- Modify: `apps/web/app/api/stocks/tw/route.ts`
- Create: `apps/web/tests/api/stocksMergeTw.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/tests/api/stocksMergeTw.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mergeExchangeStocks } from "../../app/api/stocks/tw/mergeExchangeStocks";

describe("mergeExchangeStocks", () => {
  it("maps TWSE fields Code/Name to canonical shape", () => {
    const twse = [{ Code: "2330", Name: "台積電" }];
    const result = mergeExchangeStocks(twse, [], new Map());
    expect(result).toContainEqual({ 公司代號: "2330", 公司簡稱: "台積電" });
  });

  it("prefers t187ap03_L name over TWSE Name for TWSE entries", () => {
    const twse = [{ Code: "2330", Name: "TSMC" }];
    const nameMap = new Map([["2330", "台積電"]]);
    const result = mergeExchangeStocks(twse, [], nameMap);
    expect(result).toContainEqual({ 公司代號: "2330", 公司簡稱: "台積電" });
  });

  it("maps TPEx fields SecuritiesCompanyCode/CompanyName to canonical shape", () => {
    const tpex = [{ SecuritiesCompanyCode: "00933B", CompanyName: "國泰10Y+金融債" }];
    const result = mergeExchangeStocks([], tpex, new Map());
    expect(result).toContainEqual({ 公司代號: "00933B", 公司簡稱: "國泰10Y+金融債" });
  });

  it("deduplicates by code — TWSE entry wins over TPEx when both present", () => {
    const twse = [{ Code: "006201", Name: "元大富櫃50" }];
    const tpex = [{ SecuritiesCompanyCode: "006201", CompanyName: "元大富櫃50(TPEx)" }];
    const result = mergeExchangeStocks(twse, tpex, new Map());
    const matches = result.filter((s) => s.公司代號 === "006201");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.公司簡稱).toBe("元大富櫃50");
  });

  it("returns results sorted ascending by code", () => {
    const twse = [
      { Code: "2330", Name: "A" },
      { Code: "1101", Name: "B" },
    ];
    const result = mergeExchangeStocks(twse, [], new Map());
    expect(result[0]?.公司代號).toBe("1101");
    expect(result[1]?.公司代號).toBe("2330");
  });

  it("filters out entries with empty code or name", () => {
    const twse = [
      { Code: "", Name: "nobody" },
      { Code: "2330", Name: "" },
    ];
    const result = mergeExchangeStocks(twse, [], new Map());
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @repo/web test -- tests/api/stocksMergeTw.test.ts
```

Expected: FAIL — `mergeExchangeStocks` module not found.

- [ ] **Step 3: Create the pure helper file**

Create `apps/web/app/api/stocks/tw/mergeExchangeStocks.ts`:

```ts
type TwseRaw = Record<string, string>;
type TpexRaw = Record<string, string>;
type StockEntry = { 公司代號: string; 公司簡稱: string };

export function mergeExchangeStocks(
  twseItems: TwseRaw[],
  tpexItems: TpexRaw[],
  nameMap: Map<string, string>
): StockEntry[] {
  const map = new Map<string, string>();

  for (const item of twseItems) {
    const code = item["Code"]?.trim() ?? "";
    const name = (nameMap.get(code) ?? item["Name"])?.trim() ?? "";
    if (code && name) map.set(code, name);
  }

  for (const item of tpexItems) {
    const code = item["SecuritiesCompanyCode"]?.trim() ?? "";
    const name = item["CompanyName"]?.trim() ?? "";
    // TWSE entry wins if already present
    if (code && name && !map.has(code)) map.set(code, name);
  }

  return Array.from(map.entries())
    .map(([code, name]) => ({ 公司代號: code, 公司簡稱: name }))
    .sort((a, b) => a.公司代號.localeCompare(b.公司代號));
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @repo/web test -- tests/api/stocksMergeTw.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Update the route to use the helper and add TPEx fetch**

Replace the contents of `apps/web/app/api/stocks/tw/route.ts`:

```ts
import { NextResponse } from "next/server";
import { mergeExchangeStocks } from "./mergeExchangeStocks.js";

// TWSE: all securities traded today (stocks + equity ETFs + bond ETFs listed on TWSE)
const TWSE_ALL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";
// TWSE: better Chinese short names for listed companies
const TWSE_COMPANIES = "https://openapi.twse.com.tw/v1/opendata/t187ap03_L";
// TPEx (OTC/上櫃): covers bond ETFs (e.g. 00933B) and OTC-listed stocks absent from TWSE
const TPEX_ALL = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes";

let cachedAt = 0;
let cachedResult: { 公司代號: string; 公司簡稱: string }[] | null = null;
const CACHE_MS = 60 * 60 * 1000; // 1 hour

async function fetchJSON(url: string): Promise<Record<string, string>[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    if (cachedResult && Date.now() - cachedAt < CACHE_MS) {
      return NextResponse.json(cachedResult);
    }

    const [allSecurities, companies, tpexSecurities] = await Promise.all([
      fetchJSON(TWSE_ALL),
      fetchJSON(TWSE_COMPANIES),
      fetchJSON(TPEX_ALL),
    ]);

    const nameMap = new Map<string, string>();
    for (const item of companies) {
      const code = item["公司代號"]?.trim();
      const name = (item["公司簡稱"] ?? item["公司名稱"])?.trim();
      if (code && name) nameMap.set(code, name);
    }

    const result = mergeExchangeStocks(allSecurities, tpexSecurities, nameMap);

    cachedAt = Date.now();
    cachedResult = result;

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  }
}
```

- [ ] **Step 6: Re-run tests to confirm still green**

```bash
pnpm --filter @repo/web test -- tests/api/stocksMergeTw.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/api/stocks/tw/mergeExchangeStocks.ts apps/web/app/api/stocks/tw/route.ts apps/web/tests/api/stocksMergeTw.test.ts
git commit -m "feat(api): merge TPEx OTC data into /api/stocks/tw to cover bond ETFs"
```

---

## Task 2: Update StockPickerPage — holdings-first + debounced search

**Files:**

- Modify: `apps/web/components/finance/StockPickerPage.tsx`

- [ ] **Step 1: Add `holdings` prop and replace internal state**

Open `apps/web/components/finance/StockPickerPage.tsx`.

Replace the `Props` interface and all state/ref/effect/filter declarations (lines 6–97):

```tsx
export interface StockItem {
  code: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (stock: StockItem) => void;
  market: string;
  color: string;
  holdings?: StockItem[];
}

async function fetchTWListedStocks(): Promise<StockItem[]> {
  const res = await fetch("/api/stocks/tw");
  if (!res.ok) throw new Error("fetch failed");
  const data: Record<string, string>[] = await res.json();
  return data
    .map((item) => ({
      code: item["公司代號"] ?? "",
      name: item["公司簡稱"] ?? item["公司名稱"] ?? "",
    }))
    .filter((s) => s.code && s.name);
}

async function fetchUSStocks(): Promise<StockItem[]> {
  const res = await fetch("/api/stocks/us");
  if (!res.ok) throw new Error("fetch failed");
  return res.json() as Promise<StockItem[]>;
}

async function fetchCryptoList(): Promise<StockItem[]> {
  const res = await fetch("/api/stocks/crypto");
  if (!res.ok) throw new Error("fetch failed");
  return res.json() as Promise<StockItem[]>;
}

const PRECIOUS_METALS: StockItem[] = [
  { code: "twgd", name: "Taiwan gold (tael) (New Taiwan Dollar/Taiwan tael)" },
  { code: "twgdg", name: "Taiwan gold (gram) (New Taiwan Dollar/Gram)" },
  { code: "gt", name: "Hongkong gold (Hong Kong Dollar/Ounce)" },
  { code: "xau", name: "Spot gold (U.S. Dollar/Ounce)" },
  { code: "xpd", name: "Spot palladium (U.S. Dollar/Ounce)" },
  { code: "xag", name: "Spot silver (U.S. Dollar/Ounce)" },
  { code: "xap", name: "Spot platinum (U.S. Dollar/Ounce)" },
];
```

- [ ] **Step 2: Replace the component body**

Replace everything from `export function StockPickerPage(` through the closing `}` with:

```tsx
export function StockPickerPage({ open, onClose, onSelect, market, color, holdings }: Props) {
  const isTW = market === "台股";

  // For non-TW markets: full list loaded on open (existing behaviour)
  const [stocks, setStocks] = useState<StockItem[]>([]);
  // For TW market: results from the last debounced API fetch
  const [apiStocks, setApiStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchedMarket = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset TW picker state whenever the sheet closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setApiStocks([]);
      setError(null);
    }
  }, [open]);

  // Non-TW markets: fetch full list on open (unchanged behaviour)
  const fetchStocks = (targetMarket: string) => {
    if (targetMarket === "貴金屬") {
      setStocks(PRECIOUS_METALS);
      return;
    }
    setLoading(true);
    setError(null);
    const fetcher =
      targetMarket === "美股"
        ? fetchUSStocks
        : targetMarket === "加密貨幣"
          ? fetchCryptoList
          : fetchTWListedStocks;
    fetcher()
      .then(setStocks)
      .catch(() => setError("無法載入股票清單，請檢查網路連線"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || isTW) return;
    if (fetchedMarket.current === market) return;
    fetchedMarket.current = market;
    setStocks([]);
    setQuery("");
    fetchStocks(market);
  }, [open, market, isTW]);

  // TW market: debounced API fetch on query change
  useEffect(() => {
    if (!isTW) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setApiStocks([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    debounceRef.current = setTimeout(() => {
      fetchTWListedStocks()
        .then((all) => {
          const q = query.trim().toLowerCase();
          const filtered = all.filter(
            (s) => s.code.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q)
          );
          setApiStocks(filtered);
        })
        .catch(() => setError("無法載入股票清單，請檢查網路連線"))
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isTW]);

  const MAX_DISPLAY = 100;

  // TW: show holdings when no query; show API results when searching
  // Non-TW: filter the full loaded list client-side
  const displayed = useMemo(() => {
    if (isTW) {
      if (!query.trim()) return (holdings ?? []).slice(0, MAX_DISPLAY);
      return apiStocks.slice(0, MAX_DISPLAY);
    }
    if (!query.trim()) return stocks.slice(0, MAX_DISPLAY);
    const q = query.trim().toLowerCase();
    return stocks
      .filter((s) => s.code.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q))
      .slice(0, MAX_DISPLAY);
  }, [isTW, query, holdings, apiStocks, stocks]);

  const totalCount = isTW
    ? query.trim()
      ? apiStocks.length
      : (holdings ?? []).length
    : query.trim()
      ? stocks.filter((s) => {
          const q = query.trim().toLowerCase();
          return s.code.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q);
        }).length
      : stocks.length;

  const handleSelect = (stock: StockItem) => {
    onSelect(stock);
    onClose();
  };

  // Empty-state copy
  const emptyMessage = isTW
    ? query.trim()
      ? `找不到「${query}」相關股票`
      : "輸入代號或名稱搜尋台股"
    : `找不到「${query}」相關股票`;

  const showHoldingsLabel = isTW && !query.trim() && (holdings ?? []).length > 0;

  return (
    <div
      className={`fixed inset-0 z-[80] flex flex-col bg-[#f2f2f7] transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pt-14 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ChevronLeft size={20} className="text-[#1c1c1e]" />
          </button>
          <h1 className="text-[20px] font-bold text-[#1c1c1e]">{market} 選股</h1>
        </div>
      </div>

      {/* Stock list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md px-4">
          {loading ? (
            <div className="py-24 text-center text-[14px] text-[#8e8e93]">載入中...</div>
          ) : error ? (
            <div className="py-24 text-center">
              <p className="text-[14px] text-[#ff3b30]">{error}</p>
              <button
                onClick={() => {
                  if (isTW) {
                    setError(null);
                    setLoading(true);
                    const q = query.trim().toLowerCase();
                    fetchTWListedStocks()
                      .then((all) => {
                        const filtered = all.filter(
                          (s) =>
                            s.code.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q)
                        );
                        setApiStocks(filtered);
                      })
                      .catch(() => setError("無法載入股票清單，請檢查網路連線"))
                      .finally(() => setLoading(false));
                  } else {
                    fetchedMarket.current = null;
                    fetchStocks(market);
                  }
                }}
                className="mt-3 text-[14px] font-medium text-[#007aff]"
              >
                重新載入
              </button>
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-24 text-center text-[14px] text-[#8e8e93]">{emptyMessage}</div>
          ) : (
            <div className="divide-y divide-[#f2f2f7] pb-4">
              {showHoldingsLabel && <p className="py-2 text-[12px] text-[#8e8e93]">現有持倉</p>}
              {displayed.map((stock) => (
                <button
                  key={stock.code}
                  onClick={() => handleSelect(stock)}
                  className="flex w-full items-center gap-3 py-3.5 text-left transition-colors active:bg-white"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: color + "20" }}
                  >
                    <span className="text-[11px] font-bold" style={{ color }}>
                      {market === "美股"
                        ? "US"
                        : market === "加密貨幣"
                          ? "₿"
                          : market === "貴金屬"
                            ? "Au"
                            : "TW"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold text-[#1c1c1e]">{stock.code}</p>
                    <p className="text-[13px] text-[#8e8e93]">{stock.name}</p>
                  </div>
                </button>
              ))}
              {totalCount > MAX_DISPLAY && (
                <p className="py-4 text-center text-[13px] text-[#8e8e93]">
                  顯示前 {MAX_DISPLAY} 筆，請輸入更多字縮小範圍
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search bar — fixed at bottom */}
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pt-3 pb-10">
        <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
          <Search size={16} className="shrink-0 text-[#8e8e93]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isTW ? "搜尋名稱或代號" : "搜尋名稱或代號"}
            className="flex-1 bg-transparent text-[15px] text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
          />
          {query.length > 0 && (
            <button onClick={() => setQuery("")}>
              <X size={14} className="text-[#8e8e93]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/finance/StockPickerPage.tsx
git commit -m "feat(web): holdings-first TW stock picker with debounced search"
```

---

## Task 3: Update AccountFormPage — derive and pass twHoldings

**Files:**

- Modify: `apps/web/components/finance/AccountFormPage.tsx`

- [ ] **Step 1: Read `entries` from the store and derive twHoldings**

In `AccountFormPage.tsx`, find the existing store destructure (around line 81):

```ts
const { addEntry, updateEntry, fetchAll } = useFinanceStore();
```

Replace with:

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

- [ ] **Step 2: Pass holdings to StockPickerPage**

Find the `<StockPickerPage` usage near the bottom of `AccountFormPage.tsx` (around line 666):

```tsx
<StockPickerPage
  open={showStockPicker}
  onClose={() => setShowStockPicker(false)}
  onSelect={handleSelectStock}
  market={subCategoryName}
  color={categoryColor}
/>
```

Replace with:

```tsx
<StockPickerPage
  open={showStockPicker}
  onClose={() => setShowStockPicker(false)}
  onSelect={handleSelectStock}
  market={subCategoryName}
  color={categoryColor}
  holdings={subCategoryName === "台股" ? twHoldings : undefined}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
pnpm --filter @repo/web test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/finance/AccountFormPage.tsx
git commit -m "feat(web): pass twHoldings to StockPickerPage for holdings-first default view"
```
