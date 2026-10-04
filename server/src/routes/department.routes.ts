import { Router } from "express";
import { DepartmentController as DepartmentControllerRaw } from "../controllers/department.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";
import { wrapController } from "../utils/async-handler.util";

const router = Router();
const DepartmentController = wrapController(DepartmentControllerRaw);

const canManageDepartments = userHasAnyPermission([PermissionKeys.DEPARTMENTS_MANAGEMENT_WRITE_ALL]);

router.get("/", DepartmentController.getAll);
router.post("/", canManageDepartments, DepartmentController.create);
router.get("/:id", DepartmentController.getById);
router.put("/:id", canManageDepartments, DepartmentController.update);
router.delete("/:id", canManageDepartments, DepartmentController.delete);

export default router;
