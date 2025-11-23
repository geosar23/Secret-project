import { Request, Response } from "express";
import { UserService } from "../services/user.service";

export const UserController = {
    getUsers: async (req: Request, res: Response) => {
        try {
            const params = req.query;
            console.log("UserController.getUsers called with params:", params);

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
