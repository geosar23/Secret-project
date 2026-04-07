import { userRepository } from "../repositories/user.repository";
import { IProfileImageMetadata, IUser, IUsersQueryParams } from "../interfaces/user.interface";
import { FilterQuery } from "mongoose";
import { UserModel } from "../models/user.model";
import bcrypt from "bcryptjs";
import { decryptString } from "../utils/encryption.util";

export const UserService = {
    getUsers: async (params: IUsersQueryParams = {}, companyId: string, permissionsFilter?: FilterQuery<IUser>) => {
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
        const country = params.countryId;
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

        if (country) {
            filter.country = country;
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

        if (permissionsFilter && Object.keys(permissionsFilter).length > 0) {
            filter.$and = [...(filter.$and || []), permissionsFilter];
        }

        const repo = userRepository(companyId);
        const [users, total] = await Promise.all([
            repo
                .find(filter)
                .populate("role")
                .populate("company")
                .populate("country")
                .populate("manager")
                .populate("level")
                .populate("office")
                .populate({
                    path: "employmentTitle",
                    populate: { path: "subDepartment", populate: { path: "department" } },
                })
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .select("-password -salary")
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

    getById: async (id: string, companyId: string, selectFields?: string[]) => {
        if (!companyId) {
            throw new Error("Company ID is required for fetching user by ID");
        }
        const repo = userRepository(companyId);
        let query = repo
            .findById(id)
            .populate("role")
            .populate("company")
            .populate("country")
            .populate("manager")
            .populate("level")
            .populate("office")
            .populate("hrRepresentative", "_id name email")
            .populate({
                path: "employmentTitle",
                populate: { path: "subDepartment", populate: { path: "department" } },
            })
            .select("-password")
            .lean();
        if (selectFields && selectFields.length > 0) {
            query = query.select("-password " + selectFields.join(" "));
        }
        const user = await query.lean();
        if (user && (user as IUser).salary) {
            try {
                (user as Record<string, unknown>).salary = decryptString((user as IUser).salary!);
            } catch {
                (user as Record<string, unknown>).salary = undefined;
            }
        }
        return user;
    },
    update: async (id: string, data: Partial<IUser>, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for updating user");
        }

        const repo = userRepository(String(companyId));
        await repo.updateOne({ _id: id }, data as Partial<IUser>);
        const updated = await repo.findById(id).select("_id").lean();
        return updated;
    },
    getByEmail: (email: string) =>
        UserModel.findOne({ email }).populate("role", "role name").populate("company").lean(),
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

    changePassword: async (id: string, currentPassword: string, newPassword: string, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for changing password");
        }

        const repo = userRepository(companyId);
        const user = await repo.findById(id).select("password").lean();

        if (!user || !user.password) {
            throw new Error("User not found");
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new Error("Current password is incorrect");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await repo.updateOne({ _id: id }, { password: hashedPassword });
    },

    grantPermission: async (id: string, permissionKey: string, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for granting permissions");
        }

        const repo = userRepository(companyId);
        const result = await repo.updateOne({ _id: id }, {
            $addToSet: { grantedPermissions: permissionKey },
            $pull: { revokedPermissions: permissionKey },
        } as unknown as Partial<IUser>);

        return result.modifiedCount > 0 || result.matchedCount > 0;
    },

    revokePermission: async (id: string, permissionKey: string, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for revoking permissions");
        }

        const repo = userRepository(companyId);
        const result = await repo.updateOne({ _id: id }, {
            $addToSet: { revokedPermissions: permissionKey },
            $pull: { grantedPermissions: permissionKey },
        } as unknown as Partial<IUser>);

        return result.modifiedCount > 0 || result.matchedCount > 0;
    },

    updateProfileImageMetadata: async (
        id: string,
        profileImage: IProfileImageMetadata | undefined,
        companyId: string,
    ) => {
        if (!companyId) {
            throw new Error("Company ID is required for updating user profile image");
        }

        const repo = userRepository(companyId);
        if (!profileImage) {
            await repo.updateOne({ _id: id }, { $unset: { profileImage: 1 } } as unknown as Partial<IUser>);
        } else {
            await repo.updateOne({ _id: id }, { $set: { profileImage } } as unknown as Partial<IUser>);
        }
        return repo.findById(id).select("_id profileImage").lean();
    },

    getProfileImageMetadata: async (id: string, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for reading user profile image");
        }

        const repo = userRepository(companyId);
        return repo.findById(id).select("_id profileImage").lean();
    },
};
