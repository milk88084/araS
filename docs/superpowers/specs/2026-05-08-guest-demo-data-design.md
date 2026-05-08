# Guest Demo Data Design

**Date:** 2026-05-08
**Status:** Approved

## Overview

Add per-user data isolation via Clerk `userId` on all data models. Unauthenticated guests see
static demo data loaded from a JSON file; authenticated users see and manage their own database
records.

## Goals

- Only logged-in users can read/write their own data
- Guests browse with demo data (no DB access)
- Guest mutations apply optimistically in UI state only — they vanish on refresh
- Zero changes to page files

## Non-Goals

- No demo banner or explicit "demo mode" UI indicator
- No server-side demo data serving (demo JSON loads client-side only)
- No guest-specific routes or duplicate pages

## Architecture

### Data Flow

```
Guest  → FinanceDataProvider calls fetchAll(false) → import demo.json → UI state
Signed → FinanceDataProvider calls fetchAll(true)  → /api/* (userId filtered) → UI state

Guest mutation  → update UI state only (fake id, no API call)
Signed mutation → API call + refetch
```

### 1. Prisma Schema Changes

Add `userId String` to three top-level models. `Loan`, `Insurance`, and `EntryHistory` are
accessed only through their parent `Entry` and do not need a direct `userId` field.

`PortfolioItem.symbol` is currently `@unique`. With multi-user support, uniqueness must be
per-user, so this constraint changes to `@@unique([userId, symbol])`.

```prisma
model Entry {
  userId String
  // ... existing fields unchanged
  @@index([userId])
}

model Transaction {
  userId String
  // ... existing fields unchanged
  @@index([userId])
}

model PortfolioItem {
  userId String
  // ... existing fields unchanged, symbol @unique removed
  @@unique([userId, symbol])
  @@index([userId])
}
```

### 2. Migration Strategy

Three-step migration to safely add non-nullable columns:

1. Add `userId String?` (nullable) to Entry, Transaction, PortfolioItem — `pnpm db:migrate`
2. Run SQL backfill:
   ```sql
   UPDATE "Entry"         SET "userId" = 'user_3DQekdndCosGqQz3CsR9q5mMvcm' WHERE "userId" IS NULL;
   UPDATE "Transaction"   SET "userId" = 'user_3DQekdndCosGqQz3CsR9q5mMvcm' WHERE "userId" IS NULL;
   UPDATE "PortfolioItem" SET "userId" = 'user_3DQekdndCosGqQz3CsR9q5mMvcm' WHERE "userId" IS NULL;
   ```
3. Change to `userId String` (non-nullable) + swap `PortfolioItem` unique constraint — `pnpm db:migrate`

Demo JSON export (`pnpm export:demo`) runs **before step 1** to capture current data cleanly.

**Owner userId for all existing data:** `user_3DQekdndCosGqQz3CsR9q5mMvcm`

### 3. Service Layer Changes

API routes delegate to service files (e.g. `apps/web/services/entries.service.ts`). The `userId`
filtering belongs in the service layer, not in route handlers. Routes extract `userId` from Clerk
`auth()` and pass it into service calls.

**Route handler pattern (all affected routes):**

```typescript
// apps/web/app/api/entries/route.ts
import { auth } from "@clerk/nextjs/server";
import { entriesService } from "@/services/entries.service";
import { ok, handleError } from "@/lib/api-response";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const entries = await entriesService.list(userId);
    return ok(entries);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const data = CreateEntrySchema.parse(await req.json());
    const entry = await entriesService.create(data, userId);
    return ok(entry, 201);
  } catch (e) {
    return handleError(e);
  }
}
```

**Service layer pattern:**

```typescript
// entries.service.ts
list(userId: string) {
  return prisma.entry.findMany({ where: { userId }, include: { loan: true, insurance: true } });
}

create(data: CreateEntry, userId: string) {
  return prisma.entry.create({ data: { ...data, userId } });
}

update(id: string, data: UpdateEntry, userId: string) {
  return prisma.entry.update({ where: { id, userId }, data });
}

delete(id: string, userId: string) {
  return prisma.entry.delete({ where: { id, userId } });
}
```

