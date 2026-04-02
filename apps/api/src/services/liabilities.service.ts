import { prisma } from "../lib/prisma.js";
import type { CreateLiability, UpdateLiability } from "@repo/shared";

export class LiabilitiesService {
  async list() {
    return prisma.liability.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string) {
    return prisma.liability.findUnique({ where: { id } });
  }

  async create(data: CreateLiability) {
    return prisma.liability.create({ data });
  }

  async update(id: string, data: UpdateLiability) {
    // Strip undefined values to satisfy Prisma's exactOptionalPropertyTypes
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Parameters<typeof prisma.liability.update>[0]["data"];
    return prisma.liability.update({ where: { id }, data: cleaned });
  }

  async delete(id: string) {
    return prisma.liability.delete({ where: { id } });
  }
}

export const liabilitiesService = new LiabilitiesService();
