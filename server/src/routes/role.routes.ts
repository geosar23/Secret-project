import { Router } from "express";
import { RoleController as RoleControllerRaw } from "../controllers/role.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";
import { USER_FORM_REFERENCE_READ_PERMISSIONS } from "../policies/permission-groups";
import { wrapController } from "../utils/async-handler.util";

const router = Router();
const RoleController = wrapController(RoleControllerRaw);

// Permissions required to mutate roles (create / update / delete)
const canManageRoles = userHasAnyPermission([PermissionKeys.ROLES_MANAGEMENT_WRITE_ALL]);

// Role lists feed the user create/edit forms, so user managers may read them too
const canReadRoles = userHasAnyPermission([
    PermissionKeys.ROLES_MANAGEMENT_READ_ALL,
    PermissionKeys.ROLES_MANAGEMENT_WRITE_ALL,
    ...USER_FORM_REFERENCE_READ_PERMISSIONS,
]);

// Get role hierarchy
router.get("/hierarchy", canReadRoles, RoleController.getRoleHierarchy);

// Get permissions for a specific role type
router.get("/:roleType/permissions", canReadRoles, RoleController.getRolePermissions);

// Get all roles
router.get("/", canReadRoles, RoleController.getAllRoles);

// Get role by ID
router.get("/:id", canReadRoles, RoleController.getRoleById);

// Create custom role
router.post("/", canManageRoles, RoleController.createRole);

// Update custom role (system or custom)
router.put("/:id", canManageRoles, RoleController.updateRole);

// Delete custom role
router.delete("/:id", canManageRoles, RoleController.deleteRole);

export default router;
