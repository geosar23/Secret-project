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
    [PermissionCategories.USER_PROFILE_IDENTITY]: "User Profile â€” Identity",
    [PermissionCategories.USER_PROFILE_CONTACT]: "User Profile â€” Contact",
    [PermissionCategories.USER_PROFILE_EMPLOYMENT]: "User Profile â€” Employment",
    [PermissionCategories.USER_PROFILE_EDUCATION]: "User Profile â€” Education",
    [PermissionCategories.USER_PROFILE_COMPENSATION]: "User Profile â€” Compensation",
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

// â”€â”€â”€ Permission factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Convert a permission segment value to its uppercase key representation.
 *  "*"                  â†’ "ALL"
 *  "department-country" â†’ "DEPARTMENT_COUNTRY"
 *  "read"               â†’ "READ"
 */
export type ToKeyPart<T extends string> = T extends "*"
    ? "ALL"
    : T extends "department-country"
      ? "DEPARTMENT_COUNTRY"
      : Uppercase<T>;

/**
 * Inverse of {@link ToKeyPart}: convert a key part back to the original segment
 * value.
 *  "ALL"                â†’ "*"
 *  "DEPARTMENT_COUNTRY" â†’ "department-country"
 *  "READ"               â†’ "read"
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
 * `"category:action:scope"` string for that exact combination â€” not a union.
 *
 * The `K extends \`${infer AK}_${infer SK}\`` conditional type is evaluated with
 * TypeScript's non-greedy (minimal) inference for the first segment: AK captures
 * everything up to the **first** underscore, and SK captures the remainder.
 * Because action key-parts (READ, ALL) never contain underscores this always
 * produces the correct action/scope split, including "department-country" â†’
 * DEPARTMENT_COUNTRY in the scope position.
 */
export type DefinedPermissions<TCategory extends string, TAction extends string, TScope extends string> = {
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
 * // â†’ { USERS_MANAGEMENT_READ_ALL: "usersManagement:read:*" }
 */
export function prefixedKeys<const TPrefix extends string, T extends Record<string, string>>(
    prefix: TPrefix,
    obj: T,
): { [K in keyof T as `${TPrefix}_${K & string}`]: T[K] } {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [`${prefix}_${k}`, v])) as {
        [K in keyof T as `${TPrefix}_${K & string}`]: T[K];
    };
}

// â”€â”€â”€ Per-category permission objects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
export const COUNTRIES_MANAGEMENT_PERMISSIONS = definePermissions(PermissionCategories.COUNTRIES_MANAGEMENT, {
    actions: [PermissionActions.READ, PermissionActions.ALL],
    scopes: [PermissionScopes.ALL, PermissionScopes.COMPANY],
});

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

// â”€â”€â”€ Flat permission-key map (PermissionCategory:PermissionAction:PermissionScope) â”€â”€

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
