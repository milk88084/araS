import { formatCurrency } from "../../lib/format";

interface Props {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export function NetWorthCard({ netWorth, totalAssets, totalLiabilities }: Props) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-1 text-[13px] text-[#8e8e93]">資產淨值</p>
      <p className="mb-4 text-[24px] font-bold text-[#1c1c1e]">{formatCurrency(netWorth)}</p>
      <div className="flex gap-4 border-t border-[#f2f2f7] pt-3">
        <div className="flex-1">
          <p className="mb-0.5 text-xs text-[#8e8e93]">總資產</p>
          <p className="text-sm font-semibold text-[#34c759]">{formatCurrency(totalAssets)}</p>
        </div>
        <div className="h-auto w-px bg-[#e5e5ea]" />
        <div className="flex-1">
          <p className="mb-0.5 text-xs text-[#8e8e93]">總負債</p>
          <p className="text-sm font-semibold text-[#ff3b30]">{formatCurrency(totalLiabilities)}</p>
        </div>
      </div>
    </div>
  );
}
