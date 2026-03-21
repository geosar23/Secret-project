/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Response } from "express";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { IUser, IUsersQueryParams } from "../interfaces/user.interface";
import { success, softError } from "../util/response.util";
import { buildUserSearchAccessQuery } from "../policies/user.policy";
import { PermissionKeys } from "../enums/permissions.enum";

export class UserController {
    private static isValidPermissionKey(permissionKey: string): boolean {
        return Object.values(PermissionKeys).includes(
            permissionKey as (typeof PermissionKeys)[keyof typeof PermissionKeys],
        );
    }

    static async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }

            // Parse query parameters
            const params: IUsersQueryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
                search: req.query.search as string,
                sortBy: req.query.sortBy as string,
                sortOrder: req.query.sortOrder as "asc" | "desc",
                roleId: req.query.roleId as string,
                companyId: req.query.companyId as string,
                departmentId: req.query.departmentId as string,
                isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
            };

            const actorUser = await UserService.getById(requestingUser.id, requestingUser.companyId);
            if (!actorUser) {
                res.json(softError("Unauthorized"));
                return;
            }

            const actor = actorUser as IUser;

            const searchAccessQuery = buildUserSearchAccessQuery(actor);
            if (searchAccessQuery === null) {
                res.json(
                    success({ users: [], total: 0, page: params.page || 1, limit: params.limit || 10, totalPages: 0 }),
                );
                return;
            }

            const users = await UserService.getUsers(params, requestingUser.companyId, searchAccessQuery);
            res.json(success(users));
        } catch (error: any) {
            console.log("Error in UserController.getUsers:", error, { decoded: req.decoded, query: req.query });
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }

            const params: Omit<IUser, "_id"> = {
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                role: req.body.role,
                company: req.body.companyId,
                department: req.body.departmentId,
                manager: req.body.managerId,
                isActive: true,
            };

            const newUser = await UserService.create(params, requestingUser.companyId);
            res.json(success({ user: newUser }));
        } catch (error: any) {
            console.log("Error in UserController.create:", error, { decoded: req.decoded, body: req.body });
            res.json(softError(error.message, error));
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }
            const userId = req.params.id;
            const selectFields = req.query.fields ? (req.query.fields as string).split(",") : undefined;
            const user = await UserService.getById(userId, requestingUser.companyId, selectFields);
            if (!user) {
                res.json(softError("User not found"));
                return;
            }
            res.json(success(user));
        } catch (error: any) {
            console.log("Error in UserController.getById:", error);
            res.json(softError(error.message, error));
        }
    }

    static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }

            const userId = req.params.id;

            const user = await UserService.getById(userId, requestingUser.companyId);
            if (!user) {
                res.json(softError("User not found"));
                return;
            }

            // Define allowed fields for update (prevent unauthorized field modifications)
            const allowedFields: (keyof IUser)[] = ["name", "email", "department", "isActive"];

            // Sanitize input: only allow whitelisted fields
            const sanitizedData: Partial<IUser> = {};

            allowedFields.forEach(field => {
                if (field in req.body && req.body[field] !== undefined) {
                    const value = req.body[field];

                    // Allow email validation
                    if (field === "email" && typeof value === "string") {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (emailRegex.test(value.trim())) {
                            (sanitizedData as Record<string, string | boolean>)[field] = value.trim();
                        }
                    }
                    // Sanitize string fields (trim whitespace, prevent empty strings)
                    else if (typeof value === "string") {
                        const trimmed = String(value).trim();
                        if (trimmed.length > 0) {
                            (sanitizedData as Record<string, string | boolean>)[field] = trimmed;
                        }
                    }
                    // Allow boolean values
                    else if (typeof value === "boolean") {
                        (sanitizedData as Record<string, string | boolean>)[field] = value;
                    }
                    // Allow other valid types
                    else if (value !== null && value !== undefined) {
                        (sanitizedData as Record<string, string | boolean>)[field] = value;
                    }
                }
            });

            if (Object.keys(sanitizedData).length === 0) {
                res.json(softError("No valid fields provided for update"));
                return;
            }

            const updatedUser = await UserService.update(userId, sanitizedData, requestingUser.companyId);
            if (!updatedUser) {
                res.json(softError("User not found"));
                return;
            }
            res.json(success({ user: updatedUser }));
        } catch (error: any) {
            console.log("Error in UserController.update:", error);
            res.json(softError(error.message, error));
        }
    }

    static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }

            const userId = req.params.id;
            const { currentPassword, newPassword } = req.body as {
                currentPassword?: string;
                newPassword?: string;
            };

            if (requestingUser.id !== userId) {
                res.json(softError("You can only change your own password"));
                return;
            }

            if (!currentPassword || !newPassword) {
                res.json(softError("Current password and new password are required"));
                return;
            }

            if (newPassword.length < 6) {
                res.json(softError("New password must be at least 6 characters"));
                return;
            }

            await UserService.changePassword(userId, currentPassword, newPassword, requestingUser.companyId);
            res.json(success({}));
        } catch (error: any) {
            console.log("Error in UserController.changePassword:", error);
            res.json(softError(error.message, error));
        }
    }

    static async grantPermission(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }

            const userId = req.params.id;
            const permissionKey = String(req.body.permissionKey || "").trim();

            if (!permissionKey) {
                res.json(softError("permissionKey is required"));
                return;
            }

            if (!UserController.isValidPermissionKey(permissionKey)) {
                res.json(softError("Invalid permission key"));
                return;
            }

            const targetUser = await UserService.getById(userId, requestingUser.companyId, ["_id"]);
            if (!targetUser) {
                res.json(softError("User not found"));
                return;
            }

            await UserService.grantPermission(userId, permissionKey, requestingUser.companyId);
            res.json(success({ userId, permissionKey }));
        } catch (error: any) {
            console.log("Error in UserController.grantPermission:", error);
            res.json(softError(error.message, error));
        }
    }

    static async revokePermission(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }

            const userId = req.params.id;
            const permissionKey = String(req.body.permissionKey || "").trim();

            if (!permissionKey) {
                res.json(softError("permissionKey is required"));
                return;
            }

            if (!UserController.isValidPermissionKey(permissionKey)) {
                res.json(softError("Invalid permission key"));
                return;
            }

            const targetUser = await UserService.getById(userId, requestingUser.companyId, ["_id"]);
            if (!targetUser) {
                res.json(softError("User not found"));
                return;
            }

            await UserService.revokePermission(userId, permissionKey, requestingUser.companyId);
            res.json(success({ userId, permissionKey }));
        } catch (error: any) {
            console.log("Error in UserController.revokePermission:", error);
            res.json(softError(error.message, error));
        }
    }
}
