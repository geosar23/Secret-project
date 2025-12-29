/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { success, softError } from "../util/response.util";

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
            const userId = decoded.id;
            const user = await UserService.getById(userId, decoded.companyId);

            if (!user) {
                return res.json(softError("User not found"));
            }

            res.json(success({ user }));
        } catch (err: any) {
            res.json(softError(err.message, err));
        }
    },
};
