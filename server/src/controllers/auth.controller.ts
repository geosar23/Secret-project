/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { success, softError } from "../utils/response.util";

export const AuthController = {
    login: async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.json(softError("Invalid credentials"));
            }

            const result = await AuthService.login({ email, password });
            res.json(success(result));
        } catch (err) {
            console.log("Error in AuthController.login:", err);
            res.json(softError("Invalid credentials"));
        }
    },

    me: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const token = req.headers.authorization?.replace("Bearer ", "");

            if (!token) {
                return res.json(softError("No token provided"));
            }

            const decoded = AuthService.verifyToken(token) as tokenPayload;
            const user = await UserService.getById(decoded.id, decoded.companyId);

            if (!user) {
                return res.json(softError("User not found"));
            }

            res.json(success({ user }));
        } catch (err: any) {
            console.log("Error in AuthController.me:", err);
            res.json(softError(err.message, err));
        }
    },

    resetPassword: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { userId, newPassword } = req.body;

            if (!userId || !newPassword) {
                return res.json(softError("userId and newPassword are required"));
            }

            const payload = req.decoded as tokenPayload;
            await UserService.resetPasswordForUser(userId, newPassword, payload.companyId);

            res.json(success({ message: "Password reset successfully" }));
        } catch (err: any) {
            console.log("Error in AuthController.resetPassword:", err);
            res.json(softError(err.message, err));
        }
    },
};
