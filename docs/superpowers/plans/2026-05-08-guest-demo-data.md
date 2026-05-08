# Guest Demo Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-user data isolation via Clerk `userId` and serve static demo JSON to unauthenticated guests.

**Architecture:** Services accept `userId` as a parameter; API routes extract it from Clerk `auth()` and pass it to services. `useFinanceStore` loads demo JSON for guests and applies mutations optimistically to local state only. A `FinanceDataProvider` client component in the finance layout bridges Clerk auth state to the store.

**Tech Stack:** Prisma 6, Next.js 15 App Router, Clerk `@clerk/nextjs`, Zustand, Vitest

---

## File Map

| File                                                         | Change                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `scripts/export-demo-data.ts`                                | Create (one-time, delete after running)                                        |
| `apps/web/data/demo.json`                                    | Create (output of export script)                                               |
| `apps/web/prisma/schema.prisma`                              | Add `userId` to Entry, Transaction, PortfolioItem; update PortfolioItem unique |
| `apps/web/services/entries.service.ts`                       | Add `userId` to all methods                                                    |
| `apps/web/services/transactions.service.ts`                  | Add `userId` to all methods                                                    |
| `apps/web/services/portfolio.service.ts`                     | Add `userId` to all methods                                                    |
| `apps/web/services/loans.service.ts`                         | Add `userId` to all methods via entry relation                                 |
| `apps/web/app/api/entries/route.ts`                          | Add `auth()` + pass `userId`                                                   |
| `apps/web/app/api/entries/[id]/route.ts`                     | Add `auth()` + pass `userId`                                                   |
| `apps/web/app/api/entries/[id]/history/route.ts`             | Add `auth()` + pass `userId`                                                   |
| `apps/web/app/api/entries/[id]/history/[historyId]/route.ts` | Add `auth()` + pass `userId`                                                   |
| `apps/web/app/api/transactions/route.ts`                     | Add `auth()` + pass `userId`                                                   |
| `apps/web/app/api/transactions/[id]/route.ts`                | Add `auth()` + pass `userId`                                                   |
| `apps/web/app/api/portfolio/route.ts`                        | Add `auth()` + pass `userId`                                                   |
| `apps/web/app/api/portfolio/[id]/route.ts`                   | Add `auth()` + pass `userId`                                                   |
| `apps/web/app/api/loans/route.ts`                            | Add `auth()` + pass `userId`                                                   |
| `apps/web/app/api/loans/[id]/route.ts`                       | Add `auth()` + pass `userId`                                                   |
| `apps/web/app/api/loans/[id]/rate/route.ts`                  | Add `auth()` + pass `userId`                                                   |
| `apps/web/app/api/loans/[id]/sync/route.ts`                  | Add `auth()` + pass `userId`                                                   |
| `apps/web/store/useFinanceStore.ts`                          | Add `isGuest`, update `fetchAll`, add guest guards to mutations                |
| `apps/web/components/layout/FinanceDataProvider.tsx`         | Create new client component                                                    |
| `apps/web/app/(finance)/layout.tsx`                          | Add `<FinanceDataProvider />`                                                  |
| `apps/web/tests/services/entries.service.test.ts`            | Create (userId-scoped queries)                                                 |
| `apps/web/tests/services/transactions.service.test.ts`       | Create                                                                         |
| `apps/web/tests/services/portfolio.service.test.ts`          | Create                                                                         |

---

## Task 1: Export current DB data as demo.json

**Files:**

- Create: `scripts/export-demo-data.ts`
- Create: `apps/web/data/demo.json`

- [ ] **Step 1: Add export script to root package.json**

Open `package.json` in the repo root. In the `"scripts"` section add:

```json
"export:demo": "dotenv -e .env -- tsx scripts/export-demo-data.ts"
```

- [ ] **Step 2: Write the export script**

