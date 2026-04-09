import { prisma } from "@/lib/prisma";
import type { CreatePortfolioItem, UpdatePortfolioItem } from "@repo/shared";

export class PortfolioService {
  async list() {
    return prisma.portfolioItem.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string) {
    return prisma.portfolioItem.findUnique({ where: { id } });
  }

  async create(data: CreatePortfolioItem) {
    return prisma.portfolioItem.create({ data });
  }

  async update(id: string, data: UpdatePortfolioItem) {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Parameters<typeof prisma.portfolioItem.update>[0]["data"];
    return prisma.portfolioItem.update({ where: { id }, data: cleaned });
  }

  async delete(id: string) {
    return prisma.portfolioItem.delete({ where: { id } });
  }
}

export const portfolioService = new PortfolioService();
