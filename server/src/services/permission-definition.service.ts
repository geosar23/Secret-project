import { PermissionModel } from "../models/permission.model";
import { IPermission } from "../interfaces/permission.interface";
import { MockDatabase } from "../db/mock-database";
import { dbState } from "../config/databases";

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
     * Get permission by string
     */
    getByString: (permission: string): Promise<IPermission | null> => {
        if (dbState.useMock) {
            return Promise.resolve(MockDatabase.getPermissionByString(permission) || null);
        }
        return PermissionModel.findOne({ permission }).exec();
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
     * Get permissions by entity
     */
    getByEntity: (entity: string): Promise<IPermission[]> => {
        if (dbState.useMock) {
            return Promise.resolve(MockDatabase.getPermissionsByEntity(entity));
        }
        return PermissionModel.find({ entity }).exec();
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
                        perm.permission.toLowerCase().includes(searchTerm) ||
                        perm.description.toLowerCase().includes(searchTerm) ||
                        perm.entity.toLowerCase().includes(searchTerm) ||
                        perm.action.toLowerCase().includes(searchTerm),
                ),
            );
        }

        return PermissionModel.find({
            $or: [
                { permission: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } },
                { entity: { $regex: query, $options: "i" } },
                { action: { $regex: query, $options: "i" } },
            ],
        }).exec();
    },

    /**
     * Create a new permission
     */
    create: (data: Omit<IPermission, "_id">): Promise<IPermission> => {
        if (dbState.useMock) {
            return Promise.resolve(MockDatabase.createPermission(data));
        }
        return PermissionModel.create(data);
    },

    /**
     * Update a permission
     */
    update: (id: string, data: Partial<IPermission>): Promise<IPermission | null> => {
        if (dbState.useMock) {
            // Mock doesn't have update for permissions yet
            throw new Error("Not implemented in mock database");
        }
        return PermissionModel.findByIdAndUpdate(id, data, { new: true }).exec();
    },

    /**
     * Delete a permission
     */
    delete: async (id: string): Promise<boolean> => {
        if (dbState.useMock) {
            // Mock doesn't have delete for permissions yet
            throw new Error("Not implemented in mock database");
        }
        const result = await PermissionModel.findByIdAndDelete(id).exec();
        return !!result;
    },
};
