import { Response, NextFunction } from "express";
import {
    PermissionChecker,
    getEffectivePermissions,
    matchesWildcard,
    buildActorContext,
} from "../utils/permission-checker";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { IUserPopulated } from "../interfaces/user.interface";
import { UserService } from "../services/user.service";
import { PermissionCategories, PermissionActions, PermissionScopes } from "../enums/permissions.enum";
import { canAccessUserByScope } from "../policies/user.policy";
import { forbiddenError, hardError, unauthorizedError } from "../utils/response.util";

// Re-export for backwards compatibility
export type { AuthenticatedRequest };

/**
 * Narrow req.decoded to the concrete tokenPayload shape set by authMiddleware.
 * Returns null when the request is unauthenticated or the token is malformed.
 */
function getTokenPayload(req: AuthenticatedRequest): tokenPayload | null {
    const d = req.decoded;
    if (!d || typeof d === "string" || !("id" in d) || !("companyId" in d)) {
        return null;
    }
    return d as tokenPayload;
}

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required permission
 * @param permission Permission string to check (e.g., "usersManagement:read:department")
 */
export function userHasPermission(permission: string) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const payload = getTokenPayload(req);
            if (!payload) {
                return unauthorizedError(res);
            }

            const user = await UserService.getById(payload.id, payload.companyId);
            if (!user) {
                return unauthorizedError(res);
            }

            const hasAccess = await PermissionChecker.canAccess(user, permission);

            if (!hasAccess) {
                return forbiddenError(res);
            }

            next();
        } catch (error) {
            console.error("Authorization error:", error);
            return hardError(res);
        }
    };
}

/**
 * Middleware to check if user has ANY of the specified permissions
 */
export function userHasAnyPermission(permissions: string[]) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const payload = getTokenPayload(req);
            if (!payload) {
                return unauthorizedError(res);
            }

            const user = await UserService.getById(payload.id, payload.companyId);
            if (!user) {
                return unauthorizedError(res);
            }

            const hasAccess = await PermissionChecker.hasAnyPermission(user, permissions);

            if (!hasAccess) {
                return forbiddenError(res);
            }

            next();
        } catch (error) {
            console.error("Authorization error:", error);
            return hardError(res);
        }
    };
}

/**
 * Middleware to check if user has ALL of the specified permissions
 */
export function userHasAllPermissions(permissions: string[]) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const payload = getTokenPayload(req);
            if (!payload) {
                return unauthorizedError(res);
            }

            const user = await UserService.getById(payload.id, payload.companyId);
            if (!user) {
                return unauthorizedError(res);
            }

            const hasAccess = await PermissionChecker.hasAllPermissions(user, permissions);

            if (!hasAccess) {
                return forbiddenError(res);
            }

            next();
        } catch (error) {
            console.error("Authorization error:", error);
            return hardError(res);
        }
    };
}

/**
 * Scope-aware permission check between two users.
 *
 * Checks whether `actorUser` holds `{category}:{action}:{scope}` for any scope
 * that covers `subject`, iterating from broadest (ALL) to narrowest (SELF).
 *
 * @param actorUser  The user performing the action.
 * @param subject    The user the action is being performed on.
 * @param category   The permission category (e.g. PermissionCategories.RESET_PASSWORD).
 * @param action     The permission action (e.g. PermissionActions.WRITE).
 */
export function canActorAccessSubject(
    actorUser: IUserPopulated,
    subject: IUserPopulated,
    category: PermissionCategories | string,
    action: PermissionActions | string,
): boolean {
    const effective = getEffectivePermissions(actorUser);
    const actorCtx = buildActorContext(actorUser);

    const scopeChecks: [string, PermissionScopes][] = [
        [`${category}:${action}:${PermissionScopes.ALL}`, PermissionScopes.ALL],
        [`${category}:${action}:${PermissionScopes.DEPARTMENT}`, PermissionScopes.DEPARTMENT],
        [`${category}:${action}:${PermissionScopes.COUNTRY}`, PermissionScopes.COUNTRY],
        [`${category}:${action}:${PermissionScopes.DEPARTMENT_COUNTRY}`, PermissionScopes.DEPARTMENT_COUNTRY],
        [`${category}:${action}:${PermissionScopes.MANAGED}`, PermissionScopes.MANAGED],
        [`${category}:${action}:${PermissionScopes.SELF}`, PermissionScopes.SELF],
    ];

    for (const [permKey, scope] of scopeChecks) {
        if (matchesWildcard(effective, permKey)) {
            if (scope === PermissionScopes.ALL) {
                return true;
            }
            if (canAccessUserByScope(actorCtx, subject, scope)) {
                return true;
            }
        }
    }

    return false;
}

export function userHasPermissionCategory(category: string) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const payload = getTokenPayload(req);
            if (!payload) {
                return unauthorizedError(res);
            }

            const user = await UserService.getById(payload.id, payload.companyId);
            if (!user) {
                return unauthorizedError(res);
            }

            const hasAccess = await PermissionChecker.hasPermissionInCategory(user, category);

            if (!hasAccess) {
                return forbiddenError(res);
            }

            next();
        } catch (error) {
            console.error("Authorization error:", error);
            return hardError(res);
        }
    };
}
