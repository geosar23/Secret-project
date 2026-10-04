/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import {
    success,
    softError,
    hardError,
    badRequestError,
    unauthorizedError,
    forbiddenError,
} from "../utils/response.util";
import { canActorAccessSubject } from "../middleware/permission.middleware";
import { PermissionCategories, PermissionActions } from "../enums/permissions.enum";

export const AuthController = {
    login: async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return badRequestError(res);
            }

            const result = await AuthService.login({ email, password });
            res.json(success(result));
        } catch (err) {
            console.log("Error in AuthController.login:", err);
            return unauthorizedError(res);
        }
    },

    me: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const token = req.headers.authorization?.replace("Bearer ", "");

            if (!token) {
                return unauthorizedError(res);
            }

            let decoded: tokenPayload;
            try {
                decoded = AuthService.verifyToken(token) as tokenPayload;
            } catch {
                return unauthorizedError(res);
            }

            const user = await UserService.getById(decoded.id, decoded.companyId);

            if (!user) {
                return res.json(softError("User not found"));
            }

            res.json(success({ user }));
        } catch (err: any) {
            console.log("Error in AuthController.me:", err);
            return hardError(res);
        }
    },

    resetPassword: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { userId, newPassword } = req.body;

            if (!userId || !newPassword) {
                return res.json(softError("userId and newPassword are required"));
            }

            const payload = req.decoded as tokenPayload;

            const [actorUser, subjectUser] = await Promise.all([
                UserService.getById(payload.id, payload.companyId),
                UserService.getById(userId, payload.companyId),
            ]);

            if (!actorUser) {
                return unauthorizedError(res);
            }

            if (!subjectUser) {
                return res.json(softError("User not found"));
            }

            const hasAccess = canActorAccessSubject(
                actorUser,
                subjectUser,
                PermissionCategories.RESET_PASSWORD,
                PermissionActions.WRITE,
            );
            if (!hasAccess) {
                return forbiddenError(res);
            }

            await UserService.resetPasswordForUser(userId, newPassword, payload.companyId);

            res.json(success({ message: "Password reset successfully" }));
        } catch (err: any) {
            console.log("Error in AuthController.resetPassword:", err);
            return hardError(res);
        }
    },
};
