import { NextFunction, Response } from "express";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest } from "../interfaces/auth.interface";
import { DefaultUserRoles } from "../enums/user-role.enum";
import { IUser, IUsersQueryParams } from "../interfaces/user.interface";

export class UserController {
    static async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            // Get requesting user from JWT token (set by auth middleware)
            const requestingUser = req.decoded;

            if (!requestingUser) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            // Parse query parameters
            const params: IUsersQueryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
                search: req.query.search as string,
                sortBy: req.query.sortBy as string,
                sortOrder: req.query.sortOrder as "asc" | "desc",
                role: req.query.role as string,
                companyId: req.query.companyId as string,
                departmentId: req.query.departmentId as string,
                isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
            };

            // Authorization: Enforce company-level data access
            if (requestingUser.role !== DefaultUserRoles.GOD) {
                //Fetch requesting user
                const user = await UserService.getById(requestingUser.id);
                if (!user) {
                    res.status(404).json({ message: "Requesting user not found" });
                    return;
                }
                params.companyId = user.company?.toString() as string;
            }

            const users = await UserService.getUsers(params);
            res.status(200).json(users);
        } catch (error) {
            console.log("Error in UserController.getUsers:", error);
            res.status(500).json({ message: "Internal server error" });
            next(error);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            console.log("UserController.create called with body:", req.body);
            const newUser = await UserService.create(req.body);
            res.status(201).json(newUser);
        } catch (error) {
            console.log("Error in UserController.create:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.params.id;
            const selectFields = req.query.fields ? (req.query.fields as string).split(",") : undefined;
            const user = await UserService.getById(userId, selectFields);
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            res.status(200).json(user);
        } catch (error) {
            console.log("Error in UserController.getById:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.params.id;

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
                res.status(400).json({ message: "No valid fields provided for update" });
                return;
            }

            const updatedUser = await UserService.update(userId, sanitizedData);
            if (!updatedUser) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            res.status(200).json(updatedUser);
        } catch (error) {
            console.log("Error in UserController.update:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
}
