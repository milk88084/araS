# Vercel + Railway Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy apps/web to Vercel and apps/api to Railway with Supabase as the PostgreSQL backend.

**Architecture:** Next.js web on Vercel (existing vercel.json), Express API on Railway (needs tsup build fix + railway.json). Web proxies /api/\* to Railway URL via NEXT_PUBLIC_API_URL env var.

**Tech Stack:** Next.js 15, Express 4, Prisma 6, Supabase (PostgreSQL), Vercel, Railway, tsup

---

## File Map

| Action   | File                      | Purpose                                         |
| -------- | ------------------------- | ----------------------------------------------- |
| Modify   | `apps/api/package.json`   | Add tsup dep, fix build/start scripts           |
| Create   | `apps/api/tsup.config.ts` | Bundle config: ESM output, resolve @repo/shared |
| Create   | `apps/api/railway.json`   | Railway build/start command config              |
| Existing | `vercel.json` (root)      | Already correct — no changes needed             |

---

## Task 1: Fix API Build with tsup

The current `build: tsc` + `noEmit: true` produces no output. `@repo/shared` is a workspace path alias that `tsc` won't resolve in output. Replace with `tsup` which bundles + resolves workspace deps.

**Files:**

- Modify: `apps/api/package.json`
- Create: `apps/api/tsup.config.ts`

- [ ] **Step 1: Add tsup as devDependency**

```bash
pnpm --filter @repo/api add -D tsup
```

- [ ] **Step 2: Create tsup config**

Create `apps/api/tsup.config.ts`:

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  target: "node22",
  sourcemap: true,
  clean: true,
  noExternal: ["@repo/shared"],
});
```

`noExternal: ["@repo/shared"]` forces tsup to bundle the workspace package inline (since Railway won't have it on the module path).

- [ ] **Step 3: Update build and start scripts in apps/api/package.json**

Change:

```json
"build": "tsc",
"start": "node dist/index.js",
```

To:

```json
"build": "tsup",
"start": "node dist/index.js",
```

Leave `"type-check": "tsc --noEmit"` unchanged — that's still needed for CI.

- [ ] **Step 4: Run build locally to verify output**

```bash
pnpm --filter @repo/api build
```

Expected: `dist/index.js` is created with no errors.

```bash
ls apps/api/dist/
```

Expected output: `index.js` (and optionally `index.js.map`)

- [ ] **Step 5: Verify the built file can start (smoke test)**

```bash
DATABASE_URL=postgresql://x CORS_ORIGIN=http://localhost:3000 node apps/api/dist/index.js
```

Expected: Server starts and logs `Server started` on port 3001. Kill with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json apps/api/tsup.config.ts pnpm-lock.yaml
git commit -m "build(api): replace tsc with tsup for production bundling"
```

---

## Task 2: Add Railway Config

**Files:**

- Create: `apps/api/railway.json`

- [ ] **Step 1: Create railway.json**

Create `apps/api/railway.json`:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

Railway uses Nixpacks to auto-detect Node.js + pnpm. The `startCommand` runs the compiled output. Health check uses the existing `/api/health` endpoint.

- [ ] **Step 2: Commit**

```bash
git add apps/api/railway.json
git commit -m "build(api): add railway deployment config"
```

- [ ] **Step 3: Push to GitHub**

```bash
git push
```

---

## Task 3: Deploy API to Railway (Manual Steps)

**No code changes — these are UI steps.**

- [ ] **Step 1: Create Railway account**

Go to [railway.app](https://railway.app) → Sign up with GitHub → Authorize Railway.

- [ ] **Step 2: Create new project**

Dashboard → New Project → Deploy from GitHub repo → select this repo.

- [ ] **Step 3: Configure root directory**

In the service settings → Source → Root Directory: set to `apps/api`

Railway will find `apps/api/railway.json` and use Nixpacks to detect pnpm + Node.

- [ ] **Step 4: Set environment variables**

In the service → Variables tab, add:

| Variable       | Value                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`     | `production`                                                                                                                          |
| `DATABASE_URL` | Supabase **pooling** connection string (Supabase dashboard → Settings → Database → Connection pooling → port 6543, mode: Transaction) |
| `CORS_ORIGIN`  | `https://placeholder.vercel.app` (update after Vercel deploy)                                                                         |

- [ ] **Step 5: Run database migrations**

In Railway service → Deploy → one-off command (or via Railway CLI):

```bash
npx railway run --service <your-service-name> pnpm db:migrate:deploy
```

Or use the Railway dashboard shell:

```bash
pnpm db:migrate:deploy
```

Expected: Prisma prints `All migrations applied successfully.`

- [ ] **Step 6: Verify deployment**

Wait for Railway to show "Active" status. Then open the Railway-provided URL (e.g. `https://your-api.up.railway.app`) and visit:

```
https://your-api.up.railway.app/api/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 12.3,
    "timestamp": "2026-04-08T...",
    "metrics": { "requestCount": 1, "errorRate": 0, "p95": 0 }
  }
}
```

**Save the Railway URL** — needed for the next task.

---

## Task 4: Deploy Web to Vercel (Manual Steps)

**No code changes — these are UI steps.**

- [ ] **Step 1: Import repo to Vercel**

Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub → select this repo.

- [ ] **Step 2: Configure project settings**

- Framework Preset: **Next.js** (auto-detected)
- Root Directory: leave **empty** (repo root) — `vercel.json` at root already handles the filter
- Build Command: leave empty (vercel.json provides it: `pnpm turbo run build --filter=@repo/web`)
- Output Directory: leave empty (vercel.json provides it: `apps/web/.next`)

- [ ] **Step 3: Set environment variables**

In Environment Variables section, add:

| Variable              | Value                                                            |
| --------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Railway URL from Task 3 (e.g. `https://your-api.up.railway.app`) |

- [ ] **Step 4: Deploy**

Click Deploy. Wait for the build to complete (~2-3 minutes).

Expected: Vercel shows deployment URL (e.g. `https://your-app.vercel.app`).

**Save the Vercel URL** — needed for the next task.

- [ ] **Step 5: Verify web app loads**

Open `https://your-app.vercel.app` in browser. The app should load without errors.

---

## Task 5: Update CORS on Railway

The API's `CORS_ORIGIN` was set to a placeholder in Task 3. Update it to the real Vercel URL.

**No code changes — Railway dashboard update.**

- [ ] **Step 1: Update CORS_ORIGIN in Railway**

Railway dashboard → your service → Variables:

Change:

```
CORS_ORIGIN = https://placeholder.vercel.app
```

To:

```
CORS_ORIGIN = https://your-app.vercel.app
```

(use the actual Vercel URL from Task 4)

Railway redeploys automatically after env var changes.

- [ ] **Step 2: End-to-end smoke test**

Open `https://your-app.vercel.app` → navigate to any page that calls the API.

In browser DevTools → Network tab: verify `/api/*` requests return 200 with no CORS errors.

Alternatively, from the browser console:

```javascript
fetch("/api/health")
  .then((r) => r.json())
  .then(console.log);
```

Expected: `{ success: true, data: { status: "healthy", ... } }`
