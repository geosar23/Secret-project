import { Router } from "express";
import { CompanyController } from "../controllers/company.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";

const router = Router();

// All company endpoints require companies management permission
const readPermissions = [PermissionKeys.COMPANIES_MANAGEMENT_READ_ALL];
const writePermissions = [PermissionKeys.COMPANIES_MANAGEMENT_WRITE_ALL];
const deletePermissions = [PermissionKeys.COMPANIES_MANAGEMENT_DELETE_ALL];

router.get("/", userHasAnyPermission(readPermissions), CompanyController.getAll);
router.get("/:id", userHasAnyPermission(readPermissions), CompanyController.getById);
router.post("/", userHasAnyPermission(writePermissions), CompanyController.create);
router.put("/:id", userHasAnyPermission(writePermissions), CompanyController.update);
router.delete("/:id", userHasAnyPermission(deletePermissions), CompanyController.delete);

export default router;