Create `scripts/export-demo-data.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

function toNumber(v: unknown): number {
  return typeof v === "object" && v !== null && "toNumber" in v
    ? (v as { toNumber(): number }).toNumber()
    : Number(v);
}

async function main() {
  const entries = await prisma.entry.findMany({
    orderBy: { createdAt: "desc" },
    include: { loan: true },
  });

  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
  });

  const portfolio = await prisma.portfolioItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  const demo = {
    entries: entries.map(({ loan, ...e }) => ({
      id: e.id,
      name: e.name,
      topCategory: e.topCategory,
      subCategory: e.subCategory,
      stockCode: e.stockCode,
      value: toNumber(e.value),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      loan: loan
        ? {
            id: loan.id,
            entryId: loan.entryId,
            loanName: loan.loanName,
            totalAmount: toNumber(loan.totalAmount),
            annualInterestRate: toNumber(loan.annualInterestRate),
            termMonths: loan.termMonths,
            startDate: loan.startDate.toISOString(),
            gracePeriodMonths: loan.gracePeriodMonths,
            repaymentType: loan.repaymentType,
            overrideTermMonths: loan.overrideTermMonths,
            createdAt: loan.createdAt.toISOString(),
            updatedAt: loan.updatedAt.toISOString(),
          }
        : null,
      units: null,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: toNumber(t.amount),
      category: t.category,
      source: t.source,
      note: t.note,
      date: t.date.toISOString(),
      createdAt: t.createdAt.toISOString(),
    })),
    portfolio: portfolio.map((p) => ({
      id: p.id,
      symbol: p.symbol,
      name: p.name,
      avgCost: toNumber(p.avgCost),
      shares: toNumber(p.shares),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };

  const outPath = join(process.cwd(), "apps/web/data/demo.json");
  writeFileSync(outPath, JSON.stringify(demo, null, 2));
  console.log(`Written to ${outPath}`);
  console.log(`  entries: ${demo.entries.length}`);
  console.log(`  transactions: ${demo.transactions.length}`);
  console.log(`  portfolio: ${demo.portfolio.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Create the data directory and run the export**

```bash
mkdir -p apps/web/data
pnpm export:demo
```

Expected output:

```
Written to .../apps/web/data/demo.json
  entries: <N>
  transactions: <N>
  portfolio: <N>
```

Verify `apps/web/data/demo.json` exists and contains real data.

- [ ] **Step 4: Clean up the script**

Delete `scripts/export-demo-data.ts` and remove the `export:demo` line from root `package.json`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/data/demo.json package.json
git commit -m "feat: add demo data JSON from current database"
```

---

## Task 2: Prisma schema — add nullable userId (migration step 1)

**Files:**

- Modify: `apps/web/prisma/schema.prisma`

- [ ] **Step 1: Add nullable userId to Entry**

In `apps/web/prisma/schema.prisma`, update the `Entry` model:

```prisma
model Entry {
  id          String         @id @default(cuid())
  userId      String?
  name        String
  topCategory String
  subCategory String
  stockCode   String?
  value       Decimal
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  history     EntryHistory[]
  loan        Loan?
  insurance   Insurance?

  @@index([topCategory])
  @@index([userId])
}
```

- [ ] **Step 2: Add nullable userId to Transaction**

```prisma
model Transaction {
  id        String   @id @default(cuid())
  userId    String?
  type      String
  amount    Decimal
  category  String
  source    String
  note      String?
  date      DateTime
  createdAt DateTime @default(now())

  @@index([date])
  @@index([userId])
}
```

- [ ] **Step 3: Add nullable userId to PortfolioItem and change unique constraint**

Remove `@unique` from `symbol` and add composite unique + userId field:

```prisma
model PortfolioItem {
  id        String   @id @default(cuid())
  userId    String?
  symbol    String
  name      String
  avgCost   Decimal
  shares    Decimal
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, symbol])
  @@index([userId])
}
```

- [ ] **Step 4: Run migration**

```bash
pnpm db:migrate
```

When prompted for a migration name, enter: `add_user_id_nullable`

Expected: migration succeeds, no errors.

- [ ] **Step 5: Regenerate Prisma client**

```bash
pnpm db:generate
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations/
git commit -m "feat(db): add nullable userId to Entry, Transaction, PortfolioItem"
```

---

## Task 3: SQL backfill existing rows

**Files:** none (one-time DB operation)

- [ ] **Step 1: Open Prisma Studio**

```bash
pnpm db:studio
```

Studio opens at `http://localhost:5555`.

- [ ] **Step 2: Run SQL via Prisma Studio or psql**

In Prisma Studio, open the SQL editor (or use `psql` / any PostgreSQL client connected to your DB) and run:

```sql
UPDATE "Entry"
SET "userId" = 'user_3DQekdndCosGqQz3CsR9q5mMvcm'
WHERE "userId" IS NULL;

UPDATE "Transaction"
SET "userId" = 'user_3DQekdndCosGqQz3CsR9q5mMvcm'
WHERE "userId" IS NULL;

UPDATE "PortfolioItem"
SET "userId" = 'user_3DQekdndCosGqQz3CsR9q5mMvcm'
WHERE "userId" IS NULL;
```

- [ ] **Step 3: Verify**

Run and confirm all rows show `userId = 'user_3DQekdndCosGqQz3CsR9q5mMvcm'`:

```sql
SELECT COUNT(*) FROM "Entry" WHERE "userId" IS NULL;
SELECT COUNT(*) FROM "Transaction" WHERE "userId" IS NULL;
SELECT COUNT(*) FROM "PortfolioItem" WHERE "userId" IS NULL;
```

