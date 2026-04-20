"use client";

import { useState, useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import type { Loan } from "@repo/shared";
import { generateAmortizationSchedule, calculateLoanStatus } from "@repo/shared";
import { AmortizationTable } from "./AmortizationTable";
import { formatCurrency } from "../../lib/format";

interface Props {
  open: boolean;
  loan: Loan;
  color: string;
  onClose: () => void;
  onRateUpdated: () => void;
}

function formatDateStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function LoanDetailSheet({ open, loan, color, onClose, onRateUpdated }: Props) {
  const [rateInput, setRateInput] = useState(String(loan.annualInterestRate));
  const [editingRate, setEditingRate] = useState(false);
  const [savingRate, setSavingRate] = useState(false);

  const today = useMemo(() => new Date(), []);

  const loanInput = useMemo(
    () => ({
      totalAmount: loan.totalAmount,
      annualInterestRate: loan.annualInterestRate,
      termMonths: loan.termMonths,
      startDate: loan.startDate,
      gracePeriodMonths: loan.gracePeriodMonths,
      repaymentType: loan.repaymentType,
    }),
    [loan]
  );

  const schedule = useMemo(
    () => generateAmortizationSchedule(loanInput, today),
    [loanInput, today]
  );

  const status = useMemo(() => calculateLoanStatus(loanInput, today), [loanInput, today]);

  const handleSaveRate = async () => {
    const rate = parseFloat(rateInput);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    setSavingRate(true);
    try {
      const res = await fetch(`/api/loans/${loan.id}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annualInterestRate: rate }),
      });
      if (!res.ok) throw new Error("更新失敗");
      setEditingRate(false);
      onRateUpdated();
    } catch {
      // keep editing open on failure
    } finally {
      setSavingRate(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[90] flex flex-col bg-[#f2f2f7] transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pt-14 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ChevronLeft size={20} className="text-[#1c1c1e]" />
          </button>
          <div>
            <h1 className="text-[20px] font-bold text-[#1c1c1e]">{loan.loanName}</h1>
            <p className="text-[12px] text-[#8e8e93]">
              {formatDateStr(loan.startDate)} · {loan.termMonths} 期
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md space-y-3 px-4 pb-12">
          {/* Status row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "剩餘本金", value: formatCurrency(status.remainingPrincipal) },
              {
                label: "下期應繳",
                value: status.nextPaymentDate ? formatCurrency(status.nextPaymentAmount) : "—",
              },
              {
                label: "下期日期",
                value: status.nextPaymentDate
                  ? formatDateStr(status.nextPaymentDate.toISOString())
                  : "已還清",
              },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                <p className="text-[11px] text-[#8e8e93]">{label}</p>
                <p className="mt-1 text-[14px] font-bold text-[#1c1c1e]">{value}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <div className="mb-1 flex justify-between text-[12px] text-[#8e8e93]">
              <span>已繳 {status.paidMonths} 期</span>
              <span>共 {loan.termMonths} 期</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#f2f2f7]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (status.paidMonths / loan.termMonths) * 100)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>

          {/* Rate editor */}
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <p className="mb-1 text-[12px] text-[#8e8e93]">年利率 (%)</p>
            {editingRate ? (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  step="0.01"
                  className="flex-1 bg-transparent text-[20px] font-bold text-[#1c1c1e] outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveRate}
                  disabled={savingRate}
                  className="rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: color }}
                >
                  {savingRate ? "更新中" : "確認"}
                </button>
                <button
                  onClick={() => {
                    setRateInput(String(loan.annualInterestRate));
                    setEditingRate(false);
                  }}
                  className="rounded-xl bg-[#f2f2f7] px-3 py-1.5 text-[13px] font-semibold text-[#8e8e93]"
                >
                  取消
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-[20px] font-bold text-[#1c1c1e]">
                  {loan.annualInterestRate.toFixed(2)}%
                </p>
                <button
                  onClick={() => setEditingRate(true)}
                  className="text-[13px] font-medium"
                  style={{ color }}
                >
                  調整
                </button>
              </div>
            )}
          </div>

          {/* Amortization table */}
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <p className="mb-2 text-[15px] font-semibold text-[#1c1c1e]">還款明細</p>
            <AmortizationTable rows={schedule} color={color} />
          </div>
        </div>
      </div>
    </div>
  );
}
