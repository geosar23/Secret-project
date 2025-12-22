import { IUser } from "../interfaces/user.interface";
import { AccessContext } from "../interfaces/permission.interface";
import { DefaultUserRoles } from "../enums/user-role.enum";
import { RoleService } from "../services/role.service";
import { SCOPE_HANDLERS } from "./attribute-rules";
import { PermissionService } from "../services/permission.service";

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
    static async canAccess(user: IUser, permission: string, resource?: Record<string, unknown>): Promise<boolean> {
        //Fetch user's role permissions from DB and evaluate
            // Extract role id without using `any`
            const roleVal = user.role as unknown as { _id?: { toString: () => string }; toString: () => string };
            const roleId = roleVal._id ? roleVal._id.toString() : roleVal.toString();
            const roleData = await RoleService.getById(roleId);
        if (!roleData) {
            return false; // Role not found
        }

        // 1. GOD role bypasses all checks
        if (roleData.role === DefaultUserRoles.GOD) {
            return true;
        }

        // 2. Check if permission is explicitly revoked
        // Compare using permission document id
        const permissionDoc = await PermissionService.getByKey(permission);
        if (permissionDoc && user.revokedPermissions?.some(id => id?.toString() === permissionDoc._id.toString())) {
            return false;
        }

        // 3. Check custom granted permissions (with expiration)
        if (permissionDoc && user.grantedPermissions?.some(id => id?.toString() === permissionDoc._id.toString())) {
            return true;
        }

        // 4. Check role-based permissions from database
        const rolePermissions = await PermissionService.getByIds((roleData.permissions || []).map(p => p.toString())).then(
            perms => perms.map(p => p.key),
        );
        console.log("Role Permissions:", rolePermissions);

        // Check for wildcard permission
        if (rolePermissions.includes("*")) {
            return true;
        }

        // Check if permission matches role permissions
        for (const rolePermission of rolePermissions) {
            if (this.matchesPermission(permission, rolePermission)) {
                // If resource provided and permission has scope, check attribute rules
                if (resource) {
                    return this.checkAttributeBasedAccess(user, permission, resource);
                }
                return true;
            }
        }

        // 5. Multi-tenant isolation check
        // Even with permission, users can only access resources in their company
        if (resource && user.company) {
            // GOD role can access any company (already checked above)
            const userCompanyId = (user.company as unknown as { toString: () => string }).toString();
            const resourceCompanyId = (resource as { companyId?: string | { toString: () => string } }).companyId;
            const resourceCompanyIdStr = typeof resourceCompanyId === "string" ? resourceCompanyId : resourceCompanyId?.toString();
            if (userCompanyId !== resourceCompanyIdStr) {
                return false;
            }
        }

        return false; // No permission found
    }

    /**
     * Check if permission pattern matches role permission
     * Supports wildcards like "employees:*" or "employees:view:*"
     * Supports scope hierarchy: "all" includes "department", "managed", "self"
     */
    private static matchesPermission(permission: string, rolePermission: string): boolean {
        if (rolePermission === "*") return true;
        if (permission === rolePermission) return true;

        // Handle wildcards
        const roleParts = rolePermission.split(":");
        const permParts = permission.split(":");

        if (roleParts.length !== permParts.length) {
            return false;
        }

        // Check each part
        for (let i = 0; i < roleParts.length; i++) {
            const rolePart = roleParts[i];
            const permPart = permParts[i];

            // Wildcard matches anything
            if (rolePart === "*") {
                continue;
            }

            // Exact match
            if (rolePart === permPart) {
                continue;
            }

            // Scope hierarchy: "all" includes more specific scopes
            if (i === roleParts.length - 1) {
                // This is the scope part (last segment)
                if (rolePart === "all" && ["department", "managed", "self", "own"].includes(permPart)) {
                    continue;
                }
                if (rolePart === "department" && ["managed", "self", "own"].includes(permPart)) {
                    continue;
                }
                if (rolePart === "managed" && ["self", "own"].includes(permPart)) {
                    continue;
                }
            }

            // No match found for this part
            return false;
        }

        return true;
    }

    /**
     * Check attribute-based access using scope rules
     */
    private static checkAttributeBasedAccess(
        user: IUser,
        permission: string,
        resource: Record<string, unknown>,
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
    private static checkScope(user: IUser, resource: Record<string, unknown>, scope: string): boolean {
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
    static async filterAccessibleResources<T extends Record<string, unknown>>(
        user: IUser,
        resources: T[],
        permission: string,
    ): Promise<T[]> {
        const accessible: T[] = [];
        for (const resource of resources) {
            if (await this.canAccess(user, permission, resource)) {
                accessible.push(resource);
            }
        }
        return accessible;
    }

    /**
     * Expand a permission to include all inherited scope variations
     * e.g., "employees:view:all" -> ["employees:view:all", "employees:view:department", "employees:view:managed", "employees:view:self"]
     */
    private static expandPermissionScopes(permission: string): string[] {
        const expanded: string[] = [permission];

        // Handle wildcards - they already cover everything
        if (permission === "*" || permission.includes("*")) {
            return expanded;
        }

        const parts = permission.split(":");
        if (parts.length < 3) {
            return expanded; // Not a scoped permission
        }

        const [entity, action, scope] = parts;

        // Expand scope hierarchy
        if (scope === "all") {
            expanded.push(`${entity}:${action}:department`);
            expanded.push(`${entity}:${action}:managed`);
            expanded.push(`${entity}:${action}:self`);
            expanded.push(`${entity}:${action}:own`);
        } else if (scope === "department") {
            expanded.push(`${entity}:${action}:managed`);
            expanded.push(`${entity}:${action}:self`);
            expanded.push(`${entity}:${action}:own`);
        } else if (scope === "managed") {
            expanded.push(`${entity}:${action}:self`);
            expanded.push(`${entity}:${action}:own`);
        }

        return expanded;
    }

    /**
     * Check if user has ANY of the specified permissions
     */
    static async hasAnyPermission(
        user: IUser,
        permissions: string[],
        resource?: Record<string, unknown>,
    ): Promise<boolean> {
        for (const permission of permissions) {
            if (await this.canAccess(user, permission, resource)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if user has ALL of the specified permissions
     */
    static async hasAllPermissions(
        user: IUser,
        permissions: string[],
        resource?: Record<string, unknown>,
    ): Promise<boolean> {
        for (const permission of permissions) {
            if (!(await this.canAccess(user, permission, resource))) {
                return false;
            }
        }
        return true;
    }
}
