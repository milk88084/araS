import { z } from "zod";

export const PostStatus = z.enum(["draft", "published", "archived"]);
export type PostStatus = z.infer<typeof PostStatus>;

export const PostSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  status: PostStatus.default("draft"),
  authorId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type Post = z.infer<typeof PostSchema>;

export const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  status: PostStatus.optional().default("draft"),
});

export type CreatePost = z.infer<typeof CreatePostSchema>;

export const UpdatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  status: PostStatus.optional(),
});

export type UpdatePost = z.infer<typeof UpdatePostSchema>;

export const PostQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: PostStatus.optional(),
  authorId: z.string().optional(),
  search: z.string().optional(),
});

export type PostQuery = z.infer<typeof PostQuerySchema>;
