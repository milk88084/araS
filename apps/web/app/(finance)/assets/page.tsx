"use client";

import { useEffect, useState } from "react";
import { Plus, PieChart } from "lucide-react";
import type { Asset, Liability } from "@repo/shared";
import { useFinanceStore } from "../../../store/useFinanceStore";
import { formatCurrency } from "../../../lib/format";
import {
  FinanceCategoryCard,
  type CategoryItem,
} from "../../../components/finance/FinanceCategoryCard";
import { AssetTreemap } from "../../../components/finance/AssetTreemap";
import { AddItemActionSheet } from "../../../components/finance/AddItemActionSheet";
import { AssetSheet } from "../../../components/finance/AssetSheet";
import { LiabilitySheet } from "../../../components/finance/LiabilitySheet";

type SheetType = "none" | "menu" | "asset" | "liability";

export default function AssetsPage() {
  const { fetchAll, assets, liabilities, loading, deleteAsset, deleteLiability } =
    useFinanceStore();

  const [showChart, setShowChart] = useState(false);
  const [sheet, setSheet] = useState<SheetType>("none");
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [editLiability, setEditLiability] = useState<Liability | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Group assets by category
  const groupedAssets = assets.reduce<Record<string, Asset[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  // Group liabilities by category
  const groupedLiabilities = liabilities.reduce<Record<string, Liability[]>>((acc, l) => {
    (acc[l.category] ??= []).push(l);
    return acc;
  }, {});

  // Treemap data
  const treemapItems = [
    ...Object.entries(groupedAssets).map(([name, items]) => ({
      name,
      value: items.reduce((s, a) => s + a.value, 0),
    })),
    ...Object.entries(groupedLiabilities).map(([name, items]) => ({
      name,
      value: items.reduce((s, l) => s + l.balance, 0),
    })),
  ];

  // Handlers
  const handleEditAsset = (item: CategoryItem) => {
    const found = assets.find((a) => a.id === item.id) ?? null;
    setEditAsset(found);
    setSheet("asset");
  };

  const handleEditLiability = (item: CategoryItem) => {
    const found = liabilities.find((l) => l.id === item.id) ?? null;
    setEditLiability(found);
    setSheet("liability");
  };

  const closeSheet = () => {
    setSheet("none");
    setEditAsset(null);
    setEditLiability(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-[#8e8e93]">載入中...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-[13px] text-[#8e8e93]">我的淨資產 (TWD)</p>
          <p className="mt-0.5 text-[36px] font-bold tracking-tight text-[#1c1c1e]">
            {formatCurrency(netWorth)}
          </p>
          <div className="mt-1 flex gap-3 text-[12px]">
            <span className="text-[#34c759]">資產 {formatCurrency(totalAssets)}</span>
            <span className="text-[#ff3b30]">負債 {formatCurrency(totalLiabilities)}</span>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          {treemapItems.length > 0 && (
            <button
              onClick={() => setShowChart((v) => !v)}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                showChart ? "bg-[#007aff]" : "bg-[#e5e5ea]"
              }`}
            >
              <PieChart size={16} className={showChart ? "text-white" : "text-[#8e8e93]"} />
            </button>
          )}
          <button
            onClick={() => setSheet("menu")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#007aff]"
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Treemap chart */}
      {showChart && treemapItems.length > 0 && (
        <div className="mb-4">
          <AssetTreemap items={treemapItems} />
        </div>
      )}

      {/* Category list */}
      <div className="space-y-3 pb-4">
        {Object.entries(groupedAssets).map(([category, items]) => (
          <FinanceCategoryCard
            key={category}
            name={category}
            items={items.map((a) => ({
              id: a.id,
              name: a.name,
              value: a.value,
              updatedAt: a.updatedAt,
            }))}
            onEditItem={handleEditAsset}
            onDeleteItem={deleteAsset}
          />
        ))}

        {Object.entries(groupedLiabilities).map(([category, items]) => (
          <FinanceCategoryCard
            key={category}
            name={category}
            items={items.map((l) => ({
              id: l.id,
              name: l.name,
              value: l.balance,
              updatedAt: l.updatedAt,
            }))}
            isLiability
            onEditItem={handleEditLiability}
            onDeleteItem={deleteLiability}
          />
        ))}

        {assets.length === 0 && liabilities.length === 0 && (
          <button
            onClick={() => setSheet("menu")}
            className="w-full rounded-2xl bg-white px-4 py-12 text-center shadow-sm transition-colors active:bg-[#f2f2f7]"
          >
            <p className="text-[15px] font-medium text-[#007aff]">+ 新增第一筆資產</p>
            <p className="mt-1 text-[13px] text-[#8e8e93]">記錄你的資產與負債</p>
          </button>
        )}
      </div>

      {/* Modals */}
      <AddItemActionSheet
        open={sheet === "menu"}
        onClose={() => setSheet("none")}
        onAddAsset={() => setSheet("asset")}
        onAddLiability={() => setSheet("liability")}
      />

      <AssetSheet open={sheet === "asset"} onClose={closeSheet} editItem={editAsset} />

      <LiabilitySheet open={sheet === "liability"} onClose={closeSheet} editItem={editLiability} />
    </div>
  );
}
