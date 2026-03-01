import rateLimit from "express-rate-limit";
import { env } from "../lib/env.js";
import { sendError } from "../lib/envelope.js";

export const apiRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, "RATE_LIMITED", "Too many requests, please try again later", 429);
  },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, "RATE_LIMITED", "Too many auth attempts, please try again later", 429);
  },
});
