# Loan Payment Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a「我已繳款」button to `LoanDetailSheet` that syncs the entry's stored balance to
the calculated (or manually entered) remaining principal after each monthly payment.

**Architecture:** Three-layer change — (1) new `syncBalance` service method that calculates or
accepts a manual remaining balance and writes it to `entry.value`, (2) new `PATCH
/api/loans/[id]/sync` route, (3) UI additions to `LoanDetailSheet`: a trigger button, a
confirmation bottom sheet with auto/manual modes, and a success toast.

**Tech Stack:** Next.js 15 App Router, Prisma 6, Zod, React 19, Tailwind CSS 4, Vitest + React
Testing Library

---

## File Map

| Action | File                                                                  | Purpose                  |
| ------ | --------------------------------------------------------------------- | ------------------------ |
| Modify | `apps/web/services/loans.service.ts`                                  | Add `syncBalance` method |
| Create | `apps/web/app/api/loans/[id]/sync/route.ts`                           | PATCH handler            |
| Modify | `apps/web/components/finance/LoanDetailSheet.tsx`                     | Button + sheet + toast   |
| Create | `apps/web/components/finance/__tests__/LoanDetailSheet.sync.test.tsx` | UI behaviour tests       |

---

## Task 1: Service method + API route

**Files:**

- Modify: `apps/web/services/loans.service.ts`
- Create: `apps/web/app/api/loans/[id]/sync/route.ts`

- [ ] **Step 1: Add `syncBalance` to `LoansService`**

In `apps/web/services/loans.service.ts`, add this method after `updateRate` (line 83):

```typescript
async syncBalance(id: string, manualBalance?: number) {
  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan) return null;

  const newBalance =
    manualBalance !== undefined
      ? manualBalance
      : calculateLoanStatus(
          {
            totalAmount: loan.totalAmount,
            annualInterestRate: loan.annualInterestRate,
            termMonths: loan.termMonths,
            startDate: loan.startDate,
            gracePeriodMonths: loan.gracePeriodMonths,
            repaymentType: loan.repaymentType,
          },
          new Date()
        ).remainingPrincipal;

  await prisma.entry.update({
    where: { id: loan.entryId },
    data: { value: newBalance },
  });

  return { loan, entryValue: newBalance };
}
```

- [ ] **Step 2: Create the sync route**

Create `apps/web/app/api/loans/[id]/sync/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { loansService } from "@/services/loans.service";
import { ok, err, handleError } from "@/lib/api-response";

const SyncBodySchema = z.object({
  manualBalance: z.number().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await loansService.findById(id);
    if (!existing) return err("NOT_FOUND", "Loan not found", 404);
    const body = await req.json().catch(() => ({}));
    const { manualBalance } = SyncBodySchema.parse(body);
    const result = await loansService.syncBalance(id, manualBalance);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 3: Verify type-check passes**

```bash
pnpm --filter @repo/web type-check
```

Expected: exits with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/services/loans.service.ts "apps/web/app/api/loans/[id]/sync/route.ts"
git commit -m "feat(api): add syncBalance service method and PATCH /api/loans/[id]/sync route"
```

---

## Task 2: LoanDetailSheet UI — button, sheet, toast

**Files:**

- Create: `apps/web/components/finance/__tests__/LoanDetailSheet.sync.test.tsx`
- Modify: `apps/web/components/finance/LoanDetailSheet.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/components/finance/__tests__/LoanDetailSheet.sync.test.tsx`:

