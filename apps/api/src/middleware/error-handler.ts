import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { sendError } from "../lib/envelope.js";
import { logger } from "../lib/logger.js";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error({ err }, "Unhandled error");

  if (err instanceof ZodError) {
    sendError(res, "VALIDATION_ERROR", "Invalid request data", 400, err.flatten());
    return;
  }

  if (err.name === "UnauthorizedError" || err.message === "Unauthenticated") {
    sendError(res, "UNAUTHORIZED", "Authentication required", 401);
    return;
  }

  if (err.name === "NotFoundError") {
    sendError(res, "NOT_FOUND", err.message, 404);
    return;
  }

  sendError(
    res,
    "INTERNAL_ERROR",
    process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    500
  );
}

export function notFoundHandler(_req: Request, res: Response) {
  sendError(res, "NOT_FOUND", "Route not found", 404);
}
