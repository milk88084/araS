import type { Request, Response, NextFunction } from "express";
import { CreateAssetSchema, UpdateAssetSchema } from "@repo/shared";
import { assetsService } from "../services/assets.service.js";
import { sendSuccess, sendError } from "../lib/envelope.js";

export class AssetsController {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const assets = await assetsService.list();
      sendSuccess(res, assets);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreateAssetSchema.parse(req.body);
      const asset = await assetsService.create(data);
      sendSuccess(res, asset, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const existing = await assetsService.findById(id);
      if (!existing) {
        sendError(res, "NOT_FOUND", "Asset not found", 404);
        return;
      }
      const data = UpdateAssetSchema.parse(req.body);
      const asset = await assetsService.update(id, data);
      sendSuccess(res, asset);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const existing = await assetsService.findById(id);
      if (!existing) {
        sendError(res, "NOT_FOUND", "Asset not found", 404);
        return;
      }
      await assetsService.delete(id);
      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  }
}

export const assetsController = new AssetsController();
