"use client";

import { useEffect, useState } from "react";
import { X, Pencil, MoreHorizontal } from "lucide-react";
import type { Entry, EntryHistory } from "@repo/shared";
import { formatCurrency } from "../../lib/format";
import { CATEGORIES } from "./categoryConfig";

interface Props {
  open: boolean;
  entry: Entry | null;
  onClose: () => void;
  onAddEntry: () => void;
  onAdjust: () => void;
}

const STOCK_PICKER_CATEGORIES = ["台股", "美股", "加密貨幣", "貴金屬"];
const METAL_YF_SYMBOL: Record<string, string> = {
  xau: "GC=F",
  xag: "SI=F",
  xap: "PL=F",
  xpd: "PA=F",
};

function getCategoryColor(topCategory: string): string {
  return CATEGORIES.find((c) => c.name === topCategory)?.color ?? "#007aff";
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${formatCurrency(delta)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildYfSymbol(subCategory: string, stockCode: string): string {
  if (subCategory === "貴金屬") return METAL_YF_SYMBOL[stockCode.toLowerCase()] ?? "";
  const suffix = subCategory === "台股" ? ".TW" : subCategory === "加密貨幣" ? "-USD" : "";
  return stockCode + suffix;
}

export function EntryDetailPage({ open, entry, onClose, onAddEntry, onAdjust }: Props) {
  const [history, setHistory] = useState<EntryHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const isStockEntry =
    !!entry && STOCK_PICKER_CATEGORIES.includes(entry.subCategory) && !!entry.stockCode;

  useEffect(() => {
    if (!open || !entry) return;

    setHistory([]);
    setCurrentPrice(null);

    // Fetch history
    setLoading(true);
    fetch(`/api/entries/${entry.id}/history`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setHistory(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch current price if this is a stock entry
    if (isStockEntry && entry.stockCode) {
      const yfSymbol = buildYfSymbol(entry.subCategory, entry.stockCode);
      if (!yfSymbol) return;
      setPriceLoading(true);
      fetch(`/api/stocks/price?symbol=${encodeURIComponent(yfSymbol)}`)
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.price === "number") setCurrentPrice(data.price as number);
        })
        .catch(() => {})
        .finally(() => setPriceLoading(false));
    }
  }, [open, entry, isStockEntry]);

  if (!entry) return null;

  const color = getCategoryColor(entry.topCategory);
  const isLiability = entry.topCategory === "負債";

  // P&L calculations (only for history records that have units)
  const investmentRecords = history.filter((h) => h.units != null && h.units > 0);
  const totalUnits = investmentRecords.reduce((s, h) => s + (h.units ?? 0), 0);
  const totalCost = investmentRecords.reduce((s, h) => s + h.delta, 0);
  const currentMarketValue = currentPrice != null ? totalUnits * currentPrice : null;
  const totalPnL = currentMarketValue != null ? currentMarketValue - totalCost : null;
  const totalPnLPct = totalCost > 0 && totalPnL != null ? (totalPnL / totalCost) * 100 : null;

  return (
    <div
      className={`fixed inset-0 z-[60] bg-[#f2f2f7] transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
    >
      <div className="mx-auto flex h-full max-w-md flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-14 pb-4">
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <X size={18} className="text-[#1c1c1e]" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onAdjust}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            >
              <Pencil size={16} className="text-[#1c1c1e]" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
              <MoreHorizontal size={18} className="text-[#1c1c1e]" />
            </button>
          </div>
        </div>

        {/* Entry info */}
        <div className="px-5 pb-6">
          {/* Icon + name */}
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: color + "20" }}
            >
              <span className="text-[13px] font-bold" style={{ color }}>
                {entry.subCategory.slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="text-[17px] font-semibold text-[#1c1c1e]">{entry.name}</p>
              <p className="text-[13px] text-[#8e8e93]">
                {entry.stockCode ? `${entry.stockCode} · ${entry.subCategory}` : entry.subCategory}
              </p>
            </div>
          </div>

          {/* Value */}
          <p className="text-[38px] font-bold tracking-tight text-[#1c1c1e]">
            {formatCurrency(entry.value)}
          </p>

          {/* P&L summary (stocks only) */}
          {isStockEntry && (
            <div className="mt-2 mb-4 flex items-center gap-4">
              {priceLoading ? (
                <p className="text-[13px] text-[#8e8e93]">查詢股價中…</p>
              ) : currentPrice != null ? (
                <>
                  <p className="text-[13px] text-[#8e8e93]">
                    當日股價 {currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </p>
                  {totalPnL != null && (
                    <p
                      className="text-[14px] font-semibold"
                      style={{ color: totalPnL >= 0 ? "#34c759" : "#ff3b30" }}
                    >
                      {formatDelta(totalPnL)}
                      {totalPnLPct != null && (
                        <span className="ml-1 text-[12px] font-medium">
                          ({totalPnL >= 0 ? "+" : ""}
                          {totalPnLPct.toFixed(2)}%)
                        </span>
                      )}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-[#8e8e93]">無法取得股價</p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className={`flex gap-3 ${isStockEntry ? "" : "mt-6"}`}>
            <button
              onClick={onAddEntry}
              className="flex-1 rounded-full border border-[#e5e5ea] bg-white py-3 text-[15px] font-semibold text-[#1c1c1e] shadow-sm active:bg-[#f2f2f7]"
            >
              新增記錄
            </button>
            <button
              onClick={onAdjust}
              className="flex-1 rounded-full bg-[#1c1c1e] py-3 text-[15px] font-semibold text-white active:opacity-80"
            >
              調整金額
            </button>
          </div>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto px-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[#1c1c1e]">交易記錄</p>
            <p className="text-[13px] text-[#8e8e93]">變動</p>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-[#8e8e93]">載入中...</p>
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#c7c7cc]">尚無記錄</p>
          ) : (
            <div className="space-y-0 overflow-hidden rounded-2xl bg-white shadow-sm">
              {history.map((h, i) => {
                const hasUnits = h.units != null && h.units > 0;
                const recordPnL =
                  hasUnits && currentPrice != null ? h.units! * currentPrice - h.delta : null;

                return (
                  <div key={h.id}>
                    {i > 0 && <div className="mx-4 h-px bg-[#f2f2f7]" />}
                    <div className="flex items-start justify-between px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-[#1c1c1e]">
                          {h.note ?? (h.delta >= 0 ? "新增" : "調整")}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#8e8e93]">
                          {formatDate(h.createdAt)}
                        </p>
                        {hasUnits && (
                          <p className="mt-0.5 text-[12px] text-[#8e8e93]">
                            {h.units!.toLocaleString()} 股
                          </p>
                        )}
                      </div>
                      <div className="ml-4 shrink-0 text-right">
                        <p
                          className="text-[14px] font-semibold"
                          style={{
                            color: h.delta >= 0 ? (isLiability ? "#ff3b30" : "#34c759") : "#ff3b30",
                          }}
                        >
                          {formatDelta(h.delta)}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#8e8e93]">
                          餘額 {formatCurrency(h.balance)}
                        </p>
                        {recordPnL != null && (
                          <p
                            className="mt-0.5 text-[12px] font-medium"
                            style={{ color: recordPnL >= 0 ? "#34c759" : "#ff3b30" }}
                          >
                            盈虧 {formatDelta(recordPnL)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
