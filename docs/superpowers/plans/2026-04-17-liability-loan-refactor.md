# Liability / Loan Section Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured loan entries to the existing liability section with amortization calculation, a detail sheet with rate editing, and an amortization schedule table.

**Architecture:** New `Loan` model in Prisma (one-to-one with `Entry`) stores loan metadata. Amortization math lives in a pure utility in `@repo/shared`. API routes in Next.js handle CRUD. UI integrates into the existing `/assets` page as a `LoanDetailSheet` overlay when a loan entry is tapped.

**Tech Stack:** Next.js 15 App Router route handlers, Prisma 6, Zod, `@repo/shared` (no build step), Vitest, Tailwind CSS 4, TypeScript.

---

## File Map

| Action | File                                                  | Responsibility                                 |
| ------ | ----------------------------------------------------- | ---------------------------------------------- |
| Modify | `apps/web/prisma/schema.prisma`                       | Add `Loan` model + `RepaymentType` enum        |
| Modify | `packages/shared/src/schemas/finance.ts`              | Add loan Zod schemas + extend `EntrySchema`    |
| Modify | `packages/shared/src/schemas/index.ts`                | Re-export new loan types                       |
| Create | `packages/shared/src/utils/loanCalculations.ts`       | Pure amortization math                         |
| Modify | `packages/shared/src/index.ts`                        | Export calculation utilities                   |
| Create | `apps/web/tests/utils/loanCalculations.test.ts`       | Unit tests for calculations                    |
| Modify | `apps/web/services/entries.service.ts`                | Include `loan` relation in queries             |
| Create | `apps/web/services/loans.service.ts`                  | Loan CRUD (Prisma)                             |
| Create | `apps/web/app/api/loans/route.ts`                     | `POST /api/loans`                              |
| Create | `apps/web/app/api/loans/[id]/route.ts`                | `GET`, `DELETE /api/loans/:id`                 |
| Create | `apps/web/app/api/loans/[id]/rate/route.ts`           | `PATCH /api/loans/:id/rate`                    |
| Create | `apps/web/components/finance/LoanFormFields.tsx`      | Loan-specific form fields                      |
| Modify | `apps/web/components/finance/AccountFormPage.tsx`     | Detect loan subcategory; use loan form + API   |
| Create | `apps/web/components/finance/AmortizationTable.tsx`   | Per-month schedule table                       |
| Create | `apps/web/components/finance/LoanDetailSheet.tsx`     | Full-screen loan detail overlay                |
| Create | `apps/web/components/finance/LoanSummaryCard.tsx`     | Total debt summary + progress bar              |
| Modify | `apps/web/components/finance/FinanceCategoryCard.tsx` | Loan row: progress pill + open LoanDetailSheet |
| Modify | `apps/web/app/(finance)/assets/page.tsx`              | Wire LoanDetailSheet + LoanSummaryCard         |

---

## Task 1: Prisma schema — add Loan model

**Files:**

- Modify: `apps/web/prisma/schema.prisma`

- [ ] **Step 1: Add the Loan model and enum to the schema**

Replace the full contents of `apps/web/prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Entry {
  id          String         @id @default(cuid())
  name        String
  topCategory String
  subCategory String
  stockCode   String?
  value       Float
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  history     EntryHistory[]
  loan        Loan?

  @@index([topCategory])
}

model Loan {
  id                 String        @id @default(cuid())
  entryId            String        @unique
  entry              Entry         @relation(fields: [entryId], references: [id], onDelete: Cascade)
  loanName           String
  totalAmount        Float
  annualInterestRate Float
  termMonths         Int
  startDate          DateTime
  gracePeriodMonths  Int           @default(0)
  repaymentType      RepaymentType
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
}

enum RepaymentType {
  principal_interest
  principal_equal
}

model EntryHistory {
  id        String   @id @default(cuid())
  entryId   String
  entry     Entry    @relation(fields: [entryId], references: [id], onDelete: Cascade)
  delta     Float
  balance   Float
  units     Float?
  note      String?
  createdAt DateTime @default(now())

  @@index([entryId, createdAt])
}

model Transaction {
  id        String   @id @default(cuid())
  type      String
  amount    Float
  category  String
  source    String
  note      String?
  date      DateTime
  createdAt DateTime @default(now())

  @@index([date])
}

model PortfolioItem {
  id        String   @id @default(cuid())
  symbol    String   @unique
  name      String
  avgCost   Float
  shares    Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Run migration**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm docker:up
pnpm db:migrate
```

Expected: migration named something like `add_loan_model` applied, Prisma client regenerated.

If prompted for migration name, enter: `add_loan_model`

- [ ] **Step 3: Verify Prisma client has Loan type**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm db:generate
```

Expected: no errors; `@prisma/client` now includes `PrismaClient.loan`.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/S00175/Desktop/araS
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations/
git commit -m "feat(db): add loan model and repayment type enum"
```

---

## Task 2: Shared schemas — add loan types + extend EntrySchema

**Files:**

- Modify: `packages/shared/src/schemas/finance.ts`
- Modify: `packages/shared/src/schemas/index.ts`

- [ ] **Step 1: Add loan schemas to `finance.ts`**

Append the following to the **end** of `packages/shared/src/schemas/finance.ts` (after the `ValueSnapshot` block):

