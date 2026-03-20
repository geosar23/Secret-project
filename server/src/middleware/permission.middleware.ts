import { Response, NextFunction } from "express";
import { PermissionChecker } from "../utils/permission-checker";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { IUser } from "../interfaces/user.interface";
import { UserService } from "../services/user.service";

// Re-export for backwards compatibility
export type { AuthenticatedRequest };

/**
 * Narrow req.decoded to the concrete tokenPayload shape set by authMiddleware.
 * Returns null when the request is unauthenticated or the token is malformed.
 */
function getTokenPayload(req: AuthenticatedRequest): tokenPayload | null {
    const d = req.decoded;
    if (!d || typeof d === "string" || !("id" in d) || !("companyId" in d)) return null;
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
                return res.status(401).json({ message: "Authentication required" });
            }

            const user = (await UserService.getById(payload.id, payload.companyId)) as IUser | null;
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            const hasAccess = await PermissionChecker.canAccess(user, permission);

            if (!hasAccess) {
                return res.status(403).json({ message: "Insufficient permissions", required: permission });
            }

            next();
        } catch (error) {
            console.error("Authorization error:", error);
            return next({ statusCode: 500, message: "Authorization check failed" });
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
                return res.status(401).json({ message: "Authentication required" });
            }

            const user = (await UserService.getById(payload.id, payload.companyId)) as IUser | null;
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            const hasAccess = await PermissionChecker.hasAnyPermission(user, permissions);

            if (!hasAccess) {
                return res.status(403).json({ message: "Insufficient permissions", requiredAny: permissions });
            }

            next();
        } catch (error) {
            console.error("Authorization error:", error);
            return next({ statusCode: 500, message: "Authorization check failed" });
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
                return res.status(401).json({ message: "Authentication required" });
            }

            const user = (await UserService.getById(payload.id, payload.companyId)) as IUser | null;
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            const hasAccess = await PermissionChecker.hasAllPermissions(user, permissions);

            if (!hasAccess) {
                return res.status(403).json({ message: "Insufficient permissions", requiredAll: permissions });
            }

            next();
        } catch (error) {
            console.error("Authorization error:", error);
            return next({ statusCode: 500, message: "Authorization check failed" });
        }
    };
}
