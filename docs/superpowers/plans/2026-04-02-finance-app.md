# Finance App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing Next.js + Express template into a mobile-first personal finance management app with asset/liability tracking, transaction recording, stock portfolio P/L, and PWA support.

**Architecture:** Keep the Turborepo monorepo (apps/web + apps/api). Strip out Clerk auth and Posts entirely. Replace with 4 Prisma models (Asset, Liability, Transaction, PortfolioItem), a 15-endpoint REST API, and a Next.js App Router frontend using Zustand for state.

**Tech Stack:** Next.js 15, Express 4, Prisma 6, PostgreSQL, Zustand, Lucide React, Tailwind CSS 4, @ducanh2912/next-pwa

---

## File Map

**Delete:**

- `apps/api/src/middleware/auth.ts`
- `apps/api/src/controllers/auth.controller.ts`
- `apps/api/src/services/auth.service.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/controllers/posts.controller.ts`
- `apps/api/src/services/posts.service.ts`
- `apps/api/src/routes/posts.ts`
- `apps/api/tests/posts.test.ts`
- `apps/web/middleware.ts`
- `apps/web/lib/clerk.ts`
- `apps/web/components/layout/header.tsx`
- `apps/web/components/layout/footer.tsx`
- `apps/web/app/(dashboard)/` (entire directory)
- `packages/shared/src/schemas/user.ts`
- `packages/shared/src/schemas/post.ts`

**Modify:**

- `apps/api/package.json`
- `apps/api/src/app.ts`
- `apps/api/src/lib/env.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/tests/health.test.ts`
- `packages/shared/src/schemas/index.ts`
- `apps/web/package.json`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/lib/api-client.ts`
- `apps/web/next.config.ts`

**Create:**

- `apps/api/src/services/assets.service.ts`
- `apps/api/src/controllers/assets.controller.ts`
- `apps/api/src/services/liabilities.service.ts`
- `apps/api/src/controllers/liabilities.controller.ts`
- `apps/api/src/services/transactions.service.ts`
- `apps/api/src/controllers/transactions.controller.ts`
- `apps/api/src/services/portfolio.service.ts`
- `apps/api/src/controllers/portfolio.controller.ts`
- `apps/api/src/services/quotes.service.ts`
- `apps/api/src/controllers/quotes.controller.ts`
- `apps/api/src/routes/finance.ts`
- `apps/api/tests/assets.test.ts`
- `apps/api/tests/liabilities.test.ts`
- `apps/api/tests/transactions.test.ts`
- `apps/api/tests/portfolio.test.ts`
- `apps/api/tests/quotes.test.ts`
- `packages/shared/src/schemas/finance.ts`
- `apps/web/store/useFinanceStore.ts`
- `apps/web/store/useQuoteStore.ts`
- `apps/web/lib/format.ts`
- `apps/web/components/layout/BottomNav.tsx`
- `apps/web/app/(finance)/layout.tsx`
- `apps/web/app/(finance)/dashboard/page.tsx`
- `apps/web/app/(finance)/assets/page.tsx`
- `apps/web/app/(finance)/transactions/page.tsx`
- `apps/web/app/(finance)/insurance/page.tsx`
- `apps/web/app/(finance)/more/page.tsx`
- `apps/web/components/finance/DisposableBalanceHeader.tsx`
- `apps/web/components/finance/NetWorthCard.tsx`
- `apps/web/components/finance/QuickActionsGrid.tsx`
- `apps/web/components/finance/RecentTransactionsList.tsx`
- `apps/web/components/finance/TransactionBottomSheet.tsx`
- `apps/web/components/finance/AssetCategoryList.tsx`
- `apps/web/components/finance/LiabilityCategoryList.tsx`
- `apps/web/components/finance/PortfolioSection.tsx`
- `apps/web/components/finance/AddPortfolioItemModal.tsx`
- `apps/web/scripts/gen-icons.mjs`
- `public/manifest.json`

---

## Task 1: Strip Clerk from the API

**Files:**

- Delete: `apps/api/src/middleware/auth.ts`
- Delete: `apps/api/src/controllers/auth.controller.ts`
- Delete: `apps/api/src/services/auth.service.ts`
- Delete: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/lib/env.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Remove @clerk/express dependency**

```bash
pnpm --filter @repo/api remove @clerk/express
```

Expected: package removed, no errors

- [ ] **Step 2: Delete Clerk-related source files**

```bash
rm apps/api/src/middleware/auth.ts
rm apps/api/src/controllers/auth.controller.ts
rm apps/api/src/services/auth.service.ts
rm apps/api/src/routes/auth.ts
```

- [ ] **Step 3: Rewrite `apps/api/src/app.ts`** (remove clerkAuth import and usage)

```typescript
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
```

- [ ] **Step 4: Rewrite `apps/api/src/lib/env.ts`** (remove Clerk env vars)

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return result.data;
}

export const env = validateEnv();
```

- [ ] **Step 5: Update `apps/api/tests/health.test.ts`** (remove Clerk vars from env mock)

```typescript
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
```

- [ ] **Step 6: Run health tests to confirm no Clerk import errors**

```bash
pnpm --filter @repo/api test -- apps/api/tests/health.test.ts
```

Expected: 2 tests pass

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/app.ts apps/api/src/lib/env.ts apps/api/tests/health.test.ts apps/api/package.json
git commit -m "chore: remove clerk auth from api"
```

---

## Task 2: Strip Posts from the API

**Files:**

- Delete: `apps/api/src/controllers/posts.controller.ts`
- Delete: `apps/api/src/services/posts.service.ts`
- Delete: `apps/api/src/routes/posts.ts`
- Delete: `apps/api/tests/posts.test.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Delete Posts files**

```bash
rm apps/api/src/controllers/posts.controller.ts
rm apps/api/src/services/posts.service.ts
rm apps/api/src/routes/posts.ts
rm apps/api/tests/posts.test.ts
```

- [ ] **Step 2: Rewrite `apps/api/src/routes/index.ts`**

```typescript
import { Router } from "express";
import healthRoutes from "./health.js";

const router = Router();

router.use("/health", healthRoutes);

export default router;
```

- [ ] **Step 3: Verify API compiles**

```bash
pnpm --filter @repo/api type-check
```

Expected: no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/index.ts
git commit -m "chore: remove posts from api"
```

---

## Task 3: Strip Clerk and Posts from the Web app

**Files:**

- Delete: `apps/web/middleware.ts`
- Delete: `apps/web/lib/clerk.ts`
- Delete: `apps/web/components/layout/header.tsx`
- Delete: `apps/web/components/layout/footer.tsx`
- Delete: `apps/web/app/(dashboard)/` (directory)
- Modify: `apps/web/package.json` (remove @clerk/nextjs)

- [ ] **Step 1: Remove @clerk/nextjs dependency**

```bash
pnpm --filter @repo/web remove @clerk/nextjs
```

Expected: package removed

- [ ] **Step 2: Delete Clerk + Posts web files**

```bash
rm apps/web/middleware.ts
rm apps/web/lib/clerk.ts
rm apps/web/components/layout/header.tsx
rm apps/web/components/layout/footer.tsx
rm -rf "apps/web/app/(dashboard)"
```

- [ ] **Step 3: Replace `apps/web/app/layout.tsx`** (remove ClerkProvider)

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "財務管家",
  description: "個人財務管理工具",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Replace `apps/web/app/page.tsx`** (redirect to dashboard)

```typescript
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
```

- [ ] **Step 5: Verify web compiles**

```bash
pnpm --filter @repo/web type-check
```

Expected: no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/app/page.tsx apps/web/package.json
git commit -m "chore: remove clerk and posts from web"
```

