/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Response } from "express";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
// import { DefaultUserRoles } from "../enums/user-role.enum";
import { IUser, IUsersQueryParams } from "../interfaces/user.interface";
import { success, softError } from "../util/response.util";

export class UserController {
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

            const users = await UserService.getUsers(params, requestingUser.companyId);
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
}
