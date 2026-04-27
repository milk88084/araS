# Loading State Interaction Lock — Design Spec

**Date:** 2026-04-27  
**Status:** Approved

## Problem

When the app is in a loading or submitting state, users can still trigger interactions (click buttons, modify inputs, navigate), which can lead to duplicate API calls, inconsistent UI state, or data corruption.

## Scope

Three categories of loading state require interaction locking:

1. **Page-level loading** — already handled (`if (loading) return <LoadingScreen/>`) in `assets`, `loans`, `insurance` pages. No changes needed.
2. **Form/action submitting** — inputs and action buttons must be locked while an async operation is in flight.
3. **Bottom navigation** — tab buttons must be locked during page transitions.

## Design Decisions

- **Back/cancel buttons are NOT disabled** during submission — users may intentionally cancel an in-flight action.
- **All form inputs and action buttons ARE disabled** during submission to prevent duplicate submissions or mid-flight data changes.
- **Method:** Targeted `disabled={isLoading}` per element (Approach A). No shared abstraction needed.

## Changes Per Component

### 1. `BottomNav.tsx`

**Trigger:** `isPending` (React `useTransition`)  
**Lock:** All four tab buttons get `disabled={isPending}`.  
**Visual:** Add `opacity-60 cursor-not-allowed` class when `isPending` to signal the locked state.

### 2. `AccountFormPage.tsx`

**Trigger:** `submitting`  
**Lock:**

- Stock picker button (`setShowStockPicker`) — `disabled={submitting}`
- Stock price/units inputs — `disabled={submitting}`
- Account name input — `disabled={submitting}`
- Date input — `disabled={submitting}`
- Note input — `disabled={submitting}`
- "Include in chart" toggle button — `disabled={submitting}`

### 3. `PolicyUpdateForm.tsx`

**Trigger:** `saving`  
**Lock:** All four `<input type="number">` fields — `disabled={saving}`

### 4. `AddPortfolioItemModal.tsx`

**Trigger:** `submitting`  
**Lock:**

- Close (✕) button — `disabled={submitting}`
- Backdrop `onClick` — guarded: `onClick={submitting ? undefined : onClose}`
- All four input fields — `disabled={submitting}`

### 5. `EntryDetailPage.tsx`

**Two separate triggers:**

| Trigger                   | Elements to lock                       |
| ------------------------- | -------------------------------------- |
| `loading` (history fetch) | 「新增記錄」button, 「調整金額」button |
| `editSaving`              | Edit sheet backdrop `onClick`          |

### 6. `FinanceCategoryCard.tsx`

**Trigger:** `deletingId !== null`  
**Lock:** All item `onClick` handlers — guard with `!deletingId` check:

```tsx
onClick={() => !isConfirming && !deletingId && onEditItem?.(item)}
```

## Out of Scope

- `LoanDetailSheet` / `InsuranceDetailSheet` rate editor — cancel button intentionally remains active (cancelling a rate update is valid user intent).
- `PortfolioSection` add button during quote refresh — adding a new symbol while quotes refresh is harmless.
- Page-level loading screens — already implemented correctly.
