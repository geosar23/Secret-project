import { UserRole } from "../enums/user-role.enum";

/**
 * Role display names
 */
export const ROLE_NAMES: Record<UserRole, string> = {
    [UserRole.GOD]: "God",
    [UserRole.SUPER_ADMIN]: "Super Admin",
    [UserRole.ADMIN]: "Admin",
    [UserRole.HR]: "HR Manager",
    [UserRole.MANAGER]: "Manager",
    [UserRole.EMPLOYEE]: "Employee",
} as const;

/**
 * Role hierarchy configuration
 * Higher level includes all permissions of lower levels
 */
export const ROLE_HIERARCHY_CONFIG = {
    levels: [
        UserRole.GOD,
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.HR,
        UserRole.MANAGER,
        UserRole.EMPLOYEE,
    ],
    hierarchy: {
        [UserRole.GOD]: 6, // Highest
        [UserRole.SUPER_ADMIN]: 5,
        [UserRole.ADMIN]: 4,
        [UserRole.HR]: 3,
        [UserRole.MANAGER]: 2,
        [UserRole.EMPLOYEE]: 1, // Lowest
    },
} as const;

/**
 * Role utility functions
 */
export class RoleUtils {
    /**
     * Get the display name for a role
     */
    static getRoleName(role: UserRole): string {
        return ROLE_NAMES[role];
    }

    /**
     * Check if roleA is higher in hierarchy than roleB
     */
    static isHigherRole(roleA: UserRole, roleB: UserRole): boolean {
        return ROLE_HIERARCHY_CONFIG.hierarchy[roleA] > ROLE_HIERARCHY_CONFIG.hierarchy[roleB];
    }

    /**
     * Get all roles sorted by hierarchy (highest to lowest)
     */
    static getAllRolesSorted(): UserRole[] {
        return [...ROLE_HIERARCHY_CONFIG.levels];
    }

    /**
     * Get hierarchy level for a role
     */
    static getRoleLevel(role: UserRole): number {
        return ROLE_HIERARCHY_CONFIG.hierarchy[role];
    }

    /**
     * Check if role can manage another role (must be higher in hierarchy)
     */
    static canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
        return this.isHigherRole(managerRole, targetRole);
    }

    /**
     * Get all roles that a given role can manage (lower in hierarchy)
     */
    static getManagedRoles(role: UserRole): UserRole[] {
        const level = this.getRoleLevel(role);
        return ROLE_HIERARCHY_CONFIG.levels.filter(r => this.getRoleLevel(r) < level);
    }

    /**
     * Get all available roles with their metadata
     */
    static getAllRolesWithMetadata(): Array<{
        role: UserRole;
        name: string;
        level: number;
    }> {
        return ROLE_HIERARCHY_CONFIG.levels.map(role => ({
            role,
            name: ROLE_NAMES[role],
            level: ROLE_HIERARCHY_CONFIG.hierarchy[role],
        }));
    }
}
