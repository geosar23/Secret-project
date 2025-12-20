import { Response } from "express";
import { PermissionService } from "../services/permission.service";
import { AuthenticatedRequest } from "../middleware/permission.middleware";
import { RoleUtils } from "../utils/role.utils";

/**
 * Controller for permission management endpoints
 */
export const PermissionController = {
    /**
     * Get all permission definitions
     * GET /permissions/definitions
     */
    async getAllPermissions(req: AuthenticatedRequest, res: Response) {
        try {
            const permissions = await PermissionService.getAll();
            res.status(200).json({ permissions });
        } catch (error) {
            console.error("Get all permissions error:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to fetch permissions",
            });
        }
    },
    /**
     * Get effective permissions for a user
     * GET /users/:userId/permissions/effective
     */
    async getEffectiveUserPermissions(req: AuthenticatedRequest, res: Response) {
        try {
            const { userId } = req.params;

            const permissions = await PermissionService.getEffectiveUserPermissions(userId);

            res.status(200).json({
                userId,
                permissions,
            });
        } catch (error) {
            console.error("Get effective permissions error:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get effective permissions",
            });
        }
    },

    /**
     * Grant a permission to a user
     * POST /users/:userId/permissions/grant
     */
    // async grantPermission(req: AuthenticatedRequest, res: Response) {
    //     try {
    //         const { userId } = req.params;
    //         const { permission } = req.body;

    //         if (!permission) {
    //             return res.status(400).json({ error: "Permission is required" });
    //         }

    //         if (!req.user) {
    //             return res.status(401).json({ error: "Authentication required" });
    //         }

    //         // const grantedBy = req.user._id!; check if its authorized

    //         const updatedUser = await PermissionService.grantPermission(userId, permission);

    //         const effectivePermissions = await PermissionService.getEffectiveUserPermissions(userId);

    //         res.status(200).json({
    //             message: "Permission granted successfully",
    //             user: updatedUser,
    //             effectivePermissions,
    //         });
    //     } catch (error) {
    //         console.error("Grant permission error:", error);
    //         res.status(500).json({
    //             error: error instanceof Error ? error.message : "Failed to grant permission",
    //         });
    //     }
    // },

    /**
     * Revoke a granted permission from a user
     * DELETE /users/:userId/permissions/granted/:permission
     */
    // async revokeGrantedPermission(req: AuthenticatedRequest, res: Response) {
    //     try {
    //         const { userId, permission } = req.params;

    //         const updatedUser = await PermissionService.revokeGrantedPermission(userId, decodeURIComponent(permission));

    //         const effectivePermissions = await PermissionService.getEffectiveUserPermissions(userId);

    //         res.status(200).json({
    //             message: "Granted permission revoked successfully",
    //             user: updatedUser,
    //             effectivePermissions,
    //         });
    //     } catch (error) {
    //         console.error("Revoke granted permission error:", error);
    //         res.status(500).json({
    //             error: error instanceof Error ? error.message : "Failed to revoke granted permission",
    //         });
    //     }
    // },

    /**
     * Revoke a role permission from a user (blacklist)
     * POST /users/:userId/permissions/revoke
     */
    // async revokeRolePermission(req: AuthenticatedRequest, res: Response) {
    //     try {
    //         const { userId } = req.params;
    //         const { permission } = req.body;

    //         if (!permission) {
    //             return res.status(400).json({ error: "Permission is required" });
    //         }

    //         const updatedUser = await PermissionService.revokeRolePermission(userId, permission);

    //         const effectivePermissions = await PermissionService.getEffectiveUserPermissions(userId);

    //         res.status(200).json({
    //             message: "Role permission revoked successfully",
    //             user: updatedUser,
    //             effectivePermissions,
    //         });
    //     } catch (error) {
    //         console.error("Revoke role permission error:", error);
    //         res.status(500).json({
    //             error: error instanceof Error ? error.message : "Failed to revoke role permission",
    //         });
    //     }
    // },

    /**
     * Restore a previously revoked role permission
     * POST /users/:userId/permissions/restore
     */
    // async restoreRolePermission(req: AuthenticatedRequest, res: Response) {
    //     try {
    //         const { userId } = req.params;
    //         const { permission } = req.body;

    //         if (!permission) {
    //             return res.status(400).json({ error: "Permission is required" });
    //         }

    //         const updatedUser = await PermissionService.restoreRolePermission(userId, permission);

    //         const effectivePermissions = await PermissionService.getEffectiveUserPermissions(userId);

    //         res.status(200).json({
    //             message: "Role permission restored successfully",
    //             user: updatedUser,
    //             effectivePermissions,
    //         });
    //     } catch (error) {
    //         console.error("Restore role permission error:", error);
    //         res.status(500).json({
    //             error: error instanceof Error ? error.message : "Failed to restore role permission",
    //         });
    //     }
    // },

    /**
     * Get role metadata (hierarchy, names, levels)
     * GET /permissions/roles
     */
    async getRoles(req: AuthenticatedRequest, res: Response) {
        try {
            const roles = RoleUtils.getAllRolesWithMetadata();

            res.status(200).json({
                success: true,
                roles,
                hierarchy: roles.map(r => r.role),
            });
        } catch (error) {
            console.error("Error fetching roles:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch role metadata",
            });
        }
    },
};
