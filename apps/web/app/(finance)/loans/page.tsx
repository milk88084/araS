"use client";

import { useEffect } from "react";
import { useFinanceStore } from "../../../store/useFinanceStore";
import { LoanSummaryCard } from "../../../components/finance/LoanSummaryCard";

export default function LoansPage() {
  const { fetchAll, entries, loading } = useFinanceStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const loanEntries = entries.filter((e) => e.loan != null);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-[#8e8e93]">載入中...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="mb-4 text-xl font-bold text-[#1c1c1e]">貸款</h1>
      {loanEntries.length > 0 ? (
        <LoanSummaryCard loanEntries={loanEntries} />
      ) : (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#c7c7cc] shadow-sm">
          尚無貸款資料
        </div>
      )}
    </div>
  );
}
