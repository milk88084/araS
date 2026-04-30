# Loan Payment Sync — Design Spec

**Date:** 2026-04-30
**Status:** Approved

## Problem

After making a monthly loan payment, the entry's stored `value` (used in net worth calculations)
does not update automatically. Users have no way to reflect their decreasing loan balance without
changing the interest rate.

## Solution

Add a **「我已繳款」** button to `LoanDetailSheet` that syncs the entry's value to the calculated
remaining principal. A manual override is available for cases where the actual balance differs
from the calculated value (e.g., early repayment).

## User Flow

1. User pays their monthly loan installment
2. User opens the loan detail page
3. Taps **「我已繳款」**
4. A confirmation sheet slides up from the bottom showing:
   - 本期應繳 (`status.nextPaymentAmount`, formatted as currency)
   - 還款日 (`status.nextPaymentDate`, formatted as YYYY/MM/DD)
5. User taps **「確認已繳」**
   - Button shows spinner + disabled while request is in flight
   - On success: sheet closes, a **「✓ 已同步」** toast appears at the top of the screen for 2 seconds, then `onRateUpdated()` is called to refresh data
   - On error: sheet stays open, inline error message **「同步失敗，請稍後再試」** appears below the buttons; user can retry
6. User can dismiss the sheet at any time by tapping the backdrop (outside the card)

**Manual override path:**

- User taps **「金額不同？手動輸入」** in the confirmation sheet
- The amount display is replaced by a number input labelled **「實際剩餘本金」**
- Placeholder: `0`; accepts integers and decimals ≥ 0 and ≤ `loan.totalAmount`
- If value is empty, negative, or exceeds `loan.totalAmount`, the confirm button is disabled and shows inline error **「請輸入有效金額（0 ～ 貸款總額）」**
- On submit: same loading/success/error behavior as auto-sync path

**Edge cases:**

- Button is hidden when `status.nextPaymentDate === null` (loan fully repaid)
- If `manualBalance` is `0`, it is treated as valid (loan fully repaid scenario)

## UI Layout

```
LoanDetailSheet (top → bottom)
─────────────────────────────
Header (back button + loan name)
Status cards: 剩餘本金 | 下期應繳 | 下期日期
Progress bar
[ 我已繳款 ]          ← NEW: full-width rounded button, backgroundColor = color prop, white text
年利率 (rate editor)
還款明細 (amortization table)
```

**「我已繳款」button:**

- Classes: `w-full rounded-2xl py-3 text-[15px] font-semibold text-white`
- `style={{ backgroundColor: color }}`
- Hidden (not rendered) when `status.nextPaymentDate === null`

**Confirmation sheet:**

```
[backdrop: fixed inset-0 bg-black/30, tap to dismiss]

╭──────────────────────────────╮
│  確認本期還款                  │  ← title, 17px semibold
│                                │
│  本期應繳   $12,450             │  ← label 12px gray + value 20px bold
│  還款日     2026/05/01          │  ← label 12px gray + value 15px
│                                │
│  [ 確認已繳 ]                  │  ← full-width, backgroundColor=color, white, 15px semibold
│  [ 金額不同？手動輸入 ]         │  ← text-only button, color=color, 13px
│                                │
│  (error message if any)        │  ← 12px red #ff3b30, shown only on error
╰──────────────────────────────╯
```

Sheet animation: slides up from bottom (`translate-y-full` → `translate-y-0`, 300ms ease-in-out).
Sheet is anchored to the bottom of the viewport (`fixed bottom-0 left-0 right-0`), `rounded-t-2xl`, `bg-white`, `px-5 py-6`.

**Manual input state replaces the amount display:**

```
│  實際剩餘本金                   │  ← label 12px gray
│  [____________] (number input) │  ← full-width, 20px bold
│  (validation error if any)     │  ← 12px red
│  [ 確認已繳 ]                  │
│  [ ← 返回自動計算 ]             │  ← resets back to auto-sync view
```

**Success toast:**

- Position: fixed top-center (`fixed top-14 left-1/2 -translate-x-1/2`)
- Content: `✓ 已同步` in white text on dark pill (`bg-[#1c1c1e] rounded-full px-4 py-2 text-[14px]`)
- Auto-dismisses after 2000ms with fade-out transition

## API Changes

### New endpoint: `PATCH /api/loans/[id]/sync`

**Request body (optional):**

```json
{ "manualBalance": 1200000 }
```

**Response:** `{ success: true, data: { loan, entryValue } }`

**Logic:**

1. Fetch loan by `id`; return 404 if not found
2. If `manualBalance` provided → use it directly
3. Otherwise → call `calculateLoanStatus(loanInput, new Date())` → use `remainingPrincipal`
4. `await prisma.entry.update({ where: { id: loan.entryId }, data: { value: newBalance } })`
5. Return `{ loan, entryValue: newBalance }`

**No schema changes required.**

## Component Changes

**File: `apps/web/components/finance/LoanDetailSheet.tsx`**

New state variables:

- `showSyncSheet: boolean` — controls confirmation sheet visibility
- `syncMode: 'auto' | 'manual'` — which view is shown inside the sheet
- `manualBalance: string` — controlled input value for manual mode
- `syncing: boolean` — loading state for the API call
- `syncError: string | null` — error message
- `showToast: boolean` — controls success toast visibility

New handler: `handleSync(manualBalance?: number)`:

1. Sets `syncing = true`, clears `syncError`
2. Calls `PATCH /api/loans/${loan.id}/sync` with optional body
3. On success: closes sheet, shows toast for 2s (`setTimeout`), calls `onRateUpdated()`
4. On error: sets `syncError = '同步失敗，請稍後再試'`
5. Sets `syncing = false`

**New files:**

- `apps/web/app/api/loans/[id]/sync/route.ts`

**Service changes:**

- `apps/web/services/loans.service.ts` — add `syncBalance(id: string, manualBalance?: number)` method

## Out of Scope

- Payment history log (tracking individual payments over time)
- Push notifications / reminders for upcoming payments
- Recurring payment automation
