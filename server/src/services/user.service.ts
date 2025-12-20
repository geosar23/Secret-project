import { UserModel } from "../models/user.model";
import { IUser, IUsersQueryParams } from "../interfaces/user.interface";
import { FilterQuery } from "mongoose";

export const UserService = {
    getUsers: async (params: IUsersQueryParams = {}) => {
        // Validate and sanitize parameters (business rules)
        const page = Math.max(1, Math.min(params.page || 1, 1000));
        const limit = Math.max(1, Math.min(params.limit || 10, 100));
        const search = params.search ? String(params.search).slice(0, 100) : undefined;
        const allowedSortFields = ["name", "email", "createdAt", "role", "companyId"];
        const sortBy = allowedSortFields.includes(params.sortBy || "") ? params.sortBy! : "createdAt";
        const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";
        const role = params.role;
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

        // Execute query with pagination
        const [users, total] = await Promise.all([
            UserModel.find(filter)
                .populate("role", "role name")
                .populate("company")
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .select("-password")
                .lean(),
            UserModel.countDocuments(filter),
        ]);

        return {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    },

    getById: (id: string) => UserModel.findById(id),
    getByEmail: (email: string) => UserModel.findOne({ email }),
    create: (data: Omit<IUser, "_id">) => UserModel.create(data),
    update: (id: string, data: Partial<IUser>) => UserModel.findByIdAndUpdate(id, data, { new: true }),
    delete: (id: string) => UserModel.findByIdAndDelete(id),
};
