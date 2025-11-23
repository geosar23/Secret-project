import { Request, Response } from "express";
import { PermissionService } from "../services/permission-definition.service";

/**
 * Controller for permission definitions management
 */
export const PermissionDefinitionController = {
    /**
     * Get all available permissions
     * GET /api/permission-definitions
     */
    async getAllPermissions(req: Request, res: Response) {
        try {
            const permissions = await PermissionService.getAll();
            res.json({
                success: true,
                data: permissions,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch permissions",
            });
        }
    },

    /**
     * Get permission by ID
     * GET /api/permission-definitions/:id
     */
    async getPermissionById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const permission = await PermissionService.getById(id);

            if (!permission) {
                return res.status(404).json({
                    success: false,
                    error: "Permission not found",
                });
            }

            res.json({
                success: true,
                data: permission,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch permission",
            });
        }
    },

    /**
     * Get permissions by category
     * GET /api/permission-definitions/category/:category
     */
    async getPermissionsByCategory(req: Request, res: Response) {
        try {
            const { category } = req.params;
            const permissions = await PermissionService.getByCategory(category);

            res.json({
                success: true,
                data: permissions,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch permissions by category",
            });
        }
    },

    /**
     * Get permissions by entity
     * GET /api/permission-definitions/entity/:entity
     */
    async getPermissionsByEntity(req: Request, res: Response) {
        try {
            const { entity } = req.params;
            const permissions = await PermissionService.getByEntity(entity);

            res.json({
                success: true,
                data: permissions,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch permissions by entity",
            });
        }
    },

    /**
     * Get all permission categories
     * GET /api/permission-definitions/categories
     */
    async getPermissionCategories(req: Request, res: Response) {
        try {
            const categories = await PermissionService.getCategories();
            res.json({
                success: true,
                data: categories,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch categories",
            });
        }
    },

    /**
     * Get permissions grouped by category
     * GET /api/permission-definitions/grouped
     */
    async getPermissionsGrouped(req: Request, res: Response) {
        try {
            const grouped = await PermissionService.getGrouped();

            res.json({
                success: true,
                data: grouped,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch grouped permissions",
            });
        }
    },

    /**
     * Search permissions
     * GET /api/permission-definitions/search?q=query
     */
    async searchPermissions(req: Request, res: Response) {
        try {
            const { q } = req.query;
            if (!q || typeof q !== "string") {
                return res.status(400).json({
                    success: false,
                    error: "Search query is required",
                });
            }

            const results = await PermissionService.search(q);

            res.json({
                success: true,
                data: results,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to search permissions",
            });
        }
    },
};
