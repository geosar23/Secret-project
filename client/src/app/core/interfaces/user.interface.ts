import { ICompany } from "./company.interface";
import { IEmploymentTitle } from "./employment-title.interface";
import { IRole } from "./role.interface";

export interface IUser {
    _id?: string;
    name: string;
    email: string;
    password: string;

    // Role & Organization
    role: IRole;
    company?: ICompany; // null only for GOD role
    employmentTitle?: IEmploymentTitle;
    department?: string;
    manager?: string; // Direct manager's user ID
    managedDepartments?: string[]; // For managers - departments they manage

    // Custom permissions
    grantedPermissions?: string[]; // Additional permissions granted
    revokedPermissions?: string[]; // Role permissions that are revoked

    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICreateUserRequest {
    name: string;
    email: string;
    password: string;
    role: string;
    companyId?: string;
    employmentTitleId?: string;
    departmentId?: string;
    managerId?: string;
}

export interface IUpdateUserRequest {
    name?: string;
    email?: string;
    role?: string;
    companyId?: string;
    employmentTitleId?: string;
    departmentId?: string;
    managerId?: string;
    isActive?: boolean;
}

export interface IUsersListResponse {
    users: IUser[];
    total: number;
    page: number;
    limit: number;
}

export interface IUserResponse {
    user: IUser;
}

export interface IUsersQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    roleId?: string;
    companyId?: string;
    departmentId?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
