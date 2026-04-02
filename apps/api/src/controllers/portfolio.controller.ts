import type { Request, Response, NextFunction } from "express";
import { CreatePortfolioItemSchema, UpdatePortfolioItemSchema } from "@repo/shared";
import { portfolioService } from "../services/portfolio.service.js";
import { sendSuccess, sendError } from "../lib/envelope.js";

export class PortfolioController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await portfolioService.list();
      sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreatePortfolioItemSchema.parse(req.body);
      const item = await portfolioService.create(data);
      sendSuccess(res, item, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const existing = await portfolioService.findById(id);
      if (!existing) {
        sendError(res, "NOT_FOUND", "Portfolio item not found", 404);
        return;
      }
      const data = UpdatePortfolioItemSchema.parse(req.body);
      const item = await portfolioService.update(id, data);
      sendSuccess(res, item);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const existing = await portfolioService.findById(id);
      if (!existing) {
        sendError(res, "NOT_FOUND", "Portfolio item not found", 404);
        return;
      }
      await portfolioService.delete(id);
      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  }
}

export const portfolioController = new PortfolioController();