```ts
// Loan
export const RepaymentTypeSchema = z.enum(["principal_interest", "principal_equal"]);
export type RepaymentType = z.infer<typeof RepaymentTypeSchema>;

export const LoanSchema = z.object({
  id: z.string(),
  entryId: z.string(),
  loanName: z.string(),
  totalAmount: z.number(),
  annualInterestRate: z.number(),
  termMonths: z.number(),
  startDate: z.string(),
  gracePeriodMonths: z.number(),
  repaymentType: RepaymentTypeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Loan = z.infer<typeof LoanSchema>;

export const CreateLoanSchema = z.object({
  loanName: z.string().min(1, "貸款名稱為必填"),
  category: z.string().min(1, "類別為必填"),
  totalAmount: z.number().positive("金額必須大於 0"),
  annualInterestRate: z.number().min(0).max(100),
  termMonths: z.number().int().positive("期數必須大於 0"),
  startDate: z.string(),
  gracePeriodMonths: z.number().int().min(0).default(0),
  repaymentType: RepaymentTypeSchema,
});
export type CreateLoan = z.infer<typeof CreateLoanSchema>;

export const UpdateLoanRateSchema = z.object({
  annualInterestRate: z.number().min(0).max(100),
});
export type UpdateLoanRate = z.infer<typeof UpdateLoanRateSchema>;
```

- [ ] **Step 2: Extend `EntrySchema` to include optional `loan`**

In `packages/shared/src/schemas/finance.ts`, update `EntrySchema` by adding `loan` as the last field:

```ts
export const EntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  topCategory: z.string(),
  subCategory: z.string(),
  stockCode: z.string().nullable().optional(),
  value: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  loan: LoanSchema.nullable().optional(),
});
export type Entry = z.infer<typeof EntrySchema>;
```

(`LoanSchema` is defined earlier in the same file so this is safe.)

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/S00175/Desktop/araS
git add packages/shared/src/schemas/finance.ts
git commit -m "feat(shared): add loan schemas and extend EntrySchema"
```

---

## Task 3: Calculation utility (TDD)

**Files:**

- Create: `packages/shared/src/utils/loanCalculations.ts`
- Create: `apps/web/tests/utils/loanCalculations.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/tests/utils/loanCalculations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  generateAmortizationSchedule,
  calculateLoanStatus,
} from "../../packages/shared/src/utils/loanCalculations";

const BASE_LOAN = {
  totalAmount: 1_200_000,
  annualInterestRate: 3,
  termMonths: 12,
  startDate: "2025-01-01",
  gracePeriodMonths: 0,
  repaymentType: "principal_interest" as const,
};

describe("generateAmortizationSchedule", () => {
  it("returns exactly termMonths rows", () => {
    const rows = generateAmortizationSchedule(BASE_LOAN, new Date("2026-04-17"));
    expect(rows).toHaveLength(12);
  });

  it("first row beginBalance equals totalAmount", () => {
    const rows = generateAmortizationSchedule(BASE_LOAN, new Date("2026-04-17"));
    expect(rows[0]!.beginBalance).toBeCloseTo(1_200_000, 0);
  });

  it("last row endBalance is approximately 0 for principal_interest", () => {
    const rows = generateAmortizationSchedule(BASE_LOAN, new Date("2026-04-17"));
    expect(rows[11]!.endBalance).toBeCloseTo(0, 0);
  });

  it("totalPayment is constant for principal_interest (annuity)", () => {
    const rows = generateAmortizationSchedule(BASE_LOAN, new Date("2026-04-17"));
    const first = rows[0]!.totalPayment;
    rows.forEach((r) => expect(r.totalPayment).toBeCloseTo(first, 1));
  });

  it("principal paid increases each month for principal_interest", () => {
    const rows = generateAmortizationSchedule(BASE_LOAN, new Date("2026-04-17"));
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.principalPaid).toBeGreaterThan(rows[i - 1]!.principalPaid);
    }
  });

  it("principal_equal: monthly principal is constant after grace", () => {
    const loan = { ...BASE_LOAN, repaymentType: "principal_equal" as const };
    const rows = generateAmortizationSchedule(loan, new Date("2026-04-17"));
    const p = rows[0]!.principalPaid;
    rows.forEach((r) => expect(r.principalPaid).toBeCloseTo(p, 1));
  });

  it("grace period rows have principalPaid = 0", () => {
    const loan = { ...BASE_LOAN, gracePeriodMonths: 3 };
    const rows = generateAmortizationSchedule(loan, new Date("2026-04-17"));
    expect(rows[0]!.principalPaid).toBe(0);
    expect(rows[1]!.principalPaid).toBe(0);
    expect(rows[2]!.principalPaid).toBe(0);
    expect(rows[3]!.principalPaid).toBeGreaterThan(0);
  });

  it("grace period endBalance equals beginBalance", () => {
    const loan = { ...BASE_LOAN, gracePeriodMonths: 2 };
    const rows = generateAmortizationSchedule(loan, new Date("2026-04-17"));
    expect(rows[0]!.endBalance).toBeCloseTo(rows[0]!.beginBalance, 1);
  });

  it("isPast is true for rows before currentDate", () => {
    const rows = generateAmortizationSchedule(BASE_LOAN, new Date("2026-04-17"));
    // startDate 2025-01-01, first payment 2025-02-01 — all 12 past by 2026-04-17
    rows.forEach((r) => expect(r.isPast).toBe(true));
  });

  it("isPast is false for future rows", () => {
    const futureLoan = { ...BASE_LOAN, startDate: "2026-04-01" };
    const rows = generateAmortizationSchedule(futureLoan, new Date("2026-04-17"));
    // payment dates: 2026-05-01 onward — all future
    rows.forEach((r) => expect(r.isPast).toBe(false));
  });

  it("each row endBalance equals next row beginBalance", () => {
    const rows = generateAmortizationSchedule(BASE_LOAN, new Date("2026-04-17"));
    for (let i = 0; i < rows.length - 1; i++) {
      expect(rows[i]!.endBalance).toBeCloseTo(rows[i + 1]!.beginBalance, 1);
    }
  });
});