---

## Task 4: Replace shared schemas

**Files:**

- Delete: `packages/shared/src/schemas/user.ts`
- Delete: `packages/shared/src/schemas/post.ts`
- Create: `packages/shared/src/schemas/finance.ts`
- Modify: `packages/shared/src/schemas/index.ts`

- [ ] **Step 1: Delete old schemas**

```bash
rm packages/shared/src/schemas/user.ts
rm packages/shared/src/schemas/post.ts
```

- [ ] **Step 2: Create `packages/shared/src/schemas/finance.ts`**

```typescript
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
```

- [ ] **Step 3: Rewrite `packages/shared/src/schemas/index.ts`**

```typescript
export * from "./api";
export * from "./finance";
```

- [ ] **Step 4: Verify shared package compiles**

```bash
pnpm --filter @repo/shared type-check
```

Expected: no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/
git commit -m "feat(shared): replace user/post schemas with finance schemas"
```

---

## Task 5: Update Prisma schema and migrate

**Files:**

- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Rewrite `apps/api/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Asset {
  id        String   @id @default(cuid())
  name      String
  category  String
  value     Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Liability {
  id        String   @id @default(cuid())
  name      String
  category  String
  balance   Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Transaction {
  id        String   @id @default(cuid())
  type      String
  amount    Float
  category  String
  source    String
  note      String?
  date      DateTime
  createdAt DateTime @default(now())

  @@index([date])
}

model PortfolioItem {
  id        String   @id @default(cuid())
  symbol    String   @unique
  name      String
  avgCost   Float
  shares    Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Make sure Docker DB is running**

```bash
pnpm docker:up
```

Expected: PostgreSQL running on port 5434

- [ ] **Step 3: Run migration**

```bash
pnpm db:migrate
```

When prompted for migration name, enter: `replace_with_finance_models`

Expected: Migration created and applied successfully

- [ ] **Step 4: Regenerate Prisma client**

```bash
pnpm db:generate
```

Expected: Prisma client regenerated

- [ ] **Step 5: Verify API still type-checks**

```bash
pnpm --filter @repo/api type-check
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat(db): replace user/post models with finance models"
```

---

## Task 6: Assets service, controller, and tests

**Files:**

- Create: `apps/api/src/services/assets.service.ts`
- Create: `apps/api/src/controllers/assets.controller.ts`
- Create: `apps/api/tests/assets.test.ts`

- [ ] **Step 1: Write failing test — `apps/api/tests/assets.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { AssetsService } from "../src/services/assets.service.js";

const mockAsset = {
  id: "asset-1",
  name: "台北自住房",
  category: "不動產",
  value: 15000000,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    asset: {
      findMany: vi.fn().mockResolvedValue([mockAsset]),
      findUnique: vi.fn().mockResolvedValue(mockAsset),
      create: vi.fn().mockResolvedValue(mockAsset),
      update: vi.fn().mockResolvedValue({ ...mockAsset, value: 16000000 }),
      delete: vi.fn().mockResolvedValue(mockAsset),
    },
  },
}));

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
  recordMetric: vi.fn(),
  getP95: vi.fn(() => 0),
  getErrorRate: vi.fn(() => 0),
  metricsState: { requestCount: 0, errorCount: 0, responseTimes: [] },
  checkAlerts: vi.fn(),
}));

describe("AssetsService", () => {
  const service = new AssetsService();

  it("lists assets", async () => {
    const assets = await service.list();
    expect(assets).toHaveLength(1);
    expect(assets[0]?.name).toBe("台北自住房");
  });

  it("finds asset by id", async () => {
    const asset = await service.findById("asset-1");
    expect(asset).toBeDefined();
    expect(asset?.id).toBe("asset-1");
  });

  it("creates an asset", async () => {
    const asset = await service.create({ name: "台北自住房", category: "不動產", value: 15000000 });
    expect(asset.category).toBe("不動產");
  });

  it("updates an asset", async () => {
    const asset = await service.update("asset-1", { value: 16000000 });
    expect(asset.value).toBe(16000000);
  });

  it("deletes an asset", async () => {
    const result = await service.delete("asset-1");
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails (service not yet created)**

```bash
pnpm --filter @repo/api test -- apps/api/tests/assets.test.ts
```

Expected: FAIL — "Cannot find module '../src/services/assets.service.js'"

- [ ] **Step 3: Create `apps/api/src/services/assets.service.ts`**

```typescript
import { prisma } from "../lib/prisma.js";
import type { CreateAsset, UpdateAsset } from "@repo/shared";

export class AssetsService {
  async list() {
    return prisma.asset.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string) {
    return prisma.asset.findUnique({ where: { id } });
  }

  async create(data: CreateAsset) {
    return prisma.asset.create({ data });
  }

  async update(id: string, data: UpdateAsset) {
    return prisma.asset.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.asset.delete({ where: { id } });
  }
}

export const assetsService = new AssetsService();
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter @repo/api test -- apps/api/tests/assets.test.ts
```

Expected: 5 tests pass

- [ ] **Step 5: Create `apps/api/src/controllers/assets.controller.ts`**

```typescript
import type { Request, Response, NextFunction } from "express";
import { CreateAssetSchema, UpdateAssetSchema } from "@repo/shared";
import { assetsService } from "../services/assets.service.js";
import { sendSuccess, sendError } from "../lib/envelope.js";

export class AssetsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const assets = await assetsService.list();
      sendSuccess(res, assets);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreateAssetSchema.parse(req.body);
      const asset = await assetsService.create(data);
      sendSuccess(res, asset, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const existing = await assetsService.findById(id);
      if (!existing) {
        sendError(res, "NOT_FOUND", "Asset not found", 404);
        return;
      }
      const data = UpdateAssetSchema.parse(req.body);
      const asset = await assetsService.update(id, data);
      sendSuccess(res, asset);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const existing = await assetsService.findById(id);
      if (!existing) {
        sendError(res, "NOT_FOUND", "Asset not found", 404);
        return;
      }
      await assetsService.delete(id);
      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  }
}

export const assetsController = new AssetsController();
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/assets.service.ts apps/api/src/controllers/assets.controller.ts apps/api/tests/assets.test.ts
git commit -m "feat(api): add assets service and controller"
```

---

## Task 7: Liabilities service, controller, and tests

**Files:**

- Create: `apps/api/src/services/liabilities.service.ts`
- Create: `apps/api/src/controllers/liabilities.controller.ts`
- Create: `apps/api/tests/liabilities.test.ts`

- [ ] **Step 1: Write failing test — `apps/api/tests/liabilities.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { LiabilitiesService } from "../src/services/liabilities.service.js";

const mockLiability = {
  id: "liability-1",
  name: "房貸",
  category: "房貸",
  balance: 8000000,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    liability: {
      findMany: vi.fn().mockResolvedValue([mockLiability]),
      findUnique: vi.fn().mockResolvedValue(mockLiability),
      create: vi.fn().mockResolvedValue(mockLiability),
      update: vi.fn().mockResolvedValue({ ...mockLiability, balance: 7900000 }),
      delete: vi.fn().mockResolvedValue(mockLiability),
    },
  },
}));

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
  recordMetric: vi.fn(),
  getP95: vi.fn(() => 0),
  getErrorRate: vi.fn(() => 0),
  metricsState: { requestCount: 0, errorCount: 0, responseTimes: [] },
  checkAlerts: vi.fn(),
}));

