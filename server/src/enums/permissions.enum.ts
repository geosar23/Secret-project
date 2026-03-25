/* eslint-disable no-unused-vars */

import type { PermissionDefinition, PermissionKey } from "../interfaces/permission.interface";

export enum PermissionCategories {
    ALL = "*",
    USERS_MANAGEMENT = "usersManagement",
    USER_PROFILE = "userProfile",
    COMPANIES_MANAGEMENT = "companiesManagement",
    ROLES_MANAGEMENT = "rolesManagement",
}

export const PermissionCategoriesStrings: Record<PermissionCategories, string> = {
    [PermissionCategories.ALL]: "All",
    [PermissionCategories.USERS_MANAGEMENT]: "Users Management",
    [PermissionCategories.USER_PROFILE]: "User Profile",
    [PermissionCategories.COMPANIES_MANAGEMENT]: "Companies Management",
    [PermissionCategories.ROLES_MANAGEMENT]: "Roles Management",
};

export enum PermissionScopes {
    ALL = "*",
    COMPANY = "company",
    DEPARTMENT = "department",
    COUNTRY = "country",
    DEPARTMENT_COUNTRY = "department-country",
    MANAGED = "managed",
    OWN = "own",
    SELF = "self",
}

export enum PermissionActions {
    ALL = "*",
    READ = "read",
    WRITE = "write",
    DELETE = "delete",
}

