/* eslint-disable no-unused-vars */

export enum PermissionCategories {
    ALL = "*",
    USERS_MANAGEMENT = "usersManagement",
    USER_CREATE = "userCreate",
    COUNTRIES_MANAGEMENT = "countriesManagement",
    DEPARTMENTS_MANAGEMENT = "departmentsManagement",
    SUB_DEPARTMENTS_MANAGEMENT = "subDepartmentsManagement",
    EMPLOYMENT_TITLES_MANAGEMENT = "employmentTitlesManagement",
    LEVELS_MANAGEMENT = "levelsManagement",
    OFFICES_MANAGEMENT = "officesManagement",
    USER_PROFILE = "userProfile",
    USER_PROFILE_IDENTITY = "userProfile.identity",
    USER_PROFILE_CONTACT = "userProfile.contact",
    USER_PROFILE_EMPLOYMENT = "userProfile.employment",
    USER_PROFILE_EDUCATION = "userProfile.education",
    USER_PROFILE_COMPENSATION = "userProfile.compensation",
    ROLES_MANAGEMENT = "rolesManagement",
    RESET_PASSWORD = "resetPassword",
    REQUESTS = "requests",
    LEAVES = "leaves",
    LEAVE_BALANCES = "leaveBalances",
    LEAVE_SETTINGS_MANAGEMENT = "leaveSettingsManagement",
}

export const PermissionCategoriesStrings: Record<PermissionCategories, string> = {
    [PermissionCategories.ALL]: "All",
    [PermissionCategories.USERS_MANAGEMENT]: "Users Management",
    [PermissionCategories.USER_CREATE]: "Create User",
    [PermissionCategories.COUNTRIES_MANAGEMENT]: "Countries Management",
    [PermissionCategories.DEPARTMENTS_MANAGEMENT]: "Departments Management",
    [PermissionCategories.SUB_DEPARTMENTS_MANAGEMENT]: "Sub-Departments Management",
    [PermissionCategories.EMPLOYMENT_TITLES_MANAGEMENT]: "Employment Titles Management",
    [PermissionCategories.LEVELS_MANAGEMENT]: "Levels Management",
    [PermissionCategories.OFFICES_MANAGEMENT]: "Offices Management",
    [PermissionCategories.USER_PROFILE]: "User Profile",
    [PermissionCategories.USER_PROFILE_IDENTITY]: "User Profile – Identity",
    [PermissionCategories.USER_PROFILE_CONTACT]: "User Profile – Contact",
    [PermissionCategories.USER_PROFILE_EMPLOYMENT]: "User Profile – Employment",
    [PermissionCategories.USER_PROFILE_EDUCATION]: "User Profile – Education",
    [PermissionCategories.USER_PROFILE_COMPENSATION]: "User Profile – Compensation",
    [PermissionCategories.ROLES_MANAGEMENT]: "Roles Management",
    [PermissionCategories.RESET_PASSWORD]: "Reset Password",
    [PermissionCategories.REQUESTS]: "Requests",
    [PermissionCategories.LEAVES]: "Leaves",
    [PermissionCategories.LEAVE_BALANCES]: "Leave Balances",
    [PermissionCategories.LEAVE_SETTINGS_MANAGEMENT]: "Leave Settings Management",
};

export enum PermissionScopes {
    ALL = "*",
    DEPARTMENT = "department",
    COUNTRY = "country",
    DEPARTMENT_COUNTRY = "department-country",
    MANAGED = "managed",
    SELF = "self",
}

