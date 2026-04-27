# Collapsible Amortization Table — Design Spec

**Date:** 2026-04-27  
**Status:** Approved

## Problem

The amortization table ("還款明細") in `LoanDetailSheet` is always fully expanded, which clutters the view for loans with many months. The `loans/page.tsx` page has no amortization table at all. Both need a collapsible table that is hidden by default and expands on user click.

## Scope

Two files:

1. `apps/web/components/finance/LoanDetailSheet.tsx` — wrap existing `AmortizationTable` in a collapsible section
2. `apps/web/app/(finance)/loans/page.tsx` — add a collapsible `AmortizationTable` per loan card

## Design Decisions

- **Default state:** collapsed (hidden)
- **Animation:** CSS Grid `gridTemplateRows` trick (`"0fr"` → `"1fr"`) — consistent with existing `FinanceCategoryCard` pattern
- **Toggle UI:** clickable row with label "還款明細" + `ChevronDown`/`ChevronUp` icon (from lucide-react), icon rotates 180° on expand via `transition-transform`
- **Schedule data source in `loans/page.tsx`:** use current `formValues[entry.id]` (screen values, not raw DB entry) — allows user to see how schedule changes as they edit form fields

## Changes

### 1. `LoanDetailSheet.tsx`

Add `const [scheduleExpanded, setScheduleExpanded] = useState(false)`.

Replace the static amortization section:

```tsx
// Before
<div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
  <p className="mb-2 text-[15px] font-semibold text-[#1c1c1e]">還款明細</p>
  <AmortizationTable rows={schedule} color={color} />
</div>

// After
<div className="rounded-2xl bg-white shadow-sm">
  <button
    onClick={() => setScheduleExpanded((v) => !v)}
    className="flex w-full items-center justify-between px-4 py-4"
  >
    <p className="text-[15px] font-semibold text-[#1c1c1e]">還款明細</p>
    <ChevronDown
      size={16}
      className={`text-[#8e8e93] transition-transform duration-300 ${scheduleExpanded ? "rotate-180" : ""}`}
    />
  </button>
  <div
    className="grid transition-[grid-template-rows] duration-300 ease-in-out"
    style={{ gridTemplateRows: scheduleExpanded ? "1fr" : "0fr" }}
  >
    <div className="overflow-hidden">
      <div className="px-4 pb-4">
        <AmortizationTable rows={schedule} color={color} />
      </div>
    </div>
  </div>
</div>
```

Add `ChevronDown` to the lucide-react import.

### 2. `loans/page.tsx`

Add state:

```ts
const [expandedSchedule, setExpandedSchedule] = useState<Record<string, boolean>>({});
```

For each loan card, after `LoanFormFields`, compute the schedule from form values and render the collapsible section:

```tsx
// Parse formValues to generate schedule
const loanInput = {
  totalAmount: parseFloat(values.totalAmount) || 0,
  annualInterestRate: parseFloat(values.annualInterestRate) || 0,
  termMonths: parseInt(values.termMonths) || 0,
  startDate: values.startDate,
  gracePeriodMonths: parseInt(values.gracePeriodMonths) || 0,
  repaymentType: values.repaymentType,
};
const isValidInput = loanInput.totalAmount > 0 && loanInput.termMonths > 0 && loanInput.startDate;
const schedule = isValidInput ? generateAmortizationSchedule(loanInput, new Date()) : [];

const isExpanded = expandedSchedule[entry.id] ?? false;
```

Render after `LoanFormFields`:

```tsx
<div className="border-t border-[#f2f2f7]">
  <button
    onClick={() => setExpandedSchedule((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))}
    className="flex w-full items-center justify-between px-5 py-3"
  >
    <p className="text-[14px] font-semibold text-[#1c1c1e]">還款明細</p>
    <ChevronDown
      size={16}
      className={`text-[#8e8e93] transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
    />
  </button>
  <div
    className="grid transition-[grid-template-rows] duration-300 ease-in-out"
    style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
  >
    <div className="overflow-hidden">
      <div className="px-5 pb-4">
        {isValidInput ? (
          <AmortizationTable rows={schedule} color={color} />
        ) : (
          <p className="py-4 text-center text-[13px] text-[#8e8e93]">請先填寫貸款資料</p>
        )}
      </div>
    </div>
  </div>
</div>
```

Add imports: `ChevronDown` from lucide-react, `generateAmortizationSchedule` and `AmortizationTable` component.

## Out of Scope

- Persisting expanded/collapsed state across page refreshes
- Animating `LoanDetailSheet` schedule when loan data changes
