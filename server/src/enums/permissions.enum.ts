/* eslint-disable no-unused-vars */

import type { PermissionDefinition, PermissionKey } from "../interfaces/permission.interface";

export enum PermissionCategories {
    ALL = "*",
    USERS_MANAGEMENT = "usersManagement",
    COUNTRIES_MANAGEMENT = "countriesManagement",
    USER_PROFILE = "userProfile",
    ROLES_MANAGEMENT = "rolesManagement",
}

export const PermissionCategoriesStrings: Record<PermissionCategories, string> = {
    [PermissionCategories.ALL]: "All",
    [PermissionCategories.USERS_MANAGEMENT]: "Users Management",
    [PermissionCategories.COUNTRIES_MANAGEMENT]: "Countries Management",
    [PermissionCategories.USER_PROFILE]: "User Profile",
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
}

// ─── Permission factory ───────────────────────────────────────────────────────

/**
 * Convert a permission segment value to its uppercase key representation.
 *  "*"                  → "ALL"
 *  "department-country" → "DEPARTMENT_COUNTRY"
 *  "read"               → "READ"
 */
export type ToKeyPart<T extends string> = T extends "*"
    ? "ALL"
    : T extends "department-country"
      ? "DEPARTMENT_COUNTRY"
      : Uppercase<T>;

/**
 * Inverse of {@link ToKeyPart}: convert a key part back to the original segment
 * value.
 *  "ALL"                → "*"
 *  "DEPARTMENT_COUNTRY" → "department-country"
 *  "READ"               → "read"
 */
export type FromKeyPart<T extends string> = T extends "ALL"
    ? "*"
    : T extends "DEPARTMENT_COUNTRY"
      ? "department-country"
      : Lowercase<T>;

/**
 * The shape of the object returned by {@link definePermissions}.
 *
 * Each key is `${ActionKeyPart}_${ScopeKeyPart}` and its value is the precise
 * `"category:action:scope"` string for that exact combination — not a union.
 *
 * The `K extends \`${infer AK}_${infer SK}\`` conditional type is evaluated with
 * TypeScript's non-greedy (minimal) inference for the first segment: AK captures
 * everything up to the **first** underscore, and SK captures the remainder.
 * Because action key-parts (READ, ALL) never contain underscores this always
 * produces the correct action/scope split, including "department-country" →
 * DEPARTMENT_COUNTRY in the scope position.
 */
export type DefinedPermissions<
    TCategory extends string,
    TAction extends string,
    TScope extends string,
> = {
    readonly [K in `${ToKeyPart<TAction>}_${ToKeyPart<TScope>}`]: K extends `${infer AK}_${infer SK}`
        ? `${TCategory}:${Extract<TAction, FromKeyPart<AK>>}:${Extract<TScope, FromKeyPart<SK>>}`
        : never;
};

function toKeyPart(s: string): string {
    if (s === "*") return "ALL";
    return s.toUpperCase().replace(/-/g, "_");
}

/**
 * Generate a typed permission-key object for a given category.
 *
 * Instead of manually listing every `CATEGORY_ACTION_SCOPE` combination you
 * declare what a category supports and every key is produced automatically.
 *
 * @example
 * export const LEAVES_PERMISSIONS = definePermissions("leaves", {
 *   actions: ["read", "write", "approve"],
 *   scopes:  ["*", "company", "country", "managed", "self"],
 * });
 *
 * LEAVES_PERMISSIONS.READ_ALL        // "leaves:read:*"
 * LEAVES_PERMISSIONS.APPROVE_COUNTRY // "leaves:approve:country"
 * LEAVES_PERMISSIONS.WRITE_MANAGED   // "leaves:write:managed"
 */
export function definePermissions<
    const TCategory extends string,
    const TAction extends string,
    const TScope extends string,
>(
    category: TCategory,
    config: { actions: readonly TAction[]; scopes: readonly TScope[] },
): DefinedPermissions<TCategory, TAction, TScope> {
    const result: Record<string, string> = {};
    for (const action of config.actions) {
        for (const scope of config.scopes) {
            result[`${toKeyPart(action)}_${toKeyPart(scope)}`] = `${category}:${action}:${scope}`;
        }
    }
    return result as DefinedPermissions<TCategory, TAction, TScope>;
}