**For Loan / Insurance routes (ownership via Entry relation):**

```typescript
// GET all loans for user
prisma.loan.findMany({ where: { entry: { userId } } });

// Ownership check before mutation
const loan = await prisma.loan.findFirst({ where: { id, entry: { userId } } });
if (!loan) return Response.json({ error: "Not found" }, { status: 404 });
```

**Affected routes:**

- `GET/POST /api/entries`
- `GET/PUT/DELETE /api/entries/[id]`
- `GET/POST/PUT/DELETE /api/entries/[id]/history`
- `GET/POST /api/transactions`
- `GET/DELETE /api/transactions/[id]`
- `GET/POST /api/portfolio`
- `GET/DELETE /api/portfolio/[id]`
- `GET/POST /api/loans`
- `GET/PUT/DELETE /api/loans/[id]`
- `POST /api/loans/[id]/rate`
- `POST /api/loans/[id]/sync`

Market data routes (`/api/stocks/*`, `/api/quotes/*`, `/api/exchange-rate`,
`/api/cathaylife-rates`, `/api/health`) are public and do not change.

### 4. Zustand Store (`useFinanceStore`)

**File:** `apps/web/store/useFinanceStore.ts`

**State additions:**

```typescript
interface FinanceState {
  // existing fields unchanged
  isGuest: boolean; // new
  fetchAll: (isSignedIn?: boolean) => Promise<void>; // signature change
  // all mutation signatures unchanged
}
```

**`fetchAll` updated logic:**

```typescript
fetchAll: async (isSignedIn?: boolean) => {
  const { lastFetchedAt, isGuest } = get();

  // Called from pages (no arg) — skip if data already loaded
  if (isSignedIn === undefined) {
    if (lastFetchedAt) return;
    return;
  }

  // Skip refetch if auth state unchanged and cache is warm
  if (
    lastFetchedAt &&
    Date.now() - lastFetchedAt < 30_000 &&
    isGuest === !isSignedIn
  ) return;

  if (!isSignedIn) {
    // Guest: load static demo data
    const demo = (await import("@/data/demo.json")).default;
    set((s) => {
      const snapshots =
        s.valueSnapshots.length === 0 && demo.entries.length > 0
          ? [makeSnapshot(demo.entries)]
          : s.valueSnapshots;
      return {
        entries: demo.entries,
        transactions: demo.transactions,
        portfolio: demo.portfolio,
        valueSnapshots: snapshots,
        isGuest: true,
        loading: false,
        error: null,
        lastFetchedAt: Date.now(),
      };
    });
    return;
  }

  // Signed in: original API fetch logic unchanged
  set({ isGuest: false, loading: true, error: null });
  try {
    const [entries, transactions, portfolio] = await Promise.all([
      apiFetch<Entry[]>("/api/entries"),
      apiFetch<Transaction[]>("/api/transactions"),
      apiFetch<PortfolioItem[]>("/api/portfolio"),
    ]);
    set((s) => {
      const snapshots =
        s.valueSnapshots.length === 0 && entries.length > 0
          ? [makeSnapshot(entries)]
          : s.valueSnapshots;
      return {
        entries, transactions, portfolio,
        valueSnapshots: snapshots,
        loading: false,
        lastFetchedAt: Date.now(),
      };
    });
  } catch (e) {
    set({ loading: false, error: e instanceof Error ? e.message : "Failed to fetch data" });
  }
},
```

**Mutation guest guard (same pattern for all mutations):**

```typescript
addEntry: async (data) => {
  if (get().isGuest) {
    const fakeEntry = { ...data, id: `demo-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    set((s) => ({ entries: [...s.entries, fakeEntry] }));
    return;
  }
  // existing API call logic unchanged
},

deleteEntry: async (id) => {
  if (get().isGuest) {
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    return;
  }
  // existing API call logic unchanged
},

