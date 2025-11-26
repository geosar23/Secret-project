import { RoleModel } from "../models/role.model";
import { IRole } from "../interfaces/role.interface";
import { DefaultUserRoles } from "../enums/user-role.enum";

export const RoleService = {
    /**
     * Get all roles
     */
    getAll: (): Promise<IRole[]> => {
        return RoleModel.find().sort({ level: -1 }).exec();
    },

    /**
     * Get role by ID
     */
    getById: (id: string): Promise<IRole | null> => {
        return RoleModel.findById(id).exec();
    },

    /**
     * Get role by type (enum)
     */
    getByType: (roleType: DefaultUserRoles): Promise<IRole | null> => {
        return RoleModel.findOne({ role: roleType }).exec();
    },

    /**
     * Get roles by company (includes system roles)
     */
    getByCompany: (companyId?: string): Promise<IRole[]> => {
        return RoleModel.find({
            $or: [{ companyId }, { companyId: { $exists: false } }],
        }).exec();
    },

    /**
     * Get role hierarchy (sorted by level)
     */
    getHierarchy: (): Promise<IRole[]> => {
        return RoleModel.find().sort({ level: -1 }).exec();
    },

    /**
     * Get permissions for a role
     */
    getPermissions: async (roleType: DefaultUserRoles | string): Promise<string[]> => {
        const role = await RoleModel.findOne({ role: roleType }).exec();
        return role?.permissions || [];
    },

    /**
     * Create a custom role
     */
    create: (data: Omit<IRole, "_id">): Promise<IRole> => {
        return RoleModel.create(data);
    },

    /**
     * Update a role
     */
    update: async (id: string, data: Partial<IRole>): Promise<IRole | null> => {
        // Prevent modification of system roles
        const role = await RoleModel.findById(id).exec();
        if (role?.isSystemRole) {
            throw new Error("Cannot modify system roles");
        }

        return RoleModel.findByIdAndUpdate(id, data, { new: true }).exec();
    },

    /**
     * Delete a role
     */
    delete: async (id: string): Promise<boolean> => {
        // Prevent deletion of system roles
        const role = await RoleModel.findById(id).exec();
        if (role?.isSystemRole) {
            throw new Error("Cannot delete system roles");
        }

        const result = await RoleModel.findByIdAndDelete(id).exec();
        return !!result;
    },

    /**
     * Check if role A is higher than role B
     */
    isHigherRole: async (roleA: DefaultUserRoles, roleB: DefaultUserRoles): Promise<boolean> => {
        const [roleAData, roleBData] = await Promise.all([
            RoleModel.findOne({ role: roleA }).exec(),
            RoleModel.findOne({ role: roleB }).exec(),
        ]);

        if (!roleAData || !roleBData) return false;
        return roleAData.level > roleBData.level;
    },
};
