import { prisma } from "@/lib/prisma";
import type { CreateInsurance, UpdateInsuranceRate } from "@repo/shared";

export class InsuranceService {
  async create(data: CreateInsurance) {
    const { name, declaredRate, premiumTotal, currentAge, startDate, cashValueData, currency } =
      data;

    return prisma.$transaction(async (tx) => {
      const premiumValue = premiumTotal ?? 0;

      const entry = await tx.entry.create({
        data: {
          name,
          topCategory: "固定資產",
          subCategory: "保險",
          value: premiumValue,
        },
      });

      await tx.entryHistory.create({
        data: {
          entryId: entry.id,
          delta: premiumValue,
          balance: premiumValue,
        },
      });

      const insurance = await tx.insurance.create({
        data: {
          entryId: entry.id,
          currency: currency ?? "USD",
          declaredRate,
          premiumTotal: premiumTotal ?? null,
          currentAge,
          startDate: new Date(startDate),
          cashValueData,
        },
      });

      return { ...entry, insurance };
    });
  }

  async findById(id: string) {
    return prisma.insurance.findUnique({
      where: { id },
      include: { entry: true },
    });
  }

  async findByEntryId(entryId: string) {
    return prisma.insurance.findUnique({
      where: { entryId },
      include: { entry: true },
    });
  }

  async updateRate(id: string, data: UpdateInsuranceRate) {
    return prisma.insurance.update({
      where: { id },
      data: {
        declaredRate: data.declaredRate,
        ...(data.cashValueData !== undefined && { cashValueData: data.cashValueData }),
      },
    });
  }

  async deleteByEntryId(entryId: string) {
    return prisma.entry.delete({ where: { id: entryId } });
  }
}

export const insuranceService = new InsuranceService();
