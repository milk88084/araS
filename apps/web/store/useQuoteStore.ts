"use client";

import { create } from "zustand";
import type { Quote } from "@repo/shared";
import { api } from "../lib/api-client";

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

export const useQuoteStore = create<QuoteState>((set) => ({
  quotes: {},
  loading: false,

  refreshQuotes: async (symbols) => {
    if (symbols.length === 0) return;
    set({ loading: true });

    const results = await Promise.allSettled(
      symbols.map((symbol) => api.get<Quote>(`/quotes/${symbol}`))
    );

    const newQuotes: Record<string, QuoteEntry> = {};
    results.forEach((result, i) => {
      const symbol = symbols[i];
      if (result.status === "fulfilled" && result.value.success && symbol) {
        const quote = result.value.data;
        newQuotes[symbol] = { price: quote.price, currency: quote.currency, updatedAt: new Date() };
      }
    });

    set((state) => ({ quotes: { ...state.quotes, ...newQuotes }, loading: false }));
  },
}));
