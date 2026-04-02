import express from "express";
import { securityHeaders, corsMiddleware } from "./middleware/security.js";
import { apiRateLimit } from "./middleware/rate-limit.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import routes from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(metricsMiddleware);
  app.use("/api", apiRateLimit);

  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
