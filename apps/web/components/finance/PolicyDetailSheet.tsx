"use client";

import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import type { Insurance } from "@repo/shared";
import { useExchangeRate } from "@/hooks/useExchangeRate";

interface Props {
  open: boolean;
  insurance: Insurance;
  onClose: () => void;
}

function usd(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function twd(v: number, rate: number) {
  return `NT$${Math.round(v * rate).toLocaleString("zh-TW")}`;
}

export function PolicyDetailSheet({ open, insurance, onClose }: Props) {
  const { rate, isManual } = useExchangeRate();

  const policyYear = useMemo(
    () =>
      Math.floor(
        (Date.now() - new Date(insurance.startDate).getTime()) / (365.25 * 24 * 3600 * 1000)
      ) + 1,
    [insurance.startDate]
  );

  const rows = [
    {
      label: "解約金 (Surrender Value)",
      usdVal: insurance.surrenderValue,
    },
    {
      label: "身故保險金 (Sum Insured)",
      usdVal: insurance.sumInsured,
    },
    {
      label: "累計增值回饋分享金",
      usdVal: insurance.accumulatedBonus,
    },
    {
      label: "累計增加保險金額",
      usdVal: insurance.accumulatedSumIncrease,
    },
  ];

  const [startYear, startMonth, startDay] = insurance.startDate.slice(0, 10).split("-");

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
            <h1 className="text-[20px] font-bold text-[#1c1c1e]">保單明細</h1>
            <p className="text-[12px] text-[#8e8e93]">
              {insurance.insurer ?? "Cathay Life"} · 第 {policyYear} 年
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md space-y-3 px-4 pb-12">
          {/* Policy info */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: "保單號碼",
                value: insurance.policyNumber ?? "—",
              },
              {
                label: "起保日期",
                value: `${startYear}/${startMonth}/${startDay}`,
              },
              {
                label: "幣別",
                value: insurance.currency,
              },
              {
                label: "定期給付",
                value: insurance.isPeriodicPayout ? "是" : "否",
              },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                <p className="text-[11px] text-[#8e8e93]">{label}</p>
                <p className="mt-1 text-[14px] font-bold text-[#1c1c1e]">{value}</p>
              </div>
            ))}
          </div>

          {/* Breakdown table */}
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-semibold text-[#1c1c1e]">項目明細</p>
              {isManual && (
                <span className="rounded-full bg-[#fff3cd] px-2 py-0.5 text-[10px] text-[#856404]">
                  匯率手動
                </span>
              )}
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-[11px] font-medium text-[#8e8e93]">項目</th>
                  <th className="pb-2 text-right text-[11px] font-medium text-[#8e8e93]">USD</th>
                  <th className="pb-2 text-right text-[11px] font-medium text-[#8e8e93]">TWD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f2f7]">
                {rows.map(({ label, usdVal }) => (
                  <tr key={label}>
                    <td className="py-2.5 pr-2 text-[12px] text-[#1c1c1e]">{label}</td>
                    <td className="py-2.5 text-right text-[12px] font-semibold text-[#1c1c1e]">
                      {usd(usdVal)}
                    </td>
                    <td className="py-2.5 text-right text-[12px] text-[#8e8e93]">
                      {twd(usdVal, rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cost basis */}
          {insurance.premiumTotal != null && (
            <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <p className="mb-3 text-[15px] font-semibold text-[#1c1c1e]">成本與報酬</p>
              <div className="space-y-2">
                {[
                  { label: "保費總額", usdVal: insurance.premiumTotal, colored: false },
                  {
                    label: "未實現損益",
                    usdVal: insurance.surrenderValue - insurance.premiumTotal,
                    colored: true,
                  },
                ].map(({ label, usdVal, colored }) => (
                  <div key={label} className="flex items-center justify-between">
                    <p className="text-[13px] text-[#8e8e93]">{label}</p>
                    <p
                      className="text-[13px] font-semibold"
                      style={
                        colored
                          ? { color: usdVal >= 0 ? "#34c759" : "#ff3b30" }
                          : { color: "#1c1c1e" }
                      }
                    >
                      {usdVal >= 0 && colored ? "+" : ""}
                      {usd(usdVal)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rate info */}
          <p className="text-center text-[11px] text-[#c7c7cc]">
            匯率：1 USD = {rate.toFixed(2)} TWD {isManual ? "(手動)" : "(即時)"}
          </p>
        </div>
      </div>
    </div>
  );
}
