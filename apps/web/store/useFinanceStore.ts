"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Asset,
  Liability,
  Transaction,
  PortfolioItem,
  ValueSnapshot,
  CreateAsset,
  UpdateAsset,
  CreateLiability,
  UpdateLiability,
  CreateTransaction,
  CreatePortfolioItem,
} from "@repo/shared";

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

interface FinanceState {
  assets: Asset[];
  liabilities: Liability[];
  transactions: Transaction[];
  portfolio: PortfolioItem[];
  valueSnapshots: ValueSnapshot[];
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  addAsset: (data: CreateAsset) => Promise<void>;
  updateAsset: (id: string, data: UpdateAsset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addLiability: (data: CreateLiability) => Promise<void>;
  updateLiability: (id: string, data: UpdateLiability) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;
  addTransaction: (data: CreateTransaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addPortfolioItem: (data: CreatePortfolioItem) => Promise<void>;
  deletePortfolioItem: (id: string) => Promise<void>;
}

function makeSnapshot(assets: Asset[], liabilities: Liability[]): ValueSnapshot {
  return {
    id: uuid(),
    date: now(),
    totalAssets: assets.reduce((s, a) => s + a.value, 0),
    totalLiabilities: liabilities.reduce((s, l) => s + l.balance, 0),
  };
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      assets: [],
      liabilities: [],
      transactions: [],
      portfolio: [],
      valueSnapshots: [],
      loading: false,
      error: null,

      fetchAll: async () => {
        // 本地模式：資料已在 localStorage，無需 fetch
        // 若 valueSnapshots 尚無資料但已有資產/負債，補一筆初始快照
        set((s) => {
          if (s.valueSnapshots.length === 0 && (s.assets.length > 0 || s.liabilities.length > 0)) {
            return { valueSnapshots: [makeSnapshot(s.assets, s.liabilities)] };
          }
          return {};
        });
      },

      addAsset: async (data) => {
        const asset: Asset = {
          id: uuid(),
          name: data.name,
          category: data.category,
          value: data.value,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => {
          const newAssets = [asset, ...s.assets];
          return {
            assets: newAssets,
            valueSnapshots: [...s.valueSnapshots, makeSnapshot(newAssets, s.liabilities)],
          };
        });
      },

      updateAsset: async (id, data) => {
        set((s) => {
          const newAssets = s.assets.map((a) =>
            a.id === id
              ? {
                  ...a,
                  name: data.name ?? a.name,
                  category: data.category ?? a.category,
                  value: data.value ?? a.value,
                  updatedAt: now(),
                }
              : a
          );
          return {
            assets: newAssets,
            valueSnapshots: [...s.valueSnapshots, makeSnapshot(newAssets, s.liabilities)],
          };
        });
      },

      deleteAsset: async (id) => {
        set((s) => {
          const newAssets = s.assets.filter((a) => a.id !== id);
          return {
            assets: newAssets,
            valueSnapshots: [...s.valueSnapshots, makeSnapshot(newAssets, s.liabilities)],
          };
        });
      },

      addLiability: async (data) => {
        const liability: Liability = {
          id: uuid(),
          name: data.name,
          category: data.category,
          balance: data.balance,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => {
          const newLiabilities = [liability, ...s.liabilities];
          return {
            liabilities: newLiabilities,
            valueSnapshots: [...s.valueSnapshots, makeSnapshot(s.assets, newLiabilities)],
          };
        });
      },

      updateLiability: async (id, data) => {
        set((s) => {
          const newLiabilities = s.liabilities.map((l) =>
            l.id === id
              ? {
                  ...l,
                  name: data.name ?? l.name,
                  category: data.category ?? l.category,
                  balance: data.balance ?? l.balance,
                  updatedAt: now(),
                }
              : l
          );
          return {
            liabilities: newLiabilities,
            valueSnapshots: [...s.valueSnapshots, makeSnapshot(s.assets, newLiabilities)],
          };
        });
      },

      deleteLiability: async (id) => {
        set((s) => {
          const newLiabilities = s.liabilities.filter((l) => l.id !== id);
          return {
            liabilities: newLiabilities,
            valueSnapshots: [...s.valueSnapshots, makeSnapshot(s.assets, newLiabilities)],
          };
        });
      },

      addTransaction: async (data) => {
        const tx: Transaction = {
          id: uuid(),
          type: data.type,
          amount: data.amount,
          category: data.category,
          source: data.source,
          note: data.note ?? null,
          date: data.date,
          createdAt: now(),
        };
        set((s) => ({ transactions: [tx, ...s.transactions] }));
      },

      deleteTransaction: async (id) => {
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
      },

      addPortfolioItem: async (data) => {
        const item: PortfolioItem = {
          id: uuid(),
          symbol: data.symbol,
          name: data.name,
          avgCost: data.avgCost,
          shares: data.shares,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ portfolio: [item, ...s.portfolio] }));
      },

      deletePortfolioItem: async (id) => {
        set((s) => ({ portfolio: s.portfolio.filter((p) => p.id !== id) }));
      },
    }),
    {
      name: "finance-store",
    }
  )
);
