import { Router, RequestHandler } from "express";
import { PermissionController } from "./permission.controller";

const router = Router();

// Grant permission to user
router.post(
    "/users/:userId/permissions/grant",
    PermissionController.grantPermission as RequestHandler,
);

// Revoke granted permission from user
router.delete(
    "/users/:userId/permissions/granted/:permission",
    PermissionController.revokeGrantedPermission as RequestHandler,
);

// Revoke role permission from user (blacklist)
router.post(
    "/users/:userId/permissions/revoke",
    PermissionController.revokeRolePermission as RequestHandler,
);

// Restore revoked role permission
router.post(
    "/users/:userId/permissions/restore",
    PermissionController.restoreRolePermission as RequestHandler,
);

// Get effective permissions for user
router.get(
    "/users/:userId/permissions/effective",
    PermissionController.getEffectivePermissions as RequestHandler,
);

// Get permission history for user
router.get(
    "/users/:userId/permissions/history",
    PermissionController.getPermissionHistory as RequestHandler,
);

// Cleanup expired permissions
router.post(
    "/users/:userId/permissions/cleanup",
    PermissionController.cleanupExpiredPermissions as RequestHandler,
);

// Bulk operations
router.post(
    "/permissions/bulk/grant",
    PermissionController.bulkGrantPermission as RequestHandler,
);
router.post(
    "/permissions/bulk/revoke",
    PermissionController.bulkRevokeGrantedPermission as RequestHandler,
);

export default router;
