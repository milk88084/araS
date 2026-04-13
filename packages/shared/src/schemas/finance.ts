import { z } from "zod";

// EntryHistory
export const EntryHistorySchema = z.object({
  id: z.string(),
  entryId: z.string(),
  delta: z.number(),
  balance: z.number(),
  units: z.number().nullable().optional(),
  note: z.string().nullable(),
  createdAt: z.string(),
});
export type EntryHistory = z.infer<typeof EntryHistorySchema>;

// Entry (unified asset + liability)
export const EntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  topCategory: z.string(),
  subCategory: z.string(),
  stockCode: z.string().nullable().optional(),
  value: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Entry = z.infer<typeof EntrySchema>;

export const CreateEntrySchema = z.object({
  name: z.string().min(1, "名稱為必填"),
  topCategory: z.string().min(1, "大類為必填"),
  subCategory: z.string().min(1, "子類別為必填"),
  stockCode: z.string().optional(),
  units: z.number().optional(),
  value: z.number().positive("金額必須大於 0"),
});
export type CreateEntry = z.infer<typeof CreateEntrySchema>;

export const UpdateEntrySchema = CreateEntrySchema.partial();
export type UpdateEntry = z.infer<typeof UpdateEntrySchema>;

// Transaction
export const TransactionTypeSchema = z.enum(["income", "expense"]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export const TransactionSourceSchema = z.enum(["daily", "emergency", "excluded"]);
export type TransactionSource = z.infer<typeof TransactionSourceSchema>;

export const TransactionSchema = z.object({
  id: z.string(),
  type: TransactionTypeSchema,
  amount: z.number(),
  category: z.string(),
  source: TransactionSourceSchema,
  note: z.string().nullable(),
  date: z.string(),
  createdAt: z.string(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const CreateTransactionSchema = z.object({
  type: TransactionTypeSchema,
  amount: z.number().positive("金額必須大於 0"),
  category: z.string().min(1, "類別為必填"),
  source: TransactionSourceSchema,
  note: z.string().optional(),
  date: z.string(),
});
export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;

// Portfolio
export const PortfolioItemSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  avgCost: z.number(),
  shares: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PortfolioItem = z.infer<typeof PortfolioItemSchema>;

export const CreatePortfolioItemSchema = z.object({
  symbol: z.string().min(1, "代號為必填"),
  name: z.string().min(1, "名稱為必填"),
  avgCost: z.number().positive("成本必須大於 0"),
  shares: z.number().positive("股數必須大於 0"),
});
export type CreatePortfolioItem = z.infer<typeof CreatePortfolioItemSchema>;

export const UpdatePortfolioItemSchema = CreatePortfolioItemSchema.partial();
export type UpdatePortfolioItem = z.infer<typeof UpdatePortfolioItemSchema>;

// Quote
export const QuoteSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  currency: z.string(),
});
export type Quote = z.infer<typeof QuoteSchema>;

// ValueSnapshot — auto-recorded on every asset/liability mutation
export const ValueSnapshotSchema = z.object({
  id: z.string(),
  date: z.string(), // ISO string, e.g. "2026-04-08T10:00:00.000Z"
  totalAssets: z.number(),
  totalLiabilities: z.number(),
});
export type ValueSnapshot = z.infer<typeof ValueSnapshotSchema>;
