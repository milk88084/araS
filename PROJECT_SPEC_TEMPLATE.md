# Project Specification: Production Template

## 1. Overview

- **Project Name**: production-template
- **Scope**: `@repo/*` (monorepo with `@repo/client`, `@repo/server`, `@repo/shared`)
- **Description**: A production-ready React + Express monorepo starter template with Clerk authentication, Prisma ORM, comprehensive testing, and full CI/CD pipeline.
- **Persona**: Full-stack developers building SaaS products or internal tools who need a secure, tested, and well-architected starting point.
- **Business Goals**:
  - Reduce time-to-production for new projects
  - Enforce security best practices from day one
  - Provide a scalable architecture with clear separation of concerns

## 2. Tech Stack

| Layer       | Technology           | Version  |
| ----------- | -------------------- | -------- |
| Frontend    | React                | ^18.3.1  |
| Build       | Vite                 | ^6.0.0   |
| Backend     | Express              | ^4.21.0  |
| ORM         | Prisma               | ^6.0.0   |
| Database    | PostgreSQL           | 16       |
| Auth        | Clerk                | ^5.15.0  |
| Styling     | Tailwind CSS         | ^3.3.5   |
| Validation  | Zod                  | ^3.23.8  |
| Logging     | Pino                 | ^9.5.0   |
| Testing     | Vitest               | ^3.0.0   |
| E2E Testing | Playwright           | ^1.49.0  |
| API Testing | Supertest            | ^7.0.0   |
| Language    | TypeScript           | ^5.6.3   |
| Package Mgr | pnpm                 | ^9.14.2  |
| Runtime     | Node.js              | >=20.0.0 |

## 3. Features

### User Authentication (Clerk + Roles)
- Clerk-managed sign-up, sign-in, and session management
- Role-based access control: `admin`, `editor`, `viewer`
- User sync from Clerk to local database
- Profile management (update username, avatar)
- Protected routes (client-side and API-level)

### Posts (CRUD + Soft Delete)
- Create, Read, Update, Delete posts
- Soft delete with `deletedAt` timestamp (reversible)
- Admin-only restore capability
- Pagination with search and status filtering
- Author-based access control (owner or admin can modify)

### Shared Schemas
- Zod schemas shared between client and server (`@repo/shared`)
- `UserSchema`, `PostSchema`, `ApiSuccessSchema`, `ApiErrorSchema`
- REST envelope pattern for consistent API responses
- `PaginationMeta` for paginated endpoints

## 4. Architecture

### Pattern: Layered Architecture

```
Client (React + Vite)  →  API (Express)  →  Service  →  Repository (Prisma)
     ↕                         ↕                              ↕
  @repo/shared            @repo/shared                   PostgreSQL
```

### Directory Tree

```
production-template/
├── packages/
│   ├── client/          # React 18 + Vite + Tailwind 3.3.5
│   │   ├── src/
│   │   │   ├── components/  (layout/, ui/)
│   │   │   ├── pages/       (HomePage, PostsPage)
│   │   │   ├── lib/         (utils, api-client)
│   │   │   └── hooks/
│   │   ├── tests/
│   │   └── vitest.config.ts
│   ├── server/          # Express 4.21 + Prisma 6 + Clerk
│   │   ├── src/
│   │   │   ├── controllers/ (auth, posts)
│   │   │   ├── services/    (auth, posts)
│   │   │   ├── routes/      (health, auth, posts)
│   │   │   ├── middleware/  (auth, error, security, rate-limit, metrics)
│   │   │   └── lib/         (prisma, logger, envelope, env)
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── tests/
│   │   └── vitest.config.ts
│   └── shared/          # Shared Zod schemas
│       └── src/schemas/ (user, post, api)
├── tests/e2e/           # Playwright E2E tests
├── docker-compose.yml
├── playwright.config.ts
└── pnpm-workspace.yaml
```

### Design Decisions

1. **Monorepo with pnpm workspaces** — Shared code via `@repo/shared`, no duplication of schemas/types
2. **Layered server architecture** — Controllers handle HTTP, Services contain business logic, Prisma handles data access
3. **REST envelope pattern** — All API responses wrapped in `{ success, data, error, timestamp, meta }` for consistent client consumption
4. **Soft deletes** — Posts are never physically deleted; `deletedAt` field enables recovery and audit trails
5. **Clerk for auth** — Offloads identity management while syncing user data locally for relational queries

## 5. Security (OWASP Top 10)

| # | Category                        | Implementation                                                 |
|---|--------------------------------|---------------------------------------------------------------|
| 1 | Broken Access Control          | Clerk auth + role-based middleware (`requireRole`)            |
| 2 | Cryptographic Failures         | HTTPS enforced via HSTS, secrets in env vars (never committed)|
| 3 | Injection                      | Prisma parameterized queries, Zod input validation            |
| 4 | Insecure Design                | Layered architecture, principle of least privilege             |
| 5 | Security Misconfiguration      | Helmet.js security headers, CSP, hidden `X-Powered-By`       |
| 6 | Vulnerable Components          | Dependabot weekly scans, `pnpm audit` in CI                  |
| 7 | Auth Failures                  | Clerk-managed sessions, rate-limited auth endpoints           |
| 8 | Data Integrity Failures        | Zod schema validation on all API inputs/outputs               |
| 9 | Security Logging & Monitoring  | Pino structured logging, error rate + P95 alerts              |
| 10| Server-Side Request Forgery    | CORS whitelist, no user-controlled URL fetching               |

## 6. Testing