```typescript
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { calculateLoanStatus } from "@repo/shared";
import { LoanDetailSheet } from "../LoanDetailSheet";
import type { Loan } from "@repo/shared";

vi.mock("@repo/shared", async () => {
  const actual = await vi.importActual<typeof import("@repo/shared")>("@repo/shared");
  return {
    ...actual,
    generateAmortizationSchedule: () => [],
    calculateLoanStatus: vi.fn().mockReturnValue({
      remainingPrincipal: 900000,
      nextPaymentAmount: 12450,
      nextPaymentDate: new Date("2026-05-01"),
      paidMonths: 3,
    }),
  };
});

vi.mock("../AmortizationTable", () => ({
  AmortizationTable: () => null,
}));

const MOCK_LOAN: Loan = {
  id: "loan-1",
  entryId: "entry-1",
  loanName: "花蓮房貸",
  totalAmount: 1200000,
  annualInterestRate: 2,
  termMonths: 360,
  startDate: "2026-01-01T00:00:00.000Z",
  gracePeriodMonths: 0,
  repaymentType: "principal_interest",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("LoanDetailSheet — payment sync", () => {
  const onClose = vi.fn();
  const onRateUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(calculateLoanStatus).mockReturnValue({
      remainingPrincipal: 900000,
      nextPaymentAmount: 12450,
      nextPaymentDate: new Date("2026-05-01"),
      paidMonths: 3,
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it("renders 我已繳款 button when loan has a next payment date", () => {
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    expect(screen.getByRole("button", { name: "我已繳款" })).toBeInTheDocument();
  });

  it("does not render 我已繳款 button when loan is fully repaid", () => {
    vi.mocked(calculateLoanStatus).mockReturnValue({
      remainingPrincipal: 0,
      nextPaymentAmount: 0,
      nextPaymentDate: null,
      paidMonths: 360,
    });
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    expect(screen.queryByRole("button", { name: "我已繳款" })).not.toBeInTheDocument();
  });

  it("opens confirmation sheet when 我已繳款 is clicked", () => {
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    expect(screen.getByText("確認本期還款")).toBeInTheDocument();
  });

  it("closes confirmation sheet when backdrop is clicked", () => {
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    fireEvent.click(screen.getByTestId("sync-backdrop"));
    expect(screen.queryByText("確認本期還款")).not.toBeInTheDocument();
  });

  it("switches to manual input when 金額不同？手動輸入 is clicked", () => {
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    fireEvent.click(screen.getByRole("button", { name: "金額不同？手動輸入" }));
    expect(screen.getByLabelText("實際剩餘本金")).toBeInTheDocument();
  });

  it("disables 確認已繳 when manual balance exceeds totalAmount", () => {
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    fireEvent.click(screen.getByRole("button", { name: "金額不同？手動輸入" }));
    fireEvent.change(screen.getByLabelText("實際剩餘本金"), {
      target: { value: "9999999" },
    });
    expect(screen.getByRole("button", { name: "確認已繳" })).toBeDisabled();
  });

  it("calls fetch and onRateUpdated on successful auto sync", async () => {
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    fireEvent.click(screen.getByRole("button", { name: "確認已繳" }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/loans/loan-1/sync",
        expect.objectContaining({ method: "PATCH" })
      );
      expect(onRateUpdated).toHaveBeenCalled();
    });
  });

  it("shows error message when sync fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    fireEvent.click(screen.getByRole("button", { name: "確認已繳" }));
    await waitFor(() => {
      expect(screen.getByText("同步失敗，請稍後再試")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @repo/web test -- components/finance/__tests__/LoanDetailSheet.sync.test.tsx
```

