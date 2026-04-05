"use client";

import type { Asset } from "@repo/shared";
import { FinanceCategoryCard } from "./FinanceCategoryCard";

interface Props {
  assets: Asset[];
  loading: boolean;
}

export function AssetCategoryList({ assets, loading }: Props) {
  const grouped = assets.reduce<Record<string, Asset[]>>((acc, asset) => {
    if (!acc[asset.category]) acc[asset.category] = [];
    acc[asset.category]!.push(asset);
    return acc;
  }, {});

  if (loading) return <div className="py-4 text-center text-sm text-[#8e8e93]">載入中...</div>;
  if (Object.keys(grouped).length === 0)
    return (
      <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#c7c7cc] shadow-sm">
        尚無資產紀錄
      </div>
    );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([category, items]) => (
        <FinanceCategoryCard
          key={category}
          name={category}
          items={items.map((a) => ({
            id: a.id,
            name: a.name,
            value: a.value,
            updatedAt: a.updatedAt,
          }))}
        />
      ))}
    </div>
  );
}
