import { describe, it, expect } from "vitest";
import { calculateLoanStatus } from "@repo/shared";

const BASE_LOAN = {
  totalAmount: 6000000,
  annualInterestRate: 1.78,
  termMonths: 360,
  startDate: "2026-04-20T00:00:00.000Z",
  gracePeriodMonths: 0,
  repaymentType: "principal_interest" as const,
};

describe("calculateLoanStatus — nextRemainingPrincipal", () => {
  it("returns nextRemainingPrincipal as endBalance after first payment when no payments are past", () => {
    // today is before the first payment date (2026-05-20), so paidMonths = 0
    const today = new Date("2026-05-04T00:00:00.000Z");
    const status = calculateLoanStatus(BASE_LOAN, today);

    expect(status.paidMonths).toBe(0);
    // nextRemainingPrincipal should be the balance after the first payment
    // NOT the full totalAmount
    expect(status.nextRemainingPrincipal).toBeLessThan(BASE_LOAN.totalAmount);
  });

  it("returns nextRemainingPrincipal as endBalance after the upcoming payment when payments exist", () => {
    // today is after 12 payment dates — paidMonths = 12
    const today = new Date("2027-05-20T00:00:00.000Z");
    const status = calculateLoanStatus(BASE_LOAN, today);

    expect(status.paidMonths).toBe(12);
    // nextRemainingPrincipal < remainingPrincipal (advances one more period)
    expect(status.nextRemainingPrincipal).toBeLessThan(status.remainingPrincipal);
  });

  it("returns nextRemainingPrincipal of 0 when loan is fully repaid", () => {
    const fullyRepaidDate = new Date("2060-01-01T00:00:00.000Z");
    const status = calculateLoanStatus(BASE_LOAN, fullyRepaidDate);

    expect(status.nextPaymentDate).toBeNull();
    expect(status.nextRemainingPrincipal).toBe(0);
  });
});
