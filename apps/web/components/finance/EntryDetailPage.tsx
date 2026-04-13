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

export function EntryDetailPage({ open, entry, onClose, onAddEntry, onAdjust }: Props) {
  const [history, setHistory] = useState<EntryHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !entry) return;
    setLoading(true);
    fetch(`/api/entries/${entry.id}/history`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setHistory(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, entry]);

  if (!entry) return null;

  const color = getCategoryColor(entry.topCategory);
  const isLiability = entry.topCategory === "負債";

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
              <p className="text-[13px] text-[#8e8e93]">{entry.subCategory}</p>
            </div>
          </div>

          {/* Value */}
          <p className="mb-6 text-[38px] font-bold tracking-tight text-[#1c1c1e]">
            {formatCurrency(entry.value)}
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
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
          {/* List header */}
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
              {history.map((h, i) => (
                <div key={h.id}>
                  {i > 0 && <div className="mx-4 h-px bg-[#f2f2f7]" />}
                  <div className="flex items-start justify-between px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-[#1c1c1e]">
                        {h.note ?? (h.delta >= 0 ? "新增" : "調整")}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#8e8e93]">{formatDate(h.createdAt)}</p>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
