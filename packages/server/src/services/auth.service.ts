import { prisma } from "../lib/prisma.js";
import type { CreateUser, UpdateUser } from "@repo/shared";
import { logger } from "../lib/logger.js";

export class AuthService {
  async findOrCreateUser(clerkId: string, data: Omit<CreateUser, "clerkId">) {
    const existing = await prisma.user.findUnique({ where: { clerkId } });
    if (existing) return existing;

    const user = await prisma.user.create({
      data: {
        clerkId,
        email: data.email,
        username: data.username,
        role: data.role,
        avatarUrl: data.avatarUrl ?? null,
      },
    });
    logger.info({ userId: user.id }, "New user created via Clerk webhook");
    return user;
  }

  async getUserByClerkId(clerkId: string) {
    return prisma.user.findUnique({ where: { clerkId } });
  }

  async getUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async updateUser(id: string, data: UpdateUser) {
    return prisma.user.update({ where: { id }, data });
  }

  async listUsers(page: number, limit: number) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
    ]);
    return { users, total };
  }
}

export const authService = new AuthService();
