import { userIdentityRepository, userRepository } from "../repositories/user.repository";
import { departmentRepository } from "../repositories/department.repository";
import { subDepartmentRepository } from "../repositories/sub-department.repository";
import { IProfileImageMetadata, IUser, IUserPopulated, IUsersQueryParams } from "../interfaces/user.interface";
import { FilterQuery } from "mongoose";
import bcrypt from "bcryptjs";
import { decryptString } from "../utils/encryption.util";
import { LeaveLedgerService } from "./leaves/leave-ledger.service";

export const UserService = {
    getUsers: async (params: IUsersQueryParams = {}, companyId: string, permissionsFilter?: FilterQuery<IUser>) => {
        // Validate and sanitize parameters (business rules)
        const page = Math.max(1, Math.min(params.page || 1, 1000));
        const limit = Math.max(1, Math.min(params.limit || 10, 100));
        const search = params.search ? String(params.search).slice(0, 100) : undefined;
        const allowedSortFields = ["name", "email", "createdAt", "role"];
        const sortBy = allowedSortFields.includes(params.sortBy || "") ? params.sortBy! : "createdAt";
        const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";
        const role = params.roleId;
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

        if (department) {
            filter.$and = [
                ...(filter.$and || []),
                { $or: [{ primaryDepartment: department }, { secondaryDepartments: department }] },
            ];
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
                .populate("hrRepresentative", "_id name email")
                .populate("employmentTitle")
                .populate("primaryDepartment", "_id name")
                .populate("primarySubDepartment", "_id name")
                .populate("secondaryDepartments", "_id name")
                .populate("secondarySubDepartments", "_id name")
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

    /**
     * Company-wide org chart data, readable by every employee. Deliberately limited to
     * non-sensitive fields; it must not expose anything the users list protects behind permissions.
     */
    getOrgChart: async (companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for the org chart");
        }
        const [users, departments, subDepartments] = await Promise.all([
            userRepository(companyId)
                .find({ isActive: true })
                .select("name email manager employmentTitle level primarySubDepartment")
                .populate({ path: "employmentTitle", select: "name" })
                .populate({ path: "level", select: "name" })
                .sort({ name: 1 })
                .lean(),
            departmentRepository(companyId).find({ isActive: true }).select("name").sort({ name: 1 }).lean(),
            subDepartmentRepository(companyId)
                .find({ isActive: true })
                .select("name department")
                .sort({ name: 1 })
                .lean(),
        ]);

        return {
            users: users.map(user => {
                const title = user.employmentTitle as unknown as { name?: string } | undefined;
                const level = user.level as unknown as { name?: string } | undefined;
                return {
                    _id: String(user._id),
                    name: user.name,
                    email: user.email,
                    managerId: user.manager ? String(user.manager) : null,
                    title: title?.name ?? null,
                    level: level?.name ?? null,
                    subDepartmentId: user.primarySubDepartment ? String(user.primarySubDepartment) : null,
                };
            }),
            departments: departments.map(d => ({ _id: String(d._id), name: d.name })),
            subDepartments: subDepartments.map(sd => ({
                _id: String(sd._id),
                name: sd.name,
                departmentId: String(sd.department),
            })),
        };
    },

    getById: async (id: string, companyId: string, selectFields?: string[]): Promise<IUserPopulated | null> => {
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
            .populate("employmentTitle")
            .populate("primaryDepartment", "_id name")
            .populate("primarySubDepartment", "_id name")
            .populate("secondaryDepartments", "_id name")
            .populate("secondarySubDepartments", "_id name")
            .select("-password")
            .lean();
        if (selectFields && selectFields.length > 0) {
            query = query.select("-password " + selectFields.join(" "));
        }
        const user = await query.lean();
        if (user && user.salary) {
            try {
                (user as Record<string, unknown>).salary = decryptString(user.salary);
            } catch {
                (user as Record<string, unknown>).salary = undefined;
            }
        }
        return user as IUserPopulated | null;
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
        userIdentityRepository().findByEmail(email).populate("role", "role name").populate("company").lean(),
    create: async (data: Omit<IUser, "_id">, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for creating user");
        }

        const repo = userRepository(String(companyId));
        const created = await repo.create(data as Partial<IUser>);
        // This year's leave grants (pro-rated by hire date); idempotent, so a later yearly run does not double them
        await LeaveLedgerService.ensureEntitlements(String(companyId), String(new Date().getUTCFullYear()), {
            userIds: [String(created._id)],
        });
        return created;
    },

    delete: (id: string, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for deleting user");
        }
        const repo = userRepository(companyId);
        return repo.deleteOne({ _id: id });
    },

    resetPasswordForUser: async (userId: string, newPassword: string, companyId: string) => {
        if (!companyId) {
            throw new Error("Company ID is required for resetting password");
        }

        const repo = userRepository(companyId);
        const user = await repo.findById(userId).select("_id").lean();

        if (!user) {
            throw new Error("User not found");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await repo.updateOne({ _id: userId }, { password: hashedPassword });
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