- **Framework**: Vitest 3.0
- **API Testing**: Supertest pattern for Express integration tests
- **E2E**: Playwright (placeholder tests, Chromium/Firefox/WebKit)
- **Coverage Target**: 80% (lines, functions, branches, statements)
- **Test Structure**:
  - `packages/server/tests/` — Unit + Integration (Supertest)
  - `packages/client/tests/` — Component tests (Testing Library)
  - `tests/e2e/` — End-to-end (Playwright)

## 7. Performance

| Metric         | Target    |
|----------------|-----------|
| FCP            | < 1.2s    |
| API p95        | < 500ms   |
| Lighthouse     | > 90      |

### Optimization Strategies
- Vite code splitting and tree shaking
- Prisma query optimization with selective `include`
- Express response compression
- React lazy loading for route-based code splitting
- Database indexing on frequently queried columns (`authorId`, `status`, `deletedAt`)

## 8. Tasks

6-task parallel plan with file ownership per terminal:

| Task | Package    | Scope                                      |
|------|-----------|-------------------------------------------|
| T1   | shared    | Zod schemas (user, post, api)             |
| T2   | server    | Express app, middleware, routes            |
| T3   | server    | Prisma schema, services, controllers      |
| T4   | client    | Vite setup, components, pages             |
| T5   | root      | Docker Compose, CI/CD, Playwright config  |
| T6   | root      | Documentation, env setup, final wiring    |

## 9. Definition of Done (DoD)

All of the following commands must pass:

```bash
pnpm type-check    # TypeScript strict mode, no errors
pnpm lint           # ESLint passes across all packages
pnpm test           # Vitest passes with ≥80% coverage
```

Additional checks:
- Docker Compose starts PostgreSQL without errors
- Prisma migrations apply cleanly
- All OWASP security controls are implemented
- REST envelope format verified in tests

## 10. Workflow

**Project root**: `C:\Users\user\next-production-template`

### Development workflow:
```bash
# Start infrastructure
pnpm docker:up

# Generate Prisma client
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Start dev servers (parallel)
pnpm dev
```

### Validation workflow:
```bash
pnpm build && pnpm lint && pnpm type-check && pnpm test
```

## 11. Monitoring

- **Logger**: Pino with structured JSON output
- **Metrics collected**: request count, error count, response times
- **P95 latency tracking**: rolling window of last 1000 requests

### Alert Thresholds

| Metric     | Warning  | Critical |
|------------|----------|----------|
| Error Rate | > 5%     | > 1%     |
| P95 Latency| > 2000ms | > 1000ms |

### Health Endpoint
`GET /api/health` returns current metrics (uptime, request count, error rate, P95).

## 12. Deployment

### Docker Compose (Development)

| Service    | Port  | Description       |
|-----------|-------|-------------------|
| Client    | 5173  | Vite dev server   |
| Server    | 3001  | Express API       |
| PostgreSQL| 5434  | Database          |

### Prisma Commands

```bash
pnpm db:migrate          # Create and apply migration
pnpm db:migrate:deploy   # Apply in production
pnpm db:rollback         # Roll back last migration
pnpm db:studio           # Visual database browser
```

## 13. Success Criteria

- [ ] **80% test coverage** across all packages
- [ ] **API p95 < 500ms** under normal load
- [ ] **OWASP verification**: All 10 categories addressed
- [ ] All `pnpm type-check`, `pnpm lint`, `pnpm test` pass
- [ ] Docker Compose starts cleanly
- [ ] Clerk auth flow works end-to-end
- [ ] Posts CRUD with soft delete verified

## 14. Q&A

### Open Questions
1. **Production hosting**: Vercel + Railway, or Docker-based (AWS/GCP)?
2. **Email notifications**: Should post status changes trigger notifications?
3. **File uploads**: Will posts need image/file attachment support?

### Assumptions (with Impact Analysis)
1. **PostgreSQL is the primary database** — Impact: Prisma schema, Docker config, CI services all assume PostgreSQL. Switching would require schema migration.
2. **Clerk handles all identity** — Impact: No local password storage. If Clerk is replaced, auth middleware, user sync, and client components all need rewriting.
3. **Soft deletes only for posts** — Impact: Users are not soft-deleted. If needed later, requires schema migration and service changes.
4. **pnpm as package manager** — Impact: All CI workflows, scripts, and lockfile assume pnpm. Switching to npm/yarn requires updating `package.json` scripts and CI configs.

## 15. Appendix

### Glossary

| Term           | Definition                                                        |
|----------------|-------------------------------------------------------------------|
| REST Envelope  | Standard API response wrapper: `{ success, data, error, timestamp }` |
| Soft Delete    | Marking records as deleted (`deletedAt`) without physical removal  |
| P95            | 95th percentile of response times                                  |
| Layered Arch   | Separation into Controllers → Services → Repository layers        |
| Monorepo       | Single repository containing multiple packages (`@repo/*`)        |
| Clerk          | Third-party authentication-as-a-service provider                   |
| Zod            | TypeScript-first schema validation library                         |

### Resource Paths

| Resource              | Path                                          |
|-----------------------|-----------------------------------------------|
| Client source         | `packages/client/src/`                        |
| Server source         | `packages/server/src/`                        |
| Shared schemas        | `packages/shared/src/schemas/`                |
| Prisma schema         | `packages/server/prisma/schema.prisma`        |
| Docker Compose        | `docker-compose.yml`                          |
| CI workflow           | `.github/workflows/ci.yml`                    |
| Playwright config     | `playwright.config.ts`                        |
| Environment template  | `.env.example`                                |

### Version History

| Version | Date       | Changes                                       |
|---------|------------|-----------------------------------------------|
| 0.1.0   | 2026-03-01 | Initial spec — monorepo structure, all 15 sections |
