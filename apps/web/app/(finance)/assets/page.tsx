"use client";

import { useEffect, useState } from "react";
import { Plus, Eye, EyeOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Wallet } from "lucide-react";
import type { Asset, Liability } from "@repo/shared";
import { useFinanceStore } from "../../../store/useFinanceStore";
import { formatCurrency } from "../../../lib/format";
import {
  FinanceCategoryCard,
  type CategoryItem,
} from "../../../components/finance/FinanceCategoryCard";
import { AddAccountPage } from "../../../components/finance/AddAccountPage";
import { AccountFormPage } from "../../../components/finance/AccountFormPage";
import {
  CATEGORIES,
  getNodeIcon,
  getTopCategory,
} from "../../../components/finance/categoryConfig";

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

  const [showMenu, setShowMenu] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [editItem, setEditItem] = useState<EditItem | null>(null);
  const [hideBalance, setHideBalance] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const netWorth =
    assets.reduce((s, a) => s + a.value, 0) - liabilities.reduce((s, l) => s + l.balance, 0);

  const groupedAssets = assets.reduce<Record<string, Asset[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  const groupedLiabilities = liabilities.reduce<Record<string, Liability[]>>((acc, l) => {
    (acc[l.category] ??= []).push(l);
    return acc;
  }, {});

  // Merge into ordered list, only categories with data
  const categoriesWithData = CATEGORIES.map((cat) => {
    const assetItems = groupedAssets[cat.name] ?? [];
    const liabilityItems = groupedLiabilities[cat.name] ?? [];
    const total =
      assetItems.reduce((s, a) => s + a.value, 0) +
      liabilityItems.reduce((s, l) => s + l.balance, 0);
    return { ...cat, total, assetItems, liabilityItems };
  }).filter((c) => c.total > 0);

  const openFormForNew = (
    topCategory: string,
    isLiability: boolean,
    subCategoryName: string,
    icon: LucideIcon,
    color: string
  ) => {
    setFormConfig({ topCategory, isLiability, color, subCategoryName, SubCategoryIcon: icon });
    setEditItem(null);
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

  const closeForm = () => {
    setShowForm(false);
    setFormConfig(null);
    setEditItem(null);
  };

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
    <div className="pt-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <p className="text-[15px] font-semibold text-[#1c1c1e]">Net Worth (TWD)</p>
        <button onClick={() => setHideBalance((v) => !v)} className="active:opacity-60">
          {hideBalance ? (
            <EyeOff size={16} className="text-[#8e8e93]" />
          ) : (
            <Eye size={16} className="text-[#8e8e93]" />
          )}
        </button>
      </div>
      <div className="mb-6 flex items-center justify-between px-4">
        <div>
          <p className="mt-1 text-[38px] font-bold tracking-tight text-[#1c1c1e]">
            {hideBalance ? "••••••" : formatCurrency(netWorth)}
          </p>
        </div>
        <button
          onClick={() => setShowMenu(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full shadow-md active:opacity-80"
          style={{ backgroundColor: "#5856D6" }}
        >
          <Plus size={22} className="text-white" />
        </button>
      </div>

      {/* Category list with proportion bar */}
      {categoriesWithData.length > 0 ? (
        <div className="flex flex-col gap-3 pr-4 pb-8">
          {categoriesWithData.map((cat) => {
            const isLiability = cat.isLiability;
            const items: CategoryItem[] = isLiability
              ? cat.liabilityItems.map((l) => ({
                  id: l.id,
                  name: l.name,
                  value: l.balance,
                  updatedAt: l.updatedAt,
                }))
              : cat.assetItems.map((a) => ({
                  id: a.id,
                  name: a.name,
                  value: a.value,
                  updatedAt: a.updatedAt,
                }));

            return (
              <div key={cat.name} className="flex items-stretch gap-1.5">
                <div
                  className="w-12 shrink-0 rounded-r-2xl"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex-1">
                  <FinanceCategoryCard
                    name={cat.name}
                    color={cat.color}
                    items={items}
                    isLiability={isLiability}
                    getItemIcon={(itemName) => getNodeIcon(cat.name, itemName)}
                    onEditItem={(item) => openFormForEdit(item, isLiability)}
                    onDeleteItem={isLiability ? deleteLiability : deleteAsset}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4">
          <button
            onClick={() => setShowMenu(true)}
            className="w-full rounded-2xl bg-white px-4 py-12 text-center shadow-sm transition-colors active:bg-[#f2f2f7]"
          >
            <p className="text-[15px] font-medium text-[#007aff]">+ 新增第一筆資產</p>
            <p className="mt-1 text-[13px] text-[#8e8e93]">記錄你的資產與負債</p>
          </button>
        </div>
      )}

      <AddAccountPage
        open={showMenu}
        onClose={() => setShowMenu(false)}
        onSelectCategory={openFormForNew}
      />

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
