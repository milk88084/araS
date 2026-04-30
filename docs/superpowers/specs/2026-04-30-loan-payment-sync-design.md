# Loan Payment Sync — Design Spec

**Date:** 2026-04-30
**Status:** Approved

## Problem

After making a monthly loan payment, the entry's stored `value` (used in net worth calculations) does not update automatically. Users have no way to reflect their decreasing loan balance without changing the interest rate.

## Solution

Add a **「我已繳款」** button to `LoanDetailSheet` that syncs the entry's value to the calculated remaining principal. A manual override is available for cases where the actual balance differs from the calculated value (e.g., early repayment).

## User Flow

1. User pays their monthly loan installment
2. User opens the loan detail page
3. Taps **「我已繳款」**
4. A confirmation sheet slides up from the bottom showing:
   - 本期應繳 (next payment amount)
   - 還款日 (next payment date)
5. User taps **「確認已繳」** → system syncs `entry.value` to calculated `remainingPrincipal`
6. Brief **「✓ 已同步」** toast appears; remaining principal display refreshes

**Manual override path:**

- User taps **「金額不同？手動輸入」** in the confirmation sheet
- Input switches to a number field for the actual remaining balance
- User submits → `entry.value` is set to the manually entered amount

**Hidden state:**

- Button is hidden when `status.nextPaymentDate === null` (loan fully repaid)

## UI Layout

```
LoanDetailSheet (top → bottom)
─────────────────────────────
Header (back button + loan name)
Status cards: 剩餘本金 | 下期應繳 | 下期日期
Progress bar
[ 我已繳款 ]          ← NEW: full-width, loan color
年利率 (rate editor)
還款明細 (amortization table)
```

**Confirmation sheet (bottom overlay):**

```
╭──────────────────────────╮
│  確認本期還款              │
│                            │
│  本期應繳   $12,450         │
│  還款日     2026/05/01      │
│                            │
│  [ 確認已繳 ]              │  ← primary CTA, loan color
│  [ 金額不同？手動輸入 ]     │  ← text link style
╰──────────────────────────╯
```

## API Changes

### New endpoint: `PATCH /api/loans/[id]/sync`

**Request body (optional):**

```json
{ "manualBalance": 1200000 }
```

**Logic:**

1. If `manualBalance` provided → use it directly
2. Otherwise → call `calculateLoanStatus()` → use `remainingPrincipal`
3. Update `entry.value` to new balance
4. Return updated loan

**No schema changes required.**

## Component Changes

**File: `apps/web/components/finance/LoanDetailSheet.tsx`**

- Add `「我已繳款」` button between progress bar and rate editor
- Add confirmation bottom sheet (overlay + slide-up card) with two states:
  - Default: shows calculated payment amount + confirm button
  - Manual: shows number input for actual remaining balance
- Add success toast state (2-second auto-dismiss)
- Call `onRateUpdated()` after successful sync to refresh data

**New files:**

- `apps/web/app/api/loans/[id]/sync/route.ts`

**Service changes:**

- `apps/web/services/loans.service.ts` — add `syncBalance(id: string, manualBalance?: number)` method

## Out of Scope

- Payment history log (tracking individual payments over time)
- Push notifications / reminders for upcoming payments
- Recurring payment automation
