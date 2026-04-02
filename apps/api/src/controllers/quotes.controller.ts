import type { Request, Response, NextFunction } from "express";
import { quotesService } from "../services/quotes.service.js";
import { sendSuccess, sendError } from "../lib/envelope.js";

export class QuotesController {
  async getQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const { symbol } = req.params as { symbol: string };
      const quote = await quotesService.fetchQuote(symbol);
      sendSuccess(res, quote);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("No data found")) {
        sendError(res, "SYMBOL_NOT_FOUND", error.message, 404);
        return;
      }
      next(error);
    }
  }
}

export const quotesController = new QuotesController();
