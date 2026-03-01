import type { Request, Response, NextFunction } from "express";
import { recordMetric, checkAlerts, logger } from "../lib/logger.js";

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const isError = res.statusCode >= 400;

    recordMetric(duration, isError);

    logger.info({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
    });

    if (isError) {
      checkAlerts();
    }
  });

  next();
}
