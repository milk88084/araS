import { prisma } from "../lib/prisma.js";
import type { CreateAsset, UpdateAsset } from "@repo/shared";

export class AssetsService {
  async list() {
    return prisma.asset.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string) {
    return prisma.asset.findUnique({ where: { id } });
  }

  async create(data: CreateAsset) {
    return prisma.asset.create({ data });
  }

  async update(id: string, data: UpdateAsset) {
    return prisma.asset.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.asset.delete({ where: { id } });
  }
}

export const assetsService = new AssetsService();
