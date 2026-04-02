import type { Request, Response, NextFunction } from "express";
import { CreateTransactionSchema } from "@repo/shared";
import { transactionsService } from "../services/transactions.service.js";
import { sendSuccess } from "../lib/envelope.js";

export class TransactionsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { month } = req.query as { month?: string };
      const items = await transactionsService.list(month);
      sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreateTransactionSchema.parse(req.body);
      const item = await transactionsService.create(data);
      sendSuccess(res, item, 201);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      await transactionsService.delete(id);
      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  }
}

export const transactionsController = new TransactionsController();
