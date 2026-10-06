import { IRole } from "../interfaces/role.interface";
import { roleRepository } from "../repositories/role.repository";

export type RoleStatusFilter = "active" | "inactive" | "all";

const roleCompanyPopulate = { path: "company", select: "_id name" } as const;

export const RoleService = {
    /**
     * Get roles, optionally filtered by active status
     */
    getRoles: (companyId: string, status: RoleStatusFilter = "all"): Promise<IRole[]> => {
        const filter = status === "all" ? {} : { isActive: status === "active" };
        return roleRepository(companyId).find(filter).populate(roleCompanyPopulate).exec();
    },

    /**
     * Get role by ID
     */
    getById: (id: string, companyId: string): Promise<IRole | null> => {
        return roleRepository(companyId).findById(id).populate(roleCompanyPopulate).exec();
    },

    /**
     * Get roles by company (includes system roles)
     */
    getByCompany: (companyId: string): Promise<IRole[]> => {
        return roleRepository(companyId).find().populate(roleCompanyPopulate).exec();
    },

    /**
     * Get role hierarchy (sorted by level)
     */
    getHierarchy: (companyId: string): Promise<IRole[]> => {
        return roleRepository(companyId).find().populate(roleCompanyPopulate).sort({ level: -1 }).exec();
    },

    /**
     * Create a custom role
     */
    create: async (data: Omit<IRole, "_id">, companyId: string): Promise<IRole> => {
        const role = await roleRepository(companyId).create(data);
        return (await roleRepository(companyId)
            .findById(role._id.toString())
            .populate(roleCompanyPopulate)
            .exec()) as IRole;
    },

    /**
     * Update a role
     */
    update: async (id: string, data: Partial<IRole>, companyId: string): Promise<IRole | null> => {
        const repository = roleRepository(companyId);

        const role = await repository.findById(id).exec();

        // For system roles, name and slug (role) cannot be changed
        if (role?.isSystemRole) {
            delete data.name;
            delete data.role;
        }

        return repository.findOneAndUpdate({ _id: id }, data, { new: true }).populate(roleCompanyPopulate).exec();
    },

    /**
     * Delete a role
     */
    delete: async (id: string, companyId: string): Promise<boolean> => {
        const repository = roleRepository(companyId);

        // Prevent deletion of system roles
        const role = await repository.findById(id).exec();
        if (role?.isSystemRole) {
            throw new Error("Cannot delete system roles");
        }

        const result = await repository.deleteOne({ _id: id });
        return result.deletedCount > 0;
    },
};
