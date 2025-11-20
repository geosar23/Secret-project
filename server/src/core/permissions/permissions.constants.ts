/**
 * Permission structure: entity:action:scope
 * 
 * Examples:
 * - employees:view:all - View all employees
 * - employees:edit:managed - Edit employees you manage
 * - employees:delete:self - Delete your own account
 * - leaves:approve:department - Approve leaves in your department
 */

export const PERMISSIONS = {
    // System-level (GOD only)
    SYSTEM: {
        VIEW_ALL_COMPANIES: "system:companies:view",
        MANAGE_COMPANIES: "system:companies:manage",
        IMPERSONATE_USER: "system:user:impersonate",
    },

    // Company-level
    COMPANY: {
        VIEW_SETTINGS: "company:settings:view",
        EDIT_SETTINGS: "company:settings:edit",
        DELETE: "company:delete",
        VIEW_BILLING: "company:billing:view",
    },

    // Employee management
    EMPLOYEES: {
        VIEW_ALL: "employees:view:all",
        VIEW_DEPARTMENT: "employees:view:department",
        VIEW_MANAGED: "employees:view:managed",
        VIEW_SELF: "employees:view:self",
        CREATE: "employees:create:all",
        EDIT_ALL: "employees:edit:all",
        EDIT_DEPARTMENT: "employees:edit:department",
        EDIT_MANAGED: "employees:edit:managed",
        EDIT_SELF: "employees:edit:self",
        DELETE: "employees:delete:all",
        VIEW_SALARY: "employees:salary:view",
        EDIT_SALARY: "employees:salary:edit",
    },

    // Leave management
    LEAVES: {
        VIEW_ALL: "leaves:view:all",
        VIEW_DEPARTMENT: "leaves:view:department",
        VIEW_MANAGED: "leaves:view:managed",
        VIEW_SELF: "leaves:view:self",
        REQUEST: "leaves:request:self",
        APPROVE_ALL: "leaves:approve:all",
        APPROVE_DEPARTMENT: "leaves:approve:department",
        APPROVE_MANAGED: "leaves:approve:managed",
        CANCEL_ANY: "leaves:cancel:all",
        CANCEL_SELF: "leaves:cancel:self",
    },

    // Department management
    DEPARTMENTS: {
        VIEW: "departments:view:all",
        CREATE: "departments:create:all",
        EDIT: "departments:edit:all",
        DELETE: "departments:delete:all",
    },

    // Reports & Analytics
    REPORTS: {
        VIEW_ALL: "reports:view:all",
        VIEW_DEPARTMENT: "reports:view:department",
        EXPORT: "reports:export:all",
    },

    // User & Role management
    USERS: {
        VIEW_ALL: "users:view:all",
        CREATE: "users:create:all",
        EDIT_ROLES: "users:roles:edit",
        DELETE: "users:delete:all",
        MANAGE_PERMISSIONS: "users:permissions:manage",
    },
} as const;