describe("calculateLoanStatus", () => {
  it("paidMonths is 0 when no payments are past", () => {
    const futureLoan = { ...BASE_LOAN, startDate: "2027-01-01" };
    const { paidMonths } = calculateLoanStatus(futureLoan, new Date("2026-04-17"));
    expect(paidMonths).toBe(0);
  });

  it("remainingPrincipal equals totalAmount when no payments past", () => {
    const futureLoan = { ...BASE_LOAN, startDate: "2027-01-01" };
    const { remainingPrincipal } = calculateLoanStatus(futureLoan, new Date("2026-04-17"));
    expect(remainingPrincipal).toBeCloseTo(1_200_000, 0);
  });

  it("nextPaymentDate is null when loan is fully repaid", () => {
    const { nextPaymentDate } = calculateLoanStatus(BASE_LOAN, new Date("2026-04-17"));
    expect(nextPaymentDate).toBeNull();
  });

  it("nextPaymentAmount > 0 for a current loan", () => {
    const currentLoan = { ...BASE_LOAN, startDate: "2026-04-01", termMonths: 24 };
    const { nextPaymentAmount } = calculateLoanStatus(currentLoan, new Date("2026-04-17"));
    expect(nextPaymentAmount).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm --filter @repo/web test -- tests/utils/loanCalculations.test.ts
```

Expected: all tests FAIL with `Cannot find module`.

- [ ] **Step 3: Create the utility**

Create `packages/shared/src/utils/loanCalculations.ts`:

```ts
export type LoanInput = {
  totalAmount: number;
  annualInterestRate: number;
  termMonths: number;
  startDate: string | Date;
  gracePeriodMonths: number;
  repaymentType: "principal_interest" | "principal_equal";
};

export type ScheduleRow = {
  month: number;
  paymentDate: Date;
  beginBalance: number;
  principalPaid: number;
  interestPaid: number;
  totalPayment: number;
  endBalance: number;
  isPast: boolean;
};

export type LoanStatus = {
  remainingPrincipal: number;
  nextPaymentAmount: number;
  nextPaymentDate: Date | null;
  paidMonths: number;
};

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  // If day overflowed (e.g., Jan 31 + 1 month), setMonth already clamps
  // but if it went to the wrong month, go back to last day of intended month
  const expectedMonth = ((targetMonth % 12) + 12) % 12;
  if (d.getMonth() !== expectedMonth) {
    d.setDate(0); // last day of previous month
  }
  return d;
}

export function generateAmortizationSchedule(loan: LoanInput, currentDate: Date): ScheduleRow[] {
  const { totalAmount, annualInterestRate, termMonths, gracePeriodMonths, repaymentType } = loan;

  const r = annualInterestRate / 100 / 12;
  const startDate = new Date(loan.startDate);
  const n = termMonths - gracePeriodMonths;

  // Annuity monthly payment (fixed total payment)
  const annuityPayment =
    r === 0 ? totalAmount / n : (totalAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  // Equal-principal monthly principal
  const equalPrincipal = totalAmount / n;

  const rows: ScheduleRow[] = [];
  let balance = totalAmount;

  for (let month = 1; month <= termMonths; month++) {
    const paymentDate = addMonths(startDate, month);
    const beginBalance = balance;
    const isGrace = month <= gracePeriodMonths;

    let principalPaid: number;
    let interestPaid: number;

    if (isGrace) {
      interestPaid = balance * r;
      principalPaid = 0;
    } else if (repaymentType === "principal_interest") {
      interestPaid = balance * r;
      principalPaid = annuityPayment - interestPaid;
    } else {
      principalPaid = equalPrincipal;
      interestPaid = balance * r;
    }

    // Guard against floating point drift on final payment
    if (principalPaid > balance) principalPaid = balance;
    const endBalance = Math.max(0, balance - principalPaid);
    const totalPayment = principalPaid + interestPaid;

    rows.push({
      month,
      paymentDate,
      beginBalance,
      principalPaid,
      interestPaid,
      totalPayment,
      endBalance,
      isPast: paymentDate < currentDate,
    });

    balance = endBalance;
  }

  return rows;
}

export function calculateLoanStatus(loan: LoanInput, currentDate: Date): LoanStatus {
  const rows = generateAmortizationSchedule(loan, currentDate);
  const pastRows = rows.filter((r) => r.isPast);
  const futureRows = rows.filter((r) => !r.isPast);

  const paidMonths = pastRows.length;
  const remainingPrincipal =
    pastRows.length > 0 ? pastRows[pastRows.length - 1]!.endBalance : loan.totalAmount;

  const nextRow = futureRows[0] ?? null;
  const nextPaymentAmount = nextRow?.totalPayment ?? 0;
  const nextPaymentDate = nextRow?.paymentDate ?? null;

  return { remainingPrincipal, nextPaymentAmount, nextPaymentDate, paidMonths };
}
```

- [ ] **Step 4: Export from `@repo/shared`**

Update `packages/shared/src/index.ts`:

```ts
export * from "./schemas/index";
export * from "./utils/loanCalculations";
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm --filter @repo/web test -- tests/utils/loanCalculations.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/S00175/Desktop/araS
git add packages/shared/src/utils/loanCalculations.ts packages/shared/src/index.ts apps/web/tests/utils/loanCalculations.test.ts
git commit -m "feat(shared): add loan amortization calculation utility"
```

---

## Task 4: Loans service + update entries service

**Files:**

- Create: `apps/web/services/loans.service.ts`
- Modify: `apps/web/services/entries.service.ts`

- [ ] **Step 1: Create `apps/web/services/loans.service.ts`**

```ts
import { prisma } from "@/lib/prisma";
import type { CreateLoan, UpdateLoanRate } from "@repo/shared";
import { calculateLoanStatus } from "@repo/shared";

export class LoansService {
  async create(data: CreateLoan) {
    const {
      loanName,
      category,
      totalAmount,
      annualInterestRate,
      termMonths,
      startDate,
      gracePeriodMonths,
      repaymentType,
    } = data;

    return prisma.$transaction(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          name: loanName,
          topCategory: "負債",
          subCategory: category,
          value: totalAmount,
        },
      });

      await tx.entryHistory.create({
        data: {
          entryId: entry.id,
          delta: totalAmount,
          balance: totalAmount,
        },
      });

      const loan = await tx.loan.create({
        data: {
          entryId: entry.id,
          loanName,
          totalAmount,
          annualInterestRate,
          termMonths,
          startDate: new Date(startDate),
          gracePeriodMonths,
          repaymentType,
        },
      });

      return { ...entry, loan };
    });
  }

  async findById(id: string) {
    return prisma.loan.findUnique({
      where: { id },
      include: { entry: true },
    });
  }

  async updateRate(id: string, data: UpdateLoanRate) {
    const loan = await prisma.loan.update({
      where: { id },
      data: { annualInterestRate: data.annualInterestRate },
    });

    const status = calculateLoanStatus(
      {
        totalAmount: loan.totalAmount,
        annualInterestRate: loan.annualInterestRate,
        termMonths: loan.termMonths,
        startDate: loan.startDate,
        gracePeriodMonths: loan.gracePeriodMonths,
        repaymentType: loan.repaymentType,
      },
      new Date()
    );

    await prisma.entry.update({
      where: { id: loan.entryId },
      data: { value: status.remainingPrincipal },
    });

    return loan;
  }

  async deleteByEntryId(entryId: string) {
    return prisma.entry.delete({ where: { id: entryId } });
  }
}

