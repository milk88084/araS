# Liability / Loan Section Refactor

**Date:** 2026-04-17  
**Status:** Approved

## Summary

Refactor the existing liability section to support structured loan entries with full amortization calculation, a per-loan detail sheet with an amortization schedule table, and in-place interest rate updates.

---

## 1. Data Model

### New Prisma Model

```prisma
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
  principal_interest  // annuity (equal total payment)
  principal_equal     // equal principal payment
}
```

- `Entry` model gets `loan Loan?` added (one-to-one optional relation).
- `Entry.currentValue` is kept in sync with `remainingPrincipal` on rate updates and on initial creation.
- `Entry.topCategory` remains `"負債"` so the entry appears in the existing liabilities section automatically.
- Requires a Prisma migration.

### Zod Schemas (`packages/shared/src/schemas/finance.ts`)

```ts
const RepaymentTypeSchema = z.enum(["principal_interest", "principal_equal"]);

const CreateLoanSchema = z.object({
  // entryId is created server-side inside the transaction — not in this schema
  loanName: z.string().min(1),
  category: z.string(), // loan subcategory, e.g. "房屋貸款"
  totalAmount: z.number().positive(),
  annualInterestRate: z.number().min(0).max(100),
  termMonths: z.number().int().positive(),
  startDate: z.string().datetime(),
  gracePeriodMonths: z.number().int().min(0).default(0),
  repaymentType: RepaymentTypeSchema,
});

const UpdateLoanRateSchema = z.object({
  annualInterestRate: z.number().min(0).max(100),
});
```

---

## 2. API Routes (Express, `apps/api`)

All routes sit under `/api/loans`, protected by `requireAuthentication`.

| Method   | Route                 | Body                               | Purpose                                                                     |
| -------- | --------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| `POST`   | `/api/loans`          | `CreateLoanSchema` (minus entryId) | Creates Entry + Loan atomically in a Prisma transaction                     |
| `GET`    | `/api/loans/:id`      | —                                  | Returns loan with nested entry                                              |
| `PATCH`  | `/api/loans/:id/rate` | `UpdateLoanRateSchema`             | Updates rate, recalculates `remainingPrincipal`, syncs `Entry.currentValue` |
| `DELETE` | `/api/loans/:id`      | —                                  | Deletes the parent Entry; Loan is removed via `onDelete: Cascade`           |

Existing `/api/entries` routes remain unchanged (used for edit/delete of the parent Entry where loan is not involved).

### `POST /api/loans` transaction

```
BEGIN
  1. Create Entry { topCategory: "負債", category: <loan subcategory>, currentValue: totalAmount, ... }
  2. Create Loan { entryId: entry.id, ...loanFields }
COMMIT
```

### `PATCH /api/loans/:id/rate` logic

```
1. Update Loan.annualInterestRate
2. Compute remainingPrincipal via calculateLoanStatus(updatedLoan, now)
3. Update Entry.currentValue = remainingPrincipal
```

---

## 3. Calculation Utility

**File:** `packages/shared/src/utils/loanCalculations.ts`

Pure functions, no side effects, no imports outside standard JS.

### Types

```ts
type LoanInput = {
  totalAmount: number;
  annualInterestRate: number;
  termMonths: number;
  startDate: string | Date;
  gracePeriodMonths: number;
  repaymentType: "principal_interest" | "principal_equal";
};

type ScheduleRow = {
  month: number; // 1-indexed, 1 = first payment month
  paymentDate: Date;
  beginBalance: number;
  principalPaid: number;
  interestPaid: number;
  totalPayment: number;
  endBalance: number;
  isPast: boolean; // paymentDate < currentDate
};

type LoanStatus = {
  remainingPrincipal: number;
  nextPaymentAmount: number;
  nextPaymentDate: Date | null; // null if loan fully repaid
  paidMonths: number;
};
```

### `generateAmortizationSchedule(loan: LoanInput, currentDate: Date): ScheduleRow[]`

Generates one row per month for the full `termMonths`.

**Grace period** (months 1 → gracePeriodMonths):