Expected: all three return `0`.

---

## Task 4: Prisma schema — make userId non-nullable (migration step 2)

**Files:**

- Modify: `apps/web/prisma/schema.prisma`

- [ ] **Step 1: Make userId non-nullable in all three models**

In `apps/web/prisma/schema.prisma`, change `userId String?` → `userId String` in Entry, Transaction, and PortfolioItem:

```prisma
model Entry {
  id          String         @id @default(cuid())
  userId      String
  name        String
  topCategory String
  subCategory String
  stockCode   String?
  value       Decimal
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  history     EntryHistory[]
  loan        Loan?
  insurance   Insurance?

  @@index([topCategory])
  @@index([userId])
}

model Transaction {
  id        String   @id @default(cuid())
  userId    String
  type      String
  amount    Decimal
  category  String
  source    String
  note      String?
  date      DateTime
  createdAt DateTime @default(now())

  @@index([date])
  @@index([userId])
}

model PortfolioItem {
  id        String   @id @default(cuid())
  userId    String
  symbol    String
  name      String
  avgCost   Decimal
  shares    Decimal
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, symbol])
  @@index([userId])
}
```

- [ ] **Step 2: Run migration**

```bash
pnpm db:migrate
```

Migration name: `make_user_id_required`

Expected: succeeds (all rows already have values from backfill).

- [ ] **Step 3: Regenerate Prisma client**

```bash
pnpm db:generate
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations/
git commit -m "feat(db): make userId non-nullable, update PortfolioItem unique constraint"
```

---

## Task 5: Update EntriesService

**Files:**

- Modify: `apps/web/services/entries.service.ts`
- Create: `apps/web/tests/services/entries.service.test.ts`

- [ ] **Step 1: Write failing tests for userId-scoped methods**

Create `apps/web/tests/services/entries.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    entry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    entryHistory: {
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/serialize", () => ({
  d: (v: unknown) => Number(v),
  dn: (v: unknown) => (v == null ? null : Number(v)),
}));

import { prisma } from "@/lib/prisma";
import { entriesService } from "../../services/entries.service";

const USER_ID = "user_test123";

describe("EntriesService.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by userId", async () => {
    vi.mocked(prisma.entry.findMany).mockResolvedValue([]);
    await entriesService.list(USER_ID);
    expect(prisma.entry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } })
    );
  });
});

describe("EntriesService.findById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("includes userId in where clause", async () => {
    vi.mocked(prisma.entry.findUnique).mockResolvedValue(null);
    await entriesService.findById("entry-1", USER_ID);
    expect(prisma.entry.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "entry-1", userId: USER_ID } })
    );
  });
});

describe("EntriesService.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores userId on the entry", async () => {
    const fakeEntry = {
      id: "e1",
      name: "Test",
      topCategory: "資產",
      subCategory: "現金",
      stockCode: null,
      value: { toNumber: () => 100 },
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: USER_ID,
    };
    vi.mocked(prisma.entry.create).mockResolvedValue(fakeEntry as never);
    vi.mocked(prisma.entryHistory.create).mockResolvedValue({} as never);
    await entriesService.create(
      { name: "Test", topCategory: "資產", subCategory: "現金", value: 100 },
      USER_ID
    );
    expect(prisma.entry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: USER_ID }) })
    );
  });
});

describe("EntriesService.delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("includes userId in where clause", async () => {
    vi.mocked(prisma.entry.delete).mockResolvedValue({} as never);
    await entriesService.delete("entry-1", USER_ID);
    expect(prisma.entry.delete).toHaveBeenCalledWith({ where: { id: "entry-1", userId: USER_ID } });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @repo/web test -- apps/web/tests/services/entries.service.test.ts
```

Expected: FAIL — methods don't accept `userId` yet.

- [ ] **Step 3: Update EntriesService methods**

In `apps/web/services/entries.service.ts`, update the `EntriesService` class:

```typescript
async list(userId: string) {
  const entries = await prisma.entry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { loan: true, history: { select: { units: true } } },
  });
  return entries.map(({ history, loan, ...e }) => ({
    ...e,
    value: d(e.value),
    loan: loan ? serializeLoan(loan) : null,
    units: history.some((h) => h.units != null)
      ? history.reduce((s, h) => s + (h.units ? d(h.units) : 0), 0)
      : null,
  }));
}

async findById(id: string, userId: string) {
  // findFirst (not findUnique) because userId is not a @unique field alone
  const entry = await prisma.entry.findFirst({
    where: { id, userId },
    include: { loan: true },
  });
  if (!entry) return null;
  const { loan, ...rest } = entry;
  return { ...rest, value: d(rest.value), loan: loan ? serializeLoan(loan) : null };
}

async create(data: CreateEntry, userId: string) {
  const { units, stockCode, createdAt, ...rest } = data;
  const timestamp = createdAt ? new Date(createdAt) : undefined;

  const entry = await prisma.entry.create({
    data: {
      ...rest,
      userId,
      stockCode: stockCode ?? null,
      ...(timestamp !== undefined ? { createdAt: timestamp } : {}),
    },
  });

  await prisma.entryHistory.create({
    data: {
      entryId: entry.id,
      delta: entry.value,
      balance: entry.value,
      units: units ?? null,
      ...(timestamp !== undefined ? { createdAt: timestamp } : {}),
    },
  });

  return { ...entry, value: d(entry.value) };
}

async update(id: string, data: UpdateEntry, userId: string) {
  // findFirst for ownership check (userId not @unique, can't use findUnique with it)
  const existing = await prisma.entry.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const { units, ...updateData } = data;
  const cleaned = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined)
  ) as Parameters<typeof prisma.entry.update>[0]["data"];
  // update by @id only — ownership already verified above
  const entry = await prisma.entry.update({ where: { id }, data: cleaned });
  if (data.value !== undefined) {
    const delta = d(entry.value) - d(existing.value);
    await prisma.entryHistory.create({
      data: { entryId: id, delta, balance: d(entry.value), units: units ?? null },
    });
  }
  return { ...entry, value: d(entry.value) };
}

async delete(id: string, userId: string) {
  // deleteMany supports arbitrary where — atomically enforces ownership
  await prisma.entry.deleteMany({ where: { id, userId } });
}
```

Keep `listHistory`, `updateHistory`, `deleteHistory`, `createHistory` methods unchanged — they operate on history records by ID, and ownership is verified through the entry check in the route layer.

Also add a new ownership-check helper at the end of the class (before the closing `}`):

```typescript
async verifyHistoryOwnership(historyId: string, userId: string): Promise<boolean> {
  const row = await prisma.entryHistory.findFirst({
    where: { id: historyId, entry: { userId } },
  });
  return row !== null;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @repo/web test -- apps/web/tests/services/entries.service.test.ts
```

Expected: PASS all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/services/entries.service.ts apps/web/tests/services/entries.service.test.ts
git commit -m "feat(service): scope entries queries by userId"
```

---

## Task 6: Update TransactionsService and PortfolioService

**Files:**

- Modify: `apps/web/services/transactions.service.ts`
- Modify: `apps/web/services/portfolio.service.ts`
- Create: `apps/web/tests/services/transactions.service.test.ts`
- Create: `apps/web/tests/services/portfolio.service.test.ts`

- [ ] **Step 1: Write failing tests for TransactionsService**

Create `apps/web/tests/services/transactions.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/serialize", () => ({ d: (v: unknown) => Number(v) }));

import { prisma } from "@/lib/prisma";
import { transactionsService } from "../../services/transactions.service";

const USER_ID = "user_test123";

describe("TransactionsService.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by userId", async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
    await transactionsService.list(USER_ID);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: USER_ID }) })
    );
  });

  it("filters by userId and month", async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
    await transactionsService.list(USER_ID, "2026-05");
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER_ID,
          date: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    );
  });
});

describe("TransactionsService.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores userId on the transaction", async () => {
    const fake = {
      id: "t1",
      type: "income",
      amount: { toNumber: () => 100 },
      category: "薪資",
      source: "公司",
      note: null,
      date: new Date(),
      createdAt: new Date(),
      userId: USER_ID,
    };
    vi.mocked(prisma.transaction.create).mockResolvedValue(fake as never);
    await transactionsService.create(
      {
        type: "income",
        amount: 100,
        category: "薪資",
        source: "公司",
        date: new Date().toISOString(),
      },
      USER_ID
    );
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: USER_ID }) })
    );
  });
});

describe("TransactionsService.delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("includes userId in where clause", async () => {
    vi.mocked(prisma.transaction.delete).mockResolvedValue({} as never);
    await transactionsService.delete("t1", USER_ID);
    expect(prisma.transaction.delete).toHaveBeenCalledWith({
      where: { id: "t1", userId: USER_ID },
    });
  });
});
```

- [ ] **Step 2: Write failing tests for PortfolioService**

Create `apps/web/tests/services/portfolio.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    portfolioItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/serialize", () => ({ d: (v: unknown) => Number(v) }));

import { prisma } from "@/lib/prisma";
import { portfolioService } from "../../services/portfolio.service";

const USER_ID = "user_test123";

describe("PortfolioService.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by userId", async () => {
    vi.mocked(prisma.portfolioItem.findMany).mockResolvedValue([]);
    await portfolioService.list(USER_ID);
    expect(prisma.portfolioItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } })
    );
  });
});

