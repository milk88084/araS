import { Router } from "express";
import healthRoutes from "./health.js";
import financeRoutes from "./finance.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("", financeRoutes);

export default router;
