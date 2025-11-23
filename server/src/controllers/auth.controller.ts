import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

export const AuthController = {
    login: async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: "Email and password are required" });
            }

            const result = await AuthService.login({ email, password });
            res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Login failed";
            res.status(401).json({ message });
        }
    },

    register: async (req: Request, res: Response) => {
        try {
            const { name, email, password, role } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({ message: "Name, email and password are required" });
            }

            const result = await AuthService.register({ name, email, password, role });
            res.status(201).json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Registration failed";
            res.status(400).json({ message });
        }
    },

    me: async (req: Request, res: Response) => {
        try {
            const token = req.headers.authorization?.replace("Bearer ", "");

            if (!token) {
                return res.status(401).json({ message: "No token provided" });
            }

            const decoded = AuthService.verifyToken(token);
            res.json(decoded);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid token";
            res.status(401).json({ message });
        }
    },
};