//PermissionCategory:PermissionAction:PermissionScope
export const PermissionKeys = {
    ALL: `${PermissionCategories.ALL}:${PermissionActions.ALL}:${PermissionScopes.ALL}`,

    ALL_COMPANY: `${PermissionCategories.ALL}:${PermissionActions.ALL}:${PermissionScopes.COMPANY}`,

    USERS_MANAGEMENT_READ_ALL: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.ALL}`,
    USERS_MANAGEMENT_READ_COMPANY: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.COMPANY}`,
    USERS_MANAGEMENT_READ_DEPARTMENT: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT}`,
    USERS_MANAGEMENT_READ_COUNTRY: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.COUNTRY}`,
    USERS_MANAGEMENT_READ_DEPARTMENT_COUNTRY: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USERS_MANAGEMENT_READ_MANAGED: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.MANAGED}`,
    USERS_MANAGEMENT_READ_OWN: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.OWN}`,
    USERS_MANAGEMENT_READ_SELF: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.SELF}`,

    USERS_MANAGEMENT_ALL_ALL: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.ALL}:${PermissionScopes.ALL}`,
    USERS_MANAGEMENT_ALL_COMPANY: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.ALL}:${PermissionScopes.COMPANY}`,
    USERS_MANAGEMENT_ALL_DEPARTMENT: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.ALL}:${PermissionScopes.DEPARTMENT}`,
    USERS_MANAGEMENT_ALL_COUNTRY: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.ALL}:${PermissionScopes.COUNTRY}`,
    USERS_MANAGEMENT_ALL_DEPARTMENT_COUNTRY: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.ALL}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USERS_MANAGEMENT_ALL_MANAGED: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.ALL}:${PermissionScopes.MANAGED}`,
    USERS_MANAGEMENT_ALL_OWN: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.ALL}:${PermissionScopes.OWN}`,
    USERS_MANAGEMENT_ALL_SELF: `${PermissionCategories.USERS_MANAGEMENT}:${PermissionActions.ALL}:${PermissionScopes.SELF}`,

    USER_PROFILE_READ_ALL: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.ALL}`,
    USER_PROFILE_READ_COMPANY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_READ_DEPARTMENT: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_READ_COUNTRY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_READ_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_READ_MANAGED: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_READ_OWN: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.OWN}`,
    USER_PROFILE_READ_SELF: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.SELF}`,

    USER_PROFILE_ALL_ALL: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.ALL}`,
    USER_PROFILE_ALL_COMPANY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_ALL_DEPARTMENT: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_ALL_COUNTRY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_ALL_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_ALL_MANAGED: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_ALL_OWN: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.OWN}`,
    USER_PROFILE_ALL_SELF: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.SELF}`,

    COMPANIES_MANAGEMENT_READ_ALL: `${PermissionCategories.COMPANIES_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.ALL}`,
    COMPANIES_MANAGEMENT_WRITE_ALL: `${PermissionCategories.COMPANIES_MANAGEMENT}:${PermissionActions.WRITE}:${PermissionScopes.ALL}`,
    COMPANIES_MANAGEMENT_DELETE_ALL: `${PermissionCategories.COMPANIES_MANAGEMENT}:${PermissionActions.DELETE}:${PermissionScopes.ALL}`,

    ROLES_MANAGEMENT_READ_ALL: `${PermissionCategories.ROLES_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.ALL}`,
    ROLES_MANAGEMENT_READ_COMPANY: `${PermissionCategories.ROLES_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.COMPANY}`,
    ROLES_MANAGEMENT_WRITE_ALL: `${PermissionCategories.ROLES_MANAGEMENT}:${PermissionActions.WRITE}:${PermissionScopes.ALL}`,
    ROLES_MANAGEMENT_WRITE_COMPANY: `${PermissionCategories.ROLES_MANAGEMENT}:${PermissionActions.WRITE}:${PermissionScopes.COMPANY}`,
    ROLES_MANAGEMENT_DELETE_ALL: `${PermissionCategories.ROLES_MANAGEMENT}:${PermissionActions.DELETE}:${PermissionScopes.ALL}`,
    ROLES_MANAGEMENT_DELETE_COMPANY: `${PermissionCategories.ROLES_MANAGEMENT}:${PermissionActions.DELETE}:${PermissionScopes.COMPANY}`,
} as const;

export const PERMISSIONS: Record<PermissionKey, PermissionDefinition> = {
    [PermissionKeys.ALL]: {
        key: PermissionKeys.ALL,
        category: PermissionCategories.ALL,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.ALL],
        name: "All Permissions",
        description: "Grants all permissions",
    },
    [PermissionKeys.ALL_COMPANY]: {
        key: PermissionKeys.ALL_COMPANY,
        category: PermissionCategories.ALL,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.COMPANY],
        name: "All Company Permissions",
        description: "Grants all permissions within the company scope",
    },
    [PermissionKeys.USERS_MANAGEMENT_READ_ALL]: {
        key: PermissionKeys.USERS_MANAGEMENT_READ_ALL,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.ALL],
        name: "View all users",
        description: "Can view all users across the company",
    },
    [PermissionKeys.USERS_MANAGEMENT_READ_COMPANY]: {
        key: PermissionKeys.USERS_MANAGEMENT_READ_COMPANY,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COMPANY],
        name: "View company users",
        description: "Can view users within own company",
    },

    [PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT]: {
        key: PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "View department users",
        description: "Can view users within own department",
    },

    [PermissionKeys.USERS_MANAGEMENT_READ_COUNTRY]: {
        key: PermissionKeys.USERS_MANAGEMENT_READ_COUNTRY,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COUNTRY],
        name: "View country users",
        description: "Can view users within own country",
    },

    [PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "View department-country users",
        description: "Can view users within specified department-country scope",
    },

    [PermissionKeys.USERS_MANAGEMENT_READ_MANAGED]: {
        key: PermissionKeys.USERS_MANAGEMENT_READ_MANAGED,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.MANAGED],
        name: "View managed users",
        description: "Can view users managed by the actor",
    },

    [PermissionKeys.USERS_MANAGEMENT_READ_OWN]: {
        key: PermissionKeys.USERS_MANAGEMENT_READ_OWN,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.OWN],
        name: "View own company-owned users",
        description: "Can view users owned by the actor's entity",
    },

    [PermissionKeys.USERS_MANAGEMENT_READ_SELF]: {
        key: PermissionKeys.USERS_MANAGEMENT_READ_SELF,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.SELF],
        name: "View own profile",
        description: "Can view own user profile",
    },

    [PermissionKeys.USERS_MANAGEMENT_ALL_ALL]: {
        key: PermissionKeys.USERS_MANAGEMENT_ALL_ALL,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.ALL],
        name: "Manage all users",
        description: "Full management of all users across the company",
    },

    [PermissionKeys.USERS_MANAGEMENT_ALL_COMPANY]: {
        key: PermissionKeys.USERS_MANAGEMENT_ALL_COMPANY,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.COMPANY],
        name: "Manage company users",
        description: "Full management of users within own company",
    },

    [PermissionKeys.USERS_MANAGEMENT_ALL_DEPARTMENT]: {
        key: PermissionKeys.USERS_MANAGEMENT_ALL_DEPARTMENT,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "Manage department users",
        description: "Full management of users within own department",
    },

    [PermissionKeys.USERS_MANAGEMENT_ALL_COUNTRY]: {
        key: PermissionKeys.USERS_MANAGEMENT_ALL_COUNTRY,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.COUNTRY],
        name: "Manage country users",
        description: "Full management of users within own country",
    },

    [PermissionKeys.USERS_MANAGEMENT_ALL_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USERS_MANAGEMENT_ALL_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "Manage department-country users",
        description: "Full management of users within department-country scope",
    },

    [PermissionKeys.USERS_MANAGEMENT_ALL_MANAGED]: {
        key: PermissionKeys.USERS_MANAGEMENT_ALL_MANAGED,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.MANAGED],
        name: "Manage managed users",
        description: "Full management of users managed by the actor",
    },

    [PermissionKeys.USERS_MANAGEMENT_ALL_OWN]: {
        key: PermissionKeys.USERS_MANAGEMENT_ALL_OWN,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.OWN],
        name: "Manage owned users",
        description: "Full management of users owned by the actor's entity",
    },

    [PermissionKeys.USERS_MANAGEMENT_ALL_SELF]: {
        key: PermissionKeys.USERS_MANAGEMENT_ALL_SELF,
        category: PermissionCategories.USERS_MANAGEMENT,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.SELF],
        name: "Manage own profile",
        description: "Full management of own user profile",
    },

    [PermissionKeys.USER_PROFILE_READ_ALL]: {
        key: PermissionKeys.USER_PROFILE_READ_ALL,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.ALL],
        name: "View all user profiles",
        description: "Can view all user profiles across the company",
    },

    [PermissionKeys.USER_PROFILE_READ_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_READ_COMPANY,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COMPANY],
        name: "View company user profiles",
        description: "Can view user profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_READ_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_READ_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "View department user profiles",
        description: "Can view user profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_READ_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_READ_COUNTRY,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COUNTRY],
        name: "View country user profiles",
        description: "Can view user profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_READ_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_READ_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "View department-country profiles",
        description: "Can view user profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_READ_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_READ_MANAGED,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.MANAGED],
        name: "View managed user profiles",
        description: "Can view profiles of users managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_READ_OWN]: {
        key: PermissionKeys.USER_PROFILE_READ_OWN,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.OWN],
        name: "View owned user profiles",
        description: "Can view profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_READ_SELF]: {
        key: PermissionKeys.USER_PROFILE_READ_SELF,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.SELF],
        name: "View own profile",
        description: "Can view own user profile",
    },

    [PermissionKeys.USER_PROFILE_ALL_ALL]: {
        key: PermissionKeys.USER_PROFILE_ALL_ALL,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.ALL],
        name: "Manage all user profiles",
        description: "Full management of all user profiles",
    },

    [PermissionKeys.USER_PROFILE_ALL_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_ALL_COMPANY,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.COMPANY],
        name: "Manage company profiles",
        description: "Full management of user profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_ALL_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_ALL_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "Manage department profiles",
        description: "Full management of user profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_ALL_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_ALL_COUNTRY,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.COUNTRY],
        name: "Manage country profiles",
        description: "Full management of user profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_ALL_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_ALL_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "Manage department-country profiles",
        description: "Full management of profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_ALL_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_ALL_MANAGED,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.MANAGED],
        name: "Manage managed profiles",
        description: "Full management of profiles managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_ALL_OWN]: {
        key: PermissionKeys.USER_PROFILE_ALL_OWN,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.OWN],
        name: "Manage owned profiles",
        description: "Full management of profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_ALL_SELF]: {
        key: PermissionKeys.USER_PROFILE_ALL_SELF,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.SELF],
        name: "Manage own profile",
        description: "Full management of own user profile",
    },

    [PermissionKeys.COMPANIES_MANAGEMENT_READ_ALL]: {
        key: PermissionKeys.COMPANIES_MANAGEMENT_READ_ALL,
        category: PermissionCategories.COMPANIES_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.ALL],
        name: "View all companies",
        description: "Can view all companies",
    },

    [PermissionKeys.COMPANIES_MANAGEMENT_WRITE_ALL]: {
        key: PermissionKeys.COMPANIES_MANAGEMENT_WRITE_ALL,
        category: PermissionCategories.COMPANIES_MANAGEMENT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.ALL],
        name: "Manage companies",
        description: "Can create and update all companies",
    },

    [PermissionKeys.COMPANIES_MANAGEMENT_DELETE_ALL]: {
        key: PermissionKeys.COMPANIES_MANAGEMENT_DELETE_ALL,
        category: PermissionCategories.COMPANIES_MANAGEMENT,
        action: PermissionActions.DELETE,
        scopes: [PermissionScopes.ALL],
        name: "Delete companies",
        description: "Can delete companies",
    },

    [PermissionKeys.ROLES_MANAGEMENT_READ_ALL]: {
        key: PermissionKeys.ROLES_MANAGEMENT_READ_ALL,
        category: PermissionCategories.ROLES_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.ALL],
        name: "View all roles",
        description: "Can view all roles across all companies",
    },

    [PermissionKeys.ROLES_MANAGEMENT_READ_COMPANY]: {
        key: PermissionKeys.ROLES_MANAGEMENT_READ_COMPANY,
        category: PermissionCategories.ROLES_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COMPANY],
        name: "View company roles",
        description: "Can view roles within own company",
    },

    [PermissionKeys.ROLES_MANAGEMENT_WRITE_ALL]: {
        key: PermissionKeys.ROLES_MANAGEMENT_WRITE_ALL,
        category: PermissionCategories.ROLES_MANAGEMENT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.ALL],
        name: "Manage all roles",
        description: "Can create and update all roles",
    },

    [PermissionKeys.ROLES_MANAGEMENT_WRITE_COMPANY]: {
        key: PermissionKeys.ROLES_MANAGEMENT_WRITE_COMPANY,
        category: PermissionCategories.ROLES_MANAGEMENT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COMPANY],
        name: "Manage company roles",
        description: "Can create and update roles within own company",
    },

    [PermissionKeys.ROLES_MANAGEMENT_DELETE_ALL]: {
        key: PermissionKeys.ROLES_MANAGEMENT_DELETE_ALL,
        category: PermissionCategories.ROLES_MANAGEMENT,
        action: PermissionActions.DELETE,
        scopes: [PermissionScopes.ALL],
        name: "Delete all roles",
        description: "Can delete all roles",
    },

    [PermissionKeys.ROLES_MANAGEMENT_DELETE_COMPANY]: {
        key: PermissionKeys.ROLES_MANAGEMENT_DELETE_COMPANY,
        category: PermissionCategories.ROLES_MANAGEMENT,
        action: PermissionActions.DELETE,
        scopes: [PermissionScopes.COMPANY],
        name: "Delete company roles",
        description: "Can delete roles within own company",
    },
};
