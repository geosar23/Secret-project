import { NextFunction, Response } from "express";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest } from "../interfaces/auth.interface";
import { DefaultUserRoles } from "../enums/user-role.enum";

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
            const params = {
                page: req.query.page ? parseInt(req.query.page as string) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
                search: req.query.search as string,
                sortBy: req.query.sortBy as string,
                sortOrder: req.query.sortOrder as "asc" | "desc",
                role: req.query.role as string,
                companyId: req.query.companyId as string,
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
                params.companyId = user.companyId as string;
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
}
