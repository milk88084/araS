# Design: Turborepo + Next.js 15 Monorepo Migration

**Date:** 2026-03-16
**Status:** Approved
**Approach:** Incremental migration (Option A) — move and rename, never rewrite business logic

---

## 1. Folder Structure

### Before (current)

```
packages/
  client/   # React 18 + Vite
  server/   # Express 4 + Prisma
  shared/   # Zod schemas
```

### After (target)

```
apps/
  web/      # Next.js 15 App Router (migrated from packages/client)
  api/      # Express 4 + Prisma   (moved from packages/server)
packages/
  ui/       # shadcn/ui shared components
  shared/   # Zod schemas + shared types (kept as-is)
  eslint-config/  # Shared ESLint rules (extracted from root eslint.config.mjs)
```

### Rules

- `packages/client` and `packages/server` are deleted after migration; Git history is preserved.
- `packages/ui` follows the Turborepo/Vercel standard pattern and enables future apps (admin, mobile web) to reuse components.
- `packages/eslint-config` replaces the root `eslint.config.mjs`; each package extends from it.

---

## 2. pnpm Workspace

**`pnpm-workspace.yaml`:**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**`.npmrc`:**

```
shamefully-hoist=false
strict-peer-dependencies=false
```

- `shamefully-hoist=false`: strict dependency isolation, prevents phantom dependencies
- `strict-peer-dependencies=false`: suppresses false-positive peer dep warnings common in Next.js ecosystem

---

## 3. Turborepo Pipeline (`turbo.json`)

### DAG dependency order

```
packages/shared → packages/ui → apps/web
packages/shared →              → apps/api
```

### Pipeline tasks

| Task         | Depends on                         | Cache | Outputs               |
| ------------ | ---------------------------------- | ----- | --------------------- |
| `build`      | `^build` (upstream packages first) | ✅    | `.next/**`, `dist/**` |
| `dev`        | `^build`                           | ❌    | —                     |
| `lint`       | none                               | ✅    | —                     |
| `type-check` | `^type-check`                      | ✅    | —                     |
| `test`       | `^build`                           | ✅    | `coverage/**`         |
| `test:e2e`   | `build`                            | ❌    | —                     |

### Remote cache

- Config included for Vercel Remote Cache via `TURBO_TOKEN` + `TURBO_TEAM` env vars.
- Opt-in: works without these vars (local cache only).

### Root scripts (updated)

```json
{
  "dev": "turbo run dev",
  "build": "turbo run build",
  "lint": "turbo run lint",
  "type-check": "turbo run type-check",
  "test": "turbo run test",
  "test:e2e": "playwright test"
}
```

---

## 4. `apps/web` — Next.js 15

### Framework choices

- **Next.js 15** with **App Router** (not Pages Router)
- **React 19** (required by Next.js 15)
- **Tailwind CSS 4** (major upgrade from 3.x; config via CSS `@import "tailwindcss"`)
- **TypeScript strict mode**

### Auth

- **Clerk** via `@clerk/nextjs` (replaces `@clerk/clerk-react`)
- `middleware.ts` at app root handles auth routing using `clerkMiddleware`
- Protected routes use `auth()` from `@clerk/nextjs/server` in Server Components

### Folder structure inside `apps/web/`

```
apps/web/
├── app/
│   ├── layout.tsx        # Root layout with ClerkProvider
│   ├── page.tsx          # Home page
│   ├── (auth)/           # Sign-in / sign-up pages (Clerk hosted or custom)
│   └── (dashboard)/      # Protected routes
│       └── layout.tsx    # Auth guard
├── components/           # App-specific components
├── lib/                  # Utilities, API client (calls apps/api)
├── middleware.ts          # Clerk auth + route protection
├── next.config.ts        # Security headers, rewrites
├── tailwind.config.ts    # (if needed alongside CSS config)
└── package.json          # @repo/web
```

### API communication

- `apps/web` calls `apps/api` via HTTP. In development, Next.js rewrites `/api/*` to `localhost:3001/api/*`.
- In production, separate services with `NEXT_PUBLIC_API_URL` env var.
- No shared runtime dependencies between web and api — communication is over HTTP only.

### Security headers in `next.config.ts`

Configured via `headers()`:

- `Content-Security-Policy` (strict, nonce-based for inline scripts)
- `Strict-Transport-Security`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

---

## 5. `apps/api` — Express 4

### What changes

- Directory renamed from `packages/server` → `apps/api`
- Package name: `@repo/server` → `@repo/api`
- **No business logic changes** — all controllers, services, routes, and middleware are moved as-is

### What stays identical

- Layered architecture: `controllers/` → `services/` → Prisma
- Middleware chain: `securityHeaders → CORS → JSON → metricsMiddleware → clerkAuth → apiRateLimit → routes → errorHandler`
- `sendSuccess` / `sendError` / `sendPaginated` envelope helpers
- Prisma schema and migrations

### CORS update

- In development: allow `http://localhost:5173` (Vite) + `http://localhost:3000` (Next.js dev)
- In production: allow `ALLOWED_ORIGIN` env var

---

## 6. `packages/ui` — Shared Component Library

### Purpose

shadcn/ui components extracted into a shared package so future apps (`apps/admin`, `apps/marketing`) can import the same design system.

### Interface

```ts
// packages/ui/src/index.ts
export { Button } from "./components/button";
export { Card, CardHeader, CardContent } from "./components/card";
export { Input } from "./components/input";
// ... etc
```

### Setup

- **No build step** — `exports` field points to `.tsx` source files directly (same as `packages/shared`)
- Tailwind CSS peer dependency — consuming app (`apps/web`) provides Tailwind, not the package itself
- `package.json` name: `@repo/ui`