describe("PortfolioService.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores userId on the item", async () => {
    const fake = {
      id: "p1",
      symbol: "AAPL",
      name: "Apple",
      avgCost: { toNumber: () => 150 },
      shares: { toNumber: () => 10 },
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: USER_ID,
    };
    vi.mocked(prisma.portfolioItem.create).mockResolvedValue(fake as never);
    await portfolioService.create(
      { symbol: "AAPL", name: "Apple", avgCost: 150, shares: 10 },
      USER_ID
    );
    expect(prisma.portfolioItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: USER_ID }) })
    );
  });
});

describe("PortfolioService.delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("includes userId in where clause", async () => {
    vi.mocked(prisma.portfolioItem.delete).mockResolvedValue({} as never);
    await portfolioService.delete("p1", USER_ID);
    expect(prisma.portfolioItem.delete).toHaveBeenCalledWith({
      where: { id: "p1", userId: USER_ID },
    });
  });
});
```

- [ ] **Step 3: Run both tests to confirm they fail**

```bash
pnpm --filter @repo/web test -- apps/web/tests/services/transactions.service.test.ts apps/web/tests/services/portfolio.service.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Update TransactionsService**

Replace the entire `TransactionsService` class in `apps/web/services/transactions.service.ts`:

```typescript
export class TransactionsService {
  async list(userId: string, month?: string) {
    let where: Record<string, unknown> = { userId };
    if (month) {
      const [year, m] = month.split("-").map(Number);
      if (year && m) {
        const start = new Date(year, m - 1, 1);
        const end = new Date(year, m, 1);
        where = { userId, date: { gte: start, lt: end } };
      }
    }
    const rows = await prisma.transaction.findMany({ where, orderBy: { date: "desc" } });
    return rows.map(serializeTransaction);
  }

  async create(data: CreateTransaction, userId: string) {
    const { date, note, ...rest } = data;
    const row = await prisma.transaction.create({
      data: { ...rest, userId, date: new Date(date), note: note ?? null },
    });
    return serializeTransaction(row);
  }

  async delete(id: string, userId: string) {
    // deleteMany supports arbitrary where — atomically enforces ownership
    await prisma.transaction.deleteMany({ where: { id, userId } });
  }
}
```

- [ ] **Step 5: Update PortfolioService**

Replace the entire `PortfolioService` class in `apps/web/services/portfolio.service.ts`:

```typescript
export class PortfolioService {
  async list(userId: string) {
    const rows = await prisma.portfolioItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(serializeItem);
  }

  async findById(id: string, userId: string) {
    // findFirst because userId is not @unique alone
    const item = await prisma.portfolioItem.findFirst({ where: { id, userId } });
    return item ? serializeItem(item) : null;
  }

  async create(data: CreatePortfolioItem, userId: string) {
    const item = await prisma.portfolioItem.create({ data: { ...data, userId } });
    return serializeItem(item);
  }

  async update(id: string, data: UpdatePortfolioItem, userId: string) {
    // findFirst for ownership, then update by @id
    const existing = await prisma.portfolioItem.findFirst({ where: { id, userId } });
    if (!existing) return null;
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Parameters<typeof prisma.portfolioItem.update>[0]["data"];
    const item = await prisma.portfolioItem.update({ where: { id }, data: cleaned });
    return serializeItem(item);
  }

  async delete(id: string, userId: string) {
    // deleteMany supports arbitrary where — atomically enforces ownership
    await prisma.portfolioItem.deleteMany({ where: { id, userId } });
  }
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
pnpm --filter @repo/web test -- apps/web/tests/services/transactions.service.test.ts apps/web/tests/services/portfolio.service.test.ts
```

Expected: PASS all tests.

- [ ] **Step 7: Commit**

```bash
git add apps/web/services/transactions.service.ts apps/web/services/portfolio.service.ts apps/web/tests/services/transactions.service.test.ts apps/web/tests/services/portfolio.service.test.ts
git commit -m "feat(service): scope transactions and portfolio queries by userId"
```

---

## Task 7: Update LoansService

**Files:**

- Modify: `apps/web/services/loans.service.ts`

- [ ] **Step 1: Update `create` to accept and store userId**

In `apps/web/services/loans.service.ts`, update `LoansService.create`:

