import { Router } from "express";
import { requireAuthentication } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rate-limit.js";
import { authController } from "../controllers/auth.controller.js";

const router = Router();

router.get("/me", requireAuthentication, authController.getMe.bind(authController));
router.post(
  "/sync",
  authRateLimit,
  requireAuthentication,
  authController.syncUser.bind(authController)
);
router.patch(
  "/profile",
  requireAuthentication,
  authController.updateProfile.bind(authController)
);

export default router;
