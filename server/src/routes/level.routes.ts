import { Router } from "express";
import { LevelController } from "../controllers/level.controller";

const router = Router();

router.get("/", LevelController.getAll);
router.post("/", LevelController.create);
router.get("/:id", LevelController.getById);
router.put("/:id", LevelController.update);
router.delete("/:id", LevelController.delete);

export default router;
