import { z } from "zod";

// Asset
export const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  value: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Asset = z.infer<typeof AssetSchema>;

export const CreateAssetSchema = z.object({
  name: z.string().min(1, "名稱為必填"),
  category: z.string().min(1, "類別為必填"),
  value: z.number().positive("金額必須大於 0"),
});
export type CreateAsset = z.infer<typeof CreateAssetSchema>;

export const UpdateAssetSchema = CreateAssetSchema.partial();
export type UpdateAsset = z.infer<typeof UpdateAssetSchema>;

// Liability
export const LiabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  balance: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Liability = z.infer<typeof LiabilitySchema>;

export const CreateLiabilitySchema = z.object({
  name: z.string().min(1, "名稱為必填"),
  category: z.string().min(1, "類別為必填"),
  balance: z.number().positive("金額必須大於 0"),
});
export type CreateLiability = z.infer<typeof CreateLiabilitySchema>;

export const UpdateLiabilitySchema = CreateLiabilitySchema.partial();
export type UpdateLiability = z.infer<typeof UpdateLiabilitySchema>;

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
