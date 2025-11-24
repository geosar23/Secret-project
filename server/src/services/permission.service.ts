import { IUser, GrantedPermission } from "../interfaces/user.interface";
import { UserService } from "./user.service";
import { PermissionChecker } from "../utils/permission-checker";
import { PermissionModel } from "../models/permission.model";
import { dbState } from "../config/databases";
import { MockDatabase } from "../db/mock-database";
import { IPermission } from "../interfaces/permission.interface";

/**
 * Service for managing custom permission grants and revocations
 */
export const PermissionService = {
    /**
     * Get all permissions
     */
    getAll: (): Promise<IPermission[]> => {
        if (dbState.useMock) {
            return Promise.resolve(MockDatabase.getAllPermissions());
        }
        return PermissionModel.find().exec();
    },

    /**
     * Get permission by ID
     */
    getById: (id: string): Promise<IPermission | null> => {
        if (dbState.useMock) {
            return Promise.resolve(MockDatabase.getPermissionById(id) || null);
        }
        return PermissionModel.findById(id).exec();
    },

    /**
     * Get permission by key
     */
    getByKey: (key: string): Promise<IPermission | null> => {
        return PermissionModel.findOne({ key }).exec();
    },

    /**
     * Get permissions by category
     */
    getByCategory: (category: string): Promise<IPermission[]> => {
        if (dbState.useMock) {
            return Promise.resolve(MockDatabase.getPermissionsByCategory(category));
        }
        return PermissionModel.find({ category }).exec();
    },

    /**
     * Get all permission categories
     */
    getCategories: async (): Promise<string[]> => {
        if (dbState.useMock) {
            return Promise.resolve(MockDatabase.getPermissionCategories());
        }
        const categories = await PermissionModel.distinct("category").exec();
        return categories;
    },

    /**
     * Get permissions grouped by category
     */
    getGrouped: async (): Promise<Record<string, IPermission[]>> => {
        const categories = await PermissionService.getCategories();
        const grouped: Record<string, IPermission[]> = {};

        await Promise.all(
            categories.map(async (category: string) => {
                grouped[category] = await PermissionService.getByCategory(category);
            }),
        );

        return grouped;
    },

    /**
     * Search permissions
     */
    search: async (query: string): Promise<IPermission[]> => {
        if (dbState.useMock) {
            const allPermissions = MockDatabase.getAllPermissions();
            const searchTerm = query.toLowerCase();
            return Promise.resolve(
                allPermissions.filter(
                    perm =>
                        perm.key.toLowerCase().includes(searchTerm) ||
                        perm.name.toLowerCase().includes(searchTerm) ||
                        perm.description.toLowerCase().includes(searchTerm) ||
                        perm.category.toLowerCase().includes(searchTerm),
                ),
            );
        }

        return PermissionModel.find({
            $or: [
                { key: { $regex: query, $options: "i" } },
                { name: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } },
                { category: { $regex: query, $options: "i" } },
            ],
        }).exec();
    },
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
