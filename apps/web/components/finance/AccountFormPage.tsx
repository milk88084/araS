"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Check, Info, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFinanceStore } from "../../store/useFinanceStore";
import { StockPickerPage, type StockItem } from "./StockPickerPage";

interface EditItem {
  id: string;
  name: string;
  value: number;
  category: string;
}

interface Props {
  open: boolean;
  onClose: () => void; // back button — close form only
  onSaved: () => void; // after save — close form + menu
  topCategory: string;
  isLiability: boolean;
  categoryColor: string;
  subCategoryName: string;
  SubCategoryIcon: LucideIcon;
  editItem?: EditItem | null;
}

function getUnitsLabel(subCategoryName: string): string {
  switch (subCategoryName) {
    case "投資基金":
      return "基金份額";
    case "台股":
    case "台灣興櫃":
    case "美股":
      return "持有股數";
    case "加密貨幣":
      return "持有數量";
    case "貴金屬":
      return "持有重量";
    default:
      return "持有數量";
  }
}

const INVESTMENT_CATEGORIES = [
  "投資基金",
  "台股",
  "台灣興櫃",
  "美股",
  "加密貨幣",
  "貴金屬",
  "其他投資",
];
const STOCK_PICKER_CATEGORIES = ["台股", "台灣興櫃", "美股", "加密貨幣", "貴金屬"];

const METAL_YF_SYMBOL: Record<string, string> = {
  xau: "GC=F", // Gold Futures
  xag: "SI=F", // Silver Futures
  xap: "PL=F", // Platinum Futures
  xpd: "PA=F", // Palladium Futures
};

