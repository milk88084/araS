import { Router } from "express";
import healthRoutes from "./health.js";
import postsRoutes from "./posts.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/posts", postsRoutes);

export default router;
