import { Router } from "express";
import { RoleController } from "../controllers/role.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";

const router = Router();

// Permission sets for different operations
const readPermissions = [PermissionKeys.ROLES_MANAGEMENT_READ_ALL, PermissionKeys.ROLES_MANAGEMENT_READ_COMPANY];
const writePermissions = [PermissionKeys.ROLES_MANAGEMENT_WRITE_ALL, PermissionKeys.ROLES_MANAGEMENT_WRITE_COMPANY];
const deletePermissions = [PermissionKeys.ROLES_MANAGEMENT_DELETE_ALL, PermissionKeys.ROLES_MANAGEMENT_DELETE_COMPANY];

// Get role hierarchy
router.get("/hierarchy", userHasAnyPermission(readPermissions), RoleController.getRoleHierarchy);

// Get permissions for a specific role type
router.get("/:roleType/permissions", userHasAnyPermission(readPermissions), RoleController.getRolePermissions);

// Get all roles
router.get("/", userHasAnyPermission(readPermissions), RoleController.getAllRoles);

// Get role by ID
router.get("/:id", userHasAnyPermission(readPermissions), RoleController.getRoleById);

// Create custom role
router.post("/", userHasAnyPermission(writePermissions), RoleController.createRole);

// Update custom role
router.put("/:id", userHasAnyPermission(writePermissions), RoleController.updateRole);

// Delete custom role
router.delete("/:id", userHasAnyPermission(deletePermissions), RoleController.deleteRole);

export default router;