export function AccountFormPage({
  open,
  onClose,
  onSaved,
  topCategory,
  isLiability,
  categoryColor,
  subCategoryName,
  SubCategoryIcon,
  editItem,
}: Props) {
  const { addAsset, updateAsset, addLiability, updateLiability } = useFinanceStore();
  const isEdit = !!editItem;
  const isInvestment = topCategory === "投資" && INVESTMENT_CATEGORIES.includes(subCategoryName);
  const hasStockPicker = STOCK_PICKER_CATEGORIES.includes(subCategoryName);

  // Standard form state
  const [balance, setBalance] = useState("");

  // Investment form state
  const [units, setUnits] = useState("");
  const [originalPrice, setOriginalPrice] = useState(0);
  const [currency, setCurrency] = useState("TWD");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [showPriceDetail, setShowPriceDetail] = useState(false);

  // Stock picker state
  const [showStockPicker, setShowStockPicker] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const [name, setName] = useState("");
  const [includeInChart, setIncludeInChart] = useState(true);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const computedValue = useMemo(() => {
    const u = parseFloat(units) || 0;
    if (!hasStockPicker) return u;
    const priceTWD = currency === "TWD" ? originalPrice : originalPrice * exchangeRate;
    return u * priceTWD;
  }, [units, originalPrice, currency, exchangeRate, hasStockPicker]);

  useEffect(() => {
    if (open) {
      setName(editItem?.name ?? "");
      setIncludeInChart(true);
      setNote("");
      setSelectedStock(null);
      setOriginalPrice(0);
      setCurrency("TWD");
      setExchangeRate(1);
      setShowPriceDetail(false);
      if (isInvestment) {
        setUnits(editItem ? String(editItem.value) : "");
      } else {
        setBalance(editItem ? String(editItem.value) : "");
      }
    }
  }, [open, editItem, isInvestment]);

  const handleSelectStock = (stock: StockItem) => {
    setSelectedStock(stock);
    if (!name) setName(stock.name);

    // Build Yahoo Finance symbol: 台股 → code.TW, 台灣興櫃 → code.TWO, 加密貨幣 → code-USD, 美股 → code as-is
    // 貴金屬 → use predefined mapping (xau→XAU=X, etc.); unmapped metals skip price fetch
    let yfSymbol: string;
    if (subCategoryName === "貴金屬") {
      yfSymbol = METAL_YF_SYMBOL[stock.code.toLowerCase()] ?? "";
    } else {
      const suffix =
        subCategoryName === "台股"
          ? ".TW"
          : subCategoryName === "台灣興櫃"
            ? ".TWO"
            : subCategoryName === "加密貨幣"
              ? "-USD"
              : "";
      yfSymbol = stock.code + suffix;
    }

    if (!yfSymbol) {
      setOriginalPrice(0);
      setCurrency("TWD");
      setExchangeRate(1);
      return;
    }

    setPriceLoading(true);
    fetch(`/api/stocks/price?symbol=${encodeURIComponent(yfSymbol)}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (typeof data.price !== "number") return;
        const fetchedPrice = data.price as number;
        const fetchedCurrency = (data.currency as string) ?? "USD";
        setOriginalPrice(fetchedPrice);
        setCurrency(fetchedCurrency);
        if (fetchedCurrency !== "TWD") {
          try {
            const fxRes = await fetch(
              `/api/stocks/price?symbol=${encodeURIComponent(fetchedCurrency + "TWD=X")}`
            );
            const fxData = await fxRes.json();
            if (typeof fxData.price === "number") setExchangeRate(fxData.price as number);
          } catch {
            /* keep rate = 1 */
          }
        } else {
          setExchangeRate(1);
        }
      })
      .catch(() => {})
      .finally(() => setPriceLoading(false));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const value = isInvestment ? computedValue : parseFloat(balance) || 0;
    const finalName = name.trim() || selectedStock?.name || subCategoryName;

    if (isEdit && editItem) {
      if (isLiability) {
        await updateLiability(editItem.id, {
          name: finalName,
          category: topCategory,
          balance: value,
        });
      } else {
        await updateAsset(editItem.id, { name: finalName, category: topCategory, value });
      }
    } else {
      if (isLiability) {
        await addLiability({ name: finalName, category: topCategory, balance: value });
      } else {
        await addAsset({ name: finalName, category: topCategory, value });
      }
    }
    setSubmitting(false);
    onSaved();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[70] bg-[#f2f2f7] transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="mx-auto max-w-md px-4 pt-14">
          {/* Top nav */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            >
              <ChevronLeft size={20} className="text-[#1c1c1e]" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm disabled:opacity-40"
            >
              <Check size={20} style={{ color: categoryColor }} strokeWidth={2.5} />
            </button>
          </div>

          {/* Account type header */}
          <div className="mb-5 flex items-center justify-between">
            <p className="text-[22px] font-bold text-[#1c1c1e]">帳戶</p>
            <div className="flex items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: categoryColor + "25" }}
              >
                <SubCategoryIcon size={20} style={{ color: categoryColor }} />
              </div>
              <p className="text-[18px] font-semibold text-[#1c1c1e]">{subCategoryName}</p>
            </div>
          </div>

          {/* Main form card */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {isInvestment ? (
              <>
                {/* Stock selector row — for 台股 / 台灣興櫃 */}
                {hasStockPicker && (
                  <>
                    <button
                      onClick={() => setShowStockPicker(true)}
                      className="flex w-full items-center justify-between px-5 py-4 active:bg-[#f2f2f7]"
                    >
                      <p className="text-[16px] font-medium text-[#1c1c1e]">選擇股票</p>
                      <div className="flex items-center gap-2">
                        {selectedStock ? (
                          <div className="text-right">
                            <p className="text-[15px] font-semibold text-[#1c1c1e]">
                              {selectedStock.code}
                            </p>
                            <p className="text-[12px] text-[#8e8e93]">{selectedStock.name}</p>
                          </div>
                        ) : (
                          <p className="text-[15px] text-[#c7c7cc]">未選擇</p>
                        )}
                        <ChevronRight size={16} className="text-[#c7c7cc]" />
                      </div>
                    </button>
                    <div className="mx-5 h-px bg-[#f2f2f7]" />
                  </>
                )}

                {/* Units row */}
                <div className="flex items-center justify-between px-5 py-4">
                  <p className="text-[16px] font-medium text-[#1c1c1e]">
                    {getUnitsLabel(subCategoryName)}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      placeholder="0"
                      className="w-24 bg-transparent text-right text-[20px] font-semibold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
                    />
                    <span className="rounded-full bg-[#1c1c1e] px-2.5 py-1 text-[11px] font-bold text-white">
                      TWD
                    </span>
                  </div>
                </div>

                {/* Computed total — display only, tap to expand detail */}
                <button
                  onClick={() => hasStockPicker && setShowPriceDetail((v) => !v)}
                  className="flex w-full items-center px-5 pb-4"
                >
                  <div className="rounded-lg bg-[#f2f2f7] px-3 py-1.5">
                    {priceLoading ? (
                      <span className="text-[13px] text-[#8e8e93]">查詢中...</span>
                    ) : (
                      <span className="text-[13px] text-[#8e8e93]">
                        =&nbsp;TWD&nbsp;
                        <span className="font-semibold text-[#1c1c1e]">
                          {computedValue.toLocaleString()}
                        </span>
                      </span>
                    )}
                  </div>
                </button>
              </>
            ) : (
              /* Standard balance */
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-[16px] font-medium text-[#1c1c1e]">帳戶</p>
                  <p className="text-[16px] font-medium text-[#1c1c1e]">餘額</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0"
                    className="w-24 bg-transparent text-right text-[20px] font-semibold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
                  />
                  <span className="rounded-full bg-[#1c1c1e] px-2.5 py-1 text-[11px] font-bold text-white">
                    TWD
                  </span>
                </div>
              </div>
            )}

            <div className="mx-5 h-px bg-[#f2f2f7]" />

            {/* Account Name */}
            <div className="flex items-center justify-between px-5 py-4">
              <p className="shrink-0 text-[16px] font-medium text-[#1c1c1e]">帳戶名稱</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`自訂名稱，預設為${subCategoryName}`}
                className="ml-4 min-w-0 flex-1 bg-transparent text-right text-[14px] text-[#8e8e93] outline-none placeholder:text-[#c7c7cc]"
              />
            </div>

            <div className="mx-5 h-px bg-[#f2f2f7]" />

            {/* Include in Chart */}
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-[16px] font-medium text-[#1c1c1e]">納入圖表</p>
              <button
                onClick={() => setIncludeInChart((v) => !v)}
                className={`relative h-[30px] w-[52px] rounded-full transition-colors duration-200 ${
                  includeInChart ? "bg-[#34c759]" : "bg-[#e5e5ea]"
                }`}
              >
                <span
                  className={`absolute top-[3px] left-[3px] h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
                    includeInChart ? "translate-x-[22px]" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="mx-5 h-px bg-[#f2f2f7]" />

            {/* Note */}
            <div className="px-5 py-4">
              <p className="mb-2 text-[16px] font-medium text-[#1c1c1e]">備註</p>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="選填"
                className="w-full bg-transparent text-[14px] text-[#8e8e93] outline-none placeholder:text-[#c7c7cc]"
              />
            </div>
          </div>

          {/* Price detail panel — shown when user taps the computed total */}
          {showPriceDetail && !priceLoading && originalPrice > 0 && (
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
                <p className="text-[13px] text-[#8e8e93]">Price ({currency})</p>
                <p className="mt-1 text-[22px] font-bold text-[#1c1c1e]">
                  {originalPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 8,
                  })}
                </p>
              </div>
              {currency !== "TWD" && (
                <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
                  <p className="text-[13px] text-[#8e8e93]">Rate ({currency} → TWD)</p>
                  <p className="mt-1 text-[22px] font-bold text-[#1c1c1e]">{exchangeRate}</p>
                </div>
              )}
            </div>
          )}

          {/* Recurrences section */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#1c1c1e]">
                <RefreshCw size={16} className="text-[#1c1c1e]" />
              </div>
              <p className="text-[17px] font-semibold text-[#1c1c1e]">定期項目</p>
            </div>
            <button className="rounded-full border border-[#1c1c1e] px-4 py-1.5 text-[13px] font-medium text-[#1c1c1e] active:bg-[#e5e5ea]">
              新增定期
            </button>
          </div>

          {/* Recurrences info card */}
          <div className="mt-3 flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <Info size={18} className="mt-0.5 shrink-0 text-[#8e8e93]" />
            <p className="text-[13px] leading-relaxed text-[#8e8e93]">
              新增定期交易，例如帳單、薪資、租金等。可以先填入預估金額，之後再依實際情況調整。
            </p>
          </div>
        </div>
      </div>

      {/* Stock picker — slides in on top at z-80 */}
      <StockPickerPage
        open={showStockPicker}
        onClose={() => setShowStockPicker(false)}
        onSelect={handleSelectStock}
        market={subCategoryName}
        color={categoryColor}
      />
    </>
  );
}