### shadcn/ui installation

- `shadcn init` runs inside `packages/ui`
- `components.json` configured with `aliases: { components: "@repo/ui/components", utils: "@repo/ui/lib/utils" }`

---

## 7. `packages/eslint-config`

### Purpose

Single source of truth for linting rules across all packages. Prevents drift between `apps/web`, `apps/api`, and `packages/*`.

### Files

```
packages/eslint-config/
├── index.js         # Base config (JS/TS)
├── next.js          # Next.js specific (extends index.js)
├── react.js         # React + hooks rules (extends index.js)
└── package.json     # @repo/eslint-config
```

### Usage

Each package's `eslint.config.mjs`:

```js
// apps/web
import { nextConfig } from '@repo/eslint-config/next'
export default nextConfig

// apps/api
import { baseConfig } from '@repo/eslint-config'
export default baseConfig
```

---

## 8. TypeScript Configuration

### Hierarchy

```
tsconfig.base.json (root, exists today — kept as canonical base)
  ↳ packages/shared/tsconfig.json   extends ../../tsconfig.base.json
  ↳ packages/ui/tsconfig.json       extends ../../tsconfig.base.json
  ↳ apps/api/tsconfig.json          extends ../../tsconfig.base.json
  ↳ apps/web/tsconfig.json          extends ../../tsconfig.base.json + Next.js overrides
```

### Strict settings (enforced in `tsconfig.base.json`)

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true,
  "exactOptionalPropertyTypes": true
}
```

---

## 9. Security

### `apps/api` (Express)

- Helmet.js for HTTP headers (already present, keep as-is)
- `express-rate-limit` per endpoint type (already present)
- CORS restricted to known origins
- Clerk JWT verification on protected routes
- Prisma parameterized queries (safe from SQL injection by default)

### `apps/web` (Next.js)

- CSP headers via `next.config.ts` `headers()`
- Clerk middleware protects all `/dashboard/*` routes
- Server Components do not expose secrets to client (never pass `CLERK_SECRET_KEY` to client components)
- `experimental.taint` in `next.config.ts` — prevents accidental serialization of sensitive objects

### Secrets management

- All secrets via `.env` (root level, Vite/Next.js both read from project root via `envDir`)
- `.env.example` updated with new vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`
- `.env` in `.gitignore` (already configured)

---

## 10. Docker

### Current state

`docker-compose.yml` has PostgreSQL only. This is correct and sufficient for local development.

### Changes

- Rename `container_name` from `repo-postgres` to match new project naming
- Add health check already present — keep as-is
- No app containers in `docker-compose.yml` for local dev (devs run apps via `turbo dev`)
- Add a `docker-compose.prod.yml` for full production deployment with `apps/web` and `apps/api` containers

---

## 11. CI/CD (`.github/workflows/ci.yml`)

### Pipeline stages (parallel where possible)

```
1. install (pnpm install with frozen lockfile)
2. [parallel]:
   - lint         (turbo run lint)
   - type-check   (turbo run type-check)
3. test           (turbo run test -- --coverage)
4. build          (turbo run build)
5. [optional] e2e (playwright, only on PR to main)
6. security-scan  (npm audit + CodeQL)
```

### Caching in CI

- pnpm store cache via `actions/cache`
- Turbo cache via `TURBO_TOKEN` (Vercel Remote Cache, optional)

---

## 12. Husky + lint-staged

### `.husky/pre-commit`

Runs `lint-staged` only (fast, scoped to changed files). Does not run `turbo` on pre-commit to keep commit speed acceptable.

### `lint-staged.config.mjs`

```js
{
  "**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "**/*.{json,md,yaml,yml}": ["prettier --write"]
}
```

### `.husky/commit-msg`

Runs `commitlint` — unchanged from current setup.

---

## 13. Claude Code Hooks (`.claude/settings.json`)

Post-tool-use hooks to enforce quality gates during AI-assisted development:

| Trigger                              | Command                                       | Purpose                           |
| ------------------------------------ | --------------------------------------------- | --------------------------------- |
| After `Write`/`Edit` on `*.ts,*.tsx` | `pnpm type-check` (scoped to changed package) | Catch type errors immediately     |
| After `Write`/`Edit` on `*.ts,*.tsx` | `pnpm lint` (scoped)                          | Catch lint violations immediately |
| After `Write`/`Edit` on `*.test.ts`  | `pnpm test` (scoped)                          | Verify tests pass after changes   |

---

## 14. Migration Steps (high-level, for implementation plan)

1. Install `turbo` and update root `package.json`
2. Update `pnpm-workspace.yaml` to `apps/* + packages/*`
3. Create `packages/eslint-config`
4. Create `packages/ui` with `shadcn init`
5. Move `packages/server` → `apps/api` (rename, update imports)
6. Create `apps/web` as Next.js 15 app (replaces `packages/client`)
7. Migrate React components from `packages/client/src` → `apps/web/app` + `apps/web/components`
8. Write `turbo.json`
9. Update root `package.json` scripts to use `turbo run`
10. Update `.npmrc`
11. Update `next.config.ts` with security headers
12. Update `apps/api/src/app.ts` CORS origins
13. Update CI workflow
14. Update `.claude/settings.json` hooks
15. Delete `packages/client` and `packages/server`
16. Verify full `turbo run build` and `turbo run test` pass

---

## 15. Out of Scope

- Migrating test coverage to Playwright E2E for all pages (existing unit tests are migrated)
- Adding a new database model or business logic
- Internationalization (i18n)
- Deployment configuration beyond `docker-compose.prod.yml`
