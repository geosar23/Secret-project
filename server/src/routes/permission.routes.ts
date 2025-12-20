import { Router, RequestHandler } from "express";
import { PermissionController } from "../controllers/permission.controller";
const router = Router();

// Get all permission definitions
router.get("/definitions", PermissionController.getAllPermissions as RequestHandler);

// Get effective permissions for user
router.get("/users/:userId/effective", PermissionController.getEffectiveUserPermissions as RequestHandler);

//Get role permissions
router.get("/roles/:slug", PermissionController.getRolePermissions as RequestHandler);

// Get role metadata
router.get("/roles", PermissionController.getRoles as RequestHandler);

// Grant permission to user
// router.post("/users/:userId/permissions/grant", PermissionController.grantPermission as RequestHandler);

// Revoke granted permission from user
router.delete(
    "/users/:userId/permissions/granted/:permission",
    // PermissionController.revokeGrantedPermission as RequestHandler,
);

// Revoke role permission from user (blacklist)
// router.post("/users/:userId/permissions/revoke", PermissionController.revokeRolePermission as RequestHandler);

// Restore revoked role permission
// router.post("/users/:userId/permissions/restore", PermissionController.restoreRolePermission as RequestHandler);

export default router;
