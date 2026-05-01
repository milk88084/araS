# Setup Guide

Clone this repo and have the full stack running in about 10 minutes.

---

## Prerequisites

| Tool    | Version | Install               |
| ------- | ------- | --------------------- |
| Node.js | ≥ 20    | https://nodejs.org    |
| pnpm    | ≥ 9     | `npm install -g pnpm` |
| Git     | any     | https://git-scm.com   |

> No Docker required — the database runs on Supabase (cloud).

---

## Step 1 — Clone and Install

```bash
git clone <repo-url>
cd araS
git checkout dev
pnpm install
```

---

## Step 2 — Configure Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Open `.env` and fill in the following values:

### Getting Supabase Credentials (required)

1. Go to [https://supabase.com](https://supabase.com) and open the project
2. Go to **Project Settings → Database → Connection string**
3. Copy the two URLs into your `.env`:

```env
# Use "Transaction" mode (port 6543) for DATABASE_URL
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true

# Use "Session" mode (port 5432) for DIRECT_URL
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres
```

> Both URLs are needed — `DATABASE_URL` is used at runtime (via PgBouncer), `DIRECT_URL` is used by Prisma migrations.

### Other Variables (already set for local dev)

| Variable              | Default value                                 | Change? |
| --------------------- | --------------------------------------------- | ------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001`                       | No      |
| `CORS_ORIGIN`         | `http://localhost:5173,http://localhost:3000` | No      |
| `PORT`                | `3001`                                        | No      |

---

## Step 3 — Initialize Prisma

```bash
# Generate Prisma client from schema
pnpm --filter @repo/web db:generate

# Deploy all migrations to Supabase (creates all tables)
pnpm --filter @repo/web db:migrate:deploy
```

> The database is shared on Supabase — all machines connect to the same instance. No seeding needed.

---

## Step 4 — Start Development

```bash
pnpm dev
```

| App     | URL                   |
| ------- | --------------------- |
| Web app | http://localhost:3000 |
| API     | http://localhost:3001 |

---

## Verify Everything Works

```bash
# API health check
curl http://localhost:3001/api/health
# Expected: {"success":true,"data":{"status":"ok"},...}

# API proxied through Next.js
curl http://localhost:3000/api/health
# Expected: same response
```

---

## Common Issues

**`pnpm --filter @repo/web db:migrate:deploy` fails**
→ Check that `DATABASE_URL` and `DIRECT_URL` are correctly set in `.env`. Both must point to the same Supabase project.

**App starts but shows no data**
→ Run `pnpm --filter @repo/web db:generate` then restart `pnpm dev`. If tables are missing, re-run `db:migrate:deploy`.

**Port 3000 or 3001 already in use**
→ Stop the conflicting process or change the port in `apps/web/package.json` (`--port 3000`) and `apps/api/src/lib/env.ts` (`PORT`).

---

## Useful Commands

```bash
pnpm --filter @repo/web db:studio      # Open Prisma Studio (database GUI) at http://localhost:5555
pnpm --filter @repo/web db:migrate:deploy  # Apply new migrations to Supabase
pnpm test                              # Run all tests
pnpm type-check                        # TypeScript check
pnpm lint                              # Lint all packages
```