Expected: all tests FAIL (the new UI elements don't exist yet).

- [ ] **Step 3: Implement the full updated `LoanDetailSheet`**

Replace the entire content of `apps/web/components/finance/LoanDetailSheet.tsx`:

```typescript
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
  const [rateError, setRateError] = useState<string | null>(null);

  const [showSyncSheet, setShowSyncSheet] = useState(false);
  const [syncMode, setSyncMode] = useState<"auto" | "manual">("auto");
  const [manualBalance, setManualBalance] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

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

  const manualBalanceNum = parseFloat(manualBalance);
  const manualBalanceValid =
    manualBalance !== "" &&
    !isNaN(manualBalanceNum) &&
    manualBalanceNum >= 0 &&
    manualBalanceNum <= loan.totalAmount;

  const handleSaveRate = async () => {
    const rate = parseFloat(rateInput);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setRateError("請輸入有效的年利率（0 ~ 100%）");
      return;
    }
    setRateError(null);
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

  const handleSync = async (balance?: number) => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/loans/${loan.id}/sync`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        ...(balance !== undefined ? { body: JSON.stringify({ manualBalance: balance }) } : {}),
      });
      if (!res.ok) throw new Error();
      setShowSyncSheet(false);
      setSyncMode("auto");
      setManualBalance("");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      onRateUpdated();
    } catch {
      setSyncError("同步失敗，請稍後再試");
    } finally {
      setSyncing(false);
    }
  };

  const closeSyncSheet = () => {
    setShowSyncSheet(false);
    setSyncMode("auto");
    setManualBalance("");
    setSyncError(null);
  };

  return (
    <>
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
                  value: status.nextPaymentDate
                    ? formatCurrency(status.nextPaymentAmount)
                    : "—",
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

            {/* 我已繳款 — hidden when fully repaid */}
            {status.nextPaymentDate && (
              <button
                onClick={() => setShowSyncSheet(true)}
                className="w-full rounded-2xl py-3 text-[15px] font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                我已繳款
              </button>
            )}

            {/* Rate editor */}
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <p className="mb-1 text-[12px] text-[#8e8e93]">年利率 (%)</p>
              {editingRate ? (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={rateInput}
                      onChange={(e) => {
                        setRateInput(e.target.value);
                        setRateError(null);
                      }}
                      step="0.01"
                      className="min-w-0 flex-1 bg-transparent text-[20px] font-bold text-[#1c1c1e] outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setRateInput(String(loan.annualInterestRate));
                        setRateError(null);
                        setEditingRate(false);
                      }}
                      className="shrink-0 rounded-xl bg-[#f2f2f7] px-3 py-1.5 text-[13px] font-semibold text-[#8e8e93]"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveRate}
                      disabled={savingRate}
                      className="shrink-0 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: color }}
                    >
                      {savingRate ? "更新中" : "確認"}
                    </button>
                  </div>
                  {rateError && (
                    <p className="mt-1 text-[12px] text-[#ff3b30]">{rateError}</p>
                  )}
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

      {/* Sync confirmation sheet */}
      {showSyncSheet && (
        <>
          <div
            data-testid="sync-backdrop"
            className="fixed inset-0 z-[95] bg-black/30"
            onClick={closeSyncSheet}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[96] rounded-t-2xl bg-white px-5 py-6 shadow-xl">
            <div className="mx-auto max-w-md">
              <p className="mb-4 text-[17px] font-semibold text-[#1c1c1e]">確認本期還款</p>

              {syncMode === "auto" ? (
                <>
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between">
                      <p className="text-[12px] text-[#8e8e93]">本期應繳</p>
                      <p className="text-[15px] font-semibold text-[#1c1c1e]">
                        {formatCurrency(status.nextPaymentAmount)}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-[12px] text-[#8e8e93]">還款日</p>
                      <p className="text-[15px] text-[#1c1c1e]">
                        {status.nextPaymentDate
                          ? formatDateStr(status.nextPaymentDate.toISOString())
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSync()}
                    disabled={syncing}
                    className="mb-2 w-full rounded-2xl py-3 text-[15px] font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: color }}
                  >
                    {syncing ? "同步中..." : "確認已繳"}
                  </button>
                  <button
                    onClick={() => setSyncMode("manual")}
                    className="w-full py-2 text-[13px] font-medium"
                    style={{ color }}
                  >
                    金額不同？手動輸入
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <label
                      htmlFor="manual-balance"
                      className="mb-1 block text-[12px] text-[#8e8e93]"
                    >
                      實際剩餘本金
                    </label>
                    <input
                      id="manual-balance"
                      aria-label="實際剩餘本金"
                      type="number"
                      value={manualBalance}
                      onChange={(e) => setManualBalance(e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-[20px] font-bold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
                    />
                    {manualBalance !== "" && !manualBalanceValid && (
                      <p className="mt-1 text-[12px] text-[#ff3b30]">
                        請輸入有效金額（0 ～ 貸款總額）
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleSync(manualBalanceNum)}
                    disabled={syncing || !manualBalanceValid}
                    className="mb-2 w-full rounded-2xl py-3 text-[15px] font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: color }}
                  >
                    {syncing ? "同步中..." : "確認已繳"}
                  </button>
                  <button
                    onClick={() => {
                      setSyncMode("auto");
                      setManualBalance("");
                    }}
                    className="w-full py-2 text-[13px] font-medium"
                    style={{ color }}
                  >
                    ← 返回自動計算
                  </button>
                </>
              )}

              {syncError && (
                <p className="mt-2 text-center text-[12px] text-[#ff3b30]">{syncError}</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Success toast */}
      {showToast && (
        <div className="fixed top-14 left-1/2 z-[97] -translate-x-1/2">
          <div className="rounded-full bg-[#1c1c1e] px-4 py-2 text-[14px] text-white">
            ✓ 已同步
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @repo/web test -- components/finance/__tests__/LoanDetailSheet.sync.test.tsx
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Run full type-check and test suite**

```bash
pnpm --filter @repo/web type-check && pnpm --filter @repo/web test
```

Expected: no type errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/finance/LoanDetailSheet.tsx "apps/web/components/finance/__tests__/LoanDetailSheet.sync.test.tsx"
git commit -m "feat(web): add 我已繳款 payment sync button to LoanDetailSheet"
```
