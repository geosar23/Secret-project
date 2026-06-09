import { Router } from "express";
import { SubDepartmentController } from "../controllers/sub-department.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";

const router = Router();

const canManageSubDepartments = userHasAnyPermission([PermissionKeys.SUB_DEPARTMENTS_MANAGEMENT_WRITE_ALL]);

router.get("/", SubDepartmentController.getAll);
router.post("/", canManageSubDepartments, SubDepartmentController.create);
router.get("/:id", SubDepartmentController.getById);
router.put("/:id", canManageSubDepartments, SubDepartmentController.update);
router.delete("/:id", canManageSubDepartments, SubDepartmentController.delete);

export default router;