describe("LiabilitiesService", () => {
  const service = new LiabilitiesService();

  it("lists liabilities", async () => {
    const items = await service.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("房貸");
  });

  it("finds liability by id", async () => {
    const item = await service.findById("liability-1");
    expect(item?.id).toBe("liability-1");
  });

  it("creates a liability", async () => {
    const item = await service.create({ name: "房貸", category: "房貸", balance: 8000000 });
    expect(item.category).toBe("房貸");
  });

  it("updates a liability", async () => {
    const item = await service.update("liability-1", { balance: 7900000 });
    expect(item.balance).toBe(7900000);
  });

  it("deletes a liability", async () => {
    const result = await service.delete("liability-1");
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @repo/api test -- apps/api/tests/liabilities.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `apps/api/src/services/liabilities.service.ts`**

```typescript
import { prisma } from "../lib/prisma.js";
import type { CreateLiability, UpdateLiability } from "@repo/shared";

export class LiabilitiesService {
  async list() {
    return prisma.liability.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string) {
    return prisma.liability.findUnique({ where: { id } });
  }

  async create(data: CreateLiability) {
    return prisma.liability.create({ data });
  }

  async update(id: string, data: UpdateLiability) {
    return prisma.liability.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.liability.delete({ where: { id } });
  }
}

export const liabilitiesService = new LiabilitiesService();
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter @repo/api test -- apps/api/tests/liabilities.test.ts
```

Expected: 5 tests pass

- [ ] **Step 5: Create `apps/api/src/controllers/liabilities.controller.ts`**

```typescript
import type { Request, Response, NextFunction } from "express";
import { CreateLiabilitySchema, UpdateLiabilitySchema } from "@repo/shared";
import { liabilitiesService } from "../services/liabilities.service.js";
import { sendSuccess, sendError } from "../lib/envelope.js";

export class LiabilitiesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await liabilitiesService.list();
      sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreateLiabilitySchema.parse(req.body);
      const item = await liabilitiesService.create(data);
      sendSuccess(res, item, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const existing = await liabilitiesService.findById(id);
      if (!existing) {
        sendError(res, "NOT_FOUND", "Liability not found", 404);
        return;
      }
      const data = UpdateLiabilitySchema.parse(req.body);
      const item = await liabilitiesService.update(id, data);
      sendSuccess(res, item);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const existing = await liabilitiesService.findById(id);
      if (!existing) {
        sendError(res, "NOT_FOUND", "Liability not found", 404);
        return;
      }
      await liabilitiesService.delete(id);
      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  }
}

export const liabilitiesController = new LiabilitiesController();
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/liabilities.service.ts apps/api/src/controllers/liabilities.controller.ts apps/api/tests/liabilities.test.ts
git commit -m "feat(api): add liabilities service and controller"
```

---

## Task 8: Transactions service, controller, and tests

**Files:**

- Create: `apps/api/src/services/transactions.service.ts`
- Create: `apps/api/src/controllers/transactions.controller.ts`
- Create: `apps/api/tests/transactions.test.ts`

- [ ] **Step 1: Write failing test — `apps/api/tests/transactions.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { TransactionsService } from "../src/services/transactions.service.js";

const mockTransaction = {
  id: "tx-1",
  type: "expense",
  amount: 350,
  category: "餐飲",
  source: "daily",
  note: "午餐",
  date: new Date("2026-04-01"),
  createdAt: new Date(),
};

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    transaction: {
      findMany: vi.fn().mockResolvedValue([mockTransaction]),
      create: vi.fn().mockResolvedValue(mockTransaction),
      delete: vi.fn().mockResolvedValue(mockTransaction),
    },
  },
}));

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
  recordMetric: vi.fn(),
  getP95: vi.fn(() => 0),
  getErrorRate: vi.fn(() => 0),
  metricsState: { requestCount: 0, errorCount: 0, responseTimes: [] },
  checkAlerts: vi.fn(),
}));

describe("TransactionsService", () => {
  const service = new TransactionsService();

  it("lists all transactions without month filter", async () => {
    const items = await service.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.category).toBe("餐飲");
  });

  it("lists transactions with month filter", async () => {
    const items = await service.list("2026-04");
    expect(items).toHaveLength(1);
  });

  it("creates a transaction", async () => {
    const item = await service.create({
      type: "expense",
      amount: 350,
      category: "餐飲",
      source: "daily",
      date: "2026-04-01",
    });
    expect(item.type).toBe("expense");
  });

  it("deletes a transaction", async () => {
    const result = await service.delete("tx-1");
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @repo/api test -- apps/api/tests/transactions.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `apps/api/src/services/transactions.service.ts`**

```typescript
import { prisma } from "../lib/prisma.js";
import type { CreateTransaction } from "@repo/shared";

export class TransactionsService {
  async list(month?: string) {
    let where = {};
    if (month) {
      const [year, m] = month.split("-").map(Number);
      if (year && m) {
        const start = new Date(year, m - 1, 1);
        const end = new Date(year, m, 1);
        where = { date: { gte: start, lt: end } };
      }
    }
    return prisma.transaction.findMany({ where, orderBy: { date: "desc" } });
  }

  async create(data: CreateTransaction) {
    const { date, ...rest } = data;
    return prisma.transaction.create({
      data: { ...rest, date: new Date(date) },
    });
  }

  async delete(id: string) {
    return prisma.transaction.delete({ where: { id } });
  }
}

export const transactionsService = new TransactionsService();
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter @repo/api test -- apps/api/tests/transactions.test.ts
```

Expected: 4 tests pass

- [ ] **Step 5: Create `apps/api/src/controllers/transactions.controller.ts`**

```typescript
import type { Request, Response, NextFunction } from "express";
import { CreateTransactionSchema } from "@repo/shared";
import { transactionsService } from "../services/transactions.service.js";
import { sendSuccess, sendError } from "../lib/envelope.js";

export class TransactionsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { month } = req.query as { month?: string };
      const items = await transactionsService.list(month);
      sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreateTransactionSchema.parse(req.body);
      const item = await transactionsService.create(data);
      sendSuccess(res, item, 201);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      await transactionsService.delete(id);
      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  }
}

export const transactionsController = new TransactionsController();
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/transactions.service.ts apps/api/src/controllers/transactions.controller.ts apps/api/tests/transactions.test.ts
git commit -m "feat(api): add transactions service and controller"
```

---

## Task 9: Portfolio service, controller, and tests

**Files:**

- Create: `apps/api/src/services/portfolio.service.ts`
- Create: `apps/api/src/controllers/portfolio.controller.ts`
- Create: `apps/api/tests/portfolio.test.ts`

- [ ] **Step 1: Write failing test — `apps/api/tests/portfolio.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { PortfolioService } from "../src/services/portfolio.service.js";

const mockItem = {
  id: "portfolio-1",
  symbol: "0050.TW",
  name: "元大台灣50",
  avgCost: 185.5,
  shares: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    portfolioItem: {
      findMany: vi.fn().mockResolvedValue([mockItem]),
      findUnique: vi.fn().mockResolvedValue(mockItem),
      create: vi.fn().mockResolvedValue(mockItem),
      update: vi.fn().mockResolvedValue({ ...mockItem, shares: 150 }),
      delete: vi.fn().mockResolvedValue(mockItem),
    },
  },
}));

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
  recordMetric: vi.fn(),
  getP95: vi.fn(() => 0),
  getErrorRate: vi.fn(() => 0),
  metricsState: { requestCount: 0, errorCount: 0, responseTimes: [] },
  checkAlerts: vi.fn(),
}));

