# Setup Guide

Clone this repo and have the full stack running in about 10 minutes.

---

## Prerequisites

| Tool           | Version | Install                                        |
| -------------- | ------- | ---------------------------------------------- |
| Node.js        | ≥ 20    | https://nodejs.org                             |
| pnpm           | ≥ 9     | `npm install -g pnpm`                          |
| Docker Desktop | any     | https://www.docker.com/products/docker-desktop |
| Git            | any     | https://git-scm.com                            |

---

## Step 1 — Clone and Install

```bash
git clone <repo-url>
cd next-production-template
git checkout dev
pnpm install
```

---

## Step 2 — Configure Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Open `.env`. The only values you **must** fill in to run the app are the **Clerk keys**.

### Getting Clerk Keys (free)

1. Go to [https://clerk.com](https://clerk.com) and create a free account
2. Create a new application (choose "Email" or "Google" sign-in)
3. Go to **API Keys** in your Clerk dashboard
4. Copy the two keys into your `.env`:

```env
CLERK_SECRET_KEY=<your-clerk-secret-key>                # "Secret key" from Clerk dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-publishable-key>  # "Publishable key" from Clerk dashboard
```

> **Skip Clerk entirely?** Leave the keys as the placeholder values from `.env.example`. The app will run without auth — all routes will be accessible without signing in.

### Other Variables (already set for local dev)

| Variable              | Default value                                                       | Change?                              |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| `DATABASE_URL`        | `postgresql://postgres:postgres@localhost:5434/production_template` | Only if you use a different database |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001`                                             | No                                   |
| `CORS_ORIGIN`         | `http://localhost:5173,http://localhost:3000`                       | No                                   |
| `PORT`                | `3001`                                                              | No                                   |

---

## Step 3 — Start the Database

```bash
pnpm docker:up
```

This starts a PostgreSQL 16 container on port **5434**.

> Requires Docker Desktop to be running.

---

## Step 4 — Initialize the Database

```bash
pnpm db:generate   # Generate Prisma client
pnpm db:migrate    # Apply database migrations
```

---

## Step 5 — Start Development

```bash
pnpm dev
```

| App     | URL                   |
| ------- | --------------------- |
| Web app | http://localhost:3000 |
| API     | http://localhost:3001 |

Open http://localhost:3000 — you should see the home page.

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

**`pnpm docker:up` fails**
→ Make sure Docker Desktop is running.

**`pnpm db:migrate` fails**
→ Make sure `pnpm docker:up` ran first and the container is healthy.

**Clerk sign-in doesn't work**
→ Check that `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are set correctly in `.env`. They must match the same Clerk application.

**Port 3000 or 3001 already in use**
→ Stop the conflicting process or change the port in `apps/web/package.json` (`--port 3000`) and `apps/api/src/lib/env.ts` (`PORT`).

---

## Useful Commands

```bash
pnpm db:studio          # Open Prisma Studio (database GUI) at http://localhost:5555
pnpm db:migrate         # Apply new migrations
pnpm test               # Run all tests
pnpm type-check         # TypeScript check
pnpm lint               # Lint all packages
```