```typescript
async create(data: CreateLoan, userId: string) {
  const {
    loanName, category, totalAmount, annualInterestRate,
    termMonths, startDate, gracePeriodMonths, repaymentType,
  } = data;

  return prisma.$transaction(async (tx) => {
    const entry = await tx.entry.create({
      data: {
        userId,
        name: loanName,
        topCategory: "負債",
        subCategory: category,
        value: totalAmount,
      },
    });

    await tx.entryHistory.create({
      data: { entryId: entry.id, delta: totalAmount, balance: totalAmount },
    });

    const loan = await tx.loan.create({
      data: {
        entryId: entry.id,
        loanName, totalAmount, annualInterestRate, termMonths,
        startDate: new Date(startDate),
        gracePeriodMonths, repaymentType,
      },
    });

    return { ...serializeEntry(entry), loan: serializeLoan(loan) };
  });
}
```

- [ ] **Step 2: Update `findById` to verify ownership**

```typescript
async findById(id: string, userId: string) {
  const loan = await prisma.loan.findFirst({
    where: { id, entry: { userId } },
    include: { entry: true },
  });
  if (!loan) return null;
  const { entry, ...loanRest } = loan;
  return { ...serializeLoan(loanRest), entry: serializeEntry(entry) };
}
```

- [ ] **Step 3: Run type check to verify no TS errors**

```bash
pnpm type-check
```

Expected: no errors in `loans.service.ts` (route files will error — that's expected, they'll be fixed in Task 8).

- [ ] **Step 4: Commit**

```bash
git add apps/web/services/loans.service.ts
git commit -m "feat(service): scope loans queries by userId via entry relation"
```

---

## Task 8: Update API routes — entries

**Files:**

- Modify: `apps/web/app/api/entries/route.ts`
- Modify: `apps/web/app/api/entries/[id]/route.ts`
- Modify: `apps/web/app/api/entries/[id]/history/route.ts`
- Modify: `apps/web/app/api/entries/[id]/history/[historyId]/route.ts`

- [ ] **Step 1: Update `apps/web/app/api/entries/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CreateEntrySchema } from "@repo/shared";
import { entriesService } from "@/services/entries.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const entries = await entriesService.list(userId);
    return ok(entries);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const data = CreateEntrySchema.parse(await req.json());
    const entry = await entriesService.create(data, userId);
    return ok(entry, 201);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 2: Update `apps/web/app/api/entries/[id]/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UpdateEntrySchema } from "@repo/shared";
import { entriesService } from "@/services/entries.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const existing = await entriesService.findById(id, userId);
    if (!existing) return err("NOT_FOUND", "Entry not found", 404);
    const data = UpdateEntrySchema.parse(await req.json());
    const entry = await entriesService.update(id, data, userId);
    return ok(entry);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const existing = await entriesService.findById(id, userId);
    if (!existing) return err("NOT_FOUND", "Entry not found", 404);
    await entriesService.delete(id, userId);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 3: Update `apps/web/app/api/entries/[id]/history/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { entriesService } from "@/services/entries.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const existing = await entriesService.findById(id, userId);
    if (!existing) return err("NOT_FOUND", "Entry not found", 404);

    let history = await entriesService.listHistory(id);

    if (history.length === 0 && existing.value !== 0) {
      await entriesService.createHistory(id, {
        delta: existing.value,
        balance: existing.value,
        note: "初始建立",
        createdAt: existing.createdAt,
      });
      history = await entriesService.listHistory(id);
    }

    return ok(history);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 4: Update `apps/web/app/api/entries/[id]/history/[historyId]/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UpdateEntryHistorySchema } from "@repo/shared";
import { entriesService } from "@/services/entries.service";
import { ok, err, handleError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string; historyId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { historyId } = await params;
    const owned = await entriesService.verifyHistoryOwnership(historyId, userId);
    if (!owned) return err("NOT_FOUND", "History record not found", 404);
    const data = UpdateEntryHistorySchema.parse(await req.json());
    const history = await entriesService.updateHistory(historyId, data);
    return ok(history);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { historyId } = await params;
    const owned = await entriesService.verifyHistoryOwnership(historyId, userId);
    if (!owned) return err("NOT_FOUND", "History record not found", 404);
    await entriesService.deleteHistory(historyId);
    return ok(null);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 5: Type check entries routes**

```bash
pnpm type-check 2>&1 | grep "entries"
```

Expected: no errors in entries route files.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/entries/
git commit -m "feat(api): require auth and scope entries routes by userId"
```

---

## Task 9: Update API routes — transactions, portfolio, loans

**Files:**

- Modify: `apps/web/app/api/transactions/route.ts`
- Modify: `apps/web/app/api/transactions/[id]/route.ts`
- Modify: `apps/web/app/api/portfolio/route.ts`
- Modify: `apps/web/app/api/portfolio/[id]/route.ts`
- Modify: `apps/web/app/api/loans/route.ts`
- Modify: `apps/web/app/api/loans/[id]/route.ts`
- Modify: `apps/web/app/api/loans/[id]/rate/route.ts`
- Modify: `apps/web/app/api/loans/[id]/sync/route.ts`

- [ ] **Step 1: Update `apps/web/app/api/transactions/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CreateTransactionSchema } from "@repo/shared";
import { transactionsService } from "@/services/transactions.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const month = req.nextUrl.searchParams.get("month") ?? undefined;
    const items = await transactionsService.list(userId, month);
    return ok(items);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const data = CreateTransactionSchema.parse(await req.json());
    const item = await transactionsService.create(data, userId);
    return ok(item, 201);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 2: Update `apps/web/app/api/transactions/[id]/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { transactionsService } from "@/services/transactions.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    await transactionsService.delete(id, userId);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 3: Update `apps/web/app/api/portfolio/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CreatePortfolioItemSchema } from "@repo/shared";
