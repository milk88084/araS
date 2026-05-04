import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { calculateLoanStatus } from "@repo/shared";
import { LoanSummaryCard } from "../LoanSummaryCard";
import type { Entry } from "@repo/shared";

vi.mock("@repo/shared", async () => {
  const actual = await vi.importActual<typeof import("@repo/shared")>("@repo/shared");
  return {
    ...actual,
    calculateLoanStatus: vi.fn().mockReturnValue({
      remainingPrincipal: 6000000,
      nextRemainingPrincipal: 5987377,
      nextPaymentAmount: 21523,
      nextPaymentDate: new Date("2026-05-20"),
      paidMonths: 0,
    }),
  };
});

const MOCK_LOAN_ENTRY: Entry = {
  id: "entry-1",
  name: "花蓮房貸",
  topCategory: "負債",
  subCategory: "房屋貸款",
  value: 5987377, // synced balance — differs from calculateLoanStatus().remainingPrincipal (6000000)
  stockCode: null,
  units: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-05-04T00:00:00.000Z",
  loan: {
    id: "loan-1",
    entryId: "entry-1",
    loanName: "花蓮房貸",
    totalAmount: 6000000,
    annualInterestRate: 1.78,
    termMonths: 360,
    startDate: "2026-04-20T00:00:00.000Z",
    gracePeriodMonths: 0,
    repaymentType: "principal_interest",
    createdAt: "2026-04-20T00:00:00.000Z",
    updatedAt: "2026-05-04T00:00:00.000Z",
  },
};

describe("LoanSummaryCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays totalRemaining from entry.value, not from calculateLoanStatus", () => {
    render(<LoanSummaryCard loanEntries={[MOCK_LOAN_ENTRY]} />);

    // entry.value = 5,987,377 → should show ~5,987,377
    // calculateLoanStatus().remainingPrincipal = 6,000,000 (mocked) → should NOT show 6,000,000
    // formatCurrency(5987377) in zh-TW should contain "5,987"
    const main = screen.getByText(/-\$[\d,]+/);
    expect(main.textContent).toContain("5,987");
    expect(main.textContent).not.toContain("6,000,000");
  });

  it("does not call calculateLoanStatus when computing totalRemaining", () => {
    render(<LoanSummaryCard loanEntries={[MOCK_LOAN_ENTRY]} />);
    expect(vi.mocked(calculateLoanStatus)).not.toHaveBeenCalled();
  });
});
