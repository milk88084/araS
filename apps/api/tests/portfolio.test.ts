import { describe, it, expect, vi } from "vitest";
import { PortfolioService } from "../src/services/portfolio.service.js";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    portfolioItem: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "portfolio-1",
          symbol: "0050.TW",
          name: "元大台灣50",
          avgCost: 185.5,
          shares: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      findUnique: vi.fn().mockResolvedValue({
        id: "portfolio-1",
        symbol: "0050.TW",
        name: "元大台灣50",
        avgCost: 185.5,
        shares: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      create: vi.fn().mockResolvedValue({
        id: "portfolio-1",
        symbol: "0050.TW",
        name: "元大台灣50",
        avgCost: 185.5,
        shares: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: vi.fn().mockResolvedValue({
        id: "portfolio-1",
        symbol: "0050.TW",
        name: "元大台灣50",
        avgCost: 185.5,
        shares: 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      delete: vi.fn().mockResolvedValue({
        id: "portfolio-1",
        symbol: "0050.TW",
        name: "元大台灣50",
        avgCost: 185.5,
        shares: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
  },
}));

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
  recordMetric: vi.fn(),
  getP95: vi.fn(() => 0),
  getErrorRate: vi.fn(() => 0),
  metricsState: { requestCount: 0, errorCount: 0, responseTimes: [] },
  checkAlerts: vi.fn(),
}));

describe("PortfolioService", () => {
  const service = new PortfolioService();

  it("lists portfolio items", async () => {
    const items = await service.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.symbol).toBe("0050.TW");
  });

  it("finds item by id", async () => {
    const item = await service.findById("portfolio-1");
    expect(item?.id).toBe("portfolio-1");
  });

  it("creates a portfolio item", async () => {
    const item = await service.create({
      symbol: "0050.TW",
      name: "元大台灣50",
      avgCost: 185.5,
      shares: 100,
    });
    expect(item.symbol).toBe("0050.TW");
  });

  it("updates a portfolio item", async () => {
    const item = await service.update("portfolio-1", { shares: 150 });
    expect(item.shares).toBe(150);
  });

  it("deletes a portfolio item", async () => {
    const result = await service.delete("portfolio-1");
    expect(result).toBeDefined();
  });
});
