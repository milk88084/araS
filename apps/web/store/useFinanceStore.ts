"use client";

import { create } from "zustand";
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
import { api } from "../lib/api-client";

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

export const useFinanceStore = create<FinanceState>((set) => ({
  assets: [],
  liabilities: [],
  transactions: [],
  portfolio: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [assetsRes, liabilitiesRes, transactionsRes, portfolioRes] = await Promise.all([
        api.get<Asset[]>("/assets"),
        api.get<Liability[]>("/liabilities"),
        api.get<Transaction[]>("/transactions"),
        api.get<PortfolioItem[]>("/portfolio"),
      ]);
      set({
        assets: assetsRes.success ? assetsRes.data : [],
        liabilities: liabilitiesRes.success ? liabilitiesRes.data : [],
        transactions: transactionsRes.success ? transactionsRes.data : [],
        portfolio: portfolioRes.success ? portfolioRes.data : [],
        loading: false,
      });
    } catch {
      set({ error: "無法載入資料，請稍後再試", loading: false });
    }
  },

  addAsset: async (data) => {
    const res = await api.post<Asset>("/assets", data);
    if (res.success) set((state) => ({ assets: [res.data, ...state.assets] }));
  },

  updateAsset: async (id, data) => {
    const res = await api.put<Asset>(`/assets/${id}`, data);
    if (res.success)
      set((state) => ({ assets: state.assets.map((a) => (a.id === id ? res.data : a)) }));
  },

  deleteAsset: async (id) => {
    const res = await api.delete(`/assets/${id}`);
    if (res.success) set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }));
  },

  addLiability: async (data) => {
    const res = await api.post<Liability>("/liabilities", data);
    if (res.success) set((state) => ({ liabilities: [res.data, ...state.liabilities] }));
  },

  updateLiability: async (id, data) => {
    const res = await api.put<Liability>(`/liabilities/${id}`, data);
    if (res.success)
      set((state) => ({
        liabilities: state.liabilities.map((l) => (l.id === id ? res.data : l)),
      }));
  },

  deleteLiability: async (id) => {
    const res = await api.delete(`/liabilities/${id}`);
    if (res.success)
      set((state) => ({ liabilities: state.liabilities.filter((l) => l.id !== id) }));
  },

  addTransaction: async (data) => {
    const res = await api.post<Transaction>("/transactions", data);
    if (res.success) set((state) => ({ transactions: [res.data, ...state.transactions] }));
  },

  deleteTransaction: async (id) => {
    const res = await api.delete(`/transactions/${id}`);
    if (res.success)
      set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
  },

  addPortfolioItem: async (data) => {
    const res = await api.post<PortfolioItem>("/portfolio", data);
    if (res.success) set((state) => ({ portfolio: [res.data, ...state.portfolio] }));
  },

  deletePortfolioItem: async (id) => {
    const res = await api.delete(`/portfolio/${id}`);
    if (res.success) set((state) => ({ portfolio: state.portfolio.filter((p) => p.id !== id) }));
  },
}));
