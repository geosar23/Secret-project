import { Router } from "express";
import { EmploymentTitleController } from "../controllers/employment-title.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";

const router = Router();

const canManageEmploymentTitles = userHasAnyPermission([PermissionKeys.EMPLOYMENT_TITLES_MANAGEMENT_WRITE_ALL]);

router.get("/", EmploymentTitleController.getAll);
router.post("/", canManageEmploymentTitles, EmploymentTitleController.create);
router.get("/:id", EmploymentTitleController.getById);
router.put("/:id", canManageEmploymentTitles, EmploymentTitleController.update);
router.delete("/:id", canManageEmploymentTitles, EmploymentTitleController.delete);

export default router;
