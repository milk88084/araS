import { prisma } from "@/lib/prisma";
import type {
  CreateInsurance,
  UpdateInsuranceRate,
  UpdateInsurancePolicyValues,
} from "@repo/shared";

export class InsuranceService {
  async create(data: CreateInsurance) {
    const { name, declaredRate, premiumTotal, currentAge, startDate, cashValueData, currency } =
      data;

    return prisma.$transaction(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          name,
          topCategory: "固定資產",
          subCategory: "保險",
          value: premiumTotal ?? 0,
        },
      });

      await tx.entryHistory.create({
        data: {
          entryId: entry.id,
          delta: premiumTotal ?? 0,
          balance: premiumTotal ?? 0,
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

  async findAll() {
    return prisma.insurance.findMany({
      include: { entry: true },
      orderBy: { createdAt: "desc" },
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

  async updateValues(id: string, data: UpdateInsurancePolicyValues) {
    return prisma.insurance.update({
      where: { id },
      data: {
        surrenderValue: data.surrenderValue,
        accumulatedBonus: data.accumulatedBonus,
        accumulatedSumIncrease: data.accumulatedSumIncrease,
        ...(data.premiumTotal !== undefined && { premiumTotal: data.premiumTotal }),
        lastUpdatedAt: new Date(),
      },
    });
  }

  async deleteByEntryId(entryId: string) {
    return prisma.entry.delete({ where: { id: entryId } });
  }
}

export const insuranceService = new InsuranceService();
