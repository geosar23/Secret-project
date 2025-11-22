/**
 * Role utility functions
 */

export class RoleUtils {
    private static readonly ROLE_COLORS: Record<string, string> = {
        GOD: "purple",
        SUPER_ADMIN: "red",
        ADMIN: "orange",
        HR: "blue",
        MANAGER: "green",
        EMPLOYEE: "gray",
    };

    /**
     * Get the color associated with a role
     */
    static getRoleColor(role: string): string {
        const normalizedRole = role.toUpperCase();
        return this.ROLE_COLORS[normalizedRole] || "gray";
    }

    /**
     * Get all available roles with their colors
     */
    static getAllRolesWithColors(): Array<{ role: string; color: string }> {
        return Object.entries(this.ROLE_COLORS).map(([role, color]) => ({ role, color }));
    }
}
