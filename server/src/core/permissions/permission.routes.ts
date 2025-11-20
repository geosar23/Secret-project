import { Router } from "express";
import { PermissionController } from "./permission.controller"

const router = Router();

// Grant permission to user
router.post("/users/:userId/permissions/grant", PermissionController.grantPermission);

// Revoke granted permission from user
router.delete(
    "/users/:userId/permissions/granted/:permission",
    PermissionController.revokeGrantedPermission
);

// Revoke role permission from user (blacklist)
router.post(
    "/users/:userId/permissions/revoke",
    PermissionController.revokeRolePermission
);

// Restore revoked role permission
router.post(
    "/users/:userId/permissions/restore",
    PermissionController.restoreRolePermission
);

// Get effective permissions for user
router.get(
    "/users/:userId/permissions/effective",
    PermissionController.getEffectivePermissions
);

// Get permission history for user
router.get(
    "/users/:userId/permissions/history",
    PermissionController.getPermissionHistory
);

// Cleanup expired permissions
router.post(
    "/users/:userId/permissions/cleanup",
    PermissionController.cleanupExpiredPermissions
);

// Bulk operations
router.post("/permissions/bulk/grant", PermissionController.bulkGrantPermission);
router.post("/permissions/bulk/revoke", PermissionController.bulkRevokeGrantedPermission);

export default router;
