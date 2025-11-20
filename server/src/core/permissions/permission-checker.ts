import { IUser } from "../../interfaces/user.interface";
import { UserRole } from "./roles.enum";
import { ROLE_PERMISSIONS } from "./role-permissions";
import { SCOPE_HANDLERS, AccessContext } from "./attribute-rules";

/**
 * PermissionChecker handles all permission evaluation logic
 * Supports RBAC, ABAC, custom grants, and permission revocation
 */
export class PermissionChecker {
    /**
     * Check if user has permission to perform an action on a resource
     * @param user The user requesting access
     * @param permission Permission string (e.g., "employees:edit:managed")
     * @param resource Optional resource being accessed (for ABAC)
     * @returns true if access is granted, false otherwise
     */
    static canAccess(
        user: IUser,
        permission: string,
        resource?: Record<string, unknown>
    ): boolean {
        // 1. GOD role bypasses all checks
        if (user.role === UserRole.GOD) {
            return true;
        }

        // 2. Check if permission is explicitly revoked
        if (user.revokedPermissions?.includes(permission)) {
            return false;
        }

        // 3. Check custom granted permissions (with expiration)
        if (user.grantedPermissions) {
            const grant = user.grantedPermissions.find(
                (g) => g.permission === permission
            );
            if (grant) {
                // Check if grant has expired
                if (grant.expiresAt && new Date(grant.expiresAt) < new Date()) {
                    return false; // Expired
                }
                // Check scope if resource provided
                if (resource && grant.scope) {
                    return this.checkScope(user, resource, grant.scope);
                }
                return true; // Valid grant
            }
        }

        // 4. Check role-based permissions
        const rolePermissions = ROLE_PERMISSIONS[user.role] || [];

        // Check for wildcard permission
        if (rolePermissions.includes("*")) {
            return true;
        }

        // Check if permission matches role permissions
        for (const rolePermission of rolePermissions) {
            if (this.matchesPermission(permission, rolePermission)) {
                // If resource provided and permission has scope, check attribute rules
                if (resource) {
                    return this.checkAttributeBasedAccess(
                        user,
                        permission,
                        resource
                    );
                }
                return true;
            }
        }

        // 5. Multi-tenant isolation check
        // Even with permission, users can only access resources in their company
        if (resource && user.companyId && resource.companyId) {
            // GOD role can access any company (already checked above)
            if (user.companyId !== resource.companyId) {
                return false;
            }
        }

        return false; // No permission found
    }

    /**
     * Check if permission pattern matches role permission
     * Supports wildcards like "employees:*" or "employees:view:*"
     */
    private static matchesPermission(
        permission: string,
        rolePermission: string
    ): boolean {
        if (rolePermission === "*") return true;
        if (permission === rolePermission) return true;

        // Handle wildcards
        const roleParts = rolePermission.split(":");
        const permParts = permission.split(":");

        if (roleParts.length !== permParts.length) {
            return false;
        }

        return roleParts.every(
            (part, index) => part === "*" || part === permParts[index]
        );
    }

    /**
     * Check attribute-based access using scope rules
     */
    private static checkAttributeBasedAccess(
        user: IUser,
        permission: string,
        resource: Record<string, unknown>
    ): boolean {
        // Extract scope from permission (e.g., "employees:edit:managed" -> "managed")
        const parts = permission.split(":");
        const scope = parts[parts.length - 1];

        // If no specific scope, grant access
        if (!scope || scope === "all") {
            return true;
        }

        // Check scope using attribute rules
        return this.checkScope(user, resource, scope);
    }

    /**
     * Evaluate scope against attribute rules
     */
    private static checkScope(
        user: IUser,
        resource: Record<string, unknown>,
        scope: string
    ): boolean {
        const scopeHandler = SCOPE_HANDLERS[scope];
        if (!scopeHandler) {
            return false; // Unknown scope
        }

        const context: AccessContext = {
            user,
            resource,
            action: "", // Not used in current rules
        };

        return scopeHandler(context);
    }

    /**
     * Filter resources user has access to
     * Useful for list endpoints
     */
    static filterAccessibleResources<T extends Record<string, unknown>>(
        user: IUser,
        resources: T[],
        permission: string
    ): T[] {
        return resources.filter((resource) =>
            this.canAccess(user, permission, resource)
        );
    }

    /**
     * Get all effective permissions for a user (including role and granted permissions)
     */
    static getEffectivePermissions(user: IUser): string[] {
        const permissions = new Set<string>();

        // Add role permissions
        const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
        rolePermissions.forEach((p) => permissions.add(p));

        // Add granted permissions (if not expired)
        if (user.grantedPermissions) {
            const now = new Date();
            user.grantedPermissions.forEach((grant) => {
                if (!grant.expiresAt || new Date(grant.expiresAt) > now) {
                    permissions.add(grant.permission);
                }
            });
        }

        // Remove revoked permissions
        if (user.revokedPermissions) {
            user.revokedPermissions.forEach((p) => permissions.delete(p));
        }

        return Array.from(permissions);
    }

    /**
     * Check if user has ANY of the specified permissions
     */
    static hasAnyPermission(
        user: IUser,
        permissions: string[],
        resource?: Record<string, unknown>
    ): boolean {
        return permissions.some((permission) =>
            this.canAccess(user, permission, resource)
        );
    }

    /**
     * Check if user has ALL of the specified permissions
     */
    static hasAllPermissions(
        user: IUser,
        permissions: string[],
        resource?: Record<string, unknown>
    ): boolean {
        return permissions.every((permission) =>
            this.canAccess(user, permission, resource)
        );
    }
}