describe("PortfolioService", () => {
  const service = new PortfolioService();

  it("lists portfolio items", async () => {
    const items = await service.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.symbol).toBe("0050.TW");
  });

  it("finds item by id", async () => {
    const item = await service.findById("portfolio-1");
    expect(item?.id).toBe("portfolio-1");
  });

  it("creates a portfolio item", async () => {
    const item = await service.create({
      symbol: "0050.TW",
      name: "元大台灣50",
      avgCost: 185.5,
      shares: 100,
    });
    expect(item.symbol).toBe("0050.TW");
  });

  it("updates a portfolio item", async () => {
    const item = await service.update("portfolio-1", { shares: 150 });
    expect(item.shares).toBe(150);
  });

  it("deletes a portfolio item", async () => {
    const result = await service.delete("portfolio-1");
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @repo/api test -- apps/api/tests/portfolio.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `apps/api/src/services/portfolio.service.ts`**

```typescript
import { prisma } from "../lib/prisma.js";
import type { CreatePortfolioItem, UpdatePortfolioItem } from "@repo/shared";

export class PortfolioService {
  async list() {
    return prisma.portfolioItem.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string) {
    return prisma.portfolioItem.findUnique({ where: { id } });
  }

  async create(data: CreatePortfolioItem) {
    return prisma.portfolioItem.create({ data });
  }

  async update(id: string, data: UpdatePortfolioItem) {
    return prisma.portfolioItem.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.portfolioItem.delete({ where: { id } });
  }
}

export const portfolioService = new PortfolioService();
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter @repo/api test -- apps/api/tests/portfolio.test.ts
```

Expected: 5 tests pass

- [ ] **Step 5: Create `apps/api/src/controllers/portfolio.controller.ts`**

```typescript
import type { Request, Response, NextFunction } from "express";
import { CreatePortfolioItemSchema, UpdatePortfolioItemSchema } from "@repo/shared";
import { portfolioService } from "../services/portfolio.service.js";
import { sendSuccess, sendError } from "../lib/envelope.js";

export class PortfolioController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await portfolioService.list();
      sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreatePortfolioItemSchema.parse(req.body);
      const item = await portfolioService.create(data);
      sendSuccess(res, item, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const existing = await portfolioService.findById(id);
      if (!existing) {
        sendError(res, "NOT_FOUND", "Portfolio item not found", 404);
        return;
      }
      const data = UpdatePortfolioItemSchema.parse(req.body);
      const item = await portfolioService.update(id, data);
      sendSuccess(res, item);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const existing = await portfolioService.findById(id);
      if (!existing) {
        sendError(res, "NOT_FOUND", "Portfolio item not found", 404);
        return;
      }
      await portfolioService.delete(id);
      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  }
}

export const portfolioController = new PortfolioController();
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/portfolio.service.ts apps/api/src/controllers/portfolio.controller.ts apps/api/tests/portfolio.test.ts
git commit -m "feat(api): add portfolio service and controller"
```

---

## Task 10: Quotes service and tests

**Files:**

- Create: `apps/api/src/services/quotes.service.ts`
- Create: `apps/api/src/controllers/quotes.controller.ts`
- Create: `apps/api/tests/quotes.test.ts`

- [ ] **Step 1: Write failing test — `apps/api/tests/quotes.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuotesService } from "../src/services/quotes.service.js";

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
  recordMetric: vi.fn(),
  getP95: vi.fn(() => 0),
  getErrorRate: vi.fn(() => 0),
  metricsState: { requestCount: 0, errorCount: 0, responseTimes: [] },
  checkAlerts: vi.fn(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("QuotesService", () => {
  const service = new QuotesService();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("fetches a valid quote", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        chart: {
          result: [{ meta: { regularMarketPrice: 193.5, currency: "TWD", symbol: "0050.TW" } }],
          error: null,
        },
      }),
    });

    const quote = await service.fetchQuote("0050.TW");
    expect(quote.symbol).toBe("0050.TW");
    expect(quote.price).toBe(193.5);
    expect(quote.currency).toBe("TWD");
  });

  it("throws when result is null", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chart: { result: null, error: "Not Found" } }),
    });
    await expect(service.fetchQuote("INVALID")).rejects.toThrow("No data found");
  });

  it("throws when API returns non-ok status", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(service.fetchQuote("0050.TW")).rejects.toThrow("Yahoo Finance returned 429");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @repo/api test -- apps/api/tests/quotes.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `apps/api/src/services/quotes.service.ts`**

```typescript
import type { Quote } from "@repo/shared";

interface YahooChartMeta {
  regularMarketPrice: number;
  currency: string;
  symbol: string;
}

interface YahooChartResponse {
  chart: {
    result: Array<{ meta: YahooChartMeta }> | null;
    error: unknown;
  };
}

export class QuotesService {
  async fetchQuote(symbol: string): Promise<Quote> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status} for ${symbol}`);
    }

    const data = (await response.json()) as YahooChartResponse;
    const result = data?.chart?.result?.[0];

    if (!result) {
      throw new Error(`No data found for symbol ${symbol}`);
    }

    return {
      symbol,
      price: result.meta.regularMarketPrice,
      currency: result.meta.currency,
    };
  }
}

export const quotesService = new QuotesService();
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter @repo/api test -- apps/api/tests/quotes.test.ts
```

Expected: 3 tests pass

- [ ] **Step 5: Create `apps/api/src/controllers/quotes.controller.ts`**

```typescript
import type { Request, Response, NextFunction } from "express";
import { quotesService } from "../services/quotes.service.js";
import { sendSuccess, sendError } from "../lib/envelope.js";

export class QuotesController {
  async getQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const { symbol } = req.params as { symbol: string };
      const quote = await quotesService.fetchQuote(symbol);
      sendSuccess(res, quote);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("No data found")) {
        sendError(res, "SYMBOL_NOT_FOUND", error.message, 404);
        return;
      }
      next(error);
    }
  }
}

export const quotesController = new QuotesController();
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/quotes.service.ts apps/api/src/controllers/quotes.controller.ts apps/api/tests/quotes.test.ts
git commit -m "feat(api): add quotes service and controller"
```

---

## Task 11: Wire all finance routes

**Files:**

- Create: `apps/api/src/routes/finance.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Create `apps/api/src/routes/finance.ts`**

```typescript
import { Router } from "express";
import { assetsController } from "../controllers/assets.controller.js";
import { liabilitiesController } from "../controllers/liabilities.controller.js";
import { transactionsController } from "../controllers/transactions.controller.js";
import { portfolioController } from "../controllers/portfolio.controller.js";
import { quotesController } from "../controllers/quotes.controller.js";

const router = Router();

router.get("/quotes/:symbol", (req, res, next) => quotesController.getQuote(req, res, next));

router.get("/assets", (req, res, next) => assetsController.list(req, res, next));
router.post("/assets", (req, res, next) => assetsController.create(req, res, next));
router.put("/assets/:id", (req, res, next) => assetsController.update(req, res, next));
router.delete("/assets/:id", (req, res, next) => assetsController.delete(req, res, next));

router.get("/liabilities", (req, res, next) => liabilitiesController.list(req, res, next));
router.post("/liabilities", (req, res, next) => liabilitiesController.create(req, res, next));
router.put("/liabilities/:id", (req, res, next) => liabilitiesController.update(req, res, next));
router.delete("/liabilities/:id", (req, res, next) => liabilitiesController.delete(req, res, next));

router.get("/transactions", (req, res, next) => transactionsController.list(req, res, next));
router.post("/transactions", (req, res, next) => transactionsController.create(req, res, next));
router.delete("/transactions/:id", (req, res, next) =>
  transactionsController.delete(req, res, next)
);

router.get("/portfolio", (req, res, next) => portfolioController.list(req, res, next));
router.post("/portfolio", (req, res, next) => portfolioController.create(req, res, next));
router.put("/portfolio/:id", (req, res, next) => portfolioController.update(req, res, next));
router.delete("/portfolio/:id", (req, res, next) => portfolioController.delete(req, res, next));

export default router;
```

- [ ] **Step 2: Update `apps/api/src/routes/index.ts`**

```typescript
import { Router } from "express";
import healthRoutes from "./health.js";
import financeRoutes from "./finance.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("", financeRoutes);

export default router;
```

- [ ] **Step 3: Run all API tests**

```bash
pnpm --filter @repo/api test
```

Expected: all tests pass (health + assets + liabilities + transactions + portfolio + quotes)

- [ ] **Step 4: Type-check API**

```bash
pnpm --filter @repo/api type-check
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/
git commit -m "feat(api): wire all finance routes"
```

---

## Task 12: Frontend dependencies, format utility, and api-client

**Files:**

- Modify: `apps/web/package.json`
- Create: `apps/web/lib/format.ts`
- Modify: `apps/web/lib/api-client.ts`

- [ ] **Step 1: Install frontend dependencies**

```bash
pnpm --filter @repo/web add zustand lucide-react @ducanh2912/next-pwa
pnpm --filter @repo/web add -D sharp
```

Expected: packages installed

- [ ] **Step 2: Add `gen-icons` script to `apps/web/package.json`**

Open `apps/web/package.json` and add to the `scripts` section:

```json
"gen-icons": "node scripts/gen-icons.mjs"
```

- [ ] **Step 3: Create `apps/web/lib/format.ts`**

```typescript
export function formatCurrency(amount: number, currency = "TWD"): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
```

- [ ] **Step 4: Update `apps/web/lib/api-client.ts`** (add `put` method)

```typescript
import type { ApiResponse } from "@repo/shared";

const API_BASE = "/api";

class ApiClient {
  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) ?? {}),
    };
    const response = await fetch(url, { ...options, headers });
    return response.json() as Promise<ApiResponse<T>>;
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  async put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "PUT", body: JSON.stringify(body) });
  }

  async patch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient();
