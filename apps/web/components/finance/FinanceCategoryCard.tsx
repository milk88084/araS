"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "../../lib/format";

export interface CategoryItem {
  id: string;
  name: string;
  value: number;
  updatedAt: string;
}

interface Props {
  name: string;
  items: CategoryItem[];
  isLiability?: boolean;
  onEditItem?: (item: CategoryItem) => void;
  onDeleteItem?: (id: string) => Promise<void>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function FinanceCategoryCard({
  name,
  items,
  isLiability = false,
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
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* Card header */}
      <div className="flex items-start justify-between px-4 py-4">
        <div className="min-w-0 flex-1 pr-4">
          <p className="text-[17px] font-semibold text-[#1c1c1e]">{name}</p>
          <p className="mt-0.5 truncate text-[13px] text-[#8e8e93]">
            {items.map((i) => i.name).join(" · ")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[17px] font-semibold text-[#1c1c1e]">
            {isLiability && <span className="text-[#ff3b30]">-&nbsp;</span>}
            {formatCurrency(total)}
          </p>
          {lastUpdated && (
            <p className="mt-0.5 text-[11px] text-[#8e8e93]">{formatDate(lastUpdated)} 更新</p>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      <div className="border-t border-[#f2f2f7] px-4 py-2.5">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[13px] font-medium text-[#8e8e93]"
        >
          {expanded ? "收起 ▲" : `··· ${items.length} 項明細`}
        </button>
      </div>

      {/* Expanded items */}
      {expanded && (
        <div className="border-t border-[#f2f2f7]">
          {items.map((item, i) => {
            const isConfirming = confirmDeleteId === item.id;
            const isDeleting = deletingId === item.id;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i !== items.length - 1 ? "border-b border-[#f2f2f7]" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-[#1c1c1e]">{item.name}</p>
                  <p className="text-[12px] text-[#8e8e93]">{formatDate(item.updatedAt)} 更新</p>
                </div>

                <div className="ml-3 flex items-center gap-2">
                  <p
                    className={`text-[14px] font-medium ${
                      isLiability ? "text-[#ff3b30]" : "text-[#1c1c1e]"
                    }`}
                  >
                    {formatCurrency(item.value)}
                  </p>

                  {/* Actions */}
                  {isConfirming ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isDeleting}
                        className="rounded-lg bg-[#ff3b30] px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                      >
                        {isDeleting ? "刪除中" : "確認"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg bg-[#f2f2f7] px-2.5 py-1 text-[11px] font-semibold text-[#8e8e93]"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {onEditItem && (
                        <button
                          onClick={() => onEditItem(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f2f2f7] transition-colors active:bg-[#e5e5ea]"
                        >
                          <Pencil size={12} className="text-[#8e8e93]" />
                        </button>
                      )}
                      {onDeleteItem && (
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f2f2f7] transition-colors active:bg-[#e5e5ea]"
                        >
                          <Trash2 size={12} className="text-[#ff3b30]" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
