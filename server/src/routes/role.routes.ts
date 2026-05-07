import { Router } from "express";
import { RoleController } from "../controllers/role.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";

const router = Router();

// Permissions required to mutate roles (create / update / delete)
const canManageRoles = userHasAnyPermission([
    PermissionKeys.ALL,
    PermissionKeys.ALL_COMPANY,
    PermissionKeys.ROLES_MANAGEMENT_ALL_ALL,
    PermissionKeys.ROLES_MANAGEMENT_ALL_COMPANY,
]);

// Get role hierarchy
router.get("/hierarchy", RoleController.getRoleHierarchy);

// Get permissions for a specific role type
router.get("/:roleType/permissions", RoleController.getRolePermissions);

// Get all roles
router.get("/", RoleController.getAllRoles);

// Get role by ID
router.get("/:id", RoleController.getRoleById);

// Create custom role
router.post("/", canManageRoles, RoleController.createRole);

// Update custom role (system or custom)
router.put("/:id", canManageRoles, RoleController.updateRole);

// Delete custom role
router.delete("/:id", canManageRoles, RoleController.deleteRole);

export default router;
