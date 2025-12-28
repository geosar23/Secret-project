import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";

export const AuthController = {
    login: async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: "Email and password are required" });
            }

            const result = await AuthService.login({ email, password });
            res.status(200).json(result);
        } catch (error) {
            console.log(error);
            res.status(401).json({ message: "Invalid email or password" });
        }
    },

    me: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const token = req.headers.authorization?.replace("Bearer ", "");

            if (!token) {
                return res.status(401).json({ message: "No token provided" });
            }

            const decoded = AuthService.verifyToken(token);
            const userId = (decoded as tokenPayload).id;
            const user = await UserService.getById(userId, (decoded as tokenPayload).companyId);

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            res.status(200).json({ user });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid token";
            res.status(401).json({ message });
        }
    },
};
