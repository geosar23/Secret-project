/* eslint-disable no-unused-vars */
/**
 * Permission categories for organizing and grouping permissions
 */
export enum PermissionCategories {
    // Core Management
    USERS = "users",
    DEPARTMENTS = "departments",
    COMPANIES = "companies",
    COUNTRIES = "countries",
    EMPLOYMENT_TITLES = "employment_titles",
    EMPLOYMENT_TYPES = "employment_types",

    // System
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
    ALL = "*",
    VIEW = "view",
    CREATE = "create",
    EDIT = "edit",
    DELETE = "delete",
    APPROVE = "approve",
    REJECT = "reject",
    CANCEL = "cancel",
}
