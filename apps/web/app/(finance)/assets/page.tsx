"use client";

import { useEffect, useState } from "react";
import { Plus, Eye, EyeOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Wallet } from "lucide-react";
import type { Entry } from "@repo/shared";
import { useFinanceStore } from "../../../store/useFinanceStore";
import { formatCurrency } from "../../../lib/format";
import {
  FinanceCategoryCard,
  type CategoryItem,
} from "../../../components/finance/FinanceCategoryCard";
import { AddAccountPage } from "../../../components/finance/AddAccountPage";
import { AccountFormPage } from "../../../components/finance/AccountFormPage";
import { EntryDetailPage } from "../../../components/finance/EntryDetailPage";
import {
  CATEGORIES,
  getNodeIcon,
  getTopCategory,
} from "../../../components/finance/categoryConfig";
import { LoanDetailSheet } from "../../../components/finance/LoanDetailSheet";
import { LoanSummaryCard } from "../../../components/finance/LoanSummaryCard";
import { calculateLoanStatus } from "@repo/shared";
import type { Loan } from "@repo/shared";

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
  const { fetchAll, entries, loading, deleteEntry } = useFinanceStore();
  const assets = entries.filter((e) => e.topCategory !== "負債");
  const liabilities = entries.filter((e) => e.topCategory === "負債");

  const [showMenu, setShowMenu] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailEntry, setDetailEntry] = useState<Entry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [editItem, setEditItem] = useState<EditItem | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [showLoanDetail, setShowLoanDetail] = useState(false);
  const [loanDetailData, setLoanDetailData] = useState<{ loan: Loan; color: string } | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const netWorth =
    assets.reduce((s, a) => s + a.value, 0) - liabilities.reduce((s, l) => s + l.value, 0);

  const groupedEntries = entries.reduce<Record<string, Entry[]>>((acc, e) => {
    (acc[e.topCategory] ??= []).push(e);
    return acc;
  }, {});

  // Merge into ordered list, only categories with data
  const categoriesWithData = CATEGORIES.map((cat) => {
    const catEntries = groupedEntries[cat.name] ?? [];
    const total = catEntries.reduce((s, e) => s + e.value, 0);
    return { ...cat, total, catEntries };
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

  const openDetail = (item: CategoryItem) => {
    const entry = entries.find((e) => e.id === item.id);
    if (!entry) return;

    if (entry.loan) {
      const topCat = getTopCategory(entry.topCategory);
      setLoanDetailData({ loan: entry.loan, color: topCat?.color ?? "#C7C7D4" });
      setShowLoanDetail(true);
      return;
    }

    setDetailEntry(entry);
    setShowDetail(true);
  };

  const openFormFromDetail = (entry: Entry, mode: "add" | "adjust") => {
    const topCat = getTopCategory(entry.topCategory);
    const color = topCat?.color ?? "#007aff";
    const icon = getNodeIcon(entry.topCategory, entry.subCategory);
    setFormConfig({
      topCategory: entry.topCategory,
      isLiability: entry.topCategory === "負債",
      color,
      subCategoryName: entry.subCategory,
      SubCategoryIcon: icon,
    });
    if (mode === "adjust") {
      setEditItem({
        id: entry.id,
        name: entry.name,
        value: entry.value,
        category: entry.topCategory,
      });
    } else {
      setEditItem(null);
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setFormConfig(null);
    setEditItem(null);
  };

  const closeAll = () => {
    setShowForm(false);
    setShowDetail(false);
    setShowMenu(false);
    setFormConfig(null);
    setEditItem(null);
    setDetailEntry(null);
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
            const items: CategoryItem[] = cat.catEntries.map((e) => {
              let loanPill: CategoryItem["loan"] = null;
              if (e.loan) {
                const status = calculateLoanStatus(
                  {
                    totalAmount: e.loan.totalAmount,
                    annualInterestRate: e.loan.annualInterestRate,
                    termMonths: e.loan.termMonths,
                    startDate: e.loan.startDate,
                    gracePeriodMonths: e.loan.gracePeriodMonths,
                    repaymentType: e.loan.repaymentType,
                  },
                  new Date()
                );
                loanPill = { paidMonths: status.paidMonths, termMonths: e.loan.termMonths };
              }
              return {
                id: e.id,
                name: e.name,
                value: e.value,
                updatedAt: e.updatedAt,
                loan: loanPill,
              };
            });

            return (
              <div key={cat.name} className="flex items-stretch gap-1.5">
                <div
                  className="w-12 shrink-0 rounded-r-2xl"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  {cat.isLiability && <LoanSummaryCard loanEntries={cat.catEntries} />}
                  <FinanceCategoryCard
                    name={cat.name}
                    color={cat.color}
                    items={items}
                    isLiability={isLiability}
                    getItemIcon={(itemName) => {
                      const entry = cat.catEntries.find((e) => e.name === itemName);
                      return getNodeIcon(cat.name, entry?.subCategory ?? itemName);
                    }}
                    onEditItem={(item) => openDetail(item)}
                    onDeleteItem={deleteEntry}
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

      <EntryDetailPage
        open={showDetail}
        entry={detailEntry}
        onClose={() => {
          setShowDetail(false);
          setDetailEntry(null);
        }}
        onAddEntry={() => {
          if (detailEntry) openFormFromDetail(detailEntry, "add");
        }}
        onAdjust={() => {
          if (detailEntry) openFormFromDetail(detailEntry, "adjust");
        }}
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
        {...(!editItem && detailEntry?.name ? { nameSuggestion: detailEntry.name } : {})}
      />

      {loanDetailData && (
        <LoanDetailSheet
          open={showLoanDetail}
          loan={loanDetailData.loan}
          color={loanDetailData.color}
          onClose={() => {
            setShowLoanDetail(false);
            setLoanDetailData(null);
          }}
          onRateUpdated={fetchAll}
        />
      )}
    </div>
  );
}
