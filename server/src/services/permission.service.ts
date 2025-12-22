import { UserService } from "./user.service";
import { PermissionModel } from "../models/permission.model";
import { IPermission } from "../interfaces/permission.interface";
import { RoleService } from "./role.service";
import { ObjectId, Types } from "mongoose";
import { UserModel } from "../models/user.model";
import { PopulatedPermission, PopulatedUser } from "../interfaces/populated.interface";
/**
 * Service for managing custom permission grants and revocations
 */
export const PermissionService = {
    create: (entry: Partial<IPermission>): Promise<IPermission> => {
        return PermissionModel.create(entry);
    },
    /**
     * Get all permissions
     */
    getAll: (): Promise<IPermission[]> => {
        return PermissionModel.find().exec();
    },

    getByIds: (ids: string[]): Promise<IPermission[]> => {
        return PermissionModel.find({ _id: { $in: ids } }).exec();
    },

    /**
     * Get permission by ID
     */
    getById: (id: string): Promise<IPermission | null> => {
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
        return PermissionModel.find({ category }).exec();
    },

    /**
     * Get all permission categories
     */
    getCategories: async (): Promise<string[]> => {
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
     */ //to be implemented
    // async grantPermission(userId: string, permission: string): Promise<IUser> {
    //     const user = await UserService.getById(userId);
    //     if (!user) {
    //         throw new Error("User not found");
    //     }

    //     // Initialize grantedPermissions array if not exists
    //     if (!user.grantedPermissions) {
    //         user.grantedPermissions = [];
    //     }

    //     // Add to granted list if not already there
    //     if (!user.grantedPermissions.includes(permission)) {
    //         user.grantedPermissions.push(permission);
    //     }

    //     const updated = await UserService.update(userId, user);
    //     if (!updated) {
    //         throw new Error("Failed to update user");
    //     }
    //     return updated;
    // },

    /**
     * Revoke a custom granted permission from a user
     */
    // async revokeGrantedPermission(userId: string, permission: string): Promise<IUser> {
    //     const user = await UserService.getById(userId);
    //     if (!user) {
    //         throw new Error("User not found");
    //     }

    //     if (user.grantedPermissions) {
    //         user.grantedPermissions = user.grantedPermissions.filter((g: string) => g !== permission);
    //     }

    //     const updated = await UserService.update(userId, user);
    //     if (!updated) {
    //         throw new Error("Failed to update user");
    //     }
    //     return updated;
    // },

    /**
     * Revoke a role permission for a user (blacklist)
     * This removes a permission that the user would normally have through their role
     */
    // async revokeRolePermission(userId: string, permission: string): Promise<IUser> {
    //     const user = await UserService.getById(userId);
    //     if (!user) {
    //         throw new Error("User not found");
    //     }

    //     // Initialize revokedPermissions array if not exists
    //     if (!user.revokedPermissions) {
    //         user.revokedPermissions = [];
    //     }

    //     // Add to revoked list if not already there
    //     if (!user.revokedPermissions.includes(permission)) {
    //         user.revokedPermissions.push(permission);
    //     }

    //     const updated = await UserService.update(userId, user);
    //     if (!updated) {
    //         throw new Error("Failed to update user");
    //     }
    //     return updated;
    // },

    /**
     * Restore a previously revoked role permission
     */
    // async restoreRolePermission(userId: string, permission: string): Promise<IUser> {
    //     const user = await UserService.getById(userId);
    //     if (!user) {
    //         throw new Error("User not found");
    //     }

    //     if (user.revokedPermissions) {
    //         user.revokedPermissions = user.revokedPermissions.filter((p: string) => p !== permission);
    //     }

    //     const updated = await UserService.update(userId, user);
    //     if (!updated) {
    //         throw new Error("Failed to update user");
    //     }
    //     return updated;
    // },

    /**
     * Get all effective permissions for a user
     * Combines role permissions, granted permissions, and revoked permissions
     */
    async getEffectiveUserPermissions(userId: string): Promise<Types.ObjectId[]> {
        const user = await UserService.getById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const role = await RoleService.getById(user.role._id.toString());

        const effectivePermissions = [...(role?.permissions || [])];

        // Add granted permissions
        if (user.grantedPermissions) {
            effectivePermissions.push(...(user.grantedPermissions || []));
        }

        // Remove revoked permissions
        if (user.revokedPermissions) {
            user.revokedPermissions.forEach(perm => {
                const index = effectivePermissions.indexOf(perm);
                if (index > -1) {
                    effectivePermissions.splice(index, 1);
                }
            });
        }

        return effectivePermissions;
    },

    async resolveUserPermissions(userId: ObjectId | string): Promise<Set<string>> {
        const user = (await UserModel.findById(userId)
            .populate({
                path: "role",
                populate: { path: "permissions", select: "key" },
            })
            .populate("grantedPermissions", "key")
            .populate("revokedPermissions", "key")) as PopulatedUser | null;

        const rolePermissions: PopulatedPermission[] =
            user?.role && "permissions" in user.role ? user.role.permissions : [];
        const grantedPermissions: PopulatedPermission[] = Array.isArray(user?.grantedPermissions)
            ? (user!.grantedPermissions as PopulatedPermission[])
            : [];
        const revokedPermissions: PopulatedPermission[] = Array.isArray(user?.revokedPermissions)
            ? (user!.revokedPermissions as PopulatedPermission[])
            : [];

        const rolePerms = rolePermissions.map(p => p.key);
        const granted = grantedPermissions.map(p => p.key);
        const revoked = new Set(revokedPermissions.map(p => p.key));

        return new Set([...rolePerms, ...granted].filter(p => !revoked.has(p)));
    },
};
