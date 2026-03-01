import { describe, it, expect, vi } from "vitest";
import { PostsService } from "../src/services/posts.service.js";

vi.mock("../src/lib/prisma.js", () => {
  const mockPost = {
    id: "test-post-1",
    title: "Test Post",
    content: "Test content",
    status: "draft",
    authorId: "author-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    author: { id: "author-1", username: "testuser", avatarUrl: null },
  };

  return {
    prisma: {
      post: {
        create: vi.fn().mockResolvedValue(mockPost),
        findFirst: vi.fn().mockResolvedValue(mockPost),
        findMany: vi.fn().mockResolvedValue([mockPost]),
        count: vi.fn().mockResolvedValue(1),
        update: vi.fn().mockResolvedValue({ ...mockPost, title: "Updated" }),
      },
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    },
    connectDatabase: vi.fn(),
    disconnectDatabase: vi.fn(),
  };
});

vi.mock("../src/lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
  recordMetric: vi.fn(),
  getP95: vi.fn(() => 0),
  getErrorRate: vi.fn(() => 0),
  metricsState: { requestCount: 0, errorCount: 0, responseTimes: [] },
  checkAlerts: vi.fn(),
}));

describe("PostsService", () => {
  const service = new PostsService();

  it("creates a post", async () => {
    const post = await service.create("author-1", {
      title: "Test Post",
      content: "Test content",
      status: "draft",
    });

    expect(post).toBeDefined();
    expect(post.title).toBe("Test Post");
  });

  it("lists posts with pagination", async () => {
    const result = await service.list({
      page: 1,
      limit: 20,
    });

    expect(result.posts).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it("finds post by id", async () => {
    const post = await service.findById("test-post-1");
    expect(post).toBeDefined();
    expect(post?.id).toBe("test-post-1");
  });

  it("soft deletes a post", async () => {
    const post = await service.softDelete("test-post-1");
    expect(post).toBeDefined();
  });
});
