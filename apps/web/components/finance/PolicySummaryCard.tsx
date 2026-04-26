"use client";

import { useMemo } from "react";
import type { Insurance } from "@repo/shared";
import { getNetAssetValue, getCostBasis } from "@repo/shared";
import { useExchangeRate } from "@/hooks/useExchangeRate";

type PolicyWithEntry = Insurance & { entry?: { name: string } | null };

interface Props {
  insurance: PolicyWithEntry;
  onUpdate: () => void;
  onViewDetail: () => void;
}

function formatUSD(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTWD(v: number) {
  return `NT$${Math.round(v).toLocaleString("zh-TW")}`;
}

export function PolicySummaryCard({ insurance, onUpdate, onViewDetail }: Props) {
  const { rate, isManual, isLoading } = useExchangeRate();

  const policyYear = useMemo(
    () =>
      Math.floor(
        (Date.now() - new Date(insurance.startDate).getTime()) / (365.25 * 24 * 3600 * 1000)
      ) + 1,
    [insurance.startDate]
  );

  const { usd: navUsd, twd: navTwd } = useMemo(
    () => getNetAssetValue(insurance, rate),
    [insurance, rate]
  );

  const { costBasis, unrealizedGain, returnPct } = useMemo(
    () => getCostBasis(insurance),
    [insurance]
  );

  return (
    <div className="rounded-2xl bg-white px-4 py-5 shadow-sm">
      {/* Header */}
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#1c1c1e]">
            {insurance.entry?.name ?? "保單"}
          </p>
          <p className="mt-0.5 text-[11px] text-[#8e8e93]">
            {insurance.insurer ?? "Cathay Life"} · #{insurance.policyNumber ?? "—"} · 第{" "}
            {policyYear} 年
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {(isManual || isLoading) && (
            <span className="rounded-full bg-[#fff3cd] px-2 py-0.5 text-[10px] text-[#856404]">
              {isLoading ? "載入中" : "手動匯率"}
            </span>
          )}
        </div>
      </div>

      {/* Net Asset Value */}
      <div className="mt-3">
        <p className="text-[11px] text-[#8e8e93]">解約金 + 增值回饋</p>
        <p className="mt-0.5 text-[28px] font-bold text-[#1c1c1e]">{formatUSD(navUsd)}</p>
        <p className="text-[12px] text-[#8e8e93]">≈ {formatTWD(navTwd)}</p>
        <p className="mt-0.5 text-[10px] text-[#c7c7cc]">
          匯率 {rate.toFixed(2)} {isManual ? "(手動)" : "(即時)"}
        </p>
      </div>

      {/* Cost basis row */}
      {costBasis !== null && unrealizedGain !== null && returnPct !== null && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#f2f2f7] px-3 py-2.5">
          <div>
            <p className="text-[11px] text-[#8e8e93]">保費成本</p>
            <p className="mt-0.5 text-[14px] font-semibold text-[#1c1c1e]">
              {formatUSD(costBasis)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#8e8e93]">未實現損益</p>
            <p
              className="mt-0.5 text-[14px] font-bold"
              style={{ color: unrealizedGain >= 0 ? "#34c759" : "#ff3b30" }}
            >
              {unrealizedGain >= 0 ? "+" : ""}
              {formatUSD(unrealizedGain)}
              <span className="ml-1 text-[12px]">
                ({unrealizedGain >= 0 ? "+" : ""}
                {returnPct.toFixed(1)}%)
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Secondary metrics */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[#f2f2f7] px-3 py-2.5">
          <p className="text-[10px] text-[#8e8e93]">累計增值回饋分享金</p>
          <p className="mt-0.5 text-[13px] font-semibold text-[#1c1c1e]">
            {formatUSD(insurance.accumulatedBonus)}
          </p>
        </div>
        <div className="rounded-xl bg-[#f2f2f7] px-3 py-2.5">
          <p className="text-[10px] text-[#8e8e93]">累計增加保險金額</p>
          <p className="mt-0.5 text-[13px] font-semibold text-[#1c1c1e]">
            {formatUSD(insurance.accumulatedSumIncrease)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onUpdate}
          className="flex-1 rounded-xl bg-[#007aff] py-2.5 text-[14px] font-semibold text-white active:opacity-80"
        >
          更新數值
        </button>
        <button
          onClick={onViewDetail}
          className="flex-1 rounded-xl bg-[#f2f2f7] py-2.5 text-[14px] font-semibold text-[#1c1c1e] active:opacity-80"
        >
          明細
        </button>
      </div>

      {insurance.lastUpdatedAt && (
        <p className="mt-2 text-center text-[10px] text-[#c7c7cc]">
          最後更新：{new Date(insurance.lastUpdatedAt).toLocaleDateString("zh-TW")}
        </p>
      )}
    </div>
  );
}
