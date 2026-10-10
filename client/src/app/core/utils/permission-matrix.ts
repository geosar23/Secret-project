import { PermissionCategories, PermissionKeys, PermissionScopes } from "../enums/permissions.enum";
import { hasPermission } from "./permission.utils";

export type MatrixAction = "read" | "write";

export const MATRIX_ACTIONS: readonly MatrixAction[] = ["read", "write"];

/** Scopes ordered from widest to narrowest. */
export const SCOPE_ORDER: PermissionScopes[] = [
    PermissionScopes.ALL,
    PermissionScopes.DEPARTMENT_COUNTRY,
    PermissionScopes.DEPARTMENT,
    PermissionScopes.COUNTRY,
    PermissionScopes.MANAGED,
    PermissionScopes.SELF,
];

export const SCOPE_LABELS: Record<PermissionScopes, string> = {
    [PermissionScopes.ALL]: "All",
    [PermissionScopes.DEPARTMENT_COUNTRY]: "Dept + Country",
    [PermissionScopes.DEPARTMENT]: "Dept",
    [PermissionScopes.COUNTRY]: "Country",
    [PermissionScopes.MANAGED]: "Managed",
    [PermissionScopes.SELF]: "Self",
};

export const AREA_GROUPS: { label: string; categories: PermissionCategories[] }[] = [
    {
        label: "Users",
        categories: [
            PermissionCategories.USERS_MANAGEMENT,
            PermissionCategories.USER_CREATE,
            PermissionCategories.RESET_PASSWORD,
        ],
    },
    {
        label: "User profile",
        categories: [
            PermissionCategories.USER_PROFILE_IDENTITY,
            PermissionCategories.USER_PROFILE_CONTACT,
            PermissionCategories.USER_PROFILE_EMPLOYMENT,
            PermissionCategories.USER_PROFILE_EDUCATION,
            PermissionCategories.USER_PROFILE_COMPENSATION,
        ],
    },
    {
        label: "Organization",
        categories: [
            PermissionCategories.COUNTRIES_MANAGEMENT,
            PermissionCategories.DEPARTMENTS_MANAGEMENT,
            PermissionCategories.SUB_DEPARTMENTS_MANAGEMENT,
            PermissionCategories.EMPLOYMENT_TITLES_MANAGEMENT,
            PermissionCategories.LEVELS_MANAGEMENT,
            PermissionCategories.OFFICES_MANAGEMENT,
        ],
    },
    { label: "Access", categories: [PermissionCategories.ROLES_MANAGEMENT] },
    {
        // `leaves:approve:*` keys are not a matrix column yet; the editors keep them as extra permissions.
        label: "Time off",
        categories: [
            PermissionCategories.REQUESTS,
            PermissionCategories.LEAVES,
            PermissionCategories.LEAVE_BALANCES,
            PermissionCategories.LEAVE_SETTINGS_MANAGEMENT,
        ],
    },
];

/** category → action → scopes that exist for it, derived from the permission key map. */
export const SUPPORTED_SCOPES = new Map<string, Record<MatrixAction, PermissionScopes[]>>();
Object.values(PermissionKeys).forEach(key => {
    const [category, action, scope] = key.split(":");
    if (action !== "read" && action !== "write") {
        return;
    }
    const entry = SUPPORTED_SCOPES.get(category) ?? { read: [], write: [] };
    entry[action].push(scope as PermissionScopes);
    SUPPORTED_SCOPES.set(category, entry);
});

/** Every concrete `category:action:scope` key shown in the permission matrix. */
export const LEAF_KEYS: string[] = AREA_GROUPS.flatMap(g => g.categories).flatMap(category => {
    const supported = SUPPORTED_SCOPES.get(category);
    return MATRIX_ACTIONS.flatMap(action => (supported?.[action] ?? []).map(scope => `${category}:${action}:${scope}`));
});

const LEAF_KEY_SET = new Set(LEAF_KEYS);

export const isLeafKey = (key: string): boolean => LEAF_KEY_SET.has(key);

/** How many matrix permissions a list of (possibly wildcard) permission strings grants. */
export const countGrantedLeaf = (permissions: readonly string[] = []): number =>
    LEAF_KEYS.filter(key => hasPermission([...permissions], key)).length;