export const loansService = new LoansService();
```

- [ ] **Step 2: Update `entries.service.ts` to include loan relation**

In `apps/web/services/entries.service.ts`, update the `list()` and `findById()` methods to include `{ loan: true }`:

```ts
async list() {
  return prisma.entry.findMany({
    orderBy: { createdAt: "desc" },
    include: { loan: true },
  });
}

async findById(id: string) {
  return prisma.entry.findUnique({
    where: { id },
    include: { loan: true },
  });
}
```

The rest of the methods are unchanged.

- [ ] **Step 3: Type-check**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/S00175/Desktop/araS
git add apps/web/services/loans.service.ts apps/web/services/entries.service.ts
git commit -m "feat(api): add loans service and include loan relation in entries"
```

---

## Task 5: API routes — POST, GET, DELETE, PATCH rate

**Files:**

- Create: `apps/web/app/api/loans/route.ts`
- Create: `apps/web/app/api/loans/[id]/route.ts`
- Create: `apps/web/app/api/loans/[id]/rate/route.ts`

- [ ] **Step 1: Create `apps/web/app/api/loans/route.ts`**

```ts
import { NextRequest } from "next/server";
import { CreateLoanSchema } from "@repo/shared";
import { loansService } from "@/services/loans.service";
import { ok, handleError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const data = CreateLoanSchema.parse(await req.json());
    const result = await loansService.create(data);
    return ok(result, 201);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 2: Create `apps/web/app/api/loans/[id]/route.ts`**

```ts
import { NextRequest } from "next/server";
import { loansService } from "@/services/loans.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const loan = await loansService.findById(id);
    if (!loan) return err("NOT_FOUND", "Loan not found", 404);
    return ok(loan);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const loan = await loansService.findById(id);
    if (!loan) return err("NOT_FOUND", "Loan not found", 404);
    await loansService.deleteByEntryId(loan.entryId);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 3: Create `apps/web/app/api/loans/[id]/rate/route.ts`**

```ts
import { NextRequest } from "next/server";
import { UpdateLoanRateSchema } from "@repo/shared";
import { loansService } from "@/services/loans.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await loansService.findById(id);
    if (!existing) return err("NOT_FOUND", "Loan not found", 404);
    const data = UpdateLoanRateSchema.parse(await req.json());
    const loan = await loansService.updateRate(id, data);
    return ok(loan);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 4: Type-check**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/S00175/Desktop/araS
git add apps/web/app/api/loans/
git commit -m "feat(api): add loan CRUD and rate update routes"
```

---

## Task 6: LoanFormFields component

**Files:**

- Create: `apps/web/components/finance/LoanFormFields.tsx`

- [ ] **Step 1: Create `apps/web/components/finance/LoanFormFields.tsx`**

```tsx
"use client";

import type { RepaymentType } from "@repo/shared";

export interface LoanFormValues {
  loanName: string;
  totalAmount: string;
  annualInterestRate: string;
  termMonths: string;
  startDate: string;
  gracePeriodMonths: string;
  repaymentType: RepaymentType;
}

interface Props {
  values: LoanFormValues;
  color: string;
  onChange: (values: LoanFormValues) => void;
}

export function LoanFormFields({ values, color, onChange }: Props) {
  const set = (key: keyof LoanFormValues) => (val: string) => onChange({ ...values, [key]: val });

  return (
    <div className="divide-y divide-[#f2f2f7]">
      {/* Loan name */}
      <div className="px-5 py-4">
        <p className="mb-1 text-[12px] text-[#8e8e93]">貸款名稱</p>
        <input
          type="text"
          value={values.loanName}
          onChange={(e) => set("loanName")(e.target.value)}
          placeholder="例：台北房貸"
          className="w-full bg-transparent text-[17px] font-semibold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
        />
      </div>

      {/* Total amount */}
      <div className="px-5 py-4">
        <p className="mb-1 text-[12px] text-[#8e8e93]">貸款金額</p>
        <input
          type="number"
          value={values.totalAmount}
          onChange={(e) => set("totalAmount")(e.target.value)}
          placeholder="0"
          className="w-full bg-transparent text-[20px] font-bold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
        />
      </div>

      {/* Rate + term (split row) */}
      <div className="flex divide-x divide-[#f2f2f7]">
        <div className="w-1/2 px-5 py-4">
          <p className="mb-1 text-[12px] text-[#8e8e93]">年利率 (%)</p>
          <input
            type="number"
            value={values.annualInterestRate}
            onChange={(e) => set("annualInterestRate")(e.target.value)}
            placeholder="2.00"
            step="0.01"
            className="w-full bg-transparent text-[17px] font-semibold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
          />
        </div>
        <div className="w-1/2 px-5 py-4">
          <p className="mb-1 text-[12px] text-[#8e8e93]">貸款期數 (月)</p>
          <input
            type="number"
            value={values.termMonths}
            onChange={(e) => set("termMonths")(e.target.value)}
            placeholder="360"
            className="w-full bg-transparent text-[17px] font-semibold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
          />
        </div>
      </div>

      {/* Start date + grace (split row) */}
      <div className="flex divide-x divide-[#f2f2f7]">
        <div className="w-1/2 px-5 py-4">
          <p className="mb-1 text-[12px] text-[#8e8e93]">撥款日期</p>
          <input
            type="date"
            value={values.startDate}
            onChange={(e) => set("startDate")(e.target.value)}
            className="w-full bg-transparent text-[15px] font-semibold text-[#1c1c1e] outline-none"
          />
        </div>
        <div className="w-1/2 px-5 py-4">
          <p className="mb-1 text-[12px] text-[#8e8e93]">寬限期 (月)</p>
          <input
            type="number"
            value={values.gracePeriodMonths}
            onChange={(e) => set("gracePeriodMonths")(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-[17px] font-semibold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
          />
        </div>
      </div>

      {/* Repayment type */}
      <div className="px-5 py-4">
        <p className="mb-2 text-[12px] text-[#8e8e93]">還款方式</p>
        <div className="flex gap-2">
          {(
            [
              { value: "principal_interest", label: "本息均攤" },
              { value: "principal_equal", label: "本金均攤" },
            ] as { value: RepaymentType; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange({ ...values, repaymentType: value })}
              className="flex-1 rounded-xl py-2 text-[14px] font-semibold transition-colors"
              style={
                values.repaymentType === value
                  ? { backgroundColor: color, color: "white" }
                  : { backgroundColor: "#f2f2f7", color: "#8e8e93" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/S00175/Desktop/araS
git add apps/web/components/finance/LoanFormFields.tsx
git commit -m "feat(web): add LoanFormFields component"
```

