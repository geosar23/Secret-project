import { UserRole } from "../enums/user-role.enum";

export interface GrantedPermission {
    permission: string;
    grantedBy: string; // User ID who granted it
    grantedAt: Date;
    expiresAt?: Date; // Optional expiration
    reason?: string; // Audit trail
    scope?: string; // e.g., "self", "managed", "department", "company", "all"
}

export interface IUser {
    _id?: string;
    name: string;
    email: string;
    password: string;

    // Role & Organization
    role: UserRole;
    companyId?: string; // null only for GOD role
    departmentId?: string;
    managerId?: string; // Direct manager's user ID
    managedDepartments?: string[]; // For managers - departments they manage

    // Custom permissions
    grantedPermissions?: GrantedPermission[]; // Additional permissions granted
    revokedPermissions?: string[]; // Role permissions that are revoked

    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
