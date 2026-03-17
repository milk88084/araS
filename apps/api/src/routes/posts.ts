import { Router } from "express";
import { requireAuthentication, requireRole } from "../middleware/auth.js";
import { postsController } from "../controllers/posts.controller.js";

const router = Router();

router.get("/", postsController.list.bind(postsController));
router.get("/:id", postsController.getById.bind(postsController));
router.post("/", requireAuthentication, postsController.create.bind(postsController));
router.patch("/:id", requireAuthentication, postsController.update.bind(postsController));
router.delete("/:id", requireAuthentication, postsController.delete.bind(postsController));
router.post(
  "/:id/restore",
  requireAuthentication,
  requireRole("admin"),
  postsController.restore.bind(postsController)
);

export default router;
