"use client";

import { useEffect, useState } from "react";
import { useFinanceStore } from "../../../store/useFinanceStore";
import { DisposableBalanceHeader } from "../../../components/finance/DisposableBalanceHeader";
import { NetWorthCard } from "../../../components/finance/NetWorthCard";
import { QuickActionsGrid } from "../../../components/finance/QuickActionsGrid";
import { RecentTransactionsList } from "../../../components/finance/RecentTransactionsList";
import { TransactionBottomSheet } from "../../../components/finance/TransactionBottomSheet";

export default function DashboardPage() {
  const { fetchAll, assets, liabilities, transactions, loading } = useFinanceStore();
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const now = new Date();
  const currentMonthTx = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const monthlyIncome = currentMonthTx
    .filter((t) => t.type === "income" && t.source !== "excluded")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = currentMonthTx
    .filter((t) => t.type === "expense" && t.source !== "excluded")
    .reduce((sum, t) => sum + t.amount, 0);

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-gray-400">載入中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-6">
      <DisposableBalanceHeader amount={monthlyIncome - monthlyExpense} />
      <NetWorthCard
        netWorth={netWorth}
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
      />
      <QuickActionsGrid onRecordExpense={() => setShowSheet(true)} />
      <RecentTransactionsList transactions={recentTransactions} />
      <TransactionBottomSheet open={showSheet} onClose={() => setShowSheet(false)} />
    </div>
  );
}