export enum PermissionActions {
    READ = "read",
    WRITE = "write",
    APPROVE = "approve",
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
 * `"category:action:scope"` string for that exact combination – not a union.
 *
 * The `K extends \`${infer AK}_${infer SK}\`` conditional type is evaluated with
 * TypeScript's non-greedy (minimal) inference for the first segment: AK captures
 * everything up to the **first** underscore, and SK captures the remainder.
 * Because action key-parts (READ, ALL) never contain underscores this always
 * produces the correct action/scope split, including "department-country" →
 * DEPARTMENT_COUNTRY in the scope position.
 */
export type DefinedPermissions<TCategory extends string, TAction extends string, TScope extends string> = {
    readonly [K in `${ToKeyPart<TAction>}_${ToKeyPart<TScope>}`]: K extends `${infer AK}_${infer SK}`
        ? `${TCategory}:${Extract<TAction, FromKeyPart<AK>>}:${Extract<TScope, FromKeyPart<SK>>}`
        : never;
};

function toKeyPart(s: string): string {
    if (s === "*") {
        return "ALL";
    }
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
 *   scopes:  ["*", "country", "managed", "self"],
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
export function prefixedKeys<const TPrefix extends string, T extends Record<string, string>>(
    prefix: TPrefix,
    obj: T,
): { [K in keyof T as `${TPrefix}_${K & string}`]: T[K] } {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [`${prefix}_${k}`, v])) as {
        [K in keyof T as `${TPrefix}_${K & string}`]: T[K];
    };
}

// ─── Per-category permission objects ─────────────────────────────────────────

/** All `usersManagement` permission keys — read/list and write/edit existing users. */
export const USERS_MANAGEMENT_PERMISSIONS = definePermissions(PermissionCategories.USERS_MANAGEMENT, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [
        PermissionScopes.ALL,
        PermissionScopes.DEPARTMENT,
        PermissionScopes.COUNTRY,
        PermissionScopes.DEPARTMENT_COUNTRY,
        PermissionScopes.MANAGED,
        PermissionScopes.SELF,
    ],
});

/** All `userCreate` permission keys — write access for creating new users. */
export const USER_CREATE_PERMISSIONS = definePermissions(PermissionCategories.USER_CREATE, {
    actions: [PermissionActions.WRITE],
    scopes: [
        PermissionScopes.ALL,
        PermissionScopes.DEPARTMENT,
        PermissionScopes.COUNTRY,
        PermissionScopes.DEPARTMENT_COUNTRY,
        PermissionScopes.MANAGED,
    ],
});

/** All `countriesManagement` permission keys. */
export const COUNTRIES_MANAGEMENT_PERMISSIONS = definePermissions(PermissionCategories.COUNTRIES_MANAGEMENT, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [PermissionScopes.ALL],
});

/** All `departmentsManagement` permission keys. */
export const DEPARTMENTS_MANAGEMENT_PERMISSIONS = definePermissions(PermissionCategories.DEPARTMENTS_MANAGEMENT, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [PermissionScopes.ALL],
});

/** All `subDepartmentsManagement` permission keys. */
export const SUB_DEPARTMENTS_MANAGEMENT_PERMISSIONS = definePermissions(
    PermissionCategories.SUB_DEPARTMENTS_MANAGEMENT,
    {
        actions: [PermissionActions.READ, PermissionActions.WRITE],
        scopes: [PermissionScopes.ALL],
    },
);

/** All `employmentTitlesManagement` permission keys. */
export const EMPLOYMENT_TITLES_MANAGEMENT_PERMISSIONS = definePermissions(
    PermissionCategories.EMPLOYMENT_TITLES_MANAGEMENT,
    {
        actions: [PermissionActions.READ, PermissionActions.WRITE],
        scopes: [PermissionScopes.ALL],
    },
);

/** All `levelsManagement` permission keys. */
export const LEVELS_MANAGEMENT_PERMISSIONS = definePermissions(PermissionCategories.LEVELS_MANAGEMENT, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [PermissionScopes.ALL],
});

/** All `officesManagement` permission keys. */
export const OFFICES_MANAGEMENT_PERMISSIONS = definePermissions(PermissionCategories.OFFICES_MANAGEMENT, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [PermissionScopes.ALL],
});

/** All `userProfile` permission keys. */
export const USER_PROFILE_PERMISSIONS = definePermissions(PermissionCategories.USER_PROFILE, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [
        PermissionScopes.ALL,
        PermissionScopes.DEPARTMENT,
        PermissionScopes.COUNTRY,
        PermissionScopes.DEPARTMENT_COUNTRY,
        PermissionScopes.MANAGED,
        PermissionScopes.SELF,
    ],
});

