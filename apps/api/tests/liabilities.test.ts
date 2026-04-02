import { describe, it, expect, vi } from "vitest";
import { LiabilitiesService } from "../src/services/liabilities.service.js";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    liability: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "liability-1",
          name: "房貸",
          category: "房貸",
          balance: 8000000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      findUnique: vi.fn().mockResolvedValue({
        id: "liability-1",
        name: "房貸",
        category: "房貸",
        balance: 8000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      create: vi.fn().mockResolvedValue({
        id: "liability-1",
        name: "房貸",
        category: "房貸",
        balance: 8000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: vi.fn().mockResolvedValue({
        id: "liability-1",
        name: "房貸",
        category: "房貸",
        balance: 7900000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      delete: vi.fn().mockResolvedValue({
        id: "liability-1",
        name: "房貸",
        category: "房貸",
        balance: 8000000,
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

describe("LiabilitiesService", () => {
  const service = new LiabilitiesService();

  it("lists liabilities", async () => {
    const items = await service.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("房貸");
  });

  it("finds liability by id", async () => {
    const item = await service.findById("liability-1");
    expect(item?.id).toBe("liability-1");
  });

  it("creates a liability", async () => {
    const item = await service.create({ name: "房貸", category: "房貸", balance: 8000000 });
    expect(item.category).toBe("房貸");
  });

  it("updates a liability", async () => {
    const item = await service.update("liability-1", { balance: 7900000 });
    expect(item.balance).toBe(7900000);
  });

  it("deletes a liability", async () => {
    const result = await service.delete("liability-1");
    expect(result).toBeDefined();
  });
});
