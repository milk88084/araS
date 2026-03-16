# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                  # Start all via Turborepo (web :3000, api :3001)

# Quality checks
pnpm lint
pnpm type-check
pnpm test
pnpm test:coverage        # With 80% threshold enforcement
pnpm test:e2e             # Playwright

# Run a single test file
pnpm --filter @repo/api test -- apps/api/tests/posts.test.ts

# Database
pnpm docker:up            # Start PostgreSQL on port 5434
pnpm db:generate          # Generate Prisma client after schema changes
pnpm db:migrate           # Run migrations (dev)
pnpm db:studio            # Prisma Studio UI
```

## Architecture

Turborepo pnpm monorepo:

```
apps/
  web/      # Next.js 15 App Router + React 19 + Tailwind CSS 4 + Clerk (@repo/web)
  api/      # Express 4 + Prisma 6 + Clerk (@repo/api)
packages/
  ui/       # shadcn/ui shared components (@repo/ui)
  shared/   # Zod schemas + shared types (@repo/shared)
  eslint-config/  # Shared ESLint rules (@repo/eslint-config)
```

- **`@repo/web`** — Next.js 15 App Router. `apps/web` rewrites `/api/*` to `localhost:3001/api/*` in dev. Clerk via `@clerk/nextjs`.
- **`@repo/api`** — Express 4 + Prisma 6 + Clerk. ESM (`"type": "module"`), so imports require `.js` extensions. Uses `dotenv-cli` + `tsx watch` for dev.
- **`@repo/shared`** — Zod schemas shared by both apps. No build step — resolved directly to source.
- **`@repo/ui`** — shadcn/ui components. No build step — exports `.tsx` source directly.
- **`@repo/eslint-config`** — Shared ESLint rules. `index.js` (base), `react.js`, `next.js`.

### API request lifecycle

```
Request → securityHeaders → CORS → JSON body → metricsMiddleware → clerkAuth → apiRateLimit → routes → errorHandler
```

### Layered architecture

Controllers (`src/controllers/`) handle HTTP parsing and call services. Services (`src/services/`) contain business logic and call Prisma. Controllers use `sendSuccess` / `sendError` / `sendPaginated` from `src/lib/envelope.ts` to produce the standard `{ success, data|error, timestamp }` envelope defined in `@repo/shared`.

### API response envelope

All responses use `ApiResponse<T>` from `@repo/shared`:

- Success: `{ success: true, data: T, meta?: PaginationMeta, timestamp: string }`
- Error: `{ success: false, error: { code, message, details? }, timestamp: string }`

### Auth

Clerk is used for authentication. In `apps/api`, `clerkAuth` middleware runs globally; use `requireAuthentication` + `requireRole(...roles)` on protected routes. `requireRole` looks up the user in the Prisma `User` table by `clerkId` and attaches `req.dbUser`. Roles: `admin`, `editor`, `viewer`.

In `apps/web`, `middleware.ts` uses `clerkMiddleware` to protect `/dashboard/*` and `/posts/*` routes. Server Components use `auth()` from `@clerk/nextjs/server`. Client Components use `useAuth()` from `@clerk/nextjs`.

### Data model

- `User`: linked to Clerk via `clerkId`, has `role` (admin/editor/viewer)
- `Post`: `draft`/`published`/`archived` status, soft-deleted via `deletedAt`

### Env vars

Root `.env` is the single source of truth. `apps/web` loads it via `next dev --env-file ../../.env`. `apps/api` loads it via `dotenv -e ../../.env --`. See `.env.example`. Key vars: `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`, `CORS_ORIGIN`.

## Reference Resources

| Resource                        | URL                                             | Description                                          |
| ------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| MCP Servers (community curated) | https://github.com/modelcontextprotocol/servers | Community-maintained list of recommended MCP servers |
| Agents                          | https://github.com/wshobson/agents              | Agent implementations and patterns reference         |

## Installed Plugins

| Plugin                 | Scope | Purpose                                                                                                                                                                            |
| ---------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **superpowers** v5.0.2 | user  | Skills system: brainstorming, TDD, debugging, plan writing/execution, code review, git worktrees, parallel agents, and more. Always check for applicable skills before responding. |
| **playwright**         | user  | Browser automation via MCP — navigate, click, fill forms, take screenshots, inspect network, etc. Use for E2E testing and UI verification.                                         |
| **code-simplifier**    | user  | Reviews recently changed code for reuse, quality, and efficiency, then fixes issues found. Invoke with `/simplify`.                                                                |
| **skill-creator**      | user  | Create, modify, and evaluate skills. Benchmark skill performance and optimize trigger descriptions.                                                                                |
| **greptile**           | local | AI-powered codebase search and Q&A grounded in this repository. Use for deep semantic code searches and understanding unfamiliar code paths.                                       |

## Conventions

- **Commits**: Conventional Commits enforced by commitlint + husky. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Subject must be lowercase.
- **Tests**: `apps/api` tests mock Prisma and logger via `vi.mock`. `apps/web` tests use jsdom + React Testing Library.
- **Imports in api**: Always use `.js` extension on relative imports (ESM requirement).
- **Tailwind**: `apps/web` uses Tailwind CSS 4 — config is in `app/globals.css` via `@theme` block, not `tailwind.config.ts`.
