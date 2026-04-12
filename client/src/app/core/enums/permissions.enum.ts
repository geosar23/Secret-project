import { IPermissionDefinition, PermissionKey } from "../interfaces/permission.interface";

export enum PermissionCategories {
    ALL = "*",
    USERS_MANAGEMENT = "usersManagement",
    COUNTRIES_MANAGEMENT = "countriesManagement",
    USER_PROFILE = "userProfile",
    USER_PROFILE_IDENTITY = "userProfile.identity",
    USER_PROFILE_CONTACT = "userProfile.contact",
    USER_PROFILE_EMPLOYMENT = "userProfile.employment",
    USER_PROFILE_EDUCATION = "userProfile.education",
    USER_PROFILE_COMPENSATION = "userProfile.compensation",
    ROLES_MANAGEMENT = "rolesManagement",
}

export const PermissionCategoriesStrings: Record<PermissionCategories, string> = {
    [PermissionCategories.ALL]: "All",
    [PermissionCategories.USERS_MANAGEMENT]: "Users Management",
    [PermissionCategories.COUNTRIES_MANAGEMENT]: "Countries Management",
    [PermissionCategories.USER_PROFILE]: "User Profile",
    [PermissionCategories.USER_PROFILE_IDENTITY]: "User Profile — Identity",
    [PermissionCategories.USER_PROFILE_CONTACT]: "User Profile — Contact",
    [PermissionCategories.USER_PROFILE_EMPLOYMENT]: "User Profile — Employment",
    [PermissionCategories.USER_PROFILE_EDUCATION]: "User Profile — Education",
    [PermissionCategories.USER_PROFILE_COMPENSATION]: "User Profile — Compensation",
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
    CREATE = "create",
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

    COUNTRIES_MANAGEMENT_READ_ALL: `${PermissionCategories.COUNTRIES_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.ALL}`,
    COUNTRIES_MANAGEMENT_READ_COMPANY: `${PermissionCategories.COUNTRIES_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.COMPANY}`,

    COUNTRIES_MANAGEMENT_ALL_ALL: `${PermissionCategories.COUNTRIES_MANAGEMENT}:${PermissionActions.ALL}:${PermissionScopes.ALL}`,
    COUNTRIES_MANAGEMENT_ALL_COMPANY: `${PermissionCategories.COUNTRIES_MANAGEMENT}:${PermissionActions.ALL}:${PermissionScopes.COMPANY}`,

    USER_PROFILE_READ_ALL: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.ALL}`,
    USER_PROFILE_READ_COMPANY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_READ_DEPARTMENT: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_READ_COUNTRY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_READ_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_READ_MANAGED: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_READ_OWN: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.OWN}`,
    USER_PROFILE_READ_SELF: `${PermissionCategories.USER_PROFILE}:${PermissionActions.READ}:${PermissionScopes.SELF}`,

    USER_PROFILE_WRITE_ALL: `${PermissionCategories.USER_PROFILE}:${PermissionActions.WRITE}:${PermissionScopes.ALL}`,
    USER_PROFILE_WRITE_COMPANY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.WRITE}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_WRITE_DEPARTMENT: `${PermissionCategories.USER_PROFILE}:${PermissionActions.WRITE}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_WRITE_COUNTRY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.WRITE}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_WRITE_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.WRITE}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_WRITE_MANAGED: `${PermissionCategories.USER_PROFILE}:${PermissionActions.WRITE}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_WRITE_OWN: `${PermissionCategories.USER_PROFILE}:${PermissionActions.WRITE}:${PermissionScopes.OWN}`,
    USER_PROFILE_WRITE_SELF: `${PermissionCategories.USER_PROFILE}:${PermissionActions.WRITE}:${PermissionScopes.SELF}`,

    USER_PROFILE_CREATE_ALL: `${PermissionCategories.USER_PROFILE}:${PermissionActions.CREATE}:${PermissionScopes.ALL}`,
    USER_PROFILE_CREATE_COMPANY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.CREATE}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_CREATE_DEPARTMENT: `${PermissionCategories.USER_PROFILE}:${PermissionActions.CREATE}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_CREATE_COUNTRY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.CREATE}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_CREATE_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.CREATE}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_CREATE_MANAGED: `${PermissionCategories.USER_PROFILE}:${PermissionActions.CREATE}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_CREATE_OWN: `${PermissionCategories.USER_PROFILE}:${PermissionActions.CREATE}:${PermissionScopes.OWN}`,
    USER_PROFILE_CREATE_SELF: `${PermissionCategories.USER_PROFILE}:${PermissionActions.CREATE}:${PermissionScopes.SELF}`,

    USER_PROFILE_ALL_ALL: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.ALL}`,
    USER_PROFILE_ALL_COMPANY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_ALL_DEPARTMENT: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_ALL_COUNTRY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_ALL_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_ALL_MANAGED: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_ALL_OWN: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.OWN}`,
    USER_PROFILE_ALL_SELF: `${PermissionCategories.USER_PROFILE}:${PermissionActions.ALL}:${PermissionScopes.SELF}`,

    // userProfile.identity sub-category
    USER_PROFILE_IDENTITY_READ_ALL: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.READ}:${PermissionScopes.ALL}`,
    USER_PROFILE_IDENTITY_READ_COMPANY: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.READ}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_IDENTITY_READ_DEPARTMENT: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_IDENTITY_READ_COUNTRY: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.READ}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_IDENTITY_READ_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_IDENTITY_READ_MANAGED: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.READ}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_IDENTITY_READ_OWN: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.READ}:${PermissionScopes.OWN}`,
    USER_PROFILE_IDENTITY_READ_SELF: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.READ}:${PermissionScopes.SELF}`,
    USER_PROFILE_IDENTITY_WRITE_ALL: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.WRITE}:${PermissionScopes.ALL}`,
    USER_PROFILE_IDENTITY_WRITE_COMPANY: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.WRITE}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_IDENTITY_WRITE_DEPARTMENT: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.WRITE}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_IDENTITY_WRITE_COUNTRY: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.WRITE}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_IDENTITY_WRITE_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.WRITE}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_IDENTITY_WRITE_MANAGED: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.WRITE}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_IDENTITY_WRITE_OWN: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.WRITE}:${PermissionScopes.OWN}`,
    USER_PROFILE_IDENTITY_WRITE_SELF: `${PermissionCategories.USER_PROFILE_IDENTITY}:${PermissionActions.WRITE}:${PermissionScopes.SELF}`,

    // userProfile.contact sub-category
    USER_PROFILE_CONTACT_READ_ALL: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.READ}:${PermissionScopes.ALL}`,
    USER_PROFILE_CONTACT_READ_COMPANY: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.READ}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_CONTACT_READ_DEPARTMENT: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_CONTACT_READ_COUNTRY: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.READ}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_CONTACT_READ_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_CONTACT_READ_MANAGED: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.READ}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_CONTACT_READ_OWN: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.READ}:${PermissionScopes.OWN}`,
    USER_PROFILE_CONTACT_READ_SELF: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.READ}:${PermissionScopes.SELF}`,
    USER_PROFILE_CONTACT_WRITE_ALL: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.WRITE}:${PermissionScopes.ALL}`,
    USER_PROFILE_CONTACT_WRITE_COMPANY: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.WRITE}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_CONTACT_WRITE_DEPARTMENT: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.WRITE}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_CONTACT_WRITE_COUNTRY: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.WRITE}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_CONTACT_WRITE_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.WRITE}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_CONTACT_WRITE_MANAGED: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.WRITE}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_CONTACT_WRITE_OWN: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.WRITE}:${PermissionScopes.OWN}`,
    USER_PROFILE_CONTACT_WRITE_SELF: `${PermissionCategories.USER_PROFILE_CONTACT}:${PermissionActions.WRITE}:${PermissionScopes.SELF}`,

    // userProfile.employment sub-category
    USER_PROFILE_EMPLOYMENT_READ_ALL: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.READ}:${PermissionScopes.ALL}`,
    USER_PROFILE_EMPLOYMENT_READ_COMPANY: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.READ}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_EMPLOYMENT_READ_DEPARTMENT: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_EMPLOYMENT_READ_COUNTRY: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.READ}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_EMPLOYMENT_READ_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_EMPLOYMENT_READ_MANAGED: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.READ}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_EMPLOYMENT_READ_OWN: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.READ}:${PermissionScopes.OWN}`,
    USER_PROFILE_EMPLOYMENT_READ_SELF: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.READ}:${PermissionScopes.SELF}`,
    USER_PROFILE_EMPLOYMENT_WRITE_ALL: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.WRITE}:${PermissionScopes.ALL}`,
    USER_PROFILE_EMPLOYMENT_WRITE_COMPANY: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.WRITE}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_EMPLOYMENT_WRITE_DEPARTMENT: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.WRITE}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_EMPLOYMENT_WRITE_COUNTRY: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.WRITE}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_EMPLOYMENT_WRITE_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.WRITE}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_EMPLOYMENT_WRITE_MANAGED: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.WRITE}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_EMPLOYMENT_WRITE_OWN: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.WRITE}:${PermissionScopes.OWN}`,
    USER_PROFILE_EMPLOYMENT_WRITE_SELF: `${PermissionCategories.USER_PROFILE_EMPLOYMENT}:${PermissionActions.WRITE}:${PermissionScopes.SELF}`,

    // userProfile.education sub-category
    USER_PROFILE_EDUCATION_READ_ALL: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.READ}:${PermissionScopes.ALL}`,
    USER_PROFILE_EDUCATION_READ_COMPANY: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.READ}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_EDUCATION_READ_DEPARTMENT: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_EDUCATION_READ_COUNTRY: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.READ}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_EDUCATION_READ_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_EDUCATION_READ_MANAGED: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.READ}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_EDUCATION_READ_OWN: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.READ}:${PermissionScopes.OWN}`,
    USER_PROFILE_EDUCATION_READ_SELF: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.READ}:${PermissionScopes.SELF}`,
    USER_PROFILE_EDUCATION_WRITE_ALL: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.WRITE}:${PermissionScopes.ALL}`,
    USER_PROFILE_EDUCATION_WRITE_COMPANY: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.WRITE}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_EDUCATION_WRITE_DEPARTMENT: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.WRITE}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_EDUCATION_WRITE_COUNTRY: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.WRITE}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_EDUCATION_WRITE_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.WRITE}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_EDUCATION_WRITE_MANAGED: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.WRITE}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_EDUCATION_WRITE_OWN: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.WRITE}:${PermissionScopes.OWN}`,
    USER_PROFILE_EDUCATION_WRITE_SELF: `${PermissionCategories.USER_PROFILE_EDUCATION}:${PermissionActions.WRITE}:${PermissionScopes.SELF}`,

    // userProfile.compensation sub-category
    USER_PROFILE_COMPENSATION_READ_ALL: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.READ}:${PermissionScopes.ALL}`,
    USER_PROFILE_COMPENSATION_READ_COMPANY: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.READ}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_COMPENSATION_READ_DEPARTMENT: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_COMPENSATION_READ_COUNTRY: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.READ}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_COMPENSATION_READ_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.READ}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_COMPENSATION_READ_MANAGED: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.READ}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_COMPENSATION_READ_OWN: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.READ}:${PermissionScopes.OWN}`,
    USER_PROFILE_COMPENSATION_READ_SELF: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.READ}:${PermissionScopes.SELF}`,
    USER_PROFILE_COMPENSATION_WRITE_ALL: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.WRITE}:${PermissionScopes.ALL}`,
    USER_PROFILE_COMPENSATION_WRITE_COMPANY: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.WRITE}:${PermissionScopes.COMPANY}`,
    USER_PROFILE_COMPENSATION_WRITE_DEPARTMENT: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.WRITE}:${PermissionScopes.DEPARTMENT}`,
    USER_PROFILE_COMPENSATION_WRITE_COUNTRY: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.WRITE}:${PermissionScopes.COUNTRY}`,
    USER_PROFILE_COMPENSATION_WRITE_DEPARTMENT_COUNTRY: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.WRITE}:${PermissionScopes.DEPARTMENT_COUNTRY}`,
    USER_PROFILE_COMPENSATION_WRITE_MANAGED: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.WRITE}:${PermissionScopes.MANAGED}`,
    USER_PROFILE_COMPENSATION_WRITE_OWN: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.WRITE}:${PermissionScopes.OWN}`,
    USER_PROFILE_COMPENSATION_WRITE_SELF: `${PermissionCategories.USER_PROFILE_COMPENSATION}:${PermissionActions.WRITE}:${PermissionScopes.SELF}`,

    ROLES_MANAGEMENT_ALL_ALL: `${PermissionCategories.ROLES_MANAGEMENT}:${PermissionActions.ALL}:${PermissionScopes.ALL}`,
    ROLES_MANAGEMENT_ALL_COMPANY: `${PermissionCategories.ROLES_MANAGEMENT}:${PermissionActions.ALL}:${PermissionScopes.COMPANY}`,
    ROLES_MANAGEMENT_VIEW_ALL: `${PermissionCategories.ROLES_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.ALL}`,
    ROLES_MANAGEMENT_VIEW_COMPANY: `${PermissionCategories.ROLES_MANAGEMENT}:${PermissionActions.READ}:${PermissionScopes.COMPANY}`,
} as const;

