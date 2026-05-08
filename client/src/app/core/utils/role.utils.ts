import { UserRole } from "../enums/user-role.enum";

/**
 * Role display names
 */
export const ROLE_NAMES: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: "Super Admin",
    [UserRole.ADMIN]: "Admin",
    [UserRole.HR]: "HR Manager",
    [UserRole.MANAGER]: "Manager",
    [UserRole.EMPLOYEE]: "Employee",
} as const;

/**
 * Role colors for UI display
 */
export const ROLE_COLORS: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: "#e74b48ff",
    [UserRole.ADMIN]: "#eb8d36ff",
    [UserRole.HR]: "#4ea8e4ff",
    [UserRole.MANAGER]: "#48db85ff",
    [UserRole.EMPLOYEE]: "#6b6d6dff",
} as const;

/**
 * Role hierarchy configuration
 * Higher level includes all permissions of lower levels
 */
export const ROLE_HIERARCHY_CONFIG = {
    levels: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE],
    hierarchy: {
        [UserRole.SUPER_ADMIN]: 5,
        [UserRole.ADMIN]: 4,
        [UserRole.HR]: 3,
        [UserRole.MANAGER]: 2,
        [UserRole.EMPLOYEE]: 1,
    },
} as const;

/**
 * Role utility functions
 */
export class RoleUtils {
    /**
     * Get the color associated with a role
     */
    static getRoleColor(role: string): string {
        const normalizedRole = role as UserRole;
        return ROLE_COLORS[normalizedRole] || "gray";
    }

    /**
     * Get the display name for a role
     */
    static getRoleName(role: string): string {
        const normalizedRole = role as UserRole;
        return ROLE_NAMES[normalizedRole] || role;
    }

    /**
     * Check if roleA is higher in hierarchy than roleB
     */
    static isHigherRole(roleA: string, roleB: string): boolean {
        const levelA = ROLE_HIERARCHY_CONFIG.hierarchy[roleA.toUpperCase() as UserRole] || 0;
        const levelB = ROLE_HIERARCHY_CONFIG.hierarchy[roleB.toUpperCase() as UserRole] || 0;
        return levelA > levelB;
    }

    /**
     * Get all roles sorted by hierarchy (highest to lowest)
     */
    static getAllRolesSorted(): UserRole[] {
        return [...ROLE_HIERARCHY_CONFIG.levels];
    }

    /**
     * Get all available roles with their colors and names
     */
    static getAllRolesWithMetadata(): Array<{
        role: UserRole;
        name: string;
        color: string;
        level: number;
    }> {
        return ROLE_HIERARCHY_CONFIG.levels.map(role => ({
            role,
            name: ROLE_NAMES[role],
            color: ROLE_COLORS[role],
            level: ROLE_HIERARCHY_CONFIG.hierarchy[role],
        }));
    }
}
