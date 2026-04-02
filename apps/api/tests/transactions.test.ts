import { describe, it, expect, vi } from "vitest";
import { TransactionsService } from "../src/services/transactions.service.js";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    transaction: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "tx-1",
          type: "expense",
          amount: 350,
          category: "餐飲",
          source: "daily",
          note: "午餐",
          date: new Date("2026-04-01"),
          createdAt: new Date(),
        },
      ]),
      create: vi.fn().mockResolvedValue({
        id: "tx-1",
        type: "expense",
        amount: 350,
        category: "餐飲",
        source: "daily",
        note: "午餐",
        date: new Date("2026-04-01"),
        createdAt: new Date(),
      }),
      delete: vi.fn().mockResolvedValue({
        id: "tx-1",
        type: "expense",
        amount: 350,
        category: "餐飲",
        source: "daily",
        note: "午餐",
        date: new Date("2026-04-01"),
        createdAt: new Date(),
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

describe("TransactionsService", () => {
  const service = new TransactionsService();

  it("lists all transactions without month filter", async () => {
    const items = await service.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.category).toBe("餐飲");
  });

  it("lists transactions with month filter", async () => {
    const items = await service.list("2026-04");
    expect(items).toHaveLength(1);
  });

  it("creates a transaction", async () => {
    const item = await service.create({
      type: "expense",
      amount: 350,
      category: "餐飲",
      source: "daily",
      date: "2026-04-01",
    });
    expect(item.type).toBe("expense");
  });

  it("deletes a transaction", async () => {
    const result = await service.delete("tx-1");
    expect(result).toBeDefined();
  });
});
