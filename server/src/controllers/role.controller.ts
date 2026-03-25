import { Response } from "express";
import { RoleService } from "../services/role.service";
import { DefaultUserRoles } from "../enums/user-role.enum";
import { AuthenticatedRequest } from "../interfaces/auth.interface";
import { getActorUser, getActorCompanyId } from "../utils/auth-request.util";
import { getEffectivePermissions, matchesWildcard } from "../utils/permission-checker";
import { PermissionKeys } from "../enums/permissions.enum";
import { toIdString } from "../utils/general.util";
import { IRole } from "../interfaces/role.interface";

/**
 * Controller for role management
 * Note: Permission checks are handled at the route level via middleware.
 * Scope filtering (ALL vs COMPANY) is handled here based on user permissions.
 */
export const RoleController = {
    async getAllRoles(req: AuthenticatedRequest, res: Response) {
        try {
            const actorUser = await getActorUser(req);
            if (!actorUser) {
                return res.status(401).json({ success: false, error: "Unauthorized" });
            }

            const permissions = getEffectivePermissions(actorUser);

            // Platform admins see all roles
            if (matchesWildcard(permissions, PermissionKeys.ROLES_MANAGEMENT_READ_ALL)) {
                const roles = await RoleService.getAll();
                return res.json({ success: true, data: roles });
            }

            // Company admins see only their company's roles
            const actorCompanyId = getActorCompanyId(actorUser);
            const roles = await RoleService.getByCompany(actorCompanyId);
            return res.json({ success: true, data: roles });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch roles",
            });
        }
    },

    async getRoleById(req: AuthenticatedRequest, res: Response) {
        try {
            const actorUser = await getActorUser(req);
            if (!actorUser) {
                return res.status(401).json({ success: false, error: "Unauthorized" });
            }

            const { id } = req.params;
            const role = await RoleService.getById(id);

            if (!role) {
                return res.status(404).json({ success: false, error: "Role not found" });
            }

            const permissions = getEffectivePermissions(actorUser);
            const isPlatformAdmin = matchesWildcard(permissions, PermissionKeys.ROLES_MANAGEMENT_READ_ALL);

            // Company admins can only view their company's roles + system roles
            if (!isPlatformAdmin) {
                const actorCompanyId = getActorCompanyId(actorUser);
                const roleCompanyId = toIdString(role.companyId);
                if (roleCompanyId && actorCompanyId !== roleCompanyId && !role.isSystemRole) {
                    return res.status(403).json({ success: false, error: "Access denied" });
                }
            }

            res.json({ success: true, data: role });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch role",
            });
        }
    },

    async getRoleHierarchy(req: AuthenticatedRequest, res: Response) {
        try {
            const actorUser = await getActorUser(req);
            if (!actorUser) {
                return res.status(401).json({ success: false, error: "Unauthorized" });
            }

            const permissions = getEffectivePermissions(actorUser);

            let hierarchy;
            if (matchesWildcard(permissions, PermissionKeys.ROLES_MANAGEMENT_READ_ALL)) {
                hierarchy = await RoleService.getHierarchy();
            } else {
                const actorCompanyId = getActorCompanyId(actorUser);
                hierarchy = (await RoleService.getByCompany(actorCompanyId)).sort((a, b) => b.level - a.level);
            }

            res.json({ success: true, data: hierarchy });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch role hierarchy",
            });
        }
    },

    async getRolePermissions(req: AuthenticatedRequest, res: Response) {
        try {
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch role permissions",
            });
        }
    },

    async createRole(req: AuthenticatedRequest, res: Response) {
        try {
            const actorUser = await getActorUser(req);
            if (!actorUser) {
                return res.status(401).json({ success: false, error: "Unauthorized" });
            }

            const { name, level, description, permissions: rolePermissions, companyId } = req.body;
            const permissions = getEffectivePermissions(actorUser);
            const actorCompanyId = getActorCompanyId(actorUser);

            if (!name || !rolePermissions) {
                return res.status(400).json({ success: false, error: "Name and permissions are required" });
            }

            // Determine which company the role should belong to
            let targetCompanyId: string | undefined;
            const canWriteAll = matchesWildcard(permissions, PermissionKeys.ROLES_MANAGEMENT_WRITE_ALL);

            if (canWriteAll) {
                targetCompanyId = companyId;
            } else {
                targetCompanyId = actorCompanyId;
            }

            const newRole = await RoleService.create({
                role: name.toLowerCase().replace(/ /g, "_") as DefaultUserRoles,
                name,
                description: description || "",
                level: level,
                permissions: rolePermissions,
                isSystemRole: false,
                companyId: targetCompanyId as unknown as IRole["companyId"],
                isActive: true,
                createdAt: new Date(),
            });

            res.status(201).json({ success: true, data: newRole });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to create role",
            });
        }
    },

    async updateRole(req: AuthenticatedRequest, res: Response) {
        try {
            const actorUser = await getActorUser(req);
            if (!actorUser) {
                return res.status(401).json({ success: false, error: "Unauthorized" });
            }

            const { id } = req.params;
            const role = await RoleService.getById(id);
            if (!role) {
                return res.status(404).json({ success: false, error: "Role not found" });
            }

            const permissions = getEffectivePermissions(actorUser);
            const canWriteAll = matchesWildcard(permissions, PermissionKeys.ROLES_MANAGEMENT_WRITE_ALL);

            // Company admins can only update their company's roles
            if (!canWriteAll) {
                const actorCompanyId = getActorCompanyId(actorUser);
                const roleCompanyId = toIdString(role.companyId);
                if (roleCompanyId && actorCompanyId !== roleCompanyId) {
                    return res.status(403).json({ success: false, error: "Access denied" });
                }
            }

            const updated = await RoleService.update(id, req.body);
            if (!updated) {
                return res.status(404).json({ success: false, error: "Role not found" });
            }

            res.json({ success: true, data: updated });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to update role",
            });
        }
    },

    async deleteRole(req: AuthenticatedRequest, res: Response) {
        try {
            const actorUser = await getActorUser(req);
            if (!actorUser) {
                return res.status(401).json({ success: false, error: "Unauthorized" });
            }

            const { id } = req.params;
            const role = await RoleService.getById(id);
            if (!role) {
                return res.status(404).json({ success: false, error: "Role not found" });
            }

            const permissions = getEffectivePermissions(actorUser);
            const canDeleteAll = matchesWildcard(permissions, PermissionKeys.ROLES_MANAGEMENT_DELETE_ALL);

            // Company admins can only delete their company's roles
            if (!canDeleteAll) {
                const actorCompanyId = getActorCompanyId(actorUser);
                const roleCompanyId = toIdString(role.companyId);
                if (roleCompanyId && actorCompanyId !== roleCompanyId) {
                    return res.status(403).json({ success: false, error: "Access denied" });
                }
            }

            await RoleService.delete(id);
            res.json({ success: true, message: "Role deleted successfully" });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete role",
            });
        }
    },
};
