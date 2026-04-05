"use client";

import { create } from "zustand";

interface QuoteEntry {
  price: number;
  currency: string;
  updatedAt: Date;
}

interface QuoteState {
  quotes: Record<string, QuoteEntry>;
  loading: boolean;
  refreshQuotes: (symbols: string[]) => Promise<void>;
}

export const useQuoteStore = create<QuoteState>(() => ({
  quotes: {},
  loading: false,

  refreshQuotes: async (_symbols) => {
    // 本地模式：無 API，不取報價
  },
}));
