import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    loan: {
      update: vi.fn(),
    },
    entry: {
      update: vi.fn(),
    },
  },
}));

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

import { prisma } from "@/lib/prisma";
import { loansService } from "../../services/loans.service";

const MOCK_LOAN = {
  id: "loan-1",
  entryId: "entry-1",
  loanName: "花蓮房貸",
  totalAmount: 6000000,
  annualInterestRate: 2.0,
  termMonths: 360,
  startDate: new Date("2026-04-20T00:00:00.000Z"),
  gracePeriodMonths: 0,
  repaymentType: "principal_interest" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("LoansService.updateRate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.loan.update).mockResolvedValue(MOCK_LOAN as never);
  });

  it("does not overwrite entry.value when updating the interest rate", async () => {
    await loansService.updateRate("loan-1", { annualInterestRate: 2.5 });

    expect(vi.mocked(prisma.entry.update)).not.toHaveBeenCalled();
  });

  it("updates the loan annualInterestRate", async () => {
    await loansService.updateRate("loan-1", { annualInterestRate: 2.5 });

    expect(vi.mocked(prisma.loan.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "loan-1" },
        data: { annualInterestRate: 2.5 },
      })
    );
  });
});
