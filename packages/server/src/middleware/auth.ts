import { clerkMiddleware, requireAuth, getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@repo/shared";
import { prisma } from "../lib/prisma.js";
import { sendError } from "../lib/envelope.js";

export const clerkAuth = clerkMiddleware();

export const requireAuthentication = requireAuth();

export function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        sendError(res, "UNAUTHORIZED", "Authentication required", 401);
        return;
      }

      const user = await prisma.user.findUnique({
        where: { clerkId: auth.userId },
      });

      if (!user) {
        sendError(res, "USER_NOT_FOUND", "User not found in database", 404);
        return;
      }

      if (!roles.includes(user.role as UserRole)) {
        sendError(res, "FORBIDDEN", "Insufficient permissions", 403);
        return;
      }

      (req as Request & { dbUser: typeof user }).dbUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
