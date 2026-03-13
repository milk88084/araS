# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                  # Start all (client :5173, server :3001)
pnpm dev:client           # Client only
pnpm dev:server           # Server only

# Quality checks
pnpm lint
pnpm type-check
pnpm test
pnpm test:coverage        # With 80% threshold enforcement
pnpm test:e2e             # Playwright

# Run a single test file
pnpm --filter @repo/server test -- packages/server/tests/posts.test.ts
pnpm --filter @repo/client test -- packages/client/tests/HomePage.test.tsx

# Database
pnpm docker:up            # Start PostgreSQL on port 5434
pnpm db:generate          # Generate Prisma client after schema changes
pnpm db:migrate           # Run migrations (dev)
pnpm db:studio            # Prisma Studio UI
```

## Architecture

pnpm monorepo with three packages:

- **`@repo/client`** — React 18 + Vite + Tailwind CSS 3.3. `@` alias maps to `./src`. Vite proxies `/api` to `localhost:3001`.
- **`@repo/server`** — Express 4 + Prisma 6 + Clerk. ESM (`"type": "module"`), so imports require `.js` extensions. Uses `tsx watch` for dev.
- **`@repo/shared`** — Zod schemas shared by both packages. Both packages resolve `@repo/shared` directly to `../shared/src` (no build step needed).

### Server request lifecycle

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

Clerk is used for authentication. `clerkAuth` middleware runs globally; use `requireAuthentication` + `requireRole(...roles)` on protected routes. `requireRole` looks up the user in the Prisma `User` table by `clerkId` and attaches `req.dbUser`. Roles: `admin`, `editor`, `viewer`.

### Data model

- `User`: linked to Clerk via `clerkId`, has `role` (admin/editor/viewer)
- `Post`: `draft`/`published`/`archived` status, soft-deleted via `deletedAt`

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
- **Env vars**: Root `.env` file (Vite reads from project root via `envDir`). See `.env.example`. Key vars: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`.
- **Tests**: Server tests mock Prisma and logger via `vi.mock`. Client tests use jsdom + React Testing Library.
- **Imports in server**: Always use `.js` extension on relative imports (ESM requirement).
