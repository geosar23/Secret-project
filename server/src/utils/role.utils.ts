import { DefaultUserRoles } from "../enums/user-role.enum";

/**
 * Role display names
 */
export const ROLE_NAMES: Record<DefaultUserRoles, string> = {
    [DefaultUserRoles.GOD]: "God",
    [DefaultUserRoles.SUPER_ADMIN]: "Super Admin",
    [DefaultUserRoles.ADMIN]: "Admin",
    [DefaultUserRoles.HR]: "HR Manager",
    [DefaultUserRoles.MANAGER]: "Manager",
    [DefaultUserRoles.EMPLOYEE]: "Employee",
} as const;

/**
 * Role hierarchy configuration
 * Higher level includes all permissions of lower levels
 */
export const ROLE_HIERARCHY_CONFIG = {
    levels: [
        DefaultUserRoles.GOD,
        DefaultUserRoles.SUPER_ADMIN,
        DefaultUserRoles.ADMIN,
        DefaultUserRoles.HR,
        DefaultUserRoles.MANAGER,
        DefaultUserRoles.EMPLOYEE,
    ],
    hierarchy: {
        [DefaultUserRoles.GOD]: 6, // Highest
        [DefaultUserRoles.SUPER_ADMIN]: 5,
        [DefaultUserRoles.ADMIN]: 4,
        [DefaultUserRoles.HR]: 3,
        [DefaultUserRoles.MANAGER]: 2,
        [DefaultUserRoles.EMPLOYEE]: 1, // Lowest
    },
} as const;

/**
 * Role utility functions
 */
export class RoleUtils {
    /**
     * Get the display name for a role
     */
    static getRoleName(role: DefaultUserRoles): string {
        return ROLE_NAMES[role];
    }

    /**
     * Check if roleA is higher in hierarchy than roleB
     */
    static isHigherRole(roleA: DefaultUserRoles, roleB: DefaultUserRoles): boolean {
        return ROLE_HIERARCHY_CONFIG.hierarchy[roleA] > ROLE_HIERARCHY_CONFIG.hierarchy[roleB];
    }

    /**
     * Get all roles sorted by hierarchy (highest to lowest)
     */
    static getAllRolesSorted(): DefaultUserRoles[] {
        return [...ROLE_HIERARCHY_CONFIG.levels];
    }

    /**
     * Get hierarchy level for a role
     */
    static getRoleLevel(role: DefaultUserRoles): number {
        return ROLE_HIERARCHY_CONFIG.hierarchy[role];
    }

    /**
     * Check if role can manage another role (must be higher in hierarchy)
     */
    static canManageRole(managerRole: DefaultUserRoles, targetRole: DefaultUserRoles): boolean {
        return this.isHigherRole(managerRole, targetRole);
    }

    /**
     * Get all roles that a given role can manage (lower in hierarchy)
     */
    static getManagedRoles(role: DefaultUserRoles): DefaultUserRoles[] {
        const level = this.getRoleLevel(role);
        return ROLE_HIERARCHY_CONFIG.levels.filter(r => this.getRoleLevel(r) < level);
    }

    /**
     * Get all available roles with their metadata
     */
    static getAllRolesWithMetadata(): Array<{
        role: DefaultUserRoles;
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
