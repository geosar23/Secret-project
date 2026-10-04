import { Router } from "express";
import { EmploymentTitleController as EmploymentTitleControllerRaw } from "../controllers/employment-title.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";
import { wrapController } from "../utils/async-handler.util";

const router = Router();
const EmploymentTitleController = wrapController(EmploymentTitleControllerRaw);

const canManageEmploymentTitles = userHasAnyPermission([PermissionKeys.EMPLOYMENT_TITLES_MANAGEMENT_WRITE_ALL]);

router.get("/", EmploymentTitleController.getAll);
router.post("/", canManageEmploymentTitles, EmploymentTitleController.create);
router.get("/:id", EmploymentTitleController.getById);
router.put("/:id", canManageEmploymentTitles, EmploymentTitleController.update);
router.delete("/:id", canManageEmploymentTitles, EmploymentTitleController.delete);

export default router;
