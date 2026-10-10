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
import { notifyTemporaryPassword } from "../services/email/email.notifications";
import { AuditService } from "../services/audit.service";
import { PasswordSetupError, PasswordSetupService, runInBackground } from "../services/password-setup.service";
import { authLog } from "../utils/auth-log.util";
import { PermissionCategories, PermissionActions } from "../enums/permissions.enum";

const FORGOT_PASSWORD_MESSAGE = "If an account exists for that email, a reset link is on its way.";

const PASSWORD_SETUP_MESSAGES: Record<PasswordSetupError["code"], (minLength?: number) => string> = {
    invalid: () => "This link is not valid. Request a new one.",
    expired: () => "This link has expired. Request a new one.",
    used: () => "This link has already been used. Request a new one if you still need it.",
    weak_password: minLength => `Password must be at least ${minLength} characters.`,
};

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

    /** Admin action: emails the user a random temporary password they must change on first sign-in. */
    resetPassword: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { userId } = req.body;

            if (!userId) {
                return res.json(softError("userId is required"));
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

            const { temporaryPassword, expiresInHours } = await UserService.issueTemporaryPassword(
                userId,
                payload.companyId,
            );

            authLog("password_reset.by_admin", { actorId: payload.id, userId, companyId: payload.companyId });
            await AuditService.record(payload.companyId, {
                actor: payload.id,
                entity: "user",
                entityId: userId,
                action: "password_reset_by_admin",
                before: { password: "previous" },
                after: { password: "temporary" },
            }).catch(() => authLog("password_reset.audit_failed", { userId, companyId: payload.companyId }));

            // The only place the temporary password leaves the server; fire-and-forget so mail problems never affect the response.
            notifyTemporaryPassword(subjectUser, temporaryPassword, expiresInHours, req.get("x-request-id"));

            res.json(success({ message: "A temporary password was emailed to the user" }));
        } catch (err: any) {
            console.log("Error in AuthController.resetPassword:", err);
            return hardError(res);
        }
    },

    /** Public. Same response for every input; the real work happens after it is sent. */
    forgotPassword: async (req: Request, res: Response) => {
        const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
        res.json(success({ message: FORGOT_PASSWORD_MESSAGE }));
        if (email && email.length <= 254) {
            runInBackground(PasswordSetupService.requestReset(email, req.get("x-request-id")));
        }
    },

    /** Public. Redeems a link token and sets the new password. */
    passwordSetup: async (req: Request, res: Response) => {
        try {
            const { token, newPassword } = req.body ?? {};
            await PasswordSetupService.redeem(token, newPassword, req.get("x-request-id"));
            res.json(success({ message: "Password updated. You can now sign in." }));
        } catch (err: any) {
            if (err instanceof PasswordSetupError) {
                return res.json(softError(PASSWORD_SETUP_MESSAGES[err.code](err.minLength), { code: err.code }));
            }
            console.log("Error in AuthController.passwordSetup:", err);
            return hardError(res);
        }
    },
};
