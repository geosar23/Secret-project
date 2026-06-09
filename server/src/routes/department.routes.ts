import { Router } from "express";
import { DepartmentController } from "../controllers/department.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";

const router = Router();

const canManageDepartments = userHasAnyPermission([PermissionKeys.DEPARTMENTS_MANAGEMENT_WRITE_ALL]);

router.get("/", DepartmentController.getAll);
router.post("/", canManageDepartments, DepartmentController.create);
router.get("/:id", DepartmentController.getById);
router.put("/:id", canManageDepartments, DepartmentController.update);
router.delete("/:id", canManageDepartments, DepartmentController.delete);

export default router;
