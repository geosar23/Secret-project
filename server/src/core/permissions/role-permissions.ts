import { UserRole } from "../../enums";

/**
 * Permission mapping for each role
 * Format: entity:action:scope
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    [UserRole.GOD]: ["*"], // All permissions across all companies

    [UserRole.SUPER_ADMIN]: [
        // Full company permissions
        "company:*",

        // Full employee management
        "employees:*",

        // Full leave management
        "leaves:*",

        // Full department management
        "departments:*",

        // Full reports access
        "reports:*",

        // Full user management
        "users:*",
    ],

    [UserRole.ADMIN]: [
        // Company (no delete, read-only billing)
        "company:settings:view",
        "company:settings:edit",
        "company:billing:view",

        // Employee management (no delete, no salary edit)
        "employees:view:all",
        "employees:create:all",
        "employees:edit:all",
        "employees:salary:view",

        // Leave management
        "leaves:view:all",
        "leaves:approve:all",

        // Department (no delete)
        "departments:view:all",
        "departments:create:all",
        "departments:edit:all",

        // Reports
        "reports:view:all",
        "reports:export:all",

        // User management (no delete, no permission management)
        "users:view:all",
        "users:create:all",
    ],

    [UserRole.HR]: [
        // Employee management (no delete)
        "employees:view:all",
        "employees:create:all",
        "employees:edit:all",
        "employees:salary:view",
        "employees:salary:edit",

        // Leave management
        "leaves:view:all",
        "leaves:approve:all",
        "leaves:cancel:all",

        // Department (read only)
        "departments:view:all",

        // Reports
        "reports:view:all",

        // User management (view only)
        "users:view:all",
    ],

    [UserRole.MANAGER]: [
        // Employee (managed only)
        "employees:view:managed",
        "employees:edit:managed",

        // Leave (managed only)
        "leaves:view:managed",
        "leaves:approve:managed",

        // Department (read only)
        "departments:view:all",

        // Reports (department)
        "reports:view:department",
    ],

    [UserRole.EMPLOYEE]: [
        // Own profile
        "employees:view:self",
        "employees:edit:self",

        // Own leaves
        "leaves:view:self",
        "leaves:request:self",
        "leaves:cancel:self",

        // Department (read only)
        "departments:view:all",
    ],
};
