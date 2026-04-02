"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import type { PortfolioItem } from "@repo/shared";
import { useQuoteStore } from "../../store/useQuoteStore";
import { formatCurrency, formatPercent } from "../../lib/format";
import { AddPortfolioItemModal } from "./AddPortfolioItemModal";

interface Props {
  portfolio: PortfolioItem[];
}

export function PortfolioSection({ portfolio }: Props) {
  const { quotes, loading, refreshQuotes } = useQuoteStore();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (portfolio.length > 0) refreshQuotes(portfolio.map((p) => p.symbol));
  }, [portfolio, refreshQuotes]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">投資組合</p>
        <div className="flex gap-1">
          <button
            onClick={() => portfolio.length > 0 && refreshQuotes(portfolio.map((p) => p.symbol))}
            disabled={loading}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
          >
            <RefreshCw size={14} className={`text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowAdd(true)} className="rounded-lg p-1.5 hover:bg-gray-100">
            <Plus size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {portfolio.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            <p>尚無投資項目</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-2 text-sm font-medium text-gray-700 underline"
            >
              新增第一筆
            </button>
          </div>
        ) : (
          <ul>
            {portfolio.map((item, i) => {
              const quote = quotes[item.symbol];
              const cost = item.avgCost * item.shares;
              const marketValue = quote ? quote.price * item.shares : null;
              const unrealizedPL = marketValue !== null ? marketValue - cost : null;
              const returnRate = unrealizedPL !== null ? (unrealizedPL / cost) * 100 : null;
              const isGain = returnRate !== null && returnRate >= 0;

              return (
                <li
                  key={item.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i !== portfolio.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{item.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">
                      {quote ? formatCurrency(quote.price, quote.currency) : "—"}
                    </p>
                    {unrealizedPL !== null && returnRate !== null ? (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                          isGain ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                        }`}
                      >
                        {formatPercent(returnRate)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">載入中</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AddPortfolioItemModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
