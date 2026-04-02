import { prisma } from "../lib/prisma.js";
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
    return prisma.portfolioItem.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.portfolioItem.delete({ where: { id } });
  }
}

export const portfolioService = new PortfolioService();
