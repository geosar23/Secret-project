/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { RoleService, RoleStatusFilter } from "../services/role.service";
import { success, softError, hardError, unauthorizedError } from "../utils/response.util";
import { IRole } from "../interfaces/role.interface";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { UserService } from "../services/user.service";
import { findActiveDependents } from "../services/dependency.service";

/**
 * Controller for role management
 */
export class RoleController {
    /**
     * Get roles
     * GET /api/roles?status=active|inactive|all (default: all)
     */
    static async getRoles(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.decoded as tokenPayload;
            const status = req.query.status;
            const filter: RoleStatusFilter = status === "active" || status === "inactive" ? status : "all";
            const roles = await RoleService.getRoles(user.companyId, filter);
            res.json(success(roles));
        } catch (error: any) {
            console.log("Error in RoleController.getRoles:", error);
            return hardError(res);
        }
    }

    /**
     * Get role by ID
     * GET /api/roles/:id
     */
    static async getRoleById(req: AuthenticatedRequest, res: Response): Promise<void> {
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
            return hardError(res);
        }
    }

    /**
     * Get role hierarchy
     * GET /api/roles/hierarchy
     */
    static async getRoleHierarchy(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.decoded as tokenPayload;
            const hierarchy = await RoleService.getHierarchy(user.companyId);
            res.json(success(hierarchy));
        } catch (error: any) {
            console.log("Error in RoleController.getRoleHierarchy:", error);
            return hardError(res);
        }
    }

    /**
     * Get permissions for a specific role
     * GET /api/roles/:roleType/permissions
     */
    static async getRolePermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            // const { roleType } = req.params;
            // const permissions = await RoleService.getPermissions(roleType as DefaultUserRoles);

            res.json(success({}));
        } catch (error: any) {
            console.log("Error in RoleController.getRolePermissions:", error);
            return hardError(res);
        }
    }

    /**
     * Create a custom role
     * POST /api/roles
     */
    static async createRole(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.decoded as tokenPayload;
            const { name, description, permissions } = req.body as {
                name?: string;
                description?: string;
                permissions?: string[];
            };

            if (!name || typeof name !== "string" || name.trim().length < 2) {
                res.json(softError("Role name is required (min 2 characters)"));
                return;
            }

            const actor = await UserService.getById(user.id, user.companyId);
            if (!actor) {
                unauthorizedError(res);
                return;
            }

            const roleData: Omit<IRole, "_id" | "updatedAt"> = {
                role: name.toLowerCase().replace(/ /g, "_"),
                name: name.trim(),
                description: description?.trim() || "",
                level: 55,
                permissions: (permissions || [])
                    .filter((p: string) => typeof p === "string")
                    .map((p: string) => p.trim()),
                isSystemRole: false,
                company: user.companyId as any,
                isActive: true,
                createdAt: new Date(),
            };

            const newRole = await RoleService.create(roleData, user.companyId);

            res.status(201).json(success({ role: newRole }));
        } catch (error: any) {
            console.log("Error in RoleController.createRole:", error);
            return hardError(res);
        }
    }

    /**
     * Update a custom role
     * PUT /api/roles/:id
     */
    static async updateRole(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.decoded as tokenPayload;
            const { id } = req.params;
            const updates: Partial<IRole> = {};

            const actor = await UserService.getById(user.id, user.companyId);
            if (!actor) {
                return unauthorizedError(res);
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

            if (Object.keys(updates).length === 0) {
                res.json(softError("No valid fields provided for update"));
                return;
            }

            if (updates.isActive === false) {
                const blocker = await findActiveDependents("role", id, user.companyId);
                if (blocker) {
                    res.json(softError(blocker));
                    return;
                }
            }

            const updated = await RoleService.update(id, updates, user.companyId);

            if (!updated) {
                res.json(softError("Role not found"));
                return;
            }

            res.json(success({ role: updated }));
        } catch (error: any) {
            console.log("Error in RoleController.updateRole:", error);
            return hardError(res);
        }
    }

    /**
     * Delete a custom role
     * DELETE /api/roles/:id
     */
    static async deleteRole(req: AuthenticatedRequest, res: Response): Promise<void> {
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
            return hardError(res);
        }
    }
}
