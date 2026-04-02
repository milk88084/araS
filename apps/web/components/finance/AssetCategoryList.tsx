"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Asset } from "@repo/shared";
import { formatCurrency } from "../../lib/format";

interface Props {
  assets: Asset[];
  loading: boolean;
}

export function AssetCategoryList({ assets, loading }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const grouped = assets.reduce<Record<string, Asset[]>>((acc, asset) => {
    if (!acc[asset.category]) acc[asset.category] = [];
    acc[asset.category]!.push(asset);
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
        尚無資產紀錄
      </div>
    );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([category, items]) => {
        const total = items.reduce((sum, a) => sum + a.value, 0);
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
                <span className="text-sm font-semibold text-green-700">
                  {formatCurrency(total)}
                </span>
                {isExpanded ? (
                  <ChevronUp size={14} className="text-gray-400" />
                ) : (
                  <ChevronDown size={14} className="text-gray-400" />
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-gray-50">
                {items.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between border-b border-gray-50 px-4 py-2.5 last:border-0"
                  >
                    <span className="text-sm text-gray-700">{asset.name}</span>
                    <span className="text-sm text-green-700">{formatCurrency(asset.value)}</span>
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
