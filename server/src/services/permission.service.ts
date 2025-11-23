import { IUser, GrantedPermission } from "../interfaces/user.interface";
import { UserService } from "./user.service";
import { PermissionChecker } from "../utils/permission-checker";

/**
 * Service for managing custom permission grants and revocations
 */
export const PermissionService = {
    /**
     * Grant a custom permission to a user
     */
    async grantPermission(
        userId: string,
        permission: string,
        grantedBy: string,
        options?: {
            expiresAt?: Date;
            reason?: string;
            scope?: string;
        },
    ): Promise<IUser> {
        const user = await UserService.getById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Initialize grantedPermissions array if not exists
        if (!user.grantedPermissions) {
            user.grantedPermissions = [];
        }

        // Check if permission already granted
        const existingGrant = user.grantedPermissions.find((g: GrantedPermission) => g.permission === permission);

        if (existingGrant) {
            // Update existing grant
            existingGrant.grantedBy = grantedBy;
            existingGrant.grantedAt = new Date();
            existingGrant.expiresAt = options?.expiresAt;
            existingGrant.reason = options?.reason;
            existingGrant.scope = options?.scope;
        } else {
            // Add new grant
            const grant: GrantedPermission = {
                permission,
                grantedBy,
                grantedAt: new Date(),
                expiresAt: options?.expiresAt,
                reason: options?.reason,
                scope: options?.scope,
            };
            user.grantedPermissions.push(grant);
        }

        // Save user
        const updated = await UserService.update(userId, user);
        if (!updated) {
            throw new Error("Failed to update user");
        }
        return updated;
    },

    /**
     * Revoke a custom granted permission from a user
     */
    async revokeGrantedPermission(userId: string, permission: string): Promise<IUser> {
        const user = await UserService.getById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        if (user.grantedPermissions) {
            user.grantedPermissions = user.grantedPermissions.filter(
                (g: GrantedPermission) => g.permission !== permission,
            );
        }

        const updated = await UserService.update(userId, user);
        if (!updated) {
            throw new Error("Failed to update user");
        }
        return updated;
    },

    /**
     * Revoke a role permission for a user (blacklist)
     * This removes a permission that the user would normally have through their role
     */
    async revokeRolePermission(userId: string, permission: string): Promise<IUser> {
        const user = await UserService.getById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Initialize revokedPermissions array if not exists
        if (!user.revokedPermissions) {
            user.revokedPermissions = [];
        }

        // Add to revoked list if not already there
        if (!user.revokedPermissions.includes(permission)) {
            user.revokedPermissions.push(permission);
        }

        const updated = await UserService.update(userId, user);
        if (!updated) {
            throw new Error("Failed to update user");
        }
        return updated;
    },

    /**
     * Restore a previously revoked role permission
     */
    async restoreRolePermission(userId: string, permission: string): Promise<IUser> {
        const user = await UserService.getById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        if (user.revokedPermissions) {
            user.revokedPermissions = user.revokedPermissions.filter((p: string) => p !== permission);
        }

        const updated = await UserService.update(userId, user);
        if (!updated) {
            throw new Error("Failed to update user");
        }
        return updated;
    },

    /**
     * Get all effective permissions for a user
     * Combines role permissions, granted permissions, and revoked permissions
     */
    async getEffectivePermissions(userId: string): Promise<string[]> {
        const user = await UserService.getById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        return PermissionChecker.getEffectivePermissions(user);
    },

    /**
     * Get permission audit history for a user
     */
    async getPermissionHistory(userId: string): Promise<{
        granted: GrantedPermission[];
        revoked: string[];
    }> {
        const user = await UserService.getById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        return {
            granted: user.grantedPermissions || [],
            revoked: user.revokedPermissions || [],
        };
    },

    /**
     * Clean up expired granted permissions
     */
    async cleanupExpiredPermissions(userId: string): Promise<IUser> {
        const user = await UserService.getById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        if (user.grantedPermissions) {
            const now = new Date();
            user.grantedPermissions = user.grantedPermissions.filter(
                (g: GrantedPermission) => !g.expiresAt || new Date(g.expiresAt) > now,
            );
        }

        const updated = await UserService.update(userId, user);
        if (!updated) {
            throw new Error("Failed to update user");
        }
        return updated;
    },

    /**
     * Bulk grant permissions to multiple users
     */
    async bulkGrantPermission(
        userIds: string[],
        permission: string,
        grantedBy: string,
        options?: {
            expiresAt?: Date;
            reason?: string;
            scope?: string;
        },
    ): Promise<IUser[]> {
        const promises = userIds.map(userId => this.grantPermission(userId, permission, grantedBy, options));
        return Promise.all(promises);
    },

    /**
     * Bulk revoke permissions from multiple users
     */
    async bulkRevokeGrantedPermission(userIds: string[], permission: string): Promise<IUser[]> {
        const promises = userIds.map(userId => this.revokeGrantedPermission(userId, permission));
        return Promise.all(promises);
    },
};
