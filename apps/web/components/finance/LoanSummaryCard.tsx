import type { Entry } from "@repo/shared";
import { formatCurrency } from "../../lib/format";

interface Props {
  loanEntries: Entry[];
}

export function LoanSummaryCard({ loanEntries }: Props) {
  const loans = loanEntries.filter((e) => e.loan != null);
  if (loans.length === 0) return null;

  const totalOriginal = loans.reduce((s, e) => s + e.loan!.totalAmount, 0);
  const totalRemaining = loans.reduce((s, e) => s + e.value, 0);

  const paidFraction = totalOriginal > 0 ? 1 - totalRemaining / totalOriginal : 0;

  return (
    <div className="mb-3 rounded-2xl bg-white px-4 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[14px] font-semibold text-[#1c1c1e]">貸款總覽</p>
        <span className="rounded-full bg-[#f2f2f7] px-2.5 py-0.5 text-[11px] text-[#8e8e93]">
          {loans.length} 筆貸款
        </span>
      </div>

      <p className="text-[28px] font-bold text-[#ff3b30]">-{formatCurrency(totalRemaining)}</p>
      <p className="mt-0.5 text-[12px] text-[#8e8e93]">原始金額 {formatCurrency(totalOriginal)}</p>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-[#8e8e93]">
          <span>已還 {(paidFraction * 100).toFixed(1)}%</span>
          <span>剩餘 {((1 - paidFraction) * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#f2f2f7]">
          <div
            className="h-full rounded-full bg-[#C7C7D4] transition-all"
            style={{ width: `${Math.min(100, paidFraction * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
