import { Types } from "mongoose";
import { DefaultUserRoles } from "../enums/user-role.enum";
export interface IUser {
    _id?: Types.ObjectId;
    name: string;
    email: string;
    password: string;

    // Role & Organization
    role: DefaultUserRoles | string; // Can be default roles or custom roles
    companyId?: Types.ObjectId; // null only for GOD role
    departmentId?: Types.ObjectId;
    managerId?: Types.ObjectId; // Direct manager's user ID
    managedDepartments?: Types.ObjectId[]; // For managers - departments they manage
    // Custom permissions
    grantedPermissions?: string[]; // Additional permissions granted
    revokedPermissions?: string[]; // Role permissions that are revoked

    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface IUsersQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    companyId?: string;
    departmentId?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
