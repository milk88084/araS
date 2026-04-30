import { prisma } from "@/lib/prisma";
import type { CreateLoan, UpdateLoanRate } from "@repo/shared";
import { calculateLoanStatus } from "@repo/shared";

export class LoansService {
  async create(data: CreateLoan) {
    const {
      loanName,
      category,
      totalAmount,
      annualInterestRate,
      termMonths,
      startDate,
      gracePeriodMonths,
      repaymentType,
    } = data;

    return prisma.$transaction(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          name: loanName,
          topCategory: "負債",
          subCategory: category,
          value: totalAmount,
        },
      });

      await tx.entryHistory.create({
        data: {
          entryId: entry.id,
          delta: totalAmount,
          balance: totalAmount,
        },
      });

      const loan = await tx.loan.create({
        data: {
          entryId: entry.id,
          loanName,
          totalAmount,
          annualInterestRate,
          termMonths,
          startDate: new Date(startDate),
          gracePeriodMonths,
          repaymentType,
        },
      });

      return { ...entry, loan };
    });
  }

  async findById(id: string) {
    return prisma.loan.findUnique({
      where: { id },
      include: { entry: true },
    });
  }

  async updateRate(id: string, data: UpdateLoanRate) {
    const loan = await prisma.loan.update({
      where: { id },
      data: { annualInterestRate: data.annualInterestRate },
    });

    const status = calculateLoanStatus(
      {
        totalAmount: loan.totalAmount,
        annualInterestRate: loan.annualInterestRate,
        termMonths: loan.termMonths,
        startDate: loan.startDate,
        gracePeriodMonths: loan.gracePeriodMonths,
        repaymentType: loan.repaymentType,
      },
      new Date()
    );

    await prisma.entry.update({
      where: { id: loan.entryId },
      data: { value: status.remainingPrincipal },
    });

    return loan;
  }

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

  async deleteByEntryId(entryId: string) {
    return prisma.entry.delete({ where: { id: entryId } });
  }
}

export const loansService = new LoansService();