import { portfolioService } from "@/services/portfolio.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const items = await portfolioService.list(userId);
    return ok(items);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const data = CreatePortfolioItemSchema.parse(await req.json());
    const item = await portfolioService.create(data, userId);
    return ok(item, 201);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 4: Update `apps/web/app/api/portfolio/[id]/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UpdatePortfolioItemSchema } from "@repo/shared";
import { portfolioService } from "@/services/portfolio.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const existing = await portfolioService.findById(id, userId);
    if (!existing) return err("NOT_FOUND", "Portfolio item not found", 404);
    const data = UpdatePortfolioItemSchema.parse(await req.json());
    const item = await portfolioService.update(id, data, userId);
    return ok(item);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const existing = await portfolioService.findById(id, userId);
    if (!existing) return err("NOT_FOUND", "Portfolio item not found", 404);
    await portfolioService.delete(id, userId);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 5: Update `apps/web/app/api/loans/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CreateLoanSchema } from "@repo/shared";
import { loansService } from "@/services/loans.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const data = CreateLoanSchema.parse(await req.json());
    const result = await loansService.create(data, userId);
    return ok(result, 201);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 6: Update `apps/web/app/api/loans/[id]/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UpdateLoanSchema } from "@repo/shared";
import { loansService } from "@/services/loans.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const loan = await loansService.findById(id, userId);
    if (!loan) return err("NOT_FOUND", "Loan not found", 404);
    return ok(loan);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const existing = await loansService.findById(id, userId);
    if (!existing) return err("NOT_FOUND", "Loan not found", 404);
    const data = UpdateLoanSchema.parse(await req.json());
    const loan = await loansService.update(existing.id, data);
    return ok(loan);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const loan = await loansService.findById(id, userId);
    if (!loan) return err("NOT_FOUND", "Loan not found", 404);
    await loansService.deleteByEntryId(loan.entryId);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 7: Update `apps/web/app/api/loans/[id]/rate/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UpdateLoanRateSchema } from "@repo/shared";
import { loansService } from "@/services/loans.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const existing = await loansService.findById(id, userId);
    if (!existing) return err("NOT_FOUND", "Loan not found", 404);
    const data = UpdateLoanRateSchema.parse(await req.json());
    const loan = await loansService.updateRate(id, data);
    return ok(loan);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 8: Update `apps/web/app/api/loans/[id]/sync/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loansService } from "@/services/loans.service";
import { ok, err, handleError } from "@/lib/api-response";

const SyncBodySchema = z.object({
  manualBalance: z.number().min(0).optional(),
  overrideTermMonths: z.number().int().positive().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const existing = await loansService.findById(id, userId);
    if (!existing) return err("NOT_FOUND", "Loan not found", 404);
    const body = await req.json().catch(() => ({}));
    const { manualBalance, overrideTermMonths } = SyncBodySchema.parse(body);
    const result = await loansService.syncBalance(existing, manualBalance, overrideTermMonths);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 9: Type check all routes**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add apps/web/app/api/transactions/ apps/web/app/api/portfolio/ apps/web/app/api/loans/
git commit -m "feat(api): require auth and scope transactions, portfolio, loans by userId"
```

---

## Task 10: Update useFinanceStore — fetchAll and isGuest

**Files:**

- Modify: `apps/web/store/useFinanceStore.ts`

- [ ] **Step 1: Add `isGuest` to the state interface**

In `apps/web/store/useFinanceStore.ts`, find the `interface FinanceState` block and add:

```typescript
isGuest: boolean;
fetchAll: (isSignedIn?: boolean) => Promise<void>; // update existing signature
```

- [ ] **Step 2: Add `isGuest: false` to the initial state**

Find the `create(...)` call's initial state object and add `isGuest: false,` alongside the existing `loading`, `error`, etc.

- [ ] **Step 3: Replace the `fetchAll` implementation**

Replace the existing `fetchAll: async () => { ... }` with:

