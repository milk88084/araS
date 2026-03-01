import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { CreatePostSchema, UpdatePostSchema, PostQuerySchema } from "@repo/shared";
import { postsService } from "../services/posts.service.js";
import { authService } from "../services/auth.service.js";
import { sendSuccess, sendError, sendPaginated } from "../lib/envelope.js";

export class PostsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        sendError(res, "UNAUTHORIZED", "Authentication required", 401);
        return;
      }

      const user = await authService.getUserByClerkId(auth.userId);
      if (!user) {
        sendError(res, "USER_NOT_FOUND", "User not found", 404);
        return;
      }

      const data = CreatePostSchema.parse(req.body);
      const post = await postsService.create(user.id, data);
      sendSuccess(res, post, 201);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = PostQuerySchema.parse(req.query);
      const { posts, total, page, limit } = await postsService.list(query);
      sendPaginated(res, posts, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const post = await postsService.findById(id);
      if (!post) {
        sendError(res, "NOT_FOUND", "Post not found", 404);
        return;
      }
      sendSuccess(res, post);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        sendError(res, "UNAUTHORIZED", "Authentication required", 401);
        return;
      }

      const id = req.params.id as string;
      const post = await postsService.findById(id);
      if (!post) {
        sendError(res, "NOT_FOUND", "Post not found", 404);
        return;
      }

      const user = await authService.getUserByClerkId(auth.userId);
      if (!user || (post.authorId !== user.id && user.role !== "admin")) {
        sendError(res, "FORBIDDEN", "Not authorized to update this post", 403);
        return;
      }

      const data = UpdatePostSchema.parse(req.body);
      const updated = await postsService.update(id, data);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        sendError(res, "UNAUTHORIZED", "Authentication required", 401);
        return;
      }

      const id = req.params.id as string;
      const post = await postsService.findById(id);
      if (!post) {
        sendError(res, "NOT_FOUND", "Post not found", 404);
        return;
      }

      const user = await authService.getUserByClerkId(auth.userId);
      if (!user || (post.authorId !== user.id && user.role !== "admin")) {
        sendError(res, "FORBIDDEN", "Not authorized to delete this post", 403);
        return;
      }

      await postsService.softDelete(id);
      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  }

  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const post = await postsService.restore(id);
      sendSuccess(res, post);
    } catch (error) {
      next(error);
    }
  }
}

export const postsController = new PostsController();
