import { prisma } from "@/lib/prisma";
import type { CreateEntry, UpdateEntry } from "@repo/shared";

export class EntriesService {
  async list() {
    return prisma.entry.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string) {
    return prisma.entry.findUnique({ where: { id } });
  }

  async create(data: CreateEntry) {
    return prisma.entry.create({ data });
  }

  async update(id: string, data: UpdateEntry) {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Parameters<typeof prisma.entry.update>[0]["data"];
    return prisma.entry.update({ where: { id }, data: cleaned });
  }

  async delete(id: string) {
    return prisma.entry.delete({ where: { id } });
  }
}

export const entriesService = new EntriesService();
