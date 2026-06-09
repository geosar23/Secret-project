import { Router } from "express";
import { LevelController } from "../controllers/level.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";

const router = Router();

const canManageLevels = userHasAnyPermission([PermissionKeys.LEVELS_MANAGEMENT_WRITE_ALL]);

router.get("/", LevelController.getAll);
router.post("/", canManageLevels, LevelController.create);
router.get("/:id", LevelController.getById);
router.put("/:id", canManageLevels, LevelController.update);
router.delete("/:id", canManageLevels, LevelController.delete);

export default router;
