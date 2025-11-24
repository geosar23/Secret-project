/* eslint-disable no-unused-vars */
/**
 * Permission categories for organizing and grouping permissions
 */
export enum PermissionCategories {
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

export enum PermissionScopes {
    ALL = "*",
    COMPANY = "company",
    DEPARTMENT = "department",
    USER = "user",
}

export enum PermissionActions {
    VIEW = "view",
    CREATE = "create",
    EDIT = "edit",
    DELETE = "delete",
    APPROVE = "approve",
    CANCEL = "cancel",
}
