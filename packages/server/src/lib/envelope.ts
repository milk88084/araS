import type { Response } from "express";
import type { ApiSuccess, ApiError, PaginationMeta } from "@repo/shared";

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: PaginationMeta
): void {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown
): void {
  const error: { code: string; message: string; details?: unknown } = { code, message };
  if (details !== undefined) error.details = details;
  const body: ApiError = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(body);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
): void {
  const meta: PaginationMeta = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
  sendSuccess(res, data, 200, meta);
}
