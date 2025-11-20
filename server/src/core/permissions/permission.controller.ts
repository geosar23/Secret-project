import { Request, Response } from "express";
import { PermissionService } from "./permission.service";
import { AuthenticatedRequest } from "../middleware/authorize.middleware";

/**
 * Controller for permission management endpoints
 */
export const PermissionController = {
    /**
     * Grant a permission to a user
     * POST /users/:userId/permissions/grant
     */
    async grantPermission(req: AuthenticatedRequest, res: Response) {
        try {
            const { userId } = req.params;
            const { permission, expiresAt, reason, scope } = req.body;

            if (!permission) {
                return res.status(400).json({ error: "Permission is required" });
            }

            if (!req.user) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const grantedBy = req.user._id!;

            const updatedUser = await PermissionService.grantPermission(
                userId,
                permission,
                grantedBy,
                {
                    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                    reason,
                    scope,
                }
            );

            const effectivePermissions =
                await PermissionService.getEffectivePermissions(userId);

            res.status(200).json({
                message: "Permission granted successfully",
                user: updatedUser,
                effectivePermissions,
            });
        } catch (error) {
            console.error("Grant permission error:", error);
            res.status(500).json({
                error:
                    error instanceof Error ? error.message : "Failed to grant permission",
            });
        }
    },

    /**
     * Revoke a granted permission from a user
     * DELETE /users/:userId/permissions/granted/:permission
     */
    async revokeGrantedPermission(req: Request, res: Response) {
        try {
            const { userId, permission } = req.params;

            const updatedUser = await PermissionService.revokeGrantedPermission(
                userId,
                decodeURIComponent(permission)
            );

            const effectivePermissions =
                await PermissionService.getEffectivePermissions(userId);

            res.status(200).json({
                message: "Granted permission revoked successfully",
                user: updatedUser,
                effectivePermissions,
            });
        } catch (error) {
            console.error("Revoke granted permission error:", error);
            res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to revoke granted permission",
            });
        }
    },

    /**
     * Revoke a role permission from a user (blacklist)
     * POST /users/:userId/permissions/revoke
     */
    async revokeRolePermission(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const { permission } = req.body;

            if (!permission) {
                return res.status(400).json({ error: "Permission is required" });
            }

            const updatedUser = await PermissionService.revokeRolePermission(
                userId,
                permission
            );

            const effectivePermissions =
                await PermissionService.getEffectivePermissions(userId);

            res.status(200).json({
                message: "Role permission revoked successfully",
                user: updatedUser,
                effectivePermissions,
            });
        } catch (error) {
            console.error("Revoke role permission error:", error);
            res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to revoke role permission",
            });
        }
    },

    /**
     * Restore a previously revoked role permission
     * POST /users/:userId/permissions/restore
     */
    async restoreRolePermission(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const { permission } = req.body;

            if (!permission) {
                return res.status(400).json({ error: "Permission is required" });
            }

            const updatedUser = await PermissionService.restoreRolePermission(
                userId,
                permission
            );

            const effectivePermissions =
                await PermissionService.getEffectivePermissions(userId);

            res.status(200).json({
                message: "Role permission restored successfully",
                user: updatedUser,
                effectivePermissions,
            });
        } catch (error) {
            console.error("Restore role permission error:", error);
            res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to restore role permission",
            });
        }
    },

    /**
     * Get effective permissions for a user
     * GET /users/:userId/permissions/effective
     */
    async getEffectivePermissions(req: Request, res: Response) {
        try {
            const { userId } = req.params;

            const permissions = await PermissionService.getEffectivePermissions(userId);

            res.status(200).json({
                userId,
                permissions,
            });
        } catch (error) {
            console.error("Get effective permissions error:", error);
            res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to get effective permissions",
            });
        }
    },

    /**
     * Get permission history for a user
     * GET /users/:userId/permissions/history
     */
    async getPermissionHistory(req: Request, res: Response) {
        try {
            const { userId } = req.params;

            const history = await PermissionService.getPermissionHistory(userId);

            res.status(200).json({
                userId,
                history,
            });
        } catch (error) {
            console.error("Get permission history error:", error);
            res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to get permission history",
            });
        }
    },

    /**
     * Clean up expired permissions for a user
     * POST /users/:userId/permissions/cleanup
     */
    async cleanupExpiredPermissions(req: Request, res: Response) {
        try {
            const { userId } = req.params;

            const updatedUser = await PermissionService.cleanupExpiredPermissions(
                userId
            );

            res.status(200).json({
                message: "Expired permissions cleaned up successfully",
                user: updatedUser,
            });
        } catch (error) {
            console.error("Cleanup expired permissions error:", error);
            res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to cleanup expired permissions",
            });
        }
    },

    /**
     * Bulk grant permissions to multiple users
     * POST /permissions/bulk/grant
     */
    async bulkGrantPermission(req: AuthenticatedRequest, res: Response) {
        try {
            const { userIds, permission, expiresAt, reason, scope } = req.body;

            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({ error: "User IDs array is required" });
            }

            if (!permission) {
                return res.status(400).json({ error: "Permission is required" });
            }

            if (!req.user) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const grantedBy = req.user._id!;

            const updatedUsers = await PermissionService.bulkGrantPermission(
                userIds,
                permission,
                grantedBy,
                {
                    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                    reason,
                    scope,
                }
            );

            res.status(200).json({
                message: `Permission granted to ${updatedUsers.length} users`,
                users: updatedUsers,
            });
        } catch (error) {
            console.error("Bulk grant permission error:", error);
            res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to bulk grant permission",
            });
        }
    },

    /**
     * Bulk revoke granted permissions from multiple users
     * POST /permissions/bulk/revoke
     */
    async bulkRevokeGrantedPermission(req: Request, res: Response) {
        try {
            const { userIds, permission } = req.body;

            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({ error: "User IDs array is required" });
            }

            if (!permission) {
                return res.status(400).json({ error: "Permission is required" });
            }

            const updatedUsers = await PermissionService.bulkRevokeGrantedPermission(
                userIds,
                permission
            );

            res.status(200).json({
                message: `Granted permission revoked from ${updatedUsers.length} users`,
                users: updatedUsers,
            });
        } catch (error) {
            console.error("Bulk revoke granted permission error:", error);
            res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to bulk revoke granted permission",
            });
        }
    },
};
