# Production Template

A production-ready React + Express monorepo with Clerk authentication, Prisma ORM, and comprehensive testing.

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 18 + Vite + Tailwind CSS 3.3 |
| Backend  | Express 4.21 + Prisma 6            |
| Auth     | Clerk                               |
| Database | PostgreSQL 16                       |
| Testing  | Vitest 3.0 + Supertest + Playwright|
| Logging  | Pino                                |
| Language | TypeScript 5.6 (strict mode)        |

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd production-template
pnpm install

# Start PostgreSQL
pnpm docker:up

# Setup database
pnpm db:generate
pnpm db:migrate

# Configure environment
cp .env.example .env

# Start development (client on :5173, server on :3001)
pnpm dev
```

## Project Structure

```
packages/
├── client/    React 18 + Vite + Tailwind 3.3.5 (port 5173)
├── server/    Express 4.21 + Prisma 6 + Clerk  (port 3001)
└── shared/    Shared Zod schemas (@repo/shared)
```

## Scripts

| Command              | Description                       |
| -------------------- | --------------------------------- |
| `pnpm dev`           | Start all dev servers in parallel |
| `pnpm build`         | Build all packages                |
| `pnpm lint`          | Lint all packages                 |
| `pnpm type-check`    | TypeScript check all packages     |
| `pnpm test`          | Run all tests                     |
| `pnpm test:coverage` | Run tests with coverage report    |
| `pnpm test:e2e`      | Run Playwright E2E tests          |
| `pnpm docker:up`     | Start PostgreSQL (port 5434)      |
| `pnpm db:migrate`    | Run Prisma migrations             |
| `pnpm db:studio`     | Open Prisma Studio                |

## Features

- **Authentication**: Clerk with role-based access (admin, editor, viewer)
- **Posts CRUD**: Create, read, update, soft-delete posts with pagination
- **REST Envelope**: Consistent `{ success, data, error, timestamp }` API responses
- **Security**: Helmet, CORS, CSP, rate limiting, input validation (OWASP Top 10)
- **Monitoring**: Pino structured logging with P95 tracking and alert thresholds
- **Testing**: 80% coverage target with Vitest + Supertest + Playwright

## Architecture

```
Client (React)  →  API (Express)  →  Service  →  Prisma  →  PostgreSQL
       ↕                 ↕
    @repo/shared     @repo/shared
```

Layered architecture: Controllers handle HTTP concerns, Services contain business logic, Prisma handles data access.

## Environment Variables

See `.env.example` for all required variables. Key ones:

- `DATABASE_URL` — PostgreSQL connection string
- `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` — Clerk auth keys
- `VITE_CLERK_PUBLISHABLE_KEY` — Client-side Clerk key

## License

MIT
