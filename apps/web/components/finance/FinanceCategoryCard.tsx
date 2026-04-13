"use client";

import { useState } from "react";
import { Trash2, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatCurrency } from "../../lib/format";

export interface CategoryItem {
  id: string;
  name: string;
  value: number;
  updatedAt: string;
}

interface Props {
  name: string;
  color: string;
  items: CategoryItem[];
  isLiability?: boolean;
  getItemIcon?: (itemName: string) => LucideIcon;
  onEditItem?: (item: CategoryItem) => void;
  onDeleteItem?: (id: string) => Promise<void>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function FinanceCategoryCard({
  name,
  color,
  items,
  isLiability = false,
  getItemIcon,
  onEditItem,
  onDeleteItem,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const total = items.reduce((s, i) => s + i.value, 0);
  const lastUpdated = items.reduce(
    (latest, i) => (i.updatedAt > latest ? i.updatedAt : latest),
    items[0]?.updatedAt ?? ""
  );

  const handleDelete = async (id: string) => {
    if (!onDeleteItem) return;
    setDeletingId(id);
    await onDeleteItem(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  return (
    <div>
      {/* Header — transitions between white card and colored header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full rounded-2xl px-5 py-4 text-left transition-colors duration-300 active:opacity-80"
        style={{
          backgroundColor: expanded ? color : "white",
          boxShadow: expanded ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-bold text-[#1c1c1e]">{name}</p>

            {/* Items text + dots: collapse out when expanded */}
            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight: expanded ? 0 : "48px",
                opacity: expanded ? 0 : 1,
              }}
            >
              <p className="mt-0.5 truncate text-[13px] text-[#8e8e93]">
                {items.map((i) => i.name).join(", ")}
              </p>
              <div className="mt-2.5 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-1.5 w-1.5 rounded-full bg-[#c7c7cc]" />
                ))}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[20px] font-bold text-[#1c1c1e]">
              {isLiability && <span className="text-[#ff3b30]">-</span>}
              {formatCurrency(total)}
            </p>
            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight: expanded ? 0 : "24px",
                opacity: expanded ? 0 : 1,
              }}
            >
              {lastUpdated && (
                <p className="mt-0.5 text-[12px] text-[#8e8e93]">
                  Updated on {formatDate(lastUpdated)}
                </p>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Sub-items — CSS Grid row trick for smooth height animation */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-2 space-y-2">
            {items.map((item) => {
              const Icon = getItemIcon?.(item.name) ?? Wallet;
              const isConfirming = confirmDeleteId === item.id;
              const isDeleting = deletingId === item.id;

              return (
                <div key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <button
                    onClick={() => !isConfirming && onEditItem?.(item)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 active:bg-[#f2f2f7]"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: color + "25" }}
                    >
                      <Icon size={20} style={{ color }} />
                    </div>

                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[15px] font-semibold" style={{ color }}>
                        {item.name}
                      </p>
                      <p className="text-[12px] text-[#8e8e93]">
                        Updated on {formatDate(item.updatedAt)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      {isConfirming ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            disabled={isDeleting}
                            className="rounded-lg bg-[#ff3b30] px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                          >
                            {isDeleting ? "刪除中" : "確認"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="rounded-lg bg-[#f2f2f7] px-2.5 py-1 text-[11px] font-semibold text-[#8e8e93]"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <>
                          <p
                            className="text-[16px] font-bold"
                            style={{ color: isLiability ? "#ff3b30" : color }}
                          >
                            {isLiability && "-"}
                            {formatCurrency(item.value)}
                          </p>
                          <div className="mt-1 flex items-center justify-end gap-1">
                            {onDeleteItem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(item.id);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#f2f2f7] active:bg-[#e5e5ea]"
                              >
                                <Trash2 size={11} className="text-[#ff3b30]" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
