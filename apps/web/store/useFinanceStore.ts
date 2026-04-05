"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Asset,
  Liability,
  Transaction,
  PortfolioItem,
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

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      assets: [],
      liabilities: [],
      transactions: [],
      portfolio: [],
      loading: false,
      error: null,

      fetchAll: async () => {
        // 本地模式：資料已在 localStorage，無需 fetch
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
        set((s) => ({ assets: [asset, ...s.assets] }));
      },

      updateAsset: async (id, data) => {
        set((s) => ({
          assets: s.assets.map((a) =>
            a.id === id
              ? {
                  ...a,
                  name: data.name ?? a.name,
                  category: data.category ?? a.category,
                  value: data.value ?? a.value,
                  updatedAt: now(),
                }
              : a
          ),
        }));
      },

      deleteAsset: async (id) => {
        set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }));
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
        set((s) => ({ liabilities: [liability, ...s.liabilities] }));
      },

      updateLiability: async (id, data) => {
        set((s) => ({
          liabilities: s.liabilities.map((l) =>
            l.id === id
              ? {
                  ...l,
                  name: data.name ?? l.name,
                  category: data.category ?? l.category,
                  balance: data.balance ?? l.balance,
                  updatedAt: now(),
                }
              : l
          ),
        }));
      },

      deleteLiability: async (id) => {
        set((s) => ({ liabilities: s.liabilities.filter((l) => l.id !== id) }));
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
      name: "finance-store", // localStorage key
    }
  )
);