/** All `userProfile.identity` permission keys. */
export const USER_PROFILE_IDENTITY_PERMISSIONS = definePermissions(PermissionCategories.USER_PROFILE_IDENTITY, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [
        PermissionScopes.ALL,
        PermissionScopes.DEPARTMENT,
        PermissionScopes.COUNTRY,
        PermissionScopes.DEPARTMENT_COUNTRY,
        PermissionScopes.MANAGED,
        PermissionScopes.SELF,
    ],
});

/** All `userProfile.contact` permission keys. */
export const USER_PROFILE_CONTACT_PERMISSIONS = definePermissions(PermissionCategories.USER_PROFILE_CONTACT, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [
        PermissionScopes.ALL,
        PermissionScopes.DEPARTMENT,
        PermissionScopes.COUNTRY,
        PermissionScopes.DEPARTMENT_COUNTRY,
        PermissionScopes.MANAGED,
        PermissionScopes.SELF,
    ],
});

/** All `userProfile.employment` permission keys. */
export const USER_PROFILE_EMPLOYMENT_PERMISSIONS = definePermissions(PermissionCategories.USER_PROFILE_EMPLOYMENT, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [
        PermissionScopes.ALL,
        PermissionScopes.DEPARTMENT,
        PermissionScopes.COUNTRY,
        PermissionScopes.DEPARTMENT_COUNTRY,
        PermissionScopes.MANAGED,
        PermissionScopes.SELF,
    ],
});

/** All `userProfile.education` permission keys. */
export const USER_PROFILE_EDUCATION_PERMISSIONS = definePermissions(PermissionCategories.USER_PROFILE_EDUCATION, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [
        PermissionScopes.ALL,
        PermissionScopes.DEPARTMENT,
        PermissionScopes.COUNTRY,
        PermissionScopes.DEPARTMENT_COUNTRY,
        PermissionScopes.MANAGED,
        PermissionScopes.SELF,
    ],
});

/** All `userProfile.compensation` permission keys. */
export const USER_PROFILE_COMPENSATION_PERMISSIONS = definePermissions(PermissionCategories.USER_PROFILE_COMPENSATION, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [
        PermissionScopes.ALL,
        PermissionScopes.DEPARTMENT,
        PermissionScopes.COUNTRY,
        PermissionScopes.DEPARTMENT_COUNTRY,
        PermissionScopes.MANAGED,
        PermissionScopes.SELF,
    ],
});

/** All `rolesManagement` permission keys. */
export const ROLES_MANAGEMENT_PERMISSIONS = definePermissions(PermissionCategories.ROLES_MANAGEMENT, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [PermissionScopes.ALL],
});

/** All `resetPassword` permission keys. */
export const RESET_PASSWORD_PERMISSIONS = definePermissions(PermissionCategories.RESET_PASSWORD, {
    actions: [PermissionActions.WRITE],
    scopes: [
        PermissionScopes.ALL,
        PermissionScopes.DEPARTMENT,
        PermissionScopes.COUNTRY,
        PermissionScopes.DEPARTMENT_COUNTRY,
        PermissionScopes.MANAGED,
        PermissionScopes.SELF,
    ],
});

const ALL_SCOPES = [
    PermissionScopes.ALL,
    PermissionScopes.DEPARTMENT,
    PermissionScopes.COUNTRY,
    PermissionScopes.DEPARTMENT_COUNTRY,
    PermissionScopes.MANAGED,
    PermissionScopes.SELF,
] as const;

const SCOPES_BEYOND_SELF = [
    PermissionScopes.ALL,
    PermissionScopes.DEPARTMENT,
    PermissionScopes.COUNTRY,
    PermissionScopes.DEPARTMENT_COUNTRY,
    PermissionScopes.MANAGED,
] as const;

/** All `requests` permission keys — viewing other people's requests (own requests need no permission). */
export const REQUESTS_PERMISSIONS = definePermissions(PermissionCategories.REQUESTS, {
    actions: [PermissionActions.READ],
    scopes: SCOPES_BEYOND_SELF,
});

/** All `leaves` read/write keys — visibility and submission (write beyond self = on behalf of others). */
export const LEAVES_PERMISSIONS = definePermissions(PermissionCategories.LEAVES, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: ALL_SCOPES,
});

