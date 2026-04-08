# Deployment Design: Vercel (Web) + Railway (API)

**Date:** 2026-04-08
**Status:** Approved

## Overview

Deploy the Turborepo monorepo across two platforms:

- **Vercel** — hosts `apps/web` (Next.js 15)
- **Railway** — hosts `apps/api` (Express 4 + Prisma 6)
- **Supabase** — existing PostgreSQL database

Clerk authentication is not yet integrated into the codebase and is excluded from this deployment.

## Architecture

```
Browser → Vercel (Next.js)
              ↓ /api/* proxy (NEXT_PUBLIC_API_URL)
          Railway (Express)
              ↓
          Supabase (PostgreSQL)
```

## Environment Variables

### Railway (API)

| Variable       | Value                                               |
| -------------- | --------------------------------------------------- |
| `NODE_ENV`     | `production`                                        |
| `DATABASE_URL` | Supabase production connection string (pooling URL) |
| `CORS_ORIGIN`  | Vercel web URL (e.g. `https://your-app.vercel.app`) |
| `PORT`         | Set by Railway automatically                        |

### Vercel (Web)

| Variable              | Value                                                    |
| --------------------- | -------------------------------------------------------- |
| `NODE_ENV`            | `production`                                             |
| `NEXT_PUBLIC_API_URL` | Railway API URL (e.g. `https://your-api.up.railway.app`) |

## Deployment Steps

### 1. Supabase — Get DATABASE_URL

- Use the **pooling connection string** (port 6543) from Supabase dashboard → Settings → Database
- This avoids connection exhaustion in production

### 2. Railway — Deploy API

1. Create account at railway.app (GitHub login)
2. New Project → Deploy from GitHub repo
3. Set **Root Directory** to `apps/api`
4. Set build command: `pnpm install && pnpm build`
5. Set start command: `node dist/index.js`
6. Add environment variables (DATABASE_URL, CORS_ORIGIN placeholder, NODE_ENV)
7. Run DB migration via Railway CLI or one-off command: `pnpm db:migrate:deploy`
8. Note the generated Railway URL (e.g. `https://xxx.up.railway.app`)

### 3. Vercel — Deploy Web

1. Import GitHub repo at vercel.com
2. Leave **Root Directory** as repo root (the root `vercel.json` already handles filtering to `apps/web` via `turbo --filter=@repo/web`)
3. Framework preset: Next.js (auto-detected via `vercel.json`)
4. Add environment variables (`NEXT_PUBLIC_API_URL` = Railway URL)
5. Deploy
6. Note the generated Vercel URL

### 4. Railway — Update CORS

- Update `CORS_ORIGIN` to the Vercel production URL
- Railway redeploys automatically

## Code Changes Required

### `vercel.json` (root)

The existing config is sufficient for web-only deployment:

```json
{
  "buildCommand": "pnpm turbo run build --filter=@repo/web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

### `apps/api` — Railway config

Add `railway.json` or `Procfile` to specify start command, or configure via Railway dashboard.

### `apps/api/src/middleware/security.ts`

Verify CORS middleware reads `CORS_ORIGIN` from env (already implemented).

## Success Criteria

- `https://your-app.vercel.app` loads the Next.js web app
- `https://xxx.up.railway.app/api/health` returns a 200 response
- Web app can call API endpoints through the `/api/*` proxy
- DB migrations have run successfully on Supabase
