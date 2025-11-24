import { Request, Response } from "express";
import { RoleService } from "../services/role.service";
import { DefaultUserRoles } from "../enums/user-role.enum";

/**
 * Controller for role management
 */
export const RoleController = {
    /**
     * Get all roles
     * GET /api/roles
     */
    async getAllRoles(req: Request, res: Response) {
        try {
            const roles = await RoleService.getAll();
            res.json({
                success: true,
                data: roles,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch roles",
            });
        }
    },

    /**
     * Get role by ID
     * GET /api/roles/:id
     */
    async getRoleById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const role = await RoleService.getById(id);

            if (!role) {
                return res.status(404).json({
                    success: false,
                    error: "Role not found",
                });
            }

            res.json({
                success: true,
                data: role,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch role",
            });
        }
    },

    /**
     * Get role hierarchy
     * GET /api/roles/hierarchy
     */
    async getRoleHierarchy(req: Request, res: Response) {
        try {
            const hierarchy = await RoleService.getHierarchy();
            res.json({
                success: true,
                data: hierarchy,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch role hierarchy",
            });
        }
    },

    /**
     * Get permissions for a specific role
     * GET /api/roles/:roleType/permissions
     */
    async getRolePermissions(req: Request, res: Response) {
        try {
            const { roleType } = req.params;
            const permissions = await RoleService.getPermissions(roleType as DefaultUserRoles);

            res.json({
                success: true,
                data: permissions,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch role permissions",
            });
        }
    },

    /**
     * Create a custom role (company-specific)
     * POST /api/roles
     */
    async createRole(req: Request, res: Response) {
        try {
            const { name, description, permissions, companyId } = req.body;

            if (!name || !permissions) {
                return res.status(400).json({
                    success: false,
                    error: "Name and permissions are required",
                });
            }

            const newRole = await RoleService.create({
                role: name.toLowerCase().replace(/ /g, "_") as DefaultUserRoles,
                name,
                description: description || "",
                level: 55, // Custom roles default level
                permissions,
                isSystemRole: false,
                companyId,
                isActive: true,
                createdAt: new Date(),
            });

            res.status(201).json({
                success: true,
                data: newRole,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to create role",
            });
        }
    },

    /**
     * Update a custom role
     * PUT /api/roles/:id
     */
    async updateRole(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const updated = await RoleService.update(id, updates);

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: "Role not found",
                });
            }

            res.json({
                success: true,
                data: updated,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to update role",
            });
        }
    },

    /**
     * Delete a custom role
     * DELETE /api/roles/:id
     */
    async deleteRole(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const deleted = await RoleService.delete(id);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: "Role not found",
                });
            }

            res.json({
                success: true,
                message: "Role deleted successfully",
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete role",
            });
        }
    },
};
