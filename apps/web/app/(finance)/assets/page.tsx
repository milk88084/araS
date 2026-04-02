"use client";

import { useEffect, useState } from "react";
import { useFinanceStore } from "../../../store/useFinanceStore";
import { formatCurrency } from "../../../lib/format";
import { AssetCategoryList } from "../../../components/finance/AssetCategoryList";
import { LiabilityCategoryList } from "../../../components/finance/LiabilityCategoryList";
import { PortfolioSection } from "../../../components/finance/PortfolioSection";

type Tab = "assets" | "liabilities";

export default function AssetsPage() {
  const { fetchAll, assets, liabilities, portfolio, loading } = useFinanceStore();
  const [tab, setTab] = useState<Tab>("assets");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="space-y-4 px-4 pt-6">
      <div>
        <p className="mb-1 text-sm text-gray-500">淨資產</p>
        <p className="text-4xl font-bold text-gray-900">{formatCurrency(netWorth)}</p>
      </div>

      <div className="flex rounded-xl bg-gray-100 p-1">
        {(["assets", "liabilities"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {t === "assets"
              ? `資產 ${formatCurrency(totalAssets)}`
              : `負債 ${formatCurrency(totalLiabilities)}`}
          </button>
        ))}
      </div>

      {tab === "assets" && (
        <>
          <AssetCategoryList assets={assets} loading={loading} />
          <PortfolioSection portfolio={portfolio} />
        </>
      )}

      {tab === "liabilities" && (
        <LiabilityCategoryList liabilities={liabilities} loading={loading} />
      )}
    </div>
  );
}
