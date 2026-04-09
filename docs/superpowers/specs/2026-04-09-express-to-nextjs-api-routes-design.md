# Design: Migrate Express API to Next.js Route Handlers

**Date:** 2026-04-09
**Status:** Approved

## Overview

Eliminate the separate Express API (`apps/api`) by moving all API logic into Next.js Route Handlers inside `apps/web`. This removes the need for Railway as a deployment platform — only Vercel + Supabase are required.

## Architecture

```
Before:
Browser → Vercel (Next.js) → Railway (Express) → Supabase

After:
Browser → Vercel (Next.js + Route Handlers) → Supabase
```

## What Changes

### Files moved into `apps/web`

| Source (`apps/api`)                    | Destination (`apps/web`)           |
| -------------------------------------- | ---------------------------------- |
| `prisma/schema.prisma`                 | `prisma/schema.prisma`             |
| `src/lib/prisma.ts`                    | `lib/prisma.ts`                    |
| `src/services/assets.service.ts`       | `services/assets.service.ts`       |
| `src/services/liabilities.service.ts`  | `services/liabilities.service.ts`  |
| `src/services/transactions.service.ts` | `services/transactions.service.ts` |
| `src/services/portfolio.service.ts`    | `services/portfolio.service.ts`    |
| `src/services/quotes.service.ts`       | `services/quotes.service.ts`       |

### New Route Handlers (`apps/web/app/api/`)

```
api/
  assets/route.ts            # GET (list), POST (create)
  assets/[id]/route.ts       # PUT (update), DELETE
  liabilities/route.ts
  liabilities/[id]/route.ts
  transactions/route.ts
  transactions/[id]/route.ts
  portfolio/route.ts
  portfolio/[id]/route.ts
  quotes/[symbol]/route.ts   # GET (fetch quote from Yahoo Finance)
  health/route.ts            # GET (health check)
```

### New helper (`apps/web/lib/api-response.ts`)

Next.js equivalent of `apps/api/src/lib/envelope.ts`. Replaces Express `Response` with `NextResponse`:

```ts
// Returns NextResponse instead of calling res.json()
export function ok<T>(data: T, status = 200): NextResponse;
export function err(code: string, message: string, status = 400, details?: unknown): NextResponse;
```

Maintains the same `ApiResponse<T>` envelope shape from `@repo/shared`.

### Error handling in Route Handlers

Each Route Handler wraps its logic in try/catch:

- `ZodError` → 400 with validation details
- Not found (null from service) → 404
- All others → 500

This replaces the Express `errorHandler` middleware.

### Dependencies added to `apps/web`

- `@prisma/client` — Prisma ORM client
- `prisma` (devDependency) — CLI for migrations and code generation

### Files/folders deleted

- `apps/api/` — entire folder removed after migration
- `apps/api/railway.json`
- `docs/superpowers/specs/2026-04-08-vercel-railway-deployment-design.md`
- `docs/superpowers/plans/2026-04-08-vercel-railway-deployment.md`

### What is NOT migrated

- **CORS middleware** — not needed; web and API are same-origin on Vercel
- **Helmet security headers** — Next.js handles headers natively; can be configured in `next.config.ts` if needed
- **Rate limiting** — Vercel provides DDoS/rate protection; not needed for a personal finance app
- **Express metrics middleware** — no equivalent needed in Next.js

## Services

Services (`assets`, `liabilities`, `transactions`, `portfolio`, `quotes`) contain no Express dependencies — they use Prisma and `@repo/shared` types only. They are moved as-is with only the import path for Prisma updated (`../lib/prisma.js` → `@/lib/prisma`).

## Prisma

The `prisma/schema.prisma` moves from `apps/api/prisma/` to `apps/web/prisma/`. All Prisma CLI commands (`db:generate`, `db:migrate`, `db:studio`) are updated to run from `apps/web`.

## `vercel.json`

No changes required. The existing config already builds and deploys `apps/web`.

## `turbo.json` / root `package.json`

Remove the `api` workspace from Turborepo pipeline and workspace definitions after deleting `apps/api`.

## Success Criteria

- `https://your-app.vercel.app/api/health` returns `{ success: true, data: { status: "ok" } }`
- All CRUD endpoints work identically to before
- Prisma migrations run via `pnpm --filter @repo/web db:migrate`
- `apps/api` folder no longer exists
- `pnpm build` succeeds with only `apps/web`