```

- [ ] **Step 5: Type-check web**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/ apps/web/package.json
git commit -m "feat(web): add zustand/lucide-react deps, format util, api-client put method"
```

---

## Task 13: Zustand stores

**Files:**

- Create: `apps/web/store/useFinanceStore.ts`
- Create: `apps/web/store/useQuoteStore.ts`

- [ ] **Step 1: Create `apps/web/store/useFinanceStore.ts`**

```typescript
"use client";

import { create } from "zustand";
import type {
  Asset,
  Liability,
  Transaction,
  PortfolioItem,
  CreateAsset,
  CreateLiability,
  CreateTransaction,
  CreatePortfolioItem,
} from "@repo/shared";
import { api } from "../lib/api-client";

interface FinanceState {
  assets: Asset[];
  liabilities: Liability[];
  transactions: Transaction[];
  portfolio: PortfolioItem[];
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  addAsset: (data: CreateAsset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addLiability: (data: CreateLiability) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;
  addTransaction: (data: CreateTransaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addPortfolioItem: (data: CreatePortfolioItem) => Promise<void>;
  deletePortfolioItem: (id: string) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  assets: [],
  liabilities: [],
  transactions: [],
  portfolio: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [assetsRes, liabilitiesRes, transactionsRes, portfolioRes] = await Promise.all([
        api.get<Asset[]>("/assets"),
        api.get<Liability[]>("/liabilities"),
        api.get<Transaction[]>("/transactions"),
        api.get<PortfolioItem[]>("/portfolio"),
      ]);
      set({
        assets: assetsRes.success ? assetsRes.data : [],
        liabilities: liabilitiesRes.success ? liabilitiesRes.data : [],
        transactions: transactionsRes.success ? transactionsRes.data : [],
        portfolio: portfolioRes.success ? portfolioRes.data : [],
        loading: false,
      });
    } catch {
      set({ error: "無法載入資料，請稍後再試", loading: false });
    }
  },

  addAsset: async (data) => {
    const res = await api.post<Asset>("/assets", data);
    if (res.success) set((state) => ({ assets: [res.data, ...state.assets] }));
  },

  deleteAsset: async (id) => {
    const res = await api.delete(`/assets/${id}`);
    if (res.success) set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }));
  },

  addLiability: async (data) => {
    const res = await api.post<Liability>("/liabilities", data);
    if (res.success) set((state) => ({ liabilities: [res.data, ...state.liabilities] }));
  },

  deleteLiability: async (id) => {
    const res = await api.delete(`/liabilities/${id}`);
    if (res.success)
      set((state) => ({ liabilities: state.liabilities.filter((l) => l.id !== id) }));
  },

  addTransaction: async (data) => {
    const res = await api.post<Transaction>("/transactions", data);
    if (res.success) set((state) => ({ transactions: [res.data, ...state.transactions] }));
  },

  deleteTransaction: async (id) => {
    const res = await api.delete(`/transactions/${id}`);
    if (res.success)
      set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
  },

  addPortfolioItem: async (data) => {
    const res = await api.post<PortfolioItem>("/portfolio", data);
    if (res.success) set((state) => ({ portfolio: [res.data, ...state.portfolio] }));
  },

  deletePortfolioItem: async (id) => {
    const res = await api.delete(`/portfolio/${id}`);
    if (res.success) set((state) => ({ portfolio: state.portfolio.filter((p) => p.id !== id) }));
  },
}));
```

