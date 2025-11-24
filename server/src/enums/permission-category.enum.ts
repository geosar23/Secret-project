/* eslint-disable no-unused-vars */
/**
 * Permission categories for organizing and grouping permissions
 */
export enum PermissionCategory {
    // Core Management
    USERS = "users",
    EMPLOYEES = "employees",
    DEPARTMENTS = "departments",
    COMPANY = "company",

    // Requests (parent category)
    REQUESTS_LEAVES = "requests.leaves",
    REQUESTS_ADDITIONAL_PAYMENTS = "requests.additional_payments",
    REQUESTS_DEDUCTIONS = "requests.deductions",
    REQUESTS_REMOTE_WORK = "requests.remote_work",

    // Payroll
    PAYROLL = "payroll",

    // System
    REPORTS = "reports",
    SETTINGS = "settings",
    PERMISSIONS = "permissions",
    ROLES = "roles",
}

/**
 * Helper to get parent category from a subcategory
 * @example getParentCategory("requests.leaves") => "requests"
 */
export function getParentCategory(category: string): string {
    return category.split(".")[0];
}

/**
 * Helper to get subcategory from a full category
 * @example getSubCategory("requests.leaves") => "leaves"
 */
export function getSubCategory(category: string): string | null {
    const parts = category.split(".");
    return parts.length > 1 ? parts[1] : null;
}

/**
 * Category hierarchy structure for UI display
 */
export const CATEGORY_HIERARCHY = {
    users: { label: "Users", subcategories: [] },
    employees: { label: "Employees", subcategories: [] },
    departments: { label: "Departments", subcategories: [] },
    company: { label: "Company", subcategories: [] },
    requests: {
        label: "Requests",
        subcategories: [
            { key: "leaves", label: "Leaves" },
            { key: "additional_payments", label: "Additional Payments" },
            { key: "deductions", label: "Deductions" },
            { key: "remote_work", label: "Remote Work Requests" },
        ],
    },
    payroll: { label: "Payroll", subcategories: [] },
    reports: { label: "Reports", subcategories: [] },
    settings: { label: "Settings", subcategories: [] },
    permissions: { label: "Permissions", subcategories: [] },
    roles: { label: "Roles", subcategories: [] },
} as const;
