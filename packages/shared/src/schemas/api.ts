import { z } from "zod";

export const PaginationMeta = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export type PaginationMeta = z.infer<typeof PaginationMeta>;

export const ApiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: PaginationMeta.optional(),
    timestamp: z.string(),
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  timestamp: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