- [ ] **Step 2: Create `apps/web/store/useQuoteStore.ts`**

```typescript
"use client";

import { create } from "zustand";
import type { Quote } from "@repo/shared";
import { api } from "../lib/api-client";

interface QuoteEntry {
  price: number;
  currency: string;
  updatedAt: Date;
}

interface QuoteState {
  quotes: Record<string, QuoteEntry>;
  loading: boolean;
  refreshQuotes: (symbols: string[]) => Promise<void>;
}

export const useQuoteStore = create<QuoteState>((set) => ({
  quotes: {},
  loading: false,

  refreshQuotes: async (symbols) => {
    if (symbols.length === 0) return;
    set({ loading: true });

    const results = await Promise.allSettled(
      symbols.map((symbol) => api.get<Quote>(`/quotes/${symbol}`))
    );

    const newQuotes: Record<string, QuoteEntry> = {};
    results.forEach((result, i) => {
      const symbol = symbols[i];
      if (result.status === "fulfilled" && result.value.success && symbol) {
        const quote = result.value.data;
        newQuotes[symbol] = { price: quote.price, currency: quote.currency, updatedAt: new Date() };
      }
    });

    set((state) => ({ quotes: { ...state.quotes, ...newQuotes }, loading: false }));
  },
}));
```

- [ ] **Step 3: Type-check web**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/store/
git commit -m "feat(web): add zustand stores for finance and quotes"
```

---

## Task 14: BottomNav and Finance layout

**Files:**

- Create: `apps/web/components/layout/BottomNav.tsx`
- Create: `apps/web/app/(finance)/layout.tsx`

- [ ] **Step 1: Create `apps/web/components/layout/BottomNav.tsx`**

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, BarChart3, Shield, MoreHorizontal } from "lucide-react";

const tabs = [
  { href: "/dashboard", icon: Home, label: "儀表板" },
  { href: "/assets", icon: Building2, label: "資產" },
  { href: "/transactions", icon: BarChart3, label: "收支" },
  { href: "/insurance", icon: Shield, label: "保險" },
  { href: "/more", icon: MoreHorizontal, label: "更多" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
      <div className="max-w-md mx-auto flex">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                active ? "text-gray-900" : "text-gray-400"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(finance)/layout.tsx`**

```typescript
import { BottomNav } from "../../components/layout/BottomNav";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/layout/BottomNav.tsx "apps/web/app/(finance)/layout.tsx"
git commit -m "feat(web): add BottomNav and finance shell layout"
```

---

## Task 15: Dashboard components

**Files:**

- Create: `apps/web/components/finance/DisposableBalanceHeader.tsx`
- Create: `apps/web/components/finance/NetWorthCard.tsx`
- Create: `apps/web/components/finance/QuickActionsGrid.tsx`
- Create: `apps/web/components/finance/RecentTransactionsList.tsx`

- [ ] **Step 1: Create `apps/web/components/finance/DisposableBalanceHeader.tsx`**

