import { Request, Response, NextFunction } from "express";
import { PermissionChecker } from "../permissions/permission-checker";
import { IUser } from "../../interfaces/user.interface";

/**
 * Extended Request interface with user
 */
export interface AuthenticatedRequest extends Request {
    user?: IUser;
    decoded?: {
        id: string;
        email: string;
        name?: string;
        role?: string;
    };
}

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required permission
 * @param permission Permission string to check (e.g., "employees:edit:managed")
 * @param resourceLoader Optional function to load resource from request
 */
export function userhasPermission(
    permission: string,
    resourceLoader?: (req: AuthenticatedRequest) => Promise<Record<string, unknown> | null>,
) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                return res.status(401).json({
                    error: "Authentication required",
                });
            }

            const user = req.user;

            // Load resource if loader provided
            let resource: Record<string, unknown> | undefined;
            if (resourceLoader) {
                const loadedResource = await resourceLoader(req);
                if (loadedResource) {
                    resource = loadedResource;
                }
            }

            // Check permission
            const hasAccess = PermissionChecker.canAccess(user, permission, resource);

            if (!hasAccess) {
                return res.status(403).json({
                    error: "Insufficient permissions",
                    required: permission,
                });
            }

            // Permission granted, proceed
            next();
        } catch (error) {
            console.error("Authorization error:", error);
            res.status(500).json({
                error: "Authorization check failed",
            });
        }
    };
}

/**
 * Middleware to check if user has ANY of the specified permissions
 */
export function userHasAnyPermission(
    permissions: string[],
    resourceLoader?: (req: AuthenticatedRequest) => Promise<Record<string, unknown> | null>,
) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: "Authentication required",
                });
            }

            const user = req.user;
            let resource: Record<string, unknown> | undefined;

            if (resourceLoader) {
                const loadedResource = await resourceLoader(req);
                if (loadedResource) {
                    resource = loadedResource;
                }
            }

            const hasAccess = PermissionChecker.hasAnyPermission(user, permissions, resource);

            if (!hasAccess) {
                return res.status(403).json({
                    error: "Insufficient permissions",
                    requiredAny: permissions,
                });
            }

            next();
        } catch (error) {
            console.error("Authorization error:", error);
            res.status(500).json({
                error: "Authorization check failed",
            });
        }
    };
}

/**
 * Middleware to check if user has ALL of the specified permissions
 */
export function userHasAllPermissions(
    permissions: string[],
    resourceLoader?: (req: AuthenticatedRequest) => Promise<Record<string, unknown> | null>,
) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: "Authentication required",
                });
            }

            const user = req.user;
            let resource: Record<string, unknown> | undefined;

            if (resourceLoader) {
                const loadedResource = await resourceLoader(req);
                if (loadedResource) {
                    resource = loadedResource;
                }
            }

            const hasAccess = PermissionChecker.hasAllPermissions(user, permissions, resource);

            if (!hasAccess) {
                return res.status(403).json({
                    error: "Insufficient permissions",
                    requiredAll: permissions,
                });
            }

            next();
        } catch (error) {
            console.error("Authorization error:", error);
            res.status(500).json({
                error: "Authorization check failed",
            });
        }
    };
}
