"use client";

import type { Liability } from "@repo/shared";
import { FinanceCategoryCard } from "./FinanceCategoryCard";
import { getTopCategory } from "./categoryConfig";

interface Props {
  liabilities: Liability[];
  loading: boolean;
}

export function LiabilityCategoryList({ liabilities, loading }: Props) {
  const grouped = liabilities.reduce<Record<string, Liability[]>>((acc, l) => {
    if (!acc[l.category]) acc[l.category] = [];
    acc[l.category]!.push(l);
    return acc;
  }, {});

  if (loading) return <div className="py-4 text-center text-sm text-[#8e8e93]">載入中...</div>;
  if (Object.keys(grouped).length === 0)
    return (
      <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#c7c7cc] shadow-sm">
        尚無負債紀錄
      </div>
    );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([category, items]) => {
        const topCategory = getTopCategory(category);
        const color = topCategory?.color ?? "#007aff";
        return (
          <FinanceCategoryCard
            key={category}
            name={category}
            color={color}
            items={items.map((l) => ({
              id: l.id,
              name: l.name,
              value: l.balance,
              updatedAt: l.updatedAt,
            }))}
            isLiability
          />
        );
      })}
    </div>
  );
}
