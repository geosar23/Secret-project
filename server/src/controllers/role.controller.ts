/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from "express";
import { RoleService } from "../services/role.service";
import { success, softError } from "../util/response.util";
import { IRole } from "../interfaces/role.interface";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { UserService } from "../services/user.service";
import { CompanyService } from "../services/company.service";
import { PermissionChecker } from "../utils/permission-checker";
import { PermissionKeys } from "../enums/permissions.enum";

/**
 * Controller for role management
 */
export class RoleController {
    /**
     * Get all roles
     * GET /api/roles
     */
    static async getAllRoles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.decoded as tokenPayload;
            const roles = await RoleService.getAll(user.companyId);
            res.json(success(roles));
        } catch (error: any) {
            console.log("Error in RoleController.getAllRoles:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    /**
     * Get role by ID
     * GET /api/roles/:id
     */
    static async getRoleById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.decoded as tokenPayload;
            const { id } = req.params;
            const role = await RoleService.getById(id, user.companyId);

            if (!role) {
                res.json(softError("Role not found"));
                return;
            }

            res.json(success(role));
        } catch (error: any) {
            console.log("Error in RoleController.getRoleById:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    /**
     * Get role hierarchy
     * GET /api/roles/hierarchy
     */
    static async getRoleHierarchy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.decoded as tokenPayload;
            const hierarchy = await RoleService.getHierarchy(user.companyId);
            res.json(success(hierarchy));
        } catch (error: any) {
            console.log("Error in RoleController.getRoleHierarchy:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    /**
     * Get permissions for a specific role
     * GET /api/roles/:roleType/permissions
     */
    static async getRolePermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            // const { roleType } = req.params;
            // const permissions = await RoleService.getPermissions(roleType as DefaultUserRoles);

            res.json(success({}));
        } catch (error: any) {
            console.log("Error in RoleController.getRolePermissions:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    /**
     * Create a custom role
     * POST /api/roles
     */
    static async createRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.decoded as tokenPayload;
            const { name, description, permissions, companyId } = req.body as {
                name?: string;
                description?: string;
                permissions?: string[];
                companyId?: string;
            };

            if (!name || typeof name !== "string" || name.trim().length < 2) {
                res.json(softError("Role name is required (min 2 characters)"));
                return;
            }

            const actor = await UserService.getById(user.id, user.companyId);
            if (!actor) {
                res.json(softError("Unauthorized"));
                return;
            }

            const canAssignAcrossCompanies = await PermissionChecker.hasAnyPermission(actor, [
                PermissionKeys.ALL,
                PermissionKeys.USERS_MANAGEMENT_ALL_ALL,
            ]);

            if (companyId && !canAssignAcrossCompanies) {
                res.json(softError("Insufficient permissions to assign roles across companies"));
                return;
            }

            const targetCompanyId = companyId?.trim() || user.companyId;
            if (!targetCompanyId) {
                res.json(softError("companyId is required"));
                return;
            }

            const company = await CompanyService.getById(targetCompanyId);
            if (!company) {
                res.json(softError("Company not found"));
                return;
            }

            const roleData: Omit<IRole, "_id" | "updatedAt"> = {
                role: name.toLowerCase().replace(/ /g, "_"),
                name: name.trim(),
                description: description?.trim() || "",
                level: 55, // Custom roles default level
                permissions: (permissions || [])
                    .filter((p: string) => typeof p === "string")
                    .map((p: string) => p.trim()),
                isSystemRole: false,
                company: targetCompanyId as any,
                isActive: true,
                createdAt: new Date(),
            };

            const newRole = await RoleService.create(roleData, user.companyId);

            res.status(201).json(success({ role: newRole }));
        } catch (error: any) {
            console.log("Error in RoleController.createRole:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    /**
     * Update a custom role
     * PUT /api/roles/:id
     */
    static async updateRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.decoded as tokenPayload;
            const { id } = req.params;
            const updates: Partial<IRole> = {};

            const actor = await UserService.getById(user.id, user.companyId);
            if (!actor) {
                res.json(softError("Unauthorized"));
                return;
            }

            if (typeof req.body.name === "string" && req.body.name.trim().length > 0) {
                updates.name = req.body.name.trim();
            }
            if (typeof req.body.description === "string") {
                updates.description = req.body.description.trim();
            }
            if (Array.isArray(req.body.permissions)) {
                updates.permissions = req.body.permissions
                    .filter((p: string) => typeof p === "string")
                    .map((p: string) => p.trim());
            }
            if (typeof req.body.isActive === "boolean") {
                updates.isActive = req.body.isActive;
            }
            if (typeof req.body.companyId === "string" && req.body.companyId.trim().length > 0) {
                const canAssignAcrossCompanies = await PermissionChecker.hasAnyPermission(actor, [
                    PermissionKeys.ALL,
                    PermissionKeys.USERS_MANAGEMENT_ALL_ALL,
                ]);

                if (!canAssignAcrossCompanies) {
                    res.json(softError("Insufficient permissions to assign roles across companies"));
                    return;
                }

                const company = await CompanyService.getById(req.body.companyId.trim());
                if (!company) {
                    res.json(softError("Company not found"));
                    return;
                }

                updates.company = req.body.companyId.trim() as any;
            }

            if (Object.keys(updates).length === 0) {
                res.json(softError("No valid fields provided for update"));
                return;
            }

            const updated = await RoleService.update(id, updates, user.companyId);

            if (!updated) {
                res.json(softError("Role not found"));
                return;
            }

            res.json(success({ role: updated }));
        } catch (error: any) {
            console.log("Error in RoleController.updateRole:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    /**
     * Delete a custom role
     * DELETE /api/roles/:id
     */
    static async deleteRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.decoded as tokenPayload;
            const { id } = req.params;
            const deleted = await RoleService.delete(id, user.companyId);
            if (!deleted) {
                res.json(softError("Role not found"));
                return;
            }

            res.json(success({}));
        } catch (error: any) {
            console.log("Error in RoleController.deleteRole:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }
}