```typescript
fetchAll: async (isSignedIn?: boolean) => {
  const { lastFetchedAt, isGuest } = get();

  if (isSignedIn === undefined) {
    if (lastFetchedAt) return;
    return;
  }

  if (
    lastFetchedAt &&
    Date.now() - lastFetchedAt < 30_000 &&
    isGuest === !isSignedIn
  ) return;

  if (!isSignedIn) {
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
        entries,
        transactions,
        portfolio,
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

- [ ] **Step 4: Run type check**

```bash
pnpm type-check 2>&1 | grep "useFinanceStore"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/store/useFinanceStore.ts
git commit -m "feat(store): add isGuest state and demo JSON loading to fetchAll"
```

---

## Task 11: Add guest guards to all store mutations

**Files:**

- Modify: `apps/web/store/useFinanceStore.ts`

- [ ] **Step 1: Add guest guard to `addEntry`**

Find `addEntry` in the store. Prepend the guest guard:

```typescript
addEntry: async (data) => {
  if (get().isGuest) {
    const fakeEntry = {
      ...data,
      id: `demo-${Date.now()}`,
      stockCode: data.stockCode ?? null,
      loan: null,
      units: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ entries: [...s.entries, fakeEntry] }));
    return;
  }
  // existing implementation unchanged below
```

- [ ] **Step 2: Add guest guard to `updateEntry`**

```typescript
updateEntry: async (id, data) => {
  if (get().isGuest) {
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...data } : e)),
    }));
    return;
  }
  // existing implementation unchanged below
```

- [ ] **Step 3: Add guest guard to `deleteEntry`**

```typescript
deleteEntry: async (id) => {
  if (get().isGuest) {
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    return;
  }
  // existing implementation unchanged below
```

- [ ] **Step 4: Add guest guard to `addTransaction`**

```typescript
addTransaction: async (data) => {
  if (get().isGuest) {
    const fakeTx = {
      ...data,
      id: `demo-${Date.now()}`,
      note: data.note ?? null,
      date: data.date,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ transactions: [...s.transactions, fakeTx] }));
    return;
  }
  // existing implementation unchanged below
```

- [ ] **Step 5: Add guest guard to `deleteTransaction`**

```typescript
deleteTransaction: async (id) => {
  if (get().isGuest) {
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
    return;
  }
  // existing implementation unchanged below
```

- [ ] **Step 6: Add guest guard to `addPortfolioItem`**

```typescript
addPortfolioItem: async (data) => {
  if (get().isGuest) {
    const fakeItem = {
      ...data,
      id: `demo-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ portfolio: [...s.portfolio, fakeItem] }));
    return;
  }
  // existing implementation unchanged below
```

- [ ] **Step 7: Add guest guard to `deletePortfolioItem`**

```typescript
deletePortfolioItem: async (id) => {
  if (get().isGuest) {
    set((s) => ({ portfolio: s.portfolio.filter((p) => p.id !== id) }));
    return;
  }
  // existing implementation unchanged below
```

- [ ] **Step 8: Run type check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/web/store/useFinanceStore.ts
git commit -m "feat(store): add guest mode guards to all mutations"
```

---

## Task 12: Create FinanceDataProvider and update layout

**Files:**

- Create: `apps/web/components/layout/FinanceDataProvider.tsx`
- Modify: `apps/web/app/(finance)/layout.tsx`

- [ ] **Step 1: Create `FinanceDataProvider.tsx`**

Create `apps/web/components/layout/FinanceDataProvider.tsx`:

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

- [ ] **Step 2: Update `apps/web/app/(finance)/layout.tsx`**

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

- [ ] **Step 3: Run type check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/layout/FinanceDataProvider.tsx apps/web/app/\(finance\)/layout.tsx
git commit -m "feat(web): add FinanceDataProvider to bridge auth state to store"
```

---

## Task 13: Final verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 2: Run type check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Start dev server and verify guest flow**

```bash
pnpm dev
```

Open `http://localhost:3000` in a browser. Without logging in, navigate to `/assets`.

Verify:

- Demo data appears (entries list is not empty)
- Browser network tab shows **no** calls to `/api/entries`, `/api/transactions`, `/api/portfolio`
- Adding an entry updates the UI immediately
- Refreshing the page resets to original demo data (the added entry is gone)
- BottomNav shows Home button (not Logout)

- [ ] **Step 5: Verify signed-in flow**

Log in with your Clerk account. Navigate to `/assets`.

Verify:

- Your real data appears
- Network tab shows calls to `/api/entries` etc. returning 200
- Adding/editing/deleting entries persists after refresh
- BottomNav shows Logout button

- [ ] **Step 6: Final commit if any lint fixes were needed**

```bash
git add -A
git commit -m "fix: address lint and type errors from guest demo data feature"
```
