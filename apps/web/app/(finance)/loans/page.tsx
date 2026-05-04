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
    totalAmount: String(Math.round(entry.value)),
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

function valuesEqual(a: LoanFormValues, b: LoanFormValues) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function LoansPage() {
  const { fetchAll, entries, loading } = useFinanceStore();
  const [formValues, setFormValues] = useState<Record<string, LoanFormValues>>({});
  const [savedValues, setSavedValues] = useState<Record<string, LoanFormValues>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const loanEntries = entries.filter(
    (e) => e.loan != null || LOAN_SUBCATEGORIES.includes(e.subCategory)
  );

  useEffect(() => {
    const initial: Record<string, LoanFormValues> = {};
    for (const e of loanEntries) {
      if (!savedValues[e.id] && e.loan != null) {
        initial[e.id] = toLoanFormValues(e);
      }
    }
    if (Object.keys(initial).length > 0) {
      setFormValues((prev) => ({ ...prev, ...initial }));
      setSavedValues((prev) => ({ ...prev, ...initial }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanEntries.length]);

  const handleSave = async (entryId: string, loanId: string) => {
    const values = formValues[entryId];
    if (!values) return;

    const totalAmount = parseFloat(values.totalAmount);
    const annualInterestRate = parseFloat(values.annualInterestRate);
    const termMonths = parseInt(values.termMonths, 10);
    const gracePeriodMonths = parseInt(values.gracePeriodMonths, 10);

    if (!values.loanName.trim()) {
      setSaveErrors((prev) => ({ ...prev, [loanId]: "貸款名稱為必填" }));
      return;
    }
    if (!isFinite(totalAmount) || totalAmount <= 0) {
      setSaveErrors((prev) => ({ ...prev, [loanId]: "請輸入有效的貸款金額" }));
      return;
    }
    if (!isFinite(annualInterestRate) || annualInterestRate < 0 || annualInterestRate > 100) {
      setSaveErrors((prev) => ({ ...prev, [loanId]: "請輸入有效的年利率" }));
      return;
    }
    if (!isFinite(termMonths) || termMonths < 1) {
      setSaveErrors((prev) => ({ ...prev, [loanId]: "請輸入有效的貸款期數" }));
      return;
    }

    setSavingId(loanId);
    setSaveErrors((prev) => ({ ...prev, [loanId]: "" }));

    try {
      const res = await fetch(`/api/loans/${loanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanName: values.loanName.trim(),
          totalAmount,
          annualInterestRate,
          termMonths,
          startDate: values.startDate,
          gracePeriodMonths: isFinite(gracePeriodMonths) ? gracePeriodMonths : 0,
          repaymentType: values.repaymentType,
        }),
      });
      if (!res.ok) throw new Error();
      setSavedValues((prev) => ({ ...prev, [entryId]: values }));
      fetchAll();
    } catch {
      setSaveErrors((prev) => ({ ...prev, [loanId]: "儲存失敗，請稍後再試" }));
    } finally {
      setSavingId(null);
    }
  };

  const handleCancel = (entryId: string) => {
    const original = savedValues[entryId];
    if (original) setFormValues((prev) => ({ ...prev, [entryId]: original }));
    setSaveErrors({});
  };

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
          const saved = savedValues[entry.id];
          const dirty = values && saved && !valuesEqual(values, saved);
          const loanId = entry.loan?.id ?? "";
          const isSaving = savingId === loanId;
          const saveError = saveErrors[loanId];

          return (
            <div key={entry.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="px-5 pt-4 pb-2">
                <p className="text-[15px] font-semibold text-[#1c1c1e]">{entry.name}</p>
                <p className="text-[12px] text-[#8e8e93]">{entry.subCategory}</p>
              </div>

              {values ? (
                <>
                  <LoanFormFields
                    values={values}
                    color={color}
                    onChange={(v) => {
                      setFormValues((prev) => ({ ...prev, [entry.id]: v }));
                      setSaveErrors((prev) => ({ ...prev, [loanId]: "" }));
                    }}
                  />

                  {saveError && <p className="px-5 pb-2 text-[12px] text-[#ff3b30]">{saveError}</p>}

                  {dirty && (
                    <div className="flex gap-2 border-t border-[#f2f2f7] px-5 py-3">
                      <button
                        onClick={() => handleCancel(entry.id)}
                        className="flex-1 rounded-xl bg-[#f2f2f7] py-2 text-[14px] font-semibold text-[#8e8e93]"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleSave(entry.id, loanId)}
                        disabled={isSaving}
                        className="flex-1 rounded-xl py-2 text-[14px] font-semibold text-white disabled:opacity-50"
                        style={{ backgroundColor: color }}
                      >
                        {isSaving ? "儲存中..." : "儲存"}
                      </button>
                    </div>
                  )}
                </>
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
