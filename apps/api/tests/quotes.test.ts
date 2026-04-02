import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuotesService } from "../src/services/quotes.service.js";

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
  recordMetric: vi.fn(),
  getP95: vi.fn(() => 0),
  getErrorRate: vi.fn(() => 0),
  metricsState: { requestCount: 0, errorCount: 0, responseTimes: [] },
  checkAlerts: vi.fn(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("QuotesService", () => {
  const service = new QuotesService();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("fetches a valid quote", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        chart: {
          result: [{ meta: { regularMarketPrice: 193.5, currency: "TWD", symbol: "0050.TW" } }],
          error: null,
        },
      }),
    });

    const quote = await service.fetchQuote("0050.TW");
    expect(quote.symbol).toBe("0050.TW");
    expect(quote.price).toBe(193.5);
    expect(quote.currency).toBe("TWD");
  });

  it("throws when result is null", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chart: { result: null, error: "Not Found" } }),
    });
    await expect(service.fetchQuote("INVALID")).rejects.toThrow("No data found");
  });

  it("throws when API returns non-ok status", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(service.fetchQuote("0050.TW")).rejects.toThrow("Yahoo Finance returned 429");
  });
});
