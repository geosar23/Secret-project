import { DefaultUserRoles } from "../enums/user-role.enum";
export interface IUser {
    _id?: string;
    name: string;
    email: string;
    password: string;

    // Role & Organization
    role: DefaultUserRoles;
    companyId?: string; // null only for GOD role
    departmentId?: string;
    managerId?: string; // Direct manager's user ID
    managedDepartments?: string[]; // For managers - departments they manage

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
