import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import express from "express";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock("../src/lib/env.js", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 3001,
    DATABASE_URL: "postgresql://test:test@localhost:5434/test",
    CORS_ORIGIN: "http://localhost:3000",
    LOG_LEVEL: "silent",
    RATE_LIMIT_MAX: 100,
    RATE_LIMIT_WINDOW_MS: 60000,
  },
}));

describe("GET /api/health", () => {
  let app: express.Express;

  beforeAll(async () => {
    const healthRoutes = await import("../src/routes/health.js");
    app = express();
    app.use("/api/health", healthRoutes.default);
  });

  it("returns healthy status", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("healthy");
    expect(res.body.data).toHaveProperty("uptime");
    expect(res.body.data).toHaveProperty("timestamp");
    expect(res.body.data).toHaveProperty("metrics");
  });

  it("returns REST envelope format", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body).toHaveProperty("success");
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("timestamp");
  });
});
