import { Types } from "mongoose";

export interface IProfileImageMetadata {
    bucket: string;
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
}

export interface IUser {
    _id?: Types.ObjectId;
    name: string;
    email: string;
    password: string;

    // Role & Organization
    role: Types.ObjectId; // Can be default roles or custom roles
    company?: Types.ObjectId; // null only for GOD role
    department?: Types.ObjectId;
    country?: Types.ObjectId;
    employmentTitle?: Types.ObjectId;
    manager?: Types.ObjectId; // Direct manager's user ID
    managedDepartments?: Types.ObjectId[]; // For managers - departments they manage
    // Custom permissions
    grantedPermissions?: string[]; // Additional permissions granted
    revokedPermissions?: string[]; // Role permissions that are revoked
    profileImage?: IProfileImageMetadata;

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
    countryId?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
