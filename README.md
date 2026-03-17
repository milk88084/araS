# Production Template

A production-ready **Next.js 15 + Express** monorepo with Clerk authentication, Prisma ORM, and comprehensive testing.

## Tech Stack

| Layer    | Technology                             |
| -------- | -------------------------------------- |
| Frontend | Next.js 15 + React 19 + Tailwind CSS 4 |
| Backend  | Express 4 + Prisma 6                   |
| Auth     | Clerk                                  |
| Database | PostgreSQL 16                          |
| Testing  | Vitest + Supertest + Playwright        |
| Logging  | Pino                                   |
| Language | TypeScript 5 (strict)                  |
| Monorepo | Turborepo + pnpm workspaces            |

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd production-template
pnpm install

# 2. Set up environment
cp .env.example .env
# → Open .env and fill in CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# 3. Start the database
pnpm docker:up

# 4. Run database migrations
pnpm db:generate
pnpm db:migrate

# 5. Start development servers
pnpm dev
# → Web app: http://localhost:3000
# → API:     http://localhost:3001
```

See **[SETUP.md](SETUP.md)** for full setup instructions including how to get Clerk keys.

## Project Structure

```
apps/
├── web/       Next.js 15 App Router + Tailwind CSS 4   (port 3000)
└── api/       Express 4 + Prisma 6 + Clerk             (port 3001)
packages/
├── ui/        shadcn/ui shared components
├── shared/    Shared Zod schemas (@repo/shared)
└── eslint-config/  Shared ESLint rules
```

## Scripts

| Command              | Description                        |
| -------------------- | ---------------------------------- |
| `pnpm dev`           | Start all apps in development mode |
| `pnpm build`         | Build all packages                 |
| `pnpm lint`          | Lint all packages                  |
| `pnpm type-check`    | TypeScript check all packages      |
| `pnpm test`          | Run all tests                      |
| `pnpm test:coverage` | Run tests with coverage report     |
| `pnpm test:e2e`      | Run Playwright E2E tests           |
| `pnpm docker:up`     | Start PostgreSQL via Docker        |
| `pnpm db:migrate`    | Run Prisma migrations              |
| `pnpm db:studio`     | Open Prisma Studio (database GUI)  |

## Features

- **Authentication**: Clerk with role-based access (admin, editor, viewer)
- **Posts CRUD**: Create, read, update, soft-delete with pagination
- **REST Envelope**: Consistent `{ success, data, error, timestamp }` API responses
- **Security**: Helmet, CORS, CSP, rate limiting, input validation (OWASP Top 10)
- **Monitoring**: Pino structured logging with P95 tracking
- **Testing**: 80% coverage target with Vitest + Supertest + Playwright

## License

MIT
