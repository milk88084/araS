"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, Search, X } from "lucide-react";

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

export function StockPickerPage({ open, onClose, onSelect, market, color }: Props) {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!open || hasFetched.current) return;
    hasFetched.current = true;
    setLoading(true);
    setError(null);
    fetchTWListedStocks()
      .then(setStocks)
      .catch(() => setError("無法載入股票清單，請檢查網路連線"))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return stocks;
    const q = query.trim().toLowerCase();
    return stocks.filter((s) => s.code.startsWith(q) || s.name.toLowerCase().includes(q));
  }, [stocks, query]);

  const handleSelect = (stock: StockItem) => {
    onSelect(stock);
    onClose();
  };

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
                  hasFetched.current = false;
                  setLoading(true);
                  fetchTWListedStocks()
                    .then(setStocks)
                    .catch(() => setError("無法載入股票清單，請檢查網路連線"))
                    .finally(() => setLoading(false));
                }}
                className="mt-3 text-[14px] font-medium text-[#007aff]"
              >
                重新載入
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center text-[14px] text-[#8e8e93]">
              找不到「{query}」相關股票
            </div>
          ) : (
            <div className="divide-y divide-[#f2f2f7] pb-4">
              {filtered.map((stock) => (
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
                      TW
                    </span>
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold text-[#1c1c1e]">{stock.code}</p>
                    <p className="text-[13px] text-[#8e8e93]">{stock.name}</p>
                  </div>
                </button>
              ))}
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
            placeholder="搜尋名稱或代號"
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
