import { prisma } from "@/lib/prisma";
import type { CreateLoan, UpdateLoan, UpdateLoanRate } from "@repo/shared";
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

  async update(id: string, data: UpdateLoan) {
    return prisma.$transaction(async (tx) => {
      const loan = await tx.loan.update({
        where: { id },
        data: {
          ...(data.loanName !== undefined && { loanName: data.loanName }),
          ...(data.annualInterestRate !== undefined && {
            annualInterestRate: data.annualInterestRate,
          }),
          ...(data.termMonths !== undefined && { termMonths: data.termMonths }),
          ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
          ...(data.gracePeriodMonths !== undefined && {
            gracePeriodMonths: data.gracePeriodMonths,
          }),
          ...(data.repaymentType !== undefined && { repaymentType: data.repaymentType }),
        },
        include: { entry: true },
      });

      const entryUpdates: { name?: string; value?: number } = {};
      if (data.loanName !== undefined) entryUpdates.name = data.loanName;
      if (data.totalAmount !== undefined) entryUpdates.value = data.totalAmount;

      if (Object.keys(entryUpdates).length > 0) {
        await tx.entry.update({
          where: { id: loan.entryId },
          data: entryUpdates,
        });
      }

      if (data.totalAmount !== undefined && data.totalAmount !== loan.entry.value) {
        await tx.entryHistory.create({
          data: {
            entryId: loan.entryId,
            delta: data.totalAmount - loan.entry.value,
            balance: data.totalAmount,
            note: "手動調整餘額",
          },
        });
      }

      return loan;
    });
  }

  async updateRate(id: string, data: UpdateLoanRate) {
    const loan = await prisma.loan.update({
      where: { id },
      data: { annualInterestRate: data.annualInterestRate },
    });

    return loan;
  }

  async syncBalance(
    loan: {
      id: string;
      entryId: string;
      totalAmount: number;
      annualInterestRate: number;
      termMonths: number;
      startDate: Date;
      gracePeriodMonths: number;
      repaymentType: "principal_interest" | "principal_equal";
      entry: { value: number };
    },
    manualBalance?: number,
    overrideTermMonths?: number
  ) {
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
          ).nextRemainingPrincipal;

    const delta = newBalance - loan.entry.value;

    await prisma.$transaction(async (tx) => {
      await tx.entry.update({
        where: { id: loan.entryId },
        data: { value: newBalance },
      });
      await tx.entryHistory.create({
        data: {
          entryId: loan.entryId,
          delta,
          balance: newBalance,
          note: "繳款同步",
        },
      });
      if (overrideTermMonths !== undefined) {
        await tx.loan.update({
          where: { id: loan.id },
          data: { overrideTermMonths },
        });
      }
    });

    return { loan, entryValue: newBalance };
  }

  async deleteByEntryId(entryId: string) {
    return prisma.entry.delete({ where: { id: entryId } });
  }
}

export const loansService = new LoansService();