---

## Task 7: AccountFormPage — loan subcategory detection

**Files:**

- Modify: `apps/web/components/finance/AccountFormPage.tsx`

The loan subcategories are: `房屋貸款`, `汽車貸款`, `消費貸款`, `學生貸款`, `其他貸款`. When any of these is selected, the normal balance input is replaced by `LoanFormFields`, and submission calls `POST /api/loans`.

- [ ] **Step 1: Add LOAN_SUBCATEGORIES constant and imports**

At the top of `AccountFormPage.tsx`, after the existing constants, add:

```ts
import { LoanFormFields, type LoanFormValues } from "./LoanFormFields";
import { useFinanceStore } from "../../store/useFinanceStore";

const LOAN_SUBCATEGORIES = ["房屋貸款", "汽車貸款", "消費貸款", "學生貸款", "其他貸款"];
```

(The `useFinanceStore` import already exists — keep it; only add the LoanFormFields import and constant.)

- [ ] **Step 2: Add loan form state inside `AccountFormPage`**

Inside the `AccountFormPage` function, after the existing state declarations, add:

```ts
const isLoan = LOAN_SUBCATEGORIES.includes(subCategoryName);
const { fetchAll } = useFinanceStore();

const [loanValues, setLoanValues] = useState<LoanFormValues>({
  loanName: "",
  totalAmount: "",
  annualInterestRate: "",
  termMonths: "",
  startDate: new Date().toISOString().split("T")[0] ?? "",
  gracePeriodMonths: "0",
  repaymentType: "principal_interest",
});
```

- [ ] **Step 3: Reset loan form when modal opens**

Inside the existing `useEffect` that resets on `open`, add the loan reset at the end of the effect body (before the `if (!nameSuggestion || ...)` early return):

```ts
if (isLoan) {
  setLoanValues({
    loanName: nameSuggestion ?? "",
    totalAmount: "",
    annualInterestRate: "",
    termMonths: "",
    startDate: new Date().toISOString().split("T")[0] ?? "",
    gracePeriodMonths: "0",
    repaymentType: "principal_interest",
  });
}
```

- [ ] **Step 4: Update `handleSubmit` to branch on loan**

Replace the existing `handleSubmit` function with:

```ts
const handleSubmit = async () => {
  setSubmitting(true);
  try {
    if (isLoan) {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanName: loanValues.loanName.trim() || subCategoryName,
          category: subCategoryName,
          totalAmount: parseFloat(loanValues.totalAmount) || 0,
          annualInterestRate: parseFloat(loanValues.annualInterestRate) || 0,
          termMonths: parseInt(loanValues.termMonths) || 0,
          startDate: new Date(loanValues.startDate).toISOString(),
          gracePeriodMonths: parseInt(loanValues.gracePeriodMonths) || 0,
          repaymentType: loanValues.repaymentType,
        }),
      });
      if (!res.ok) throw new Error("貸款建立失敗");
      await fetchAll();
    } else {
      const value = isInvestment ? computedValue : parseFloat(balance) || 0;
      const finalName = name.trim() || selectedStock?.name || subCategoryName;
      const unitsParsed = hasStockPicker ? parseFloat(units) || undefined : undefined;

      if (isEdit && editItem) {
        await updateEntry(editItem.id, {
          name: finalName,
          topCategory,
          subCategory: subCategoryName,
          value,
          ...(selectedStock ? { stockCode: selectedStock.code } : {}),
          ...(unitsParsed != null ? { units: unitsParsed } : {}),
        });
      } else {
        await addEntry({
          name: finalName,
          topCategory,
          subCategory: subCategoryName,
          value,
          ...(selectedStock ? { stockCode: selectedStock.code } : {}),
          ...(unitsParsed != null ? { units: unitsParsed } : {}),
          createdAt: date,
        });
      }
    }
    onSaved();
  } finally {
    setSubmitting(false);
  }
};
```

- [ ] **Step 5: Render LoanFormFields in the form card**

In the JSX, the main form card currently starts with:

```tsx
<div className="overflow-hidden rounded-2xl bg-white shadow-sm">
  {isInvestment ? (
```

