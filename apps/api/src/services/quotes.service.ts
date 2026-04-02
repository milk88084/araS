import type { Quote } from "@repo/shared";

interface YahooChartMeta {
  regularMarketPrice: number;
  currency: string;
  symbol: string;
}

interface YahooChartResponse {
  chart: {
    result: Array<{ meta: YahooChartMeta }> | null;
    error: unknown;
  };
}

export class QuotesService {
  async fetchQuote(symbol: string): Promise<Quote> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status} for ${symbol}`);
    }

    const data = (await response.json()) as YahooChartResponse;
    const result = data?.chart?.result?.[0];

    if (!result) {
      throw new Error(`No data found for symbol ${symbol}`);
    }

    return {
      symbol,
      price: result.meta.regularMarketPrice,
      currency: result.meta.currency,
    };
  }
}

export const quotesService = new QuotesService();
