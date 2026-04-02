import type { Request, Response, NextFunction } from "express";
import { CreateLiabilitySchema, UpdateLiabilitySchema } from "@repo/shared";
import { liabilitiesService } from "../services/liabilities.service.js";
import { sendSuccess, sendError } from "../lib/envelope.js";

export class LiabilitiesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await liabilitiesService.list();
      sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreateLiabilitySchema.parse(req.body);
      const item = await liabilitiesService.create(data);
      sendSuccess(res, item, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const existing = await liabilitiesService.findById(id);
      if (!existing) {
        sendError(res, "NOT_FOUND", "Liability not found", 404);
        return;
      }
      const data = UpdateLiabilitySchema.parse(req.body);
      const item = await liabilitiesService.update(id, data);
      sendSuccess(res, item);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const existing = await liabilitiesService.findById(id);
      if (!existing) {
        sendError(res, "NOT_FOUND", "Liability not found", 404);
        return;
      }
      await liabilitiesService.delete(id);
      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  }
}

export const liabilitiesController = new LiabilitiesController();
