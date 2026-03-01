import { Router } from "express";
import healthRoutes from "./health.js";
import authRoutes from "./auth.js";
import postsRoutes from "./posts.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/posts", postsRoutes);

export default router;
