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
    const { units, stockCode, ...rest } = data;
    const entry = await prisma.entry.create({ data: { ...rest, stockCode: stockCode ?? null } });
    await prisma.entryHistory.create({
      data: { entryId: entry.id, delta: entry.value, balance: entry.value, units: units ?? null },
    });
    return entry;
  }

  async update(id: string, data: UpdateEntry) {
    const existing = await prisma.entry.findUnique({ where: { id } });
    const { units, ...updateData } = data;
    const cleaned = Object.fromEntries(
      Object.entries(updateData).filter(([, v]) => v !== undefined)
    ) as Parameters<typeof prisma.entry.update>[0]["data"];
    const entry = await prisma.entry.update({ where: { id }, data: cleaned });
    if (data.value !== undefined && existing) {
      const delta = entry.value - existing.value;
      await prisma.entryHistory.create({
        data: { entryId: id, delta, balance: entry.value, units: units ?? null },
      });
    }
    return entry;
  }

  async delete(id: string) {
    return prisma.entry.delete({ where: { id } });
  }

  async listHistory(id: string) {
    return prisma.entryHistory.findMany({
      where: { entryId: id },
      orderBy: { createdAt: "desc" },
    });
  }

  async createHistory(
    entryId: string,
    data: { delta: number; balance: number; units?: number | null; note?: string; createdAt?: Date }
  ) {
    const payload: Parameters<typeof prisma.entryHistory.create>[0]["data"] = {
      entryId,
      delta: data.delta,
      balance: data.balance,
      units: data.units ?? null,
      note: data.note ?? null,
    };
    if (data.createdAt) payload.createdAt = data.createdAt;
    return prisma.entryHistory.create({ data: payload });
  }
}

export const entriesService = new EntriesService();
