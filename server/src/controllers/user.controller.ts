import { NextFunction, Response } from "express";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest } from "../interfaces/auth.interface";
// import { DefaultUserRoles } from "../enums/user-role.enum";
import { IUser, IUsersQueryParams } from "../interfaces/user.interface";

export class UserController {
    static async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded;
            if (!requestingUser || requestingUser.companyId) {
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
                roleId: req.query.roleId as string,
                companyId: req.query.companyId as string,
                departmentId: req.query.departmentId as string,
                isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
            };

            const users = await UserService.getUsers(params, requestingUser.companyId);
            res.status(200).json(users);
        } catch (error) {
            console.log("Error in UserController.getUsers:", error, { decoded: req.decoded, query: req.query });
            res.status(500).json({ message: "Internal server error" });
            next(error);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded;
            if (!requestingUser || requestingUser.companyId) {
                res.status(401).json({ message: "Unauthorized" });
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
            res.status(201).json(newUser);
        } catch (error) {
            console.log("Error in UserController.create:", error, { decoded: req.decoded, body: req.body });
            res.status(500).json({ message: "Internal server error" });
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded;
            if (!requestingUser || requestingUser.companyId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const userId = req.params.id;
            const selectFields = req.query.fields ? (req.query.fields as string).split(",") : undefined;
            const user = await UserService.getById(userId, requestingUser.companyId, selectFields);
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
            const requestingUser = req.decoded;
            if (!requestingUser || requestingUser.companyId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const userId = req.params.id;

            const user = await UserService.getById(userId, requestingUser.companyId);
            if (!user) {
                res.status(404).json({ message: "User not found" });
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
                res.status(400).json({ message: "No valid fields provided for update" });
                return;
            }

            const updatedUser = await UserService.update(userId, sanitizedData, requestingUser.companyId);
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
