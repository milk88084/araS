import { Router } from "express";
import { sendSuccess } from "../lib/envelope.js";
import { prisma } from "../lib/prisma.js";
import { getP95, getErrorRate, metricsState } from "../lib/logger.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    sendSuccess(res, {
      status: "healthy",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      metrics: {
        requestCount: metricsState.requestCount,
        errorRate: getErrorRate(),
        p95: getP95(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
