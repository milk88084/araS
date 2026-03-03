# Project Setup Guide

This guide will walk you through the steps to get the `next-production-template` project up and running on your local development machine.

---

## 1. Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: `v20.0.0` or higher.
- **Pnpm**: `v9.0.0` or higher.
- **Docker & Docker Compose**: For running the PostgreSQL database.
- **Git**: For version control.

---

## 2. Initial Setup

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd next-production-template
```

### Step 2: Install Dependencies
This project uses `pnpm` monorepo. Run the following command from the root directory:
```bash
pnpm install
```

### Step 3: Configure Environment Variables
Copy the example environment file and update it with your local settings (e.g., Clerk API keys).
```bash
cp .env.example .env
```
> **Note:** Open `.env` and ensure the `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` are correctly set for your local development.

---

## 3. Infrastructure & Database

### Step 1: Start PostgreSQL via Docker
The project includes a `docker-compose.yml` for the database.
```bash
pnpm docker:up
```

### Step 2: Initialize Prisma
Once the database is running, generate the Prisma client and push the schema:
```bash
pnpm db:generate
pnpm db:push
```
*Alternatively, use `pnpm db:migrate` if you want to apply existing migrations.*

---

## 4. Running the Project

### Start Everything (Parallel)
This command will start the `client`, `server`, and `shared` packages in development mode:
```bash
pnpm dev
```

### Start Individual Packages
- **Frontend only**: `pnpm dev:client` (runs on `http://localhost:5173`)
- **Backend only**: `pnpm dev:server` (runs on `http://localhost:3001`)

---

## 5. Development Tools & Commands

### Code Quality
- **Linting**: `pnpm lint`
- **Type Checking**: `pnpm type-check`
- **Formatting**: `pnpm exec prettier --write .`

### Testing
- **Unit Tests**: `pnpm test` (Vitest)
- **E2E Tests**: `pnpm test:e2e` (Playwright)

### Database Management
- **Prisma Studio**: `pnpm db:studio` (GUI for database)

---

## 6. Project Structure Overview
- `packages/shared`: Shared Zod schemas and TypeScript types.
- `packages/server`: Express backend with Prisma.
- `packages/client`: React frontend with Vite and TailwindCSS.
- `tests/e2e`: End-to-end test suite.
