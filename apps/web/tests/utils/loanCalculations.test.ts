import { describe, it, expect } from "vitest";
import {
  generateAmortizationSchedule,
  calculateLoanStatus,
} from "@repo/shared/utils/loanCalculations";

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
