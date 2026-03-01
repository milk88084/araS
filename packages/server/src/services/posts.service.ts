import { prisma } from "../lib/prisma.js";
import type { CreatePost, UpdatePost, PostQuery } from "@repo/shared";
import { logger } from "../lib/logger.js";

export class PostsService {
  async create(authorId: string, data: CreatePost) {
    const post = await prisma.post.create({
      data: { ...data, authorId },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    });
    logger.info({ postId: post.id, authorId }, "Post created");
    return post;
  }

  async findById(id: string) {
    return prisma.post.findFirst({
      where: { id, deletedAt: null },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    });
  }

  async list(query: PostQuery) {
    const { page, limit, status, authorId, search } = query;

    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(authorId && { authorId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { content: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, username: true, avatarUrl: true } } },
      }),
      prisma.post.count({ where }),
    ]);

    return { posts, total, page, limit };
  }

  async update(id: string, data: UpdatePost) {
    return prisma.post.update({
      where: { id },
      data,
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    });
  }

  async softDelete(id: string) {
    const post = await prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    logger.info({ postId: id }, "Post soft-deleted");
    return post;
  }

  async restore(id: string) {
    return prisma.post.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}

export const postsService = new PostsService();