/**
 * Re-key every entry in `obj` by prepending `prefix_`.
 *
 * Used to assemble the flat {@link PermissionKeys} map from the per-category
 * objects produced by {@link definePermissions}.
 *
 * @example
 * prefixedKeys("USERS_MANAGEMENT", { READ_ALL: "usersManagement:read:*" })
 * // → { USERS_MANAGEMENT_READ_ALL: "usersManagement:read:*" }
 */
export function prefixedKeys<
    const TPrefix extends string,
    T extends Record<string, string>,
>(
    prefix: TPrefix,
    obj: T,
): { [K in keyof T as `${TPrefix}_${K & string}`]: T[K] } {
    return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [`${prefix}_${k}`, v]),
    ) as { [K in keyof T as `${TPrefix}_${K & string}`]: T[K] };
}

// ─── Per-category permission objects ─────────────────────────────────────────

/** All `usersManagement` permission keys. */
export const USERS_MANAGEMENT_PERMISSIONS = definePermissions(PermissionCategories.USERS_MANAGEMENT, {
    actions: [PermissionActions.READ, PermissionActions.ALL],
    scopes: [
        PermissionScopes.ALL,
        PermissionScopes.COMPANY,
        PermissionScopes.DEPARTMENT,
        PermissionScopes.COUNTRY,
        PermissionScopes.DEPARTMENT_COUNTRY,
        PermissionScopes.MANAGED,
        PermissionScopes.OWN,
        PermissionScopes.SELF,
    ],
});

/** All `countriesManagement` permission keys. */
export const COUNTRIES_MANAGEMENT_PERMISSIONS = definePermissions(
    PermissionCategories.COUNTRIES_MANAGEMENT,
    {
        actions: [PermissionActions.READ, PermissionActions.ALL],
        scopes: [PermissionScopes.ALL, PermissionScopes.COMPANY],
    },
);

/** All `userProfile` permission keys. */
export const USER_PROFILE_PERMISSIONS = definePermissions(PermissionCategories.USER_PROFILE, {
    actions: [PermissionActions.READ, PermissionActions.ALL],
    scopes: [
        PermissionScopes.ALL,
        PermissionScopes.COMPANY,
        PermissionScopes.DEPARTMENT,
        PermissionScopes.COUNTRY,
        PermissionScopes.DEPARTMENT_COUNTRY,
        PermissionScopes.MANAGED,
        PermissionScopes.OWN,
        PermissionScopes.SELF,
    ],
});

/** All `rolesManagement` permission keys. */
export const ROLES_MANAGEMENT_PERMISSIONS = definePermissions(PermissionCategories.ROLES_MANAGEMENT, {
    actions: [PermissionActions.READ, PermissionActions.ALL],
    scopes: [PermissionScopes.ALL, PermissionScopes.COMPANY],
});

// ─── Flat permission-key map (PermissionCategory:PermissionAction:PermissionScope) ──

//PermissionCategory:PermissionAction:PermissionScope
export const PermissionKeys = {
    ALL: `${PermissionCategories.ALL}:${PermissionActions.ALL}:${PermissionScopes.ALL}`,
    ALL_COMPANY: `${PermissionCategories.ALL}:${PermissionActions.ALL}:${PermissionScopes.COMPANY}`,

    ...prefixedKeys("USERS_MANAGEMENT", USERS_MANAGEMENT_PERMISSIONS),
    ...prefixedKeys("COUNTRIES_MANAGEMENT", COUNTRIES_MANAGEMENT_PERMISSIONS),
    ...prefixedKeys("USER_PROFILE", USER_PROFILE_PERMISSIONS),
    ...prefixedKeys("ROLES_MANAGEMENT", ROLES_MANAGEMENT_PERMISSIONS),

    // Legacy aliases: historically "rolesManagement" used "VIEW" instead of "READ".
    ROLES_MANAGEMENT_VIEW_ALL: ROLES_MANAGEMENT_PERMISSIONS.READ_ALL,
    ROLES_MANAGEMENT_VIEW_COMPANY: ROLES_MANAGEMENT_PERMISSIONS.READ_COMPANY,
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