/** All `leaves` approve keys — approval authority, rechecked at decision time. */
export const LEAVES_APPROVE_PERMISSIONS = definePermissions(PermissionCategories.LEAVES, {
    actions: [PermissionActions.APPROVE],
    scopes: SCOPES_BEYOND_SELF,
});

/** All `leaveBalances` read keys. */
export const LEAVE_BALANCES_READ_PERMISSIONS = definePermissions(PermissionCategories.LEAVE_BALANCES, {
    actions: [PermissionActions.READ],
    scopes: ALL_SCOPES,
});

/** All `leaveBalances` write keys — manual ledger adjustments and entitlement runs. */
export const LEAVE_BALANCES_WRITE_PERMISSIONS = definePermissions(PermissionCategories.LEAVE_BALANCES, {
    actions: [PermissionActions.WRITE],
    scopes: [PermissionScopes.ALL],
});

/** All `leaveSettingsManagement` keys — leave types, policies and work schedules. */
export const LEAVE_SETTINGS_MANAGEMENT_PERMISSIONS = definePermissions(PermissionCategories.LEAVE_SETTINGS_MANAGEMENT, {
    actions: [PermissionActions.READ, PermissionActions.WRITE],
    scopes: [PermissionScopes.ALL],
});

// ─── Flat permission-key map (PermissionCategory:PermissionAction:PermissionScope) ──

//PermissionCategory:PermissionAction:PermissionScope
export const PermissionKeys = {
    ALL: "*:*:*",
    ...prefixedKeys("USERS_MANAGEMENT", USERS_MANAGEMENT_PERMISSIONS),
    ...prefixedKeys("USER_CREATE", USER_CREATE_PERMISSIONS),
    ...prefixedKeys("COUNTRIES_MANAGEMENT", COUNTRIES_MANAGEMENT_PERMISSIONS),
    ...prefixedKeys("DEPARTMENTS_MANAGEMENT", DEPARTMENTS_MANAGEMENT_PERMISSIONS),
    ...prefixedKeys("SUB_DEPARTMENTS_MANAGEMENT", SUB_DEPARTMENTS_MANAGEMENT_PERMISSIONS),
    ...prefixedKeys("EMPLOYMENT_TITLES_MANAGEMENT", EMPLOYMENT_TITLES_MANAGEMENT_PERMISSIONS),
    ...prefixedKeys("LEVELS_MANAGEMENT", LEVELS_MANAGEMENT_PERMISSIONS),
    ...prefixedKeys("OFFICES_MANAGEMENT", OFFICES_MANAGEMENT_PERMISSIONS),
    ...prefixedKeys("USER_PROFILE", USER_PROFILE_PERMISSIONS),
    ...prefixedKeys("USER_PROFILE_IDENTITY", USER_PROFILE_IDENTITY_PERMISSIONS),
    ...prefixedKeys("USER_PROFILE_CONTACT", USER_PROFILE_CONTACT_PERMISSIONS),
    ...prefixedKeys("USER_PROFILE_EMPLOYMENT", USER_PROFILE_EMPLOYMENT_PERMISSIONS),
    ...prefixedKeys("USER_PROFILE_EDUCATION", USER_PROFILE_EDUCATION_PERMISSIONS),
    ...prefixedKeys("USER_PROFILE_COMPENSATION", USER_PROFILE_COMPENSATION_PERMISSIONS),
    ...prefixedKeys("ROLES_MANAGEMENT", ROLES_MANAGEMENT_PERMISSIONS),
    ...prefixedKeys("RESET_PASSWORD", RESET_PASSWORD_PERMISSIONS),
    ...prefixedKeys("REQUESTS", REQUESTS_PERMISSIONS),
    ...prefixedKeys("LEAVES", LEAVES_PERMISSIONS),
    ...prefixedKeys("LEAVES", LEAVES_APPROVE_PERMISSIONS),
    ...prefixedKeys("LEAVE_BALANCES", LEAVE_BALANCES_READ_PERMISSIONS),
    ...prefixedKeys("LEAVE_BALANCES", LEAVE_BALANCES_WRITE_PERMISSIONS),
    ...prefixedKeys("LEAVE_SETTINGS_MANAGEMENT", LEAVE_SETTINGS_MANAGEMENT_PERMISSIONS),
} as const;
