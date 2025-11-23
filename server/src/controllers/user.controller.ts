import { Request, Response } from "express";
import { UserService } from "../services/user.service";

export const UserController = {
    getUsers: async (req: Request, res: Response) => {
        try {
            // Parse query parameters
            const params = {
                page: req.query.page ? parseInt(req.query.page as string) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
                search: req.query.search as string,
                sortBy: req.query.sortBy as string,
                sortOrder: req.query.sortOrder as "asc" | "desc",
                role: req.query.role as string,
                isActive:
                    req.query.isActive === "true"
                        ? true
                        : req.query.isActive === "false"
                          ? false
                          : undefined,
            };

            const users = await UserService.getUsers(params);
            res.status(200).json(users);
        } catch (error) {
            console.log("Error in UserController.getUsers:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            console.log("UserController.create called with body:", req.body);
            const newUser = await UserService.create(req.body);
            res.status(201).json(newUser);
        } catch (error) {
            console.log("Error in UserController.create:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
};
