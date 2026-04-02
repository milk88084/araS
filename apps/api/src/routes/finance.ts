import { Router } from "express";
import { assetsController } from "../controllers/assets.controller.js";
import { liabilitiesController } from "../controllers/liabilities.controller.js";
import { transactionsController } from "../controllers/transactions.controller.js";
import { portfolioController } from "../controllers/portfolio.controller.js";
import { quotesController } from "../controllers/quotes.controller.js";

const router = Router();

router.get("/quotes/:symbol", (req, res, next) => quotesController.getQuote(req, res, next));

router.get("/assets", (req, res, next) => assetsController.list(req, res, next));
router.post("/assets", (req, res, next) => assetsController.create(req, res, next));
router.put("/assets/:id", (req, res, next) => assetsController.update(req, res, next));
router.delete("/assets/:id", (req, res, next) => assetsController.delete(req, res, next));

router.get("/liabilities", (req, res, next) => liabilitiesController.list(req, res, next));
router.post("/liabilities", (req, res, next) => liabilitiesController.create(req, res, next));
router.put("/liabilities/:id", (req, res, next) => liabilitiesController.update(req, res, next));
router.delete("/liabilities/:id", (req, res, next) => liabilitiesController.delete(req, res, next));

router.get("/transactions", (req, res, next) => transactionsController.list(req, res, next));
router.post("/transactions", (req, res, next) => transactionsController.create(req, res, next));
router.delete("/transactions/:id", (req, res, next) =>
  transactionsController.delete(req, res, next)
);

router.get("/portfolio", (req, res, next) => portfolioController.list(req, res, next));
router.post("/portfolio", (req, res, next) => portfolioController.create(req, res, next));
router.put("/portfolio/:id", (req, res, next) => portfolioController.update(req, res, next));
router.delete("/portfolio/:id", (req, res, next) => portfolioController.delete(req, res, next));

export default router;
