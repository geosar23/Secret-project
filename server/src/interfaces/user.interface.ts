import { Types } from "mongoose";
export interface IUser {
    _id?: Types.ObjectId;
    name: string;
    email: string;
    password: string;

    // Role & Organization
    role: Types.ObjectId; // Can be default roles or custom roles
    company?: Types.ObjectId; // null only for GOD role
    department?: Types.ObjectId;
    manager?: Types.ObjectId; // Direct manager's user ID
    managedDepartments?: Types.ObjectId[]; // For managers - departments they manage
    // Custom permissions
    grantedPermissions?: Types.ObjectId[]; // Additional permissions granted
    revokedPermissions?: Types.ObjectId[]; // Role permissions that are revoked

    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface IUsersQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    roleId?: string;
    companyId?: string | null;
    departmentId?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
