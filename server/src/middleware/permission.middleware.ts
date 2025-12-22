import { Response, NextFunction } from "express";
import { PermissionChecker } from "../utils/permission-checker";
import { AuthenticatedRequest } from "../interfaces/auth.interface";
import { IUser } from "../interfaces/user.interface";
import { UserService } from "../services/user.service";

// Re-export for backwards compatibility
export type { AuthenticatedRequest };

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required permission
 * @param permission Permission string to check (e.g., "employees:edit:managed")
 * @param resourceLoader Optional function to load resource from request
 */
export function userHasPermission(permission: string) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            // Check if user is authenticated (auth middleware sets `req.decoded`)
            if (!req.decoded || !req.decoded.id) {
                return res.status(401).json({ message: "Authentication required" });
            }

            // Load full user from DB
            const user = (await UserService.getById(req.decoded.id as string)) as IUser | null;
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            // No resource-based loading by default
            let resource: Record<string, unknown> | undefined;

            // Check permission using PermissionChecker
            const hasAccess = await PermissionChecker.canAccess(user as IUser, permission, resource);

            if (!hasAccess) {
                return res.status(403).json({ message: "Insufficient permissions", required: permission });
            }

            // Permission granted
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
            if (!req.decoded || !req.decoded.id) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const user = (await UserService.getById(req.decoded.id as string)) as IUser | null;
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            let resource: Record<string, unknown> | undefined;

            const hasAccess = await PermissionChecker.hasAnyPermission(user as IUser, permissions, resource);

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
            if (!req.decoded || !req.decoded.id) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const user = (await UserService.getById(req.decoded.id as string)) as IUser | null;
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            let resource: Record<string, unknown> | undefined;

            const hasAccess = await PermissionChecker.hasAllPermissions(user as IUser, permissions, resource);

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
