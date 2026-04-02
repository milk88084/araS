import { formatCurrency } from "../../lib/format";

interface Props {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export function NetWorthCard({ netWorth, totalAssets, totalLiabilities }: Props) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-1 text-sm text-gray-500">資產負債概覽</p>
      <p className="mb-3 text-2xl font-bold text-gray-900">{formatCurrency(netWorth)}</p>
      <div className="flex gap-4 border-t border-gray-50 pt-3">
        <div className="flex-1">
          <p className="mb-0.5 text-xs text-gray-400">總資產</p>
          <p className="text-sm font-semibold text-green-700">{formatCurrency(totalAssets)}</p>
        </div>
        <div className="flex-1">
          <p className="mb-0.5 text-xs text-gray-400">總負債</p>
          <p className="text-sm font-semibold text-red-500">{formatCurrency(totalLiabilities)}</p>
        </div>
      </div>
    </div>
  );
}
