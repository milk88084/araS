import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { authService } from "../services/auth.service.js";
import { sendSuccess, sendError } from "../lib/envelope.js";

export class AuthController {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        sendError(res, "UNAUTHORIZED", "Authentication required", 401);
        return;
      }

      const user = await authService.getUserByClerkId(auth.userId);
      if (!user) {
        sendError(res, "USER_NOT_FOUND", "User profile not found", 404);
        return;
      }

      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async syncUser(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        sendError(res, "UNAUTHORIZED", "Authentication required", 401);
        return;
      }

      const { email, username, role } = req.body;
      const user = await authService.findOrCreateUser(auth.userId, {
        email,
        username: username ?? email.split("@")[0],
        role: role ?? "viewer",
      });

      sendSuccess(res, user, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        sendError(res, "UNAUTHORIZED", "Authentication required", 401);
        return;
      }

      const currentUser = await authService.getUserByClerkId(auth.userId);
      if (!currentUser) {
        sendError(res, "USER_NOT_FOUND", "User profile not found", 404);
        return;
      }

      const user = await authService.updateUser(currentUser.id, req.body);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