```typescript
import { formatCurrency } from "../../lib/format";

interface Props {
  amount: number;
}

export function DisposableBalanceHeader({ amount }: Props) {
  const isOverdraft = amount < 0;
  return (
    <div className="pt-2">
      <p className="text-sm text-gray-500 mb-1">本月可支配餘額</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-3xl font-bold tracking-tight ${
            isOverdraft ? "text-red-500" : "text-green-700"
          }`}
        >
          {formatCurrency(amount)}
        </span>
        {isOverdraft && (
          <span className="bg-red-50 text-red-500 text-xs font-medium px-2 py-0.5 rounded-full">
            透支
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/components/finance/NetWorthCard.tsx`**

```typescript
import { formatCurrency } from "../../lib/format";

interface Props {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export function NetWorthCard({ netWorth, totalAssets, totalLiabilities }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <p className="text-sm text-gray-500 mb-1">資產負債概覽</p>
      <p className="text-2xl font-bold text-gray-900 mb-3">{formatCurrency(netWorth)}</p>
      <div className="flex gap-4 pt-3 border-t border-gray-50">
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-0.5">總資產</p>
          <p className="text-sm font-semibold text-green-700">{formatCurrency(totalAssets)}</p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-0.5">總負債</p>
          <p className="text-sm font-semibold text-red-500">{formatCurrency(totalLiabilities)}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/components/finance/QuickActionsGrid.tsx`**

```typescript
"use client";

import { PenLine, Landmark, PieChart, CreditCard } from "lucide-react";

interface Props {
  onRecordExpense: () => void;
}

const actions = [
  { icon: PenLine, label: "紀錄生活", key: "record" },
  { icon: Landmark, label: "更新存款", key: "deposit" },
  { icon: PieChart, label: "配置資產", key: "allocate" },
  { icon: CreditCard, label: "新增負債", key: "liability" },
];

export function QuickActionsGrid({ onRecordExpense }: Props) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">快速操作</p>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ icon: Icon, label, key }) => (
          <button
            key={key}
            onClick={() => key === "record" && onRecordExpense()}
            className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
              <Icon size={18} className="text-gray-700" />
            </div>
            <span className="text-xs text-gray-600 font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/components/finance/RecentTransactionsList.tsx`**

```typescript
import type { Transaction } from "@repo/shared";
import { formatCurrency } from "../../lib/format";

interface Props {
  transactions: Transaction[];
}

export function RecentTransactionsList({ transactions }: Props) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">最近交易</p>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {transactions.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">尚無交易紀錄</p>
        ) : (
          <ul>
            {transactions.map((t, i) => (
              <li
                key={t.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i !== transactions.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.category}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(t.date).toLocaleDateString("zh-TW", {
                      month: "numeric",
                      day: "numeric",
                    })}
                    {t.note ? ` · ${t.note}` : ""}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    t.type === "income" ? "text-green-700" : "text-red-500"
                  }`}
                >
                  {t.type === "income" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/finance/
git commit -m "feat(web): add dashboard finance components"
```

---

## Task 16: Dashboard page and TransactionBottomSheet

**Files:**

- Create: `apps/web/app/(finance)/dashboard/page.tsx`
- Create: `apps/web/components/finance/TransactionBottomSheet.tsx`

- [ ] **Step 1: Create `apps/web/components/finance/TransactionBottomSheet.tsx`**

```typescript
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useFinanceStore } from "../../store/useFinanceStore";
import type { TransactionSource, TransactionType } from "@repo/shared";

const EXPENSE_CATEGORIES = ["餐飲", "交通", "住房", "購物", "娛樂", "醫療", "教育", "其他"];
const INCOME_CATEGORIES = ["薪資", "投資收益", "兼職", "獎金", "其他"];
const SOURCES: { key: TransactionSource; label: string }[] = [
  { key: "daily", label: "日常開銷" },
  { key: "emergency", label: "緊急備用金" },
  { key: "excluded", label: "不計入預算" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TransactionBottomSheet({ open, onClose }: Props) {
  const { addTransaction } = useFinanceStore();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0] ?? "");
  const [note, setNote] = useState("");
  const [source, setSource] = useState<TransactionSource>("daily");
  const [submitting, setSubmitting] = useState(false);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSubmit = async () => {
    if (!amount || !category || !date) return;
    setSubmitting(true);
    await addTransaction({ type, amount: parseFloat(amount), category, source, note: note || undefined, date });
    setSubmitting(false);
    setAmount("");
    setCategory("");
    setNote("");
    setSource("daily");
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">紀錄收支</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Type toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            {(["expense", "income"] as TransactionType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setType(t); setCategory(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  type === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                {t === "expense" ? "支出" : "收入"}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">金額</label>
            <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="text-sm text-gray-400 mr-2">TWD</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent text-gray-900 text-sm outline-none"
              />
            </div>
          </div>

          {/* Category */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">類別</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none"
            >
              <option value="">選擇類別</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Date */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none"
            />
          </div>

          {/* Note */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">備註</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="選填"
              className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none"
            />
          </div>

          {/* Source */}
          <div className="mb-5">
            <label className="text-xs text-gray-500 mb-1 block">資金來源</label>
            <div className="flex gap-2">
              {SOURCES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSource(key)}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-colors ${
                    source === key
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!amount || !category || submitting}
            className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(finance)/dashboard/page.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useFinanceStore } from "../../../store/useFinanceStore";
import { DisposableBalanceHeader } from "../../../components/finance/DisposableBalanceHeader";
import { NetWorthCard } from "../../../components/finance/NetWorthCard";
import { QuickActionsGrid } from "../../../components/finance/QuickActionsGrid";
import { RecentTransactionsList } from "../../../components/finance/RecentTransactionsList";
import { TransactionBottomSheet } from "../../../components/finance/TransactionBottomSheet";

export default function DashboardPage() {
  const { fetchAll, assets, liabilities, transactions, loading } = useFinanceStore();
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const now = new Date();
  const currentMonthTx = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const monthlyIncome = currentMonthTx
    .filter((t) => t.type === "income" && t.source !== "excluded")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = currentMonthTx
    .filter((t) => t.type === "expense" && t.source !== "excluded")
    .reduce((sum, t) => sum + t.amount, 0);

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400 text-sm">載入中...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <DisposableBalanceHeader amount={monthlyIncome - monthlyExpense} />
      <NetWorthCard
        netWorth={netWorth}
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
      />
      <QuickActionsGrid onRecordExpense={() => setShowSheet(true)} />
      <RecentTransactionsList transactions={recentTransactions} />
      <TransactionBottomSheet open={showSheet} onClose={() => setShowSheet(false)} />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(finance)/dashboard/" apps/web/components/finance/TransactionBottomSheet.tsx
git commit -m "feat(web): add dashboard page and TransactionBottomSheet"
```

---

## Task 17: Assets page components

**Files:**

- Create: `apps/web/components/finance/AssetCategoryList.tsx`
- Create: `apps/web/components/finance/LiabilityCategoryList.tsx`
- Create: `apps/web/components/finance/AddPortfolioItemModal.tsx`
- Create: `apps/web/components/finance/PortfolioSection.tsx`
- Create: `apps/web/app/(finance)/assets/page.tsx`

- [ ] **Step 1: Create `apps/web/components/finance/AssetCategoryList.tsx`**

```typescript
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Asset } from "@repo/shared";
import { formatCurrency } from "../../lib/format";

interface Props {
  assets: Asset[];
  loading: boolean;
}

export function AssetCategoryList({ assets, loading }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const grouped = assets.reduce<Record<string, Asset[]>>((acc, asset) => {
    if (!acc[asset.category]) acc[asset.category] = [];
    acc[asset.category]!.push(asset);
    return acc;
  }, {});

  const toggle = (cat: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  if (loading) return <div className="text-sm text-gray-400 py-4 text-center">載入中...</div>;
  if (Object.keys(grouped).length === 0)
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">
        尚無資產紀錄
      </div>
    );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([category, items]) => {
        const total = items.reduce((sum, a) => sum + a.value, 0);
        const isExpanded = expanded.has(category);
        return (
          <div key={category} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => toggle(category)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">{category}</p>
                <p className="text-xs text-gray-400 mt-0.5">{items.length} 項</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-green-700">{formatCurrency(total)}</span>
                {isExpanded ? (
                  <ChevronUp size={14} className="text-gray-400" />
                ) : (
                  <ChevronDown size={14} className="text-gray-400" />
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-gray-50">
                {items.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm text-gray-700">{asset.name}</span>
                    <span className="text-sm text-green-700">{formatCurrency(asset.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/components/finance/LiabilityCategoryList.tsx`**

```typescript
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Liability } from "@repo/shared";
import { formatCurrency } from "../../lib/format";

interface Props {
  liabilities: Liability[];
  loading: boolean;
}

export function LiabilityCategoryList({ liabilities, loading }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const grouped = liabilities.reduce<Record<string, Liability[]>>((acc, l) => {
    if (!acc[l.category]) acc[l.category] = [];
    acc[l.category]!.push(l);
    return acc;
  }, {});

  const toggle = (cat: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  if (loading) return <div className="text-sm text-gray-400 py-4 text-center">載入中...</div>;
  if (Object.keys(grouped).length === 0)
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">
        尚無負債紀錄
      </div>
    );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([category, items]) => {
        const total = items.reduce((sum, l) => sum + l.balance, 0);
        const isExpanded = expanded.has(category);
        return (
          <div key={category} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => toggle(category)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">{category}</p>
                <p className="text-xs text-gray-400 mt-0.5">{items.length} 項</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-red-500">{formatCurrency(total)}</span>
                {isExpanded ? (
                  <ChevronUp size={14} className="text-gray-400" />
                ) : (
                  <ChevronDown size={14} className="text-gray-400" />
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-gray-50">
                {items.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm text-gray-700">{l.name}</span>
                    <span className="text-sm text-red-500">{formatCurrency(l.balance)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/components/finance/AddPortfolioItemModal.tsx`**

```typescript
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useFinanceStore } from "../../store/useFinanceStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddPortfolioItemModal({ open, onClose }: Props) {
  const { addPortfolioItem } = useFinanceStore();
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [shares, setShares] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!symbol || !name || !avgCost || !shares) return;
    setSubmitting(true);
    await addPortfolioItem({
      symbol: symbol.toUpperCase(),
      name,
      avgCost: parseFloat(avgCost),
      shares: parseFloat(shares),
    });
    setSubmitting(false);
    setSymbol(""); setName(""); setAvgCost(""); setShares("");
    onClose();
  };

  const fields: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    type?: string;
    upper?: boolean;
  }[] = [
    { label: "股票/ETF 代號", value: symbol, onChange: setSymbol, placeholder: "例：0050.TW", upper: true },
    { label: "名稱", value: name, onChange: setName, placeholder: "例：元大台灣50" },
    { label: "平均成本（每股）", value: avgCost, onChange: setAvgCost, placeholder: "0", type: "number" },
    { label: "持有股數", value: shares, onChange: setShares, placeholder: "0", type: "number" },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">新增投資標的</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {fields.map(({ label, value, onChange, placeholder, type, upper }) => (
            <div key={label} className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input
                type={type ?? "text"}
                value={value}
                onChange={(e) => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
                placeholder={placeholder}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none"
              />
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={!symbol || !name || !avgCost || !shares || submitting}
            className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50 mt-2"
          >
            {submitting ? "新增中..." : "新增"}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Create `apps/web/components/finance/PortfolioSection.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import type { PortfolioItem } from "@repo/shared";
import { useQuoteStore } from "../../store/useQuoteStore";
import { formatCurrency, formatPercent } from "../../lib/format";
import { AddPortfolioItemModal } from "./AddPortfolioItemModal";

interface Props {
  portfolio: PortfolioItem[];
}

export function PortfolioSection({ portfolio }: Props) {
  const { quotes, loading, refreshQuotes } = useQuoteStore();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (portfolio.length > 0) refreshQuotes(portfolio.map((p) => p.symbol));
  }, [portfolio, refreshQuotes]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">投資組合</p>
        <div className="flex gap-1">
          <button
            onClick={() => portfolio.length > 0 && refreshQuotes(portfolio.map((p) => p.symbol))}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={14} className={`text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowAdd(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Plus size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {portfolio.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            <p>尚無投資項目</p>
            <button onClick={() => setShowAdd(true)} className="mt-2 text-gray-700 font-medium underline text-sm">
              新增第一筆
            </button>
          </div>
        ) : (
          <ul>
            {portfolio.map((item, i) => {
              const quote = quotes[item.symbol];
              const cost = item.avgCost * item.shares;
              const marketValue = quote ? quote.price * item.shares : null;
              const unrealizedPL = marketValue !== null ? marketValue - cost : null;
              const returnRate = unrealizedPL !== null ? (unrealizedPL / cost) * 100 : null;
              const isGain = returnRate !== null && returnRate >= 0;

              return (
                <li
                  key={item.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i !== portfolio.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">
                      {quote ? formatCurrency(quote.price, quote.currency) : "—"}
                    </p>
                    {unrealizedPL !== null && returnRate !== null ? (
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                          isGain ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"
                        }`}
                      >
                        {formatPercent(returnRate)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">載入中</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AddPortfolioItemModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
```

- [ ] **Step 5: Create `apps/web/app/(finance)/assets/page.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useFinanceStore } from "../../../store/useFinanceStore";
import { formatCurrency } from "../../../lib/format";
import { AssetCategoryList } from "../../../components/finance/AssetCategoryList";
import { LiabilityCategoryList } from "../../../components/finance/LiabilityCategoryList";
import { PortfolioSection } from "../../../components/finance/PortfolioSection";

type Tab = "assets" | "liabilities";

export default function AssetsPage() {
  const { fetchAll, assets, liabilities, portfolio, loading } = useFinanceStore();
  const [tab, setTab] = useState<Tab>("assets");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="px-4 pt-6 space-y-4">
      <div>
        <p className="text-sm text-gray-500 mb-1">淨資產</p>
        <p className="text-4xl font-bold text-gray-900">{formatCurrency(netWorth)}</p>
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1">
        {(["assets", "liabilities"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {t === "assets" ? `資產 ${formatCurrency(totalAssets)}` : `負債 ${formatCurrency(totalLiabilities)}`}
          </button>
        ))}
      </div>

      {tab === "assets" && (
        <>
          <AssetCategoryList assets={assets} loading={loading} />
          <PortfolioSection portfolio={portfolio} />
        </>
      )}

      {tab === "liabilities" && (
        <LiabilityCategoryList liabilities={liabilities} loading={loading} />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Type-check**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/finance/ "apps/web/app/(finance)/assets/"
git commit -m "feat(web): add assets page with portfolio section"
```

---

## Task 18: Placeholder pages

**Files:**

- Create: `apps/web/app/(finance)/transactions/page.tsx`
- Create: `apps/web/app/(finance)/insurance/page.tsx`
- Create: `apps/web/app/(finance)/more/page.tsx`

- [ ] **Step 1: Create `apps/web/app/(finance)/transactions/page.tsx`**

```typescript
export default function TransactionsPage() {
  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">收支</h1>
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">
        即將推出
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(finance)/insurance/page.tsx`**

```typescript
export default function InsurancePage() {
  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">保險</h1>
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">
        即將推出
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/app/(finance)/more/page.tsx`**

```typescript
export default function MorePage() {
  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">更多</h1>
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">
        即將推出
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(finance)/transactions/" "apps/web/app/(finance)/insurance/" "apps/web/app/(finance)/more/"
git commit -m "feat(web): add placeholder pages for transactions, insurance, more"
```

---

## Task 19: PWA setup

**Files:**

- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/app/layout.tsx`
- Create: `public/manifest.json`
- Create: `apps/web/scripts/gen-icons.mjs`

- [ ] **Step 1: Create `public/manifest.json`**

```json
{
  "name": "財務管家",
  "short_name": "財務管家",
  "description": "個人財務管理工具",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#FAFAFA",
  "theme_color": "#111827",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: Create `apps/web/scripts/gen-icons.mjs`**

```javascript
import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const sizes = [192, 512];

for (const size of sizes) {
  const fontSize = Math.floor(size * 0.45);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 17, g: 24, b: 39, alpha: 1 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
            <text x="50%" y="54%" font-family="serif" font-size="${fontSize}"
                  fill="white" text-anchor="middle" dominant-baseline="middle">¥</text>
          </svg>`
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`);

  console.log(`✓ icon-${size}x${size}.png`);
}
```

- [ ] **Step 3: Generate icons**

```bash
pnpm --filter @repo/web gen-icons
```

Expected: `✓ icon-192x192.png` and `✓ icon-512x512.png` in `public/icons/`

- [ ] **Step 4: Rewrite `apps/web/next.config.ts`** (add next-pwa, update CSP to allow Yahoo Finance connect)

```typescript
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  experimental: {
    taint: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default withPWA(nextConfig);
```

- [ ] **Step 5: Update `apps/web/app/layout.tsx`** (add PWA meta tags and manifest link)

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "財務管家",
  description: "個人財務管理工具",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <meta name="theme-color" content="#111827" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="財務管家" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Type-check web**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add public/ apps/web/next.config.ts apps/web/app/layout.tsx apps/web/scripts/
git commit -m "feat(web): add PWA support with next-pwa, manifest, and icons"
```

---

## Task 20: Final integration check

- [ ] **Step 1: Run all API tests**

```bash
pnpm --filter @repo/api test
```

Expected: all tests pass

- [ ] **Step 2: Type-check entire monorepo**

```bash
pnpm type-check
```

Expected: no errors in api, web, or shared

- [ ] **Step 3: Lint entire monorepo**

```bash
pnpm lint
```

Expected: no lint errors

- [ ] **Step 4: Start the dev servers and verify manually**

```bash
pnpm docker:up
pnpm dev
```

Open `http://localhost:3000` in browser — should redirect to `/dashboard`. Check:

- Bottom navigation shows 5 tabs and highlights the active one
- Dashboard shows NT$0 balance (no transactions yet)
- Tapping "紀錄生活" opens the bottom sheet form
- Assets page loads with tabs for 資產/負債
- Portfolio section shows "新增第一筆" when empty

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete finance app transformation"
```
