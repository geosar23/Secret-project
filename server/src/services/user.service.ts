import { userRepository } from "../repositories/user.repository";
import { IUser, IUsersQueryParams } from "../interfaces/user.interface";
import { FilterQuery } from "mongoose";

export const UserService = {
    getUsers: async (params: IUsersQueryParams = {}, companyId: string) => {
        // Validate and sanitize parameters (business rules)
        const page = Math.max(1, Math.min(params.page || 1, 1000));
        const limit = Math.max(1, Math.min(params.limit || 10, 100));
        const search = params.search ? String(params.search).slice(0, 100) : undefined;
        const allowedSortFields = ["name", "email", "createdAt", "role", "companyId"];
        const sortBy = allowedSortFields.includes(params.sortBy || "") ? params.sortBy! : "createdAt";
        const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";
        const role = params.roleId;
        const company = params.companyId;
        const department = params.departmentId;
        const isActive = params.isActive;

        // Build filter query
        const filter: FilterQuery<IUser> = {};

        if (search) {
            filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
        }

        if (role) {
            filter.role = role;
        }

        if (company) {
            filter.company = company;
        }

        if (department) {
            filter.department = department;
        }

        if (isActive !== undefined) {
            filter.isActive = isActive;
        }

        // Calculate pagination
        const skip = (page - 1) * limit;
        const sortOptions: Record<string, 1 | -1> = {
            [sortBy]: sortOrder === "asc" ? 1 : -1,
        };

        // Execute query with pagination (use repository when companyId provided)
        if (!companyId) {
            return { users: [], total: 0, page, limit, totalPages: 0 };
        }
        const repo = userRepository(companyId);
        const [users, total] = await Promise.all([
            repo
                .find(filter)
                .populate("role", "role name")
                .populate("company")
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .select("-password")
                .lean(),
            repo.count(filter),
        ]);

        return {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    },

    getById: (id: string, companyId: string, selectFields?: string[]) => {
        if (!companyId) {
            throw new Error("Company ID is required for fetching user by ID");
        }
        const repo = userRepository(companyId);
        let query = repo.findById(id).populate("role").populate("company").select("-password").lean();
        if (selectFields && selectFields.length > 0) {
            query = query.select("-password " + selectFields.join(" "));
        }
        return query.lean();
    },
    update: async (id: string, data: Partial<IUser>, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for updating user");
        }

        const repo = userRepository(String(companyId));
        await repo.updateOne({ _id: id }, data as Partial<IUser>);
        const updated = await repo.findById(id).select("-password").lean();
        return updated;
    },
    getByEmail: (email: string, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for fetching user by email");
        }
        const repo = userRepository(companyId);
        return repo.findOne({ email }).populate("role", "role name").populate("company").lean();
    },
    create: (data: Omit<IUser, "_id">, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for creating user");
        }

        const repo = userRepository(String(companyId));
        return repo.create(data as Partial<IUser>);
    },

    delete: (id: string, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for deleting user");
        }
        const repo = userRepository(companyId);
        return repo.deleteOne({ _id: id });
    },
};
