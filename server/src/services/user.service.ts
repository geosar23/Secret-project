import { UserModel } from "../models/user.model";
import { IUser, IUsersQueryParams } from "../interfaces/user.interface";
import { FilterQuery } from "mongoose";

export const UserService = {
    getUsers: async (params: IUsersQueryParams = {}) => {
        const {
            page = 1,
            limit = 10,
            search,
            role,
            departmentId,
            isActive,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = params;

        // Build filter query
        const filter: FilterQuery<IUser> = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        if (role) {
            filter.role = role;
        }

        if (departmentId) {
            filter.departmentId = departmentId;
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
    update: (id: string, data: Partial<IUser>) =>
        UserModel.findByIdAndUpdate(id, data, { new: true }),
    delete: (id: string) => UserModel.findByIdAndDelete(id),
};
