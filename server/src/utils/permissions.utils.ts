 
/**
 * Permission structure: category:action:scope
 *
 * Examples:
 * - users:view:* - View all users across all companies (GOD only)
 * - users:view:company - View users in your company
 * - requests.leaves:approve:department - Approve leaves in your department
 * - requests.leaves:view:user - View your own leave requests
 *
 * Scopes:
 * - * : All companies (GOD only)
 * - company: User's company
 * - department: User's department
 * - user: User themselves
 */

// import { IPermission } from "../interfaces/permission.interface";
// // import { PermissionModel } from "../models/permission.model";
// import { PermissionActions, PermissionCategories, PermissionScopes } from "../enums/permissions.enum";

export const PERMISSIONS = {
    // User Management
    USERS: {
        VIEW_ALL: "users:view:*",
        VIEW_COMPANY: "users:view:company",
        CREATE: "users:create:company",
        EDIT_ALL: "users:edit:*",
        EDIT_COMPANY: "users:edit:company",
        DELETE: "users:delete:company",
        ASSIGN_ROLES: "users:assign_roles:company",
    },

    // Department Management
    DEPARTMENTS: {
        VIEW_ALL: "departments:view:*",
        VIEW_COMPANY: "departments:view:company",
        CREATE: "departments:create:company",
        EDIT: "departments:edit:company",
        DELETE: "departments:delete:company",
    },

    // Company Management
    COMPANIES: {
        VIEW_ALL: "companies:view:*",
        VIEW_OWN: "companies:view:company",
        CREATE: "companies:create:*",
        EDIT_ALL: "companies:edit:*",
        EDIT_OWN: "companies:edit:company",
        DELETE: "companies:delete:*",
    },

    // Countries Management
    COUNTRIES: {
        VIEW: "countries:view:*",
        CREATE: "countries:create:*",
        EDIT: "countries:edit:*",
        DELETE: "countries:delete:*",
    },

    // Employment Titles
    EMPLOYMENT_TITLES: {
        VIEW: "employment_titles:view:company",
        CREATE: "employment_titles:create:company",
        EDIT: "employment_titles:edit:company",
        DELETE: "employment_titles:delete:company",
    },

    // Employment Types
    EMPLOYMENT_TYPES: {
        VIEW: "employment_types:view:company",
        CREATE: "employment_types:create:company",
        EDIT: "employment_types:edit:company",
        DELETE: "employment_types:delete:company",
    },

    // Settings
    SETTINGS: {
        VIEW_COMPANY: "settings:view:company",
        EDIT_COMPANY: "settings:edit:company",
    },

    // Permissions Management
    PERMISSIONS: {
        VIEW: "permissions:view:*",
        CREATE: "permissions:create:*",
        EDIT: "permissions:edit:*",
        DELETE: "permissions:delete:*",
    },

    // Roles Management
    ROLES: {
        VIEW_ALL: "roles:view:*",
        VIEW_COMPANY: "roles:view:company",
        CREATE: "roles:create:company",
        EDIT_ALL: "roles:edit:*",
        EDIT_COMPANY: "roles:edit:company",
        DELETE: "roles:delete:company",
    },

    // // Requests to be implemented in the feature
    // REQUESTS: {
    //     VIEW_ALL: "requests.leaves:view:*",
    //     VIEW_COMPANY: "requests.leaves:view:company",
    //     VIEW_DEPARTMENT: "requests.leaves:view:department",
    //     VIEW_OWN: "requests.leaves:view:user",
    //     CREATE_OWN: "requests.leaves:create:user",
    //     APPROVE_ALL: "requests.leaves:approve:*",
    //     APPROVE_COMPANY: "requests.leaves:approve:company",
    //     APPROVE_DEPARTMENT: "requests.leaves:approve:department",
    //     REJECT_ALL: "requests.leaves:reject:*",
    //     REJECT_COMPANY: "requests.leaves:reject:company",
    //     REJECT_DEPARTMENT: "requests.leaves:reject:department",
    //     CANCEL_ANY: "requests.leaves:cancel:company",
    //     CANCEL_OWN: "requests.leaves:cancel:user",
    // },
} as const;

// Map permission key categories to PermissionCategories enum
// const CATEGORY_MAP: Record<string, PermissionCategories> = {
//     'Users Management': PermissionCategories.USERS_MANAGEMENT,
// };

// -----------------------------
// Generate DB-ready permission docs from PERMISSIONS object
// function generatePermissionDocs() {
//     const docs: Partial<IPermission>[] = [];

//     for (const categoryKey of Object.keys(PERMISSIONS)) {
//         const permissions = PERMISSIONS[categoryKey as keyof typeof PERMISSIONS];

//         for (const permKey of Object.keys(permissions)) {
//             const key = permissions[permKey as keyof typeof permissions] as string;
//             const [categoryStr, action, scope] = key.split(":");
//             const category = CATEGORY_MAP[categoryStr];

//             if (!category) {
//                 console.warn(`Unknown category: ${categoryStr} for permission: ${key}`);
//                 continue;
//             }

//             docs.push({
//                 key,
//                 name: toReadableName(permKey),
//                 description: generateDescription(categoryStr, action, scope),
//                 category,
//                 isActive: true,
//             });
//         }
//     }

//     return docs;
// }

// function generatePermissionDoc2() {
//     const docs: Partial<IPermission>[] = [];
//     for (const category of Object.values(PermissionCategories)) {
//         for (const scope of Object.values(PermissionScopes)) {
//             for (const action of Object.values(PermissionActions)) {
//                 const key = `${category}:${action}:${scope}`;
//                 const name = toReadableName(key);
//                 const description = `Allows user to ${action} on ${category} with ${scope} scope.`;
//                 docs.push({
//                     key,
//                     name,
//                     description,
//                     category,
//                     scope,
//                     action,
//                     isActive: true,
//                 });
//             }
//         }
//     }

//     return docs;
// }

// function generateDescription(category: string, action: string, scope: string): string {
//     const scopeDesc = scope === "*" ? "all" : scope;
//     return `Allows user to ${action} ${category} with ${scopeDesc} scope`;
// }

// function toReadableName(key: string): string {
//     return key
//         .split("_")
//         .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//         .join(" ");
// }