Wrap it to add a loan branch at the top:

```tsx
<div className="overflow-hidden rounded-2xl bg-white shadow-sm">
  {isLoan ? (
    <LoanFormFields
      values={loanValues}
      color={categoryColor}
      onChange={setLoanValues}
    />
  ) : isInvestment ? (
```

And close the ternary properly — the existing closing of `isInvestment` ternary stays as-is, just nested one level deeper.

- [ ] **Step 6: Type-check**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
cd C:/Users/S00175/Desktop/araS
git add apps/web/components/finance/AccountFormPage.tsx
git commit -m "feat(web): detect loan subcategory in AccountFormPage and submit to POST /api/loans"
```

---

## Task 8: AmortizationTable component

**Files:**

- Create: `apps/web/components/finance/AmortizationTable.tsx`

- [ ] **Step 1: Create `apps/web/components/finance/AmortizationTable.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { ScheduleRow } from "@repo/shared";

interface Props {
  rows: ScheduleRow[];
  color: string;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(n: number): string {
  return n.toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

export function AmortizationTable({ rows, color }: Props) {
  const [showPast, setShowPast] = useState(false);

  const pastRows = rows.filter((r) => r.isPast);
  const futureRows = rows.filter((r) => !r.isPast);

  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${today.getMonth()}`;

  const displayedRows = showPast ? [...pastRows, ...futureRows] : futureRows;

  return (
    <div className="mt-4">
      {pastRows.length > 0 && (
        <button
          onClick={() => setShowPast((v) => !v)}
          className="mb-3 w-full rounded-xl bg-[#f2f2f7] py-2 text-[13px] font-medium text-[#8e8e93]"
        >
          {showPast ? "隱藏已繳期數" : `顯示已繳期數（${pastRows.length} 期）`}
        </button>
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-10 grid grid-cols-7 gap-1 rounded-xl bg-[#f2f2f7] px-2 py-2 text-[10px] font-semibold text-[#8e8e93]">
        <span className="text-center">期</span>
        <span className="col-span-2">繳款日</span>
        <span className="text-right">期初餘額</span>
        <span className="text-right">還本</span>
        <span className="text-right">利息</span>
        <span className="text-right">本期應繳</span>
      </div>

      <div className="mt-1 space-y-px">
        {displayedRows.map((row) => {
          const rowKey = `${row.paymentDate.getFullYear()}-${row.paymentDate.getMonth()}`;
          const isCurrent = rowKey === currentMonthKey;

          return (
            <div
              key={row.month}
              className="grid grid-cols-7 gap-1 rounded-lg px-2 py-2 text-[11px]"
              style={{
                backgroundColor: row.isPast ? "transparent" : "white",
                color: row.isPast ? "#8e8e93" : "#1c1c1e",
                borderLeft: isCurrent ? `3px solid ${color}` : "3px solid transparent",
              }}
            >
              <span className="text-center font-semibold">{row.month}</span>
              <span className="col-span-2">{formatDate(row.paymentDate)}</span>
              <span className="text-right">{fmt(row.beginBalance)}</span>
              <span className="text-right">{fmt(row.principalPaid)}</span>
              <span className="text-right">{fmt(row.interestPaid)}</span>
              <span className="text-right font-semibold">{fmt(row.totalPayment)}</span>
            </div>
          );
        })}
      </div>

      {displayedRows.length === 0 && (
        <p className="py-8 text-center text-[13px] text-[#8e8e93]">貸款已全數還清</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/S00175/Desktop/araS
git add apps/web/components/finance/AmortizationTable.tsx
git commit -m "feat(web): add AmortizationTable component"
```

---

## Task 9: LoanDetailSheet component

**Files:**

- Create: `apps/web/components/finance/LoanDetailSheet.tsx`

- [ ] **Step 1: Create `apps/web/components/finance/LoanDetailSheet.tsx`**

```tsx
"use client";

import { useState, useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import type { Loan } from "@repo/shared";
import { generateAmortizationSchedule, calculateLoanStatus } from "@repo/shared";
import { AmortizationTable } from "./AmortizationTable";
import { formatCurrency } from "../../lib/format";

interface Props {
  open: boolean;
  loan: Loan;
  color: string;
  onClose: () => void;
  onRateUpdated: () => void;
}

function formatDateStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function LoanDetailSheet({ open, loan, color, onClose, onRateUpdated }: Props) {
  const [rateInput, setRateInput] = useState(String(loan.annualInterestRate));
  const [editingRate, setEditingRate] = useState(false);
  const [savingRate, setSavingRate] = useState(false);

  const today = useMemo(() => new Date(), []);

  const loanInput = useMemo(
    () => ({
      totalAmount: loan.totalAmount,
      annualInterestRate: loan.annualInterestRate,
      termMonths: loan.termMonths,
      startDate: loan.startDate,
      gracePeriodMonths: loan.gracePeriodMonths,
      repaymentType: loan.repaymentType,
    }),
    [loan]
  );

  const schedule = useMemo(
    () => generateAmortizationSchedule(loanInput, today),
    [loanInput, today]
  );

  const status = useMemo(() => calculateLoanStatus(loanInput, today), [loanInput, today]);

  const handleSaveRate = async () => {
    const rate = parseFloat(rateInput);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    setSavingRate(true);
    try {
      const res = await fetch(`/api/loans/${loan.id}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annualInterestRate: rate }),
      });
      if (!res.ok) throw new Error("更新失敗");
      setEditingRate(false);
      onRateUpdated();
    } catch {
      // keep editing open on failure
    } finally {
      setSavingRate(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[90] flex flex-col bg-[#f2f2f7] transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pt-14 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ChevronLeft size={20} className="text-[#1c1c1e]" />
          </button>
          <div>
            <h1 className="text-[20px] font-bold text-[#1c1c1e]">{loan.loanName}</h1>
            <p className="text-[12px] text-[#8e8e93]">
              {formatDateStr(loan.startDate)} · {loan.termMonths} 期
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md space-y-3 px-4 pb-12">
          {/* Status row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "剩餘本金", value: formatCurrency(status.remainingPrincipal) },
              {
                label: "下期應繳",
                value: status.nextPaymentDate ? formatCurrency(status.nextPaymentAmount) : "—",
              },
              {
                label: "下期日期",
                value: status.nextPaymentDate
                  ? formatDateStr(status.nextPaymentDate.toISOString())
                  : "已還清",
              },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                <p className="text-[11px] text-[#8e8e93]">{label}</p>
                <p className="mt-1 text-[14px] font-bold text-[#1c1c1e]">{value}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <div className="mb-1 flex justify-between text-[12px] text-[#8e8e93]">
              <span>已繳 {status.paidMonths} 期</span>
              <span>共 {loan.termMonths} 期</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#f2f2f7]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (status.paidMonths / loan.termMonths) * 100)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>

          {/* Rate editor */}
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <p className="mb-1 text-[12px] text-[#8e8e93]">年利率 (%)</p>
            {editingRate ? (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  step="0.01"
                  className="flex-1 bg-transparent text-[20px] font-bold text-[#1c1c1e] outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveRate}
                  disabled={savingRate}
                  className="rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: color }}
                >
                  {savingRate ? "更新中" : "確認"}
                </button>
                <button
                  onClick={() => {
                    setRateInput(String(loan.annualInterestRate));
                    setEditingRate(false);
                  }}
                  className="rounded-xl bg-[#f2f2f7] px-3 py-1.5 text-[13px] font-semibold text-[#8e8e93]"
                >
                  取消
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-[20px] font-bold text-[#1c1c1e]">
                  {loan.annualInterestRate.toFixed(2)}%
                </p>
                <button
                  onClick={() => setEditingRate(true)}
                  className="text-[13px] font-medium"
                  style={{ color }}
                >
                  調整
                </button>
              </div>
            )}
          </div>

          {/* Amortization table */}
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <p className="mb-2 text-[15px] font-semibold text-[#1c1c1e]">還款明細</p>
            <AmortizationTable rows={schedule} color={color} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/S00175/Desktop/araS
git add apps/web/components/finance/LoanDetailSheet.tsx
git commit -m "feat(web): add LoanDetailSheet with rate editor and amortization table"
```

---

## Task 10: LoanSummaryCard component

**Files:**

- Create: `apps/web/components/finance/LoanSummaryCard.tsx`

- [ ] **Step 1: Create `apps/web/components/finance/LoanSummaryCard.tsx`**

```tsx
import type { Entry } from "@repo/shared";
import { calculateLoanStatus } from "@repo/shared";
import { formatCurrency } from "../../lib/format";

interface Props {
  loanEntries: Entry[];
}

export function LoanSummaryCard({ loanEntries }: Props) {
  const loans = loanEntries.filter((e) => e.loan != null).map((e) => e.loan!);
  if (loans.length === 0) return null;

  const today = new Date();

  const totalOriginal = loans.reduce((s, l) => s + l.totalAmount, 0);
  const totalRemaining = loans.reduce((s, l) => {
    const status = calculateLoanStatus(
      {
        totalAmount: l.totalAmount,
        annualInterestRate: l.annualInterestRate,
        termMonths: l.termMonths,
        startDate: l.startDate,
        gracePeriodMonths: l.gracePeriodMonths,
        repaymentType: l.repaymentType,
      },
      today
    );
    return s + status.remainingPrincipal;
  }, 0);

  const paidFraction = totalOriginal > 0 ? 1 - totalRemaining / totalOriginal : 0;

  return (
    <div className="mb-3 rounded-2xl bg-white px-4 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[14px] font-semibold text-[#1c1c1e]">貸款總覽</p>
        <span className="rounded-full bg-[#f2f2f7] px-2.5 py-0.5 text-[11px] text-[#8e8e93]">
          {loans.length} 筆貸款
        </span>
      </div>

      <p className="text-[28px] font-bold text-[#ff3b30]">-{formatCurrency(totalRemaining)}</p>
      <p className="mt-0.5 text-[12px] text-[#8e8e93]">原始金額 {formatCurrency(totalOriginal)}</p>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-[#8e8e93]">
          <span>已還 {(paidFraction * 100).toFixed(1)}%</span>
          <span>剩餘 {((1 - paidFraction) * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#f2f2f7]">
          <div
            className="h-full rounded-full bg-[#C7C7D4] transition-all"
            style={{ width: `${Math.min(100, paidFraction * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/S00175/Desktop/araS
git add apps/web/components/finance/LoanSummaryCard.tsx
git commit -m "feat(web): add LoanSummaryCard component"
```

---

## Task 11: FinanceCategoryCard — loan row detection

**Files:**

- Modify: `apps/web/components/finance/FinanceCategoryCard.tsx`

Loan entries need to show a progress pill and route to `LoanDetailSheet` instead of the regular detail. The `CategoryItem` interface needs a `loan` field; the parent will compute and pass `paidMonths`/`termMonths`.

- [ ] **Step 1: Extend `CategoryItem` interface**

In `apps/web/components/finance/FinanceCategoryCard.tsx`, update the `CategoryItem` interface:

```ts
export interface CategoryItem {
  id: string;
  name: string;
  value: number;
  updatedAt: string;
  loan?: {
    paidMonths: number;
    termMonths: number;
  } | null;
}
```

- [ ] **Step 2: Update the item row JSX to show loan pill**

In the item row (where `item.name` is shown), replace the secondary text line:

```tsx
<p className="text-[12px] text-[#8e8e93]">Updated on {formatDate(item.updatedAt)}</p>
```

With:

```tsx
{
  item.loan ? (
    <p className="text-[12px] text-[#8e8e93]">
      {item.loan.paidMonths} / {item.loan.termMonths} 期
    </p>
  ) : (
    <p className="text-[12px] text-[#8e8e93]">Updated on {formatDate(item.updatedAt)}</p>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/S00175/Desktop/araS
git add apps/web/components/finance/FinanceCategoryCard.tsx
git commit -m "feat(web): show loan progress pill in FinanceCategoryCard"
```

---

## Task 12: AssetsPage — wire LoanDetailSheet and LoanSummaryCard

**Files:**

- Modify: `apps/web/app/(finance)/assets/page.tsx`

- [ ] **Step 1: Add imports**

At the top of `apps/web/app/(finance)/assets/page.tsx`, add:

```ts
import { LoanDetailSheet } from "../../../components/finance/LoanDetailSheet";
import { LoanSummaryCard } from "../../../components/finance/LoanSummaryCard";
import { calculateLoanStatus } from "@repo/shared";
import type { Loan } from "@repo/shared";
```

- [ ] **Step 2: Add loan detail state**

Inside `AssetsPage`, after the existing state declarations, add:

```ts
const [showLoanDetail, setShowLoanDetail] = useState(false);
const [loanDetailData, setLoanDetailData] = useState<{ loan: Loan; color: string } | null>(null);
```

- [ ] **Step 3: Update `openDetail` to detect loan entries**

Replace the existing `openDetail` function:

```ts
const openDetail = (item: CategoryItem) => {
  const entry = entries.find((e) => e.id === item.id);
  if (!entry) return;

  if (entry.loan) {
    const topCat = getTopCategory(entry.topCategory);
    setLoanDetailData({ loan: entry.loan, color: topCat?.color ?? "#C7C7D4" });
    setShowLoanDetail(true);
    return;
  }

  setDetailEntry(entry);
  setShowDetail(true);
};
```

- [ ] **Step 4: Pass loan data to FinanceCategoryCard items**

In the `categoriesWithData.map` block, update the items mapping:

```ts
const items: CategoryItem[] = cat.catEntries.map((e) => {
  let loanPill: CategoryItem["loan"] = null;
  if (e.loan) {
    const status = calculateLoanStatus(
      {
        totalAmount: e.loan.totalAmount,
        annualInterestRate: e.loan.annualInterestRate,
        termMonths: e.loan.termMonths,
        startDate: e.loan.startDate,
        gracePeriodMonths: e.loan.gracePeriodMonths,
        repaymentType: e.loan.repaymentType,
      },
      new Date()
    );
    loanPill = { paidMonths: status.paidMonths, termMonths: e.loan.termMonths };
  }
  return {
    id: e.id,
    name: e.name,
    value: e.value,
    updatedAt: e.updatedAt,
    loan: loanPill,
  };
});
```

- [ ] **Step 5: Add LoanSummaryCard above the 負債 section**

In the `categoriesWithData.map` JSX, wrap the liability card to prepend `LoanSummaryCard`:

```tsx
return (
  <div key={cat.name} className="flex items-stretch gap-1.5">
    <div className="w-12 shrink-0 rounded-r-2xl" style={{ backgroundColor: cat.color }} />
    <div className="min-w-0 flex-1 overflow-hidden">
      {cat.isLiability && <LoanSummaryCard loanEntries={cat.catEntries} />}
      <FinanceCategoryCard
        name={cat.name}
        color={cat.color}
        items={items}
        isLiability={isLiability}
        getItemIcon={(itemName) => {
          const entry = cat.catEntries.find((e) => e.name === itemName);
          return getNodeIcon(cat.name, entry?.subCategory ?? itemName);
        }}
        onEditItem={(item) => openDetail(item)}
        onDeleteItem={deleteEntry}
      />
    </div>
  </div>
);
```

- [ ] **Step 6: Add LoanDetailSheet to the JSX**

At the bottom of the `AssetsPage` return, alongside the existing overlays, add:

```tsx
{
  loanDetailData && (
    <LoanDetailSheet
      open={showLoanDetail}
      loan={loanDetailData.loan}
      color={loanDetailData.color}
      onClose={() => {
        setShowLoanDetail(false);
        setLoanDetailData(null);
      }}
      onRateUpdated={fetchAll}
    />
  );
}
```

- [ ] **Step 7: Type-check**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 8: Run full test suite**

```bash
cd C:/Users/S00175/Desktop/araS
pnpm test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
cd C:/Users/S00175/Desktop/araS
git add apps/web/app/\(finance\)/assets/page.tsx
git commit -m "feat(web): integrate LoanDetailSheet and LoanSummaryCard into assets page"
```

---

## Self-Review

**Spec coverage check:**

- ✅ `loanName`, `totalAmount`, `annualInterestRate`, `termMonths`, `startDate`, `gracePeriodMonths`, `repaymentType` — Task 1 (Prisma) + Task 2 (Zod)
- ✅ `calculateLoanStatus` returning `remainingPrincipal`, `nextPaymentAmount`, `nextPaymentDate`, `paidMonths` — Task 3
- ✅ Both `principal_interest` and `principal_equal` with grace period — Task 3
- ✅ `LoanSummaryCard` with total debt + progress bar — Task 10
- ✅ Amortization schedule table with all required columns — Task 8
- ✅ Rate update on any loan — Task 9 (LoanDetailSheet rate editor → Task 5 PATCH route)
- ✅ Recalculate from current period after rate update (past rows unchanged — they are computed from `isPast`, not stored) — Task 4 (LoansService.updateRate)
- ✅ Future vs past row distinction — Task 3 (`isPast`), Task 8 (AmortizationTable styling)
- ✅ Future rows default, toggle for past — Task 8 (AmortizationTable toggle button)

**Type consistency check:**

- `LoanInput` is defined in Task 3 and used in Tasks 10, 11, 12 — all reference the same exported type from `@repo/shared`
- `ScheduleRow` defined in Task 3, used in Task 8 — consistent
- `Loan` (Zod type) defined in Task 2, used in Tasks 9, 11, 12 — consistent
- `CategoryItem.loan` shape defined in Task 11, populated in Task 12 — consistent