- `principalPaid = 0`
- `interestPaid = beginBalance × (annualInterestRate / 100 / 12)`
- `totalPayment = interestPaid`
- `endBalance = beginBalance` (no principal reduction)

**Repayment period** (months gracePeriodMonths+1 → termMonths):

Let `n = termMonths - gracePeriodMonths`, `r = annualInterestRate / 100 / 12`, `P = totalAmount`.

- `principal_interest`: fixed monthly payment `M = P·r·(1+r)^n / ((1+r)^n − 1)`. Each row: `interestPaid = beginBalance × r`, `principalPaid = M − interestPaid`.
- `principal_equal`: fixed monthly principal `= P / n`. `interestPaid = beginBalance × r`. `totalPayment` shrinks each month.

`paymentDate` = `startDate + month months` (same day of month, clamped to month end).  
`isPast = paymentDate < currentDate`.

### `calculateLoanStatus(loan: LoanInput, currentDate: Date): LoanStatus`

Internally calls `generateAmortizationSchedule`. Derives:

- `paidMonths` = rows where `isPast = true` count
- `remainingPrincipal` = `endBalance` of last past row, or `totalAmount` if none paid
- `nextPaymentAmount` = `totalPayment` of first future row
- `nextPaymentDate` = `paymentDate` of first future row

---

## 4. UI Components (`apps/web`)

### 4.1 `LoanSummaryCard`

Location: `components/finance/LoanSummaryCard.tsx`  
Displayed in the liabilities section of `/assets` page, above the loan entry list.

- Total remaining debt (sum of `remainingPrincipal` across all loans)
- Progress bar: `totalPaid / totalOriginalPrincipal` (colour `#C7C7D4`)
- Active loan count

### 4.2 Loan entry row (in `FinanceCategoryCard`)

When an entry has a `loan` relation, its row shows:

- `remainingPrincipal` as the value (not `currentValue` directly)
- Small pill: "18 / 360 期" (paidMonths / termMonths)
- Tap opens `LoanDetailSheet` instead of `EntryDetailPage`

### 4.3 `LoanDetailSheet`

Location: `components/finance/LoanDetailSheet.tsx`  
Full-screen overlay, slides in from the right (same transition as `EntryDetailPage`).

**Sections:**

1. **Header** — back button, loan name, category badge, start date, term
2. **Status row** — remaining principal · next payment amount · next payment date
3. **Rate editor** — labelled input showing current rate; edit + confirm button; on confirm calls `PATCH /api/loans/:id/rate`, then re-derives schedule client-side
4. **Amortization table** (`AmortizationTable` component)

### 4.4 `AmortizationTable`

Location: `components/finance/AmortizationTable.tsx`

- Default view: future rows only (`isPast = false`)
- Toggle button "顯示已繳期數 (N期)" prepends past rows, styled in muted `#8e8e93`
- Current month's row has a coloured left border
- Sticky column headers when scrolling
- Columns: 期數 · 繳款日 · 期初餘額 · 還本 · 利息 · 本期應繳 · 期末餘額

### 4.5 `AccountFormPage` — loan fields

When the selected category is a loan subcategory (房屋貸款, 汽車貸款, 消費貸款, 學生貸款, 其他貸款), `AccountFormPage` renders loan-specific fields:

- 貸款名稱, 貸款金額, 年利率 (%), 貸款期數 (月), 撥款日期, 寬限期 (月), 還款方式 (select)

On submit: `POST /api/loans` (not the generic `POST /api/entries`).

---

## 5. Integration Points

- `apps/web/store/useFinanceStore.ts` — no changes required; loan entries appear via the existing `entries` array
- `apps/web/app/(finance)/assets/page.tsx` — render `LoanSummaryCard` above the 負債 section; pass `loan` relation data down to `FinanceCategoryCard`
- `apps/web/components/finance/FinanceCategoryCard.tsx` — detect `entry.loan` and render progress pill + open `LoanDetailSheet` on tap
- `apps/api/src/routes/` — add `loans.routes.ts`, register in main router

---

## 6. Out of Scope

- Rate change history / audit log
- Server-side amortization schedule storage
- Dedicated `/liabilities` route
- Non-loan liability types (credit cards, payables) — unchanged
