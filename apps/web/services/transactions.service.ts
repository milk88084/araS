import { prisma } from "@/lib/prisma";
import type { CreateTransaction } from "@repo/shared";

export class TransactionsService {
  async list(month?: string) {
    let where = {};
    if (month) {
      const [year, m] = month.split("-").map(Number);
      if (year && m) {
        const start = new Date(year, m - 1, 1);
        const end = new Date(year, m, 1);
        where = { date: { gte: start, lt: end } };
      }
    }
    return prisma.transaction.findMany({ where, orderBy: { date: "desc" } });
  }

  async create(data: CreateTransaction) {
    const { date, note, ...rest } = data;
    return prisma.transaction.create({
      data: { ...rest, date: new Date(date), note: note ?? null },
    });
  }

  async delete(id: string) {
    return prisma.transaction.delete({ where: { id } });
  }
}

export const transactionsService = new TransactionsService();
