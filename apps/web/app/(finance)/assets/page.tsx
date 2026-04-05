"use client";

import { useEffect, useState } from "react";
import { Plus, PieChart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Wallet } from "lucide-react";
import type { Asset, Liability } from "@repo/shared";
import { useFinanceStore } from "../../../store/useFinanceStore";
import { formatCurrency } from "../../../lib/format";
import {
  FinanceCategoryCard,
  type CategoryItem,
} from "../../../components/finance/FinanceCategoryCard";
import { AssetTreemap } from "../../../components/finance/AssetTreemap";
import { AddAccountPage } from "../../../components/finance/AddAccountPage";
import { AccountFormPage } from "../../../components/finance/AccountFormPage";
import { getNodeIcon, getTopCategory } from "../../../components/finance/categoryConfig";

interface FormConfig {
  topCategory: string;
  isLiability: boolean;
  color: string;
  subCategoryName: string;
  SubCategoryIcon: LucideIcon;
}

interface EditItem {
  id: string;
  name: string;
  value: number;
  category: string;
}

export default function AssetsPage() {
  const { fetchAll, assets, liabilities, loading, deleteAsset, deleteLiability } =
    useFinanceStore();

  const [showChart, setShowChart] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [editItem, setEditItem] = useState<EditItem | null>(null);

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

  const openFormForNew = (
    topCategory: string,
    isLiability: boolean,
    subCategoryName: string,
    icon: LucideIcon,
    color: string
  ) => {
    setFormConfig({ topCategory, isLiability, color, subCategoryName, SubCategoryIcon: icon });
    setEditItem(null);
    // Keep showMenu open — AccountFormPage slides in on top (z-70 > z-60)
    // so there's no flicker from simultaneous slide-in + slide-out
    setShowForm(true);
  };

  const openFormForEdit = (item: CategoryItem, isLiability: boolean) => {
    const topCategory = isLiability
      ? (liabilities.find((l) => l.id === item.id)?.category ?? "")
      : (assets.find((a) => a.id === item.id)?.category ?? "");

    const topCat = getTopCategory(topCategory);
    const color = topCat?.color ?? "#007aff";
    const icon = getNodeIcon(topCategory, item.name);

    setFormConfig({
      topCategory,
      isLiability,
      color,
      subCategoryName: item.name,
      SubCategoryIcon: icon,
    });
    setEditItem({ id: item.id, name: item.name, value: item.value, category: topCategory });
    setShowForm(true);
  };

  // Back button on AccountFormPage — close form only, reveal AddAccountPage underneath
  const closeForm = () => {
    setShowForm(false);
    setFormConfig(null);
    setEditItem(null);
  };

  // After save — close form and menu together
  const closeAll = () => {
    setShowForm(false);
    setShowMenu(false);
    setFormConfig(null);
    setEditItem(null);
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
            onClick={() => setShowMenu(true)}
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
            onEditItem={(item) => openFormForEdit(item, false)}
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
            onEditItem={(item) => openFormForEdit(item, true)}
            onDeleteItem={deleteLiability}
          />
        ))}

        {assets.length === 0 && liabilities.length === 0 && (
          <button
            onClick={() => setShowMenu(true)}
            className="w-full rounded-2xl bg-white px-4 py-12 text-center shadow-sm transition-colors active:bg-[#f2f2f7]"
          >
            <p className="text-[15px] font-medium text-[#007aff]">+ 新增第一筆資產</p>
            <p className="mt-1 text-[13px] text-[#8e8e93]">記錄你的資產與負債</p>
          </button>
        )}
      </div>

      {/* Full-page category picker */}
      <AddAccountPage
        open={showMenu}
        onClose={() => setShowMenu(false)}
        onSelectCategory={openFormForNew}
      />

      {/* Full-page account form */}
      <AccountFormPage
        open={showForm}
        onClose={closeForm}
        onSaved={closeAll}
        topCategory={formConfig?.topCategory ?? ""}
        isLiability={formConfig?.isLiability ?? false}
        categoryColor={formConfig?.color ?? "#007aff"}
        subCategoryName={formConfig?.subCategoryName ?? ""}
        SubCategoryIcon={formConfig?.SubCategoryIcon ?? Wallet}
        editItem={editItem}
      />
    </div>
  );
}
