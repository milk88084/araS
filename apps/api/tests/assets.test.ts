import { describe, it, expect, vi } from "vitest";
import { AssetsService } from "../src/services/assets.service.js";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    asset: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "asset-1",
          name: "台北自住房",
          category: "不動產",
          value: 15000000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      findUnique: vi.fn().mockResolvedValue({
        id: "asset-1",
        name: "台北自住房",
        category: "不動產",
        value: 15000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      create: vi.fn().mockResolvedValue({
        id: "asset-1",
        name: "台北自住房",
        category: "不動產",
        value: 15000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: vi.fn().mockResolvedValue({
        id: "asset-1",
        name: "台北自住房",
        category: "不動產",
        value: 16000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      delete: vi.fn().mockResolvedValue({
        id: "asset-1",
        name: "台北自住房",
        category: "不動產",
        value: 15000000,
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

describe("AssetsService", () => {
  const service = new AssetsService();

  it("lists assets", async () => {
    const assets = await service.list();
    expect(assets).toHaveLength(1);
    expect(assets[0]?.name).toBe("台北自住房");
  });

  it("finds asset by id", async () => {
    const asset = await service.findById("asset-1");
    expect(asset?.id).toBe("asset-1");
  });

  it("creates an asset", async () => {
    const asset = await service.create({ name: "台北自住房", category: "不動產", value: 15000000 });
    expect(asset.category).toBe("不動產");
  });

  it("updates an asset", async () => {
    const asset = await service.update("asset-1", { value: 16000000 });
    expect(asset.value).toBe(16000000);
  });

  it("deletes an asset", async () => {
    const result = await service.delete("asset-1");
    expect(result).toBeDefined();
  });
});
