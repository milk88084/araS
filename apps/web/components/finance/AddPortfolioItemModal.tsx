"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useFinanceStore } from "../../store/useFinanceStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddPortfolioItemModal({ open, onClose }: Props) {
  const { addPortfolioItem } = useFinanceStore();
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [shares, setShares] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!symbol || !name || !avgCost || !shares) return;
    setSubmitting(true);
    await addPortfolioItem({
      symbol: symbol.toUpperCase(),
      name,
      avgCost: parseFloat(avgCost),
      shares: parseFloat(shares),
    });
    setSubmitting(false);
    setSymbol("");
    setName("");
    setAvgCost("");
    setShares("");
    onClose();
  };

  const fields: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    type?: string;
    upper?: boolean;
  }[] = [
    {
      label: "股票/ETF 代號",
      value: symbol,
      onChange: setSymbol,
      placeholder: "例：0050.TW",
      upper: true,
    },
    { label: "名稱", value: name, onChange: setName, placeholder: "例：元大台灣50" },
    {
      label: "平均成本（每股）",
      value: avgCost,
      onChange: setAvgCost,
      placeholder: "0",
      type: "number",
    },
    { label: "持有股數", value: shares, onChange: setShares, placeholder: "0", type: "number" },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 bottom-0 left-0 z-50 rounded-t-2xl bg-white transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-md p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">新增投資標的</h2>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {fields.map(({ label, value, onChange, placeholder, type, upper }) => (
            <div key={label} className="mb-3">
              <label className="mb-1 block text-xs text-gray-500">{label}</label>
              <input
                type={type ?? "text"}
                value={value}
                onChange={(e) => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none"
              />
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={!symbol || !name || !avgCost || !shares || submitting}
            className="mt-2 w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "新增中..." : "新增"}
          </button>
        </div>
      </div>
    </>
  );
}
