"use client";

import { useEffect, useState } from "react";
import { useFinanceStore } from "../../../store/useFinanceStore";
import { LoanSummaryCard } from "../../../components/finance/LoanSummaryCard";
import { LoanFormFields, type LoanFormValues } from "../../../components/finance/LoanFormFields";
import { CATEGORIES } from "../../../components/finance/categoryConfig";
import type { Entry } from "@repo/shared";

const LOAN_SUBCATEGORIES = ["房屋貸款", "汽車貸款", "消費貸款", "學生貸款", "其他貸款"];

function toLoanFormValues(entry: Entry): LoanFormValues {
  const l = entry.loan!;
  return {
    loanName: l.loanName,
    totalAmount: String(l.totalAmount),
    annualInterestRate: String(l.annualInterestRate),
    termMonths: String(l.termMonths),
    startDate: l.startDate.split("T")[0] ?? "",
    gracePeriodMonths: String(l.gracePeriodMonths),
    repaymentType: l.repaymentType,
  };
}

function getLoanColor(topCategory: string): string {
  return CATEGORIES.find((c) => c.name === topCategory)?.color ?? "#C7C7D4";
}

export default function LoansPage() {
  const { fetchAll, entries, loading } = useFinanceStore();
  const [formValues, setFormValues] = useState<Record<string, LoanFormValues>>({});

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const loanEntries = entries.filter(
    (e) => e.loan != null || LOAN_SUBCATEGORIES.includes(e.subCategory)
  );

  useEffect(() => {
    const initial: Record<string, LoanFormValues> = {};
    for (const e of loanEntries) {
      if (!formValues[e.id] && e.loan != null) {
        initial[e.id] = toLoanFormValues(e);
      }
    }
    if (Object.keys(initial).length > 0) {
      setFormValues((prev) => ({ ...prev, ...initial }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanEntries.length]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-[#8e8e93]">載入中...</div>
      </div>
    );
  }

  if (loanEntries.length === 0) {
    return (
      <div className="px-4 pt-6 pb-8">
        <h1 className="mb-4 text-xl font-bold text-[#1c1c1e]">貸款</h1>
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#c7c7cc] shadow-sm">
          尚無貸款資料
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="mb-4 text-xl font-bold text-[#1c1c1e]">貸款</h1>
      <LoanSummaryCard loanEntries={loanEntries} />

      <div className="mt-4 flex flex-col gap-4">
        {loanEntries.map((entry) => {
          const color = getLoanColor(entry.topCategory);
          const values = formValues[entry.id];
          return (
            <div key={entry.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="px-5 pt-4 pb-2">
                <p className="text-[15px] font-semibold text-[#1c1c1e]">{entry.name}</p>
                <p className="text-[12px] text-[#8e8e93]">{entry.subCategory}</p>
              </div>
              {values ? (
                <LoanFormFields
                  values={values}
                  color={color}
                  onChange={(v) => setFormValues((prev) => ({ ...prev, [entry.id]: v }))}
                />
              ) : (
                <div className="px-5 py-4">
                  <p className="text-[12px] text-[#8e8e93]">餘額</p>
                  <p className="text-[20px] font-bold text-[#1c1c1e]">
                    {entry.value.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