export const PERMISSIONS: Record<PermissionKey, IPermissionDefinition> = {
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

    [PermissionKeys.COUNTRIES_MANAGEMENT_READ_ALL]: {
        key: PermissionKeys.COUNTRIES_MANAGEMENT_READ_ALL,
        category: PermissionCategories.COUNTRIES_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.ALL],
        name: "View all countries",
        description: "Can view all countries across the company",
    },

    [PermissionKeys.COUNTRIES_MANAGEMENT_READ_COMPANY]: {
        key: PermissionKeys.COUNTRIES_MANAGEMENT_READ_COMPANY,
        category: PermissionCategories.COUNTRIES_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COMPANY],
        name: "View company countries",
        description: "Can view countries within own company",
    },

    [PermissionKeys.COUNTRIES_MANAGEMENT_ALL_ALL]: {
        key: PermissionKeys.COUNTRIES_MANAGEMENT_ALL_ALL,
        category: PermissionCategories.COUNTRIES_MANAGEMENT,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.ALL],
        name: "Manage all countries",
        description: "Full management of countries across the company",
    },

    [PermissionKeys.COUNTRIES_MANAGEMENT_ALL_COMPANY]: {
        key: PermissionKeys.COUNTRIES_MANAGEMENT_ALL_COMPANY,
        category: PermissionCategories.COUNTRIES_MANAGEMENT,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.COMPANY],
        name: "Manage company countries",
        description: "Full management of countries within own company",
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

    [PermissionKeys.USER_PROFILE_WRITE_ALL]: {
        key: PermissionKeys.USER_PROFILE_WRITE_ALL,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.ALL],
        name: "Edit all user profiles",
        description: "Can edit all user profiles across the company",
    },

    [PermissionKeys.USER_PROFILE_WRITE_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_WRITE_COMPANY,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COMPANY],
        name: "Edit company user profiles",
        description: "Can edit user profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_WRITE_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_WRITE_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "Edit department user profiles",
        description: "Can edit user profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_WRITE_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_WRITE_COUNTRY,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COUNTRY],
        name: "Edit country user profiles",
        description: "Can edit user profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_WRITE_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_WRITE_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "Edit department-country user profiles",
        description: "Can edit user profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_WRITE_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_WRITE_MANAGED,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.MANAGED],
        name: "Edit managed user profiles",
        description: "Can edit profiles of users managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_WRITE_OWN]: {
        key: PermissionKeys.USER_PROFILE_WRITE_OWN,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.OWN],
        name: "Edit owned user profiles",
        description: "Can edit profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_WRITE_SELF]: {
        key: PermissionKeys.USER_PROFILE_WRITE_SELF,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.SELF],
        name: "Edit own profile",
        description: "Can edit own user profile",
    },

    [PermissionKeys.USER_PROFILE_CREATE_ALL]: {
        key: PermissionKeys.USER_PROFILE_CREATE_ALL,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.CREATE,
        scopes: [PermissionScopes.ALL],
        name: "Create any user",
        description: "Can create users globally across all companies",
    },

    [PermissionKeys.USER_PROFILE_CREATE_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_CREATE_COMPANY,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.CREATE,
        scopes: [PermissionScopes.COMPANY],
        name: "Create users in own company",
        description: "Can create users within own company",
    },

    [PermissionKeys.USER_PROFILE_CREATE_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_CREATE_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.CREATE,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "Create users in own department",
        description: "Can create users within own department",
    },

    [PermissionKeys.USER_PROFILE_CREATE_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_CREATE_COUNTRY,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.CREATE,
        scopes: [PermissionScopes.COUNTRY],
        name: "Create users in own country",
        description: "Can create users within own country",
    },

    [PermissionKeys.USER_PROFILE_CREATE_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_CREATE_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.CREATE,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "Create users in own department-country",
        description: "Can create users within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_CREATE_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_CREATE_MANAGED,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.CREATE,
        scopes: [PermissionScopes.MANAGED],
        name: "Create users for managed scope",
        description: "Can create users within managed scope",
    },

    [PermissionKeys.USER_PROFILE_CREATE_OWN]: {
        key: PermissionKeys.USER_PROFILE_CREATE_OWN,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.CREATE,
        scopes: [PermissionScopes.OWN],
        name: "Create users in own entity",
        description: "Can create users owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_CREATE_SELF]: {
        key: PermissionKeys.USER_PROFILE_CREATE_SELF,
        category: PermissionCategories.USER_PROFILE,
        action: PermissionActions.CREATE,
        scopes: [PermissionScopes.SELF],
        name: "Create own profile",
        description: "Can create own user profile entry",
    },

    // userProfile.identity sub-category definitions
    [PermissionKeys.USER_PROFILE_IDENTITY_READ_ALL]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_READ_ALL,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.ALL],
        name: "View all identity sections",
        description: "Can view identity section of any user profile",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_READ_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_READ_COMPANY,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COMPANY],
        name: "View company identity sections",
        description: "Can view identity section of profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_READ_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_READ_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "View department identity sections",
        description: "Can view identity section of profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_READ_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_READ_COUNTRY,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COUNTRY],
        name: "View country identity sections",
        description: "Can view identity section of profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_READ_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_READ_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "View department-country identity sections",
        description: "Can view identity section of profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_READ_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_READ_MANAGED,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.MANAGED],
        name: "View managed identity sections",
        description: "Can view identity section of profiles managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_READ_OWN]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_READ_OWN,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.OWN],
        name: "View owned identity sections",
        description: "Can view identity section of profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_READ_SELF]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_READ_SELF,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.SELF],
        name: "View own identity section",
        description: "Can view own identity section",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_ALL]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_WRITE_ALL,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.ALL],
        name: "Edit all identity sections",
        description: "Can edit identity section of any user profile",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_WRITE_COMPANY,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COMPANY],
        name: "Edit company identity sections",
        description: "Can edit identity section of profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_WRITE_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "Edit department identity sections",
        description: "Can edit identity section of profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_WRITE_COUNTRY,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COUNTRY],
        name: "Edit country identity sections",
        description: "Can edit identity section of profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_WRITE_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "Edit department-country identity sections",
        description: "Can edit identity section of profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_WRITE_MANAGED,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.MANAGED],
        name: "Edit managed identity sections",
        description: "Can edit identity section of profiles managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_OWN]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_WRITE_OWN,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.OWN],
        name: "Edit owned identity sections",
        description: "Can edit identity section of profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_SELF]: {
        key: PermissionKeys.USER_PROFILE_IDENTITY_WRITE_SELF,
        category: PermissionCategories.USER_PROFILE_IDENTITY,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.SELF],
        name: "Edit own identity section",
        description: "Can edit own identity section",
    },

    // userProfile.contact sub-category definitions
    [PermissionKeys.USER_PROFILE_CONTACT_READ_ALL]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_READ_ALL,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.ALL],
        name: "View all contact sections",
        description: "Can view contact section of any user profile",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_READ_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_READ_COMPANY,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COMPANY],
        name: "View company contact sections",
        description: "Can view contact section of profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_READ_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_READ_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "View department contact sections",
        description: "Can view contact section of profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_READ_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_READ_COUNTRY,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COUNTRY],
        name: "View country contact sections",
        description: "Can view contact section of profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_READ_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_READ_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "View department-country contact sections",
        description: "Can view contact section of profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_READ_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_READ_MANAGED,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.MANAGED],
        name: "View managed contact sections",
        description: "Can view contact section of profiles managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_READ_OWN]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_READ_OWN,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.OWN],
        name: "View owned contact sections",
        description: "Can view contact section of profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_READ_SELF]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_READ_SELF,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.SELF],
        name: "View own contact section",
        description: "Can view own contact section",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_WRITE_ALL]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_WRITE_ALL,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.ALL],
        name: "Edit all contact sections",
        description: "Can edit contact section of any user profile",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_WRITE_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_WRITE_COMPANY,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COMPANY],
        name: "Edit company contact sections",
        description: "Can edit contact section of profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_WRITE_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_WRITE_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "Edit department contact sections",
        description: "Can edit contact section of profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_WRITE_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_WRITE_COUNTRY,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COUNTRY],
        name: "Edit country contact sections",
        description: "Can edit contact section of profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_WRITE_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_WRITE_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "Edit department-country contact sections",
        description: "Can edit contact section of profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_WRITE_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_WRITE_MANAGED,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.MANAGED],
        name: "Edit managed contact sections",
        description: "Can edit contact section of profiles managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_WRITE_OWN]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_WRITE_OWN,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.OWN],
        name: "Edit owned contact sections",
        description: "Can edit contact section of profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_CONTACT_WRITE_SELF]: {
        key: PermissionKeys.USER_PROFILE_CONTACT_WRITE_SELF,
        category: PermissionCategories.USER_PROFILE_CONTACT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.SELF],
        name: "Edit own contact section",
        description: "Can edit own contact section",
    },

    // userProfile.employment sub-category definitions
    [PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_ALL]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_ALL,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.ALL],
        name: "View all employment sections",
        description: "Can view employment section of any user profile",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_COMPANY,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COMPANY],
        name: "View company employment sections",
        description: "Can view employment section of profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "View department employment sections",
        description: "Can view employment section of profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_COUNTRY,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COUNTRY],
        name: "View country employment sections",
        description: "Can view employment section of profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "View department-country employment sections",
        description: "Can view employment section of profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_MANAGED,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.MANAGED],
        name: "View managed employment sections",
        description: "Can view employment section of profiles managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_OWN]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_OWN,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.OWN],
        name: "View owned employment sections",
        description: "Can view employment section of profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_SELF]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_READ_SELF,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.SELF],
        name: "View own employment section",
        description: "Can view own employment section",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_ALL]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_ALL,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.ALL],
        name: "Edit all employment sections",
        description: "Can edit employment section of any user profile",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_COMPANY,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COMPANY],
        name: "Edit company employment sections",
        description: "Can edit employment section of profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "Edit department employment sections",
        description: "Can edit employment section of profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_COUNTRY,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COUNTRY],
        name: "Edit country employment sections",
        description: "Can edit employment section of profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "Edit department-country employment sections",
        description: "Can edit employment section of profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_MANAGED,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.MANAGED],
        name: "Edit managed employment sections",
        description: "Can edit employment section of profiles managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_OWN]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_OWN,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.OWN],
        name: "Edit owned employment sections",
        description: "Can edit employment section of profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_SELF]: {
        key: PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_SELF,
        category: PermissionCategories.USER_PROFILE_EMPLOYMENT,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.SELF],
        name: "Edit own employment section",
        description: "Can edit own employment section",
    },

    // userProfile.education sub-category definitions
    [PermissionKeys.USER_PROFILE_EDUCATION_READ_ALL]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_READ_ALL,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.ALL],
        name: "View all education sections",
        description: "Can view education section of any user profile",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_READ_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_READ_COMPANY,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COMPANY],
        name: "View company education sections",
        description: "Can view education section of profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_READ_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_READ_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "View department education sections",
        description: "Can view education section of profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_READ_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_READ_COUNTRY,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COUNTRY],
        name: "View country education sections",
        description: "Can view education section of profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_READ_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_READ_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "View department-country education sections",
        description: "Can view education section of profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_READ_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_READ_MANAGED,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.MANAGED],
        name: "View managed education sections",
        description: "Can view education section of profiles managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_READ_OWN]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_READ_OWN,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.OWN],
        name: "View owned education sections",
        description: "Can view education section of profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_READ_SELF]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_READ_SELF,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.SELF],
        name: "View own education section",
        description: "Can view own education section",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_ALL]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_WRITE_ALL,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.ALL],
        name: "Edit all education sections",
        description: "Can edit education section of any user profile",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_WRITE_COMPANY,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COMPANY],
        name: "Edit company education sections",
        description: "Can edit education section of profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_WRITE_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "Edit department education sections",
        description: "Can edit education section of profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_WRITE_COUNTRY,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COUNTRY],
        name: "Edit country education sections",
        description: "Can edit education section of profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_WRITE_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "Edit department-country education sections",
        description: "Can edit education section of profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_WRITE_MANAGED,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.MANAGED],
        name: "Edit managed education sections",
        description: "Can edit education section of profiles managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_OWN]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_WRITE_OWN,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.OWN],
        name: "Edit owned education sections",
        description: "Can edit education section of profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_SELF]: {
        key: PermissionKeys.USER_PROFILE_EDUCATION_WRITE_SELF,
        category: PermissionCategories.USER_PROFILE_EDUCATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.SELF],
        name: "Edit own education section",
        description: "Can edit own education section",
    },

    // userProfile.compensation sub-category definitions
    [PermissionKeys.USER_PROFILE_COMPENSATION_READ_ALL]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_READ_ALL,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.ALL],
        name: "View all compensation sections",
        description: "Can view compensation section of any user profile",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_READ_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_READ_COMPANY,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COMPANY],
        name: "View company compensation sections",
        description: "Can view compensation section of profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_READ_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_READ_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "View department compensation sections",
        description: "Can view compensation section of profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_READ_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_READ_COUNTRY,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COUNTRY],
        name: "View country compensation sections",
        description: "Can view compensation section of profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_READ_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_READ_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "View department-country compensation sections",
        description: "Can view compensation section of profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_READ_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_READ_MANAGED,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.MANAGED],
        name: "View managed compensation sections",
        description: "Can view compensation section of profiles managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_READ_OWN]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_READ_OWN,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.OWN],
        name: "View owned compensation sections",
        description: "Can view compensation section of profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_READ_SELF]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_READ_SELF,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.SELF],
        name: "View own compensation section",
        description: "Can view own compensation section",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_ALL]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_ALL,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.ALL],
        name: "Edit all compensation sections",
        description: "Can edit compensation section of any user profile",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_COMPANY]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_COMPANY,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COMPANY],
        name: "Edit company compensation sections",
        description: "Can edit compensation section of profiles within own company",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_DEPARTMENT]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_DEPARTMENT,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.DEPARTMENT],
        name: "Edit department compensation sections",
        description: "Can edit compensation section of profiles within own department",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_COUNTRY,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.COUNTRY],
        name: "Edit country compensation sections",
        description: "Can edit compensation section of profiles within own country",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_DEPARTMENT_COUNTRY]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_DEPARTMENT_COUNTRY,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.DEPARTMENT_COUNTRY],
        name: "Edit department-country compensation sections",
        description: "Can edit compensation section of profiles within department-country scope",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_MANAGED]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_MANAGED,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.MANAGED],
        name: "Edit managed compensation sections",
        description: "Can edit compensation section of profiles managed by the actor",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_OWN]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_OWN,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.OWN],
        name: "Edit owned compensation sections",
        description: "Can edit compensation section of profiles owned by the actor's entity",
    },

    [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_SELF]: {
        key: PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_SELF,
        category: PermissionCategories.USER_PROFILE_COMPENSATION,
        action: PermissionActions.WRITE,
        scopes: [PermissionScopes.SELF],
        name: "Edit own compensation section",
        description: "Can edit own compensation section",
    },

    [PermissionKeys.ROLES_MANAGEMENT_ALL_ALL]: {
        key: PermissionKeys.ROLES_MANAGEMENT_ALL_ALL,
        category: PermissionCategories.ROLES_MANAGEMENT,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.ALL],
        name: "Manage all roles",
        description: "Full management of all roles across the company",
    },

    [PermissionKeys.ROLES_MANAGEMENT_ALL_COMPANY]: {
        key: PermissionKeys.ROLES_MANAGEMENT_ALL_COMPANY,
        category: PermissionCategories.ROLES_MANAGEMENT,
        action: PermissionActions.ALL,
        scopes: [PermissionScopes.COMPANY],
        name: "Manage company roles",
        description: "Full management of roles within own company",
    },

    [PermissionKeys.ROLES_MANAGEMENT_VIEW_ALL]: {
        key: PermissionKeys.ROLES_MANAGEMENT_VIEW_ALL,
        category: PermissionCategories.ROLES_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.ALL],
        name: "View all roles",
        description: "Can view all roles across the company",
    },

    [PermissionKeys.ROLES_MANAGEMENT_VIEW_COMPANY]: {
        key: PermissionKeys.ROLES_MANAGEMENT_VIEW_COMPANY,
        category: PermissionCategories.ROLES_MANAGEMENT,
        action: PermissionActions.READ,
        scopes: [PermissionScopes.COMPANY],
        name: "View company roles",
        description: "Can view roles within own company",
    },
};