updateEntry: async (id, data) => {
  if (get().isGuest) {
    set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...data } : e)) }));
    return;
  }
  // existing API call logic unchanged
},
```

Apply the same guard to: `addTransaction`, `deleteTransaction`, `addPortfolioItem`,
`deletePortfolioItem`.

**Initial state:**

```typescript
isGuest: false,
```

### 5. FinanceDataProvider (New Client Component)

The finance layout is a Server Component and cannot use `useAuth()`. A new thin client component
handles the auth-to-store bridge. Pages keep their existing `fetchAll()` no-arg calls; those
calls hit the 30-second cache and are no-ops after the provider has run.

**New file:** `apps/web/components/layout/FinanceDataProvider.tsx`

```typescript
"use client";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";

export function FinanceDataProvider() {
  const { isSignedIn } = useAuth();
  const fetchAll = useFinanceStore((s) => s.fetchAll);

  useEffect(() => {
    if (isSignedIn !== undefined) {
      fetchAll(isSignedIn);
    }
  }, [isSignedIn, fetchAll]);

  return null;
}
```

**Updated finance layout** (`apps/web/app/(finance)/layout.tsx`):

```typescript
import { BottomNav } from "../../components/layout/BottomNav";
import { NavProvider } from "./nav-context";
import { FinanceDataProvider } from "../../components/layout/FinanceDataProvider";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavProvider>
      <FinanceDataProvider />
      <div className="min-h-screen bg-[#f2f2f7]">
        <BottomNav />
        <div className="mx-auto max-w-md pt-16">{children}</div>
      </div>
    </NavProvider>
  );
}
```

### 6. Demo JSON

**Location:** `apps/web/data/demo.json`

**Shape:**

```json
{
  "entries": [],
  "transactions": [],
  "portfolio": []
}
```

Loans and insurance are loaded by pages via their own API routes (not in the store's
`fetchAll`), so they are not included in the demo JSON. Those routes return 401 for guests;
any page displaying loan/insurance data will show an empty state for guests.

**Export script:** `scripts/export-demo-data.ts` — run once via `pnpm export:demo`, then
deleted. It queries the DB and writes clean JSON to `apps/web/data/demo.json`, omitting
internal fields (`createdAt`, `updatedAt`, `userId`).

**pnpm script** (root `package.json`):

```json
"export:demo": "dotenv -e .env -- tsx scripts/export-demo-data.ts"
```

## Implementation Order

1. Run `pnpm export:demo` → writes `apps/web/data/demo.json`
2. Delete `scripts/export-demo-data.ts` and remove the `export:demo` pnpm script
3. Prisma schema: add nullable `userId String?` to Entry, Transaction, PortfolioItem + change PortfolioItem unique constraint → `pnpm db:migrate`
4. SQL backfill: set `userId` on all existing rows via `pnpm db:studio` or a one-time script
5. Prisma schema: make `userId` non-nullable → `pnpm db:migrate`
6. Update all affected service files to accept and filter by `userId`
7. Update all affected API route handlers to extract `userId` from `auth()` and pass to services
8. Update `useFinanceStore`: add `isGuest`, update `fetchAll` signature + body, add guest guards to all mutations
9. Create `FinanceDataProvider` client component
10. Update `apps/web/app/(finance)/layout.tsx` to include `FinanceDataProvider`
11. Run `pnpm type-check` and `pnpm test` — fix any type errors

## Testing Criteria

- Guest: navigating to `/assets` shows demo data; network tab shows no `/api/entries` calls
- Guest: adding an entry updates the UI; refreshing the page resets to demo data
- Guest: deleting/updating entries reflects in UI only, resets on refresh
- Signed-in: only own records returned from all API routes
- Signed-in: creating a record sets `userId` automatically; other users cannot see it
- Signed-in: PUT/DELETE on another user's record returns 404
- `PortfolioItem`: two different users can hold the same `symbol` without constraint violation
