"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Liability } from "@repo/shared";
import { formatCurrency } from "../../lib/format";

interface Props {
  liabilities: Liability[];
  loading: boolean;
}

export function LiabilityCategoryList({ liabilities, loading }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const grouped = liabilities.reduce<Record<string, Liability[]>>((acc, l) => {
    if (!acc[l.category]) acc[l.category] = [];
    acc[l.category]!.push(l);
    return acc;
  }, {});

  const toggle = (cat: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });

  if (loading) return <div className="py-4 text-center text-sm text-gray-400">載入中...</div>;
  if (Object.keys(grouped).length === 0)
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
        尚無負債紀錄
      </div>
    );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([category, items]) => {
        const total = items.reduce((sum, l) => sum + l.balance, 0);
        const isExpanded = expanded.has(category);
        return (
          <div key={category} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <button
              onClick={() => toggle(category)}
              className="flex w-full items-center justify-between px-4 py-3"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">{category}</p>
                <p className="mt-0.5 text-xs text-gray-400">{items.length} 項</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-red-500">{formatCurrency(total)}</span>
                {isExpanded ? (
                  <ChevronUp size={14} className="text-gray-400" />
                ) : (
                  <ChevronDown size={14} className="text-gray-400" />
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-gray-50">
                {items.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between border-b border-gray-50 px-4 py-2.5 last:border-0"
                  >
                    <span className="text-sm text-gray-700">{l.name}</span>
                    <span className="text-sm text-red-500">{formatCurrency(l.balance)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
