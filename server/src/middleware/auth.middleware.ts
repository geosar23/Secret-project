import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { tokenPayload } from "../interfaces/auth.interface";
import { AuthenticatedRequest } from "../interfaces/auth.interface";
import { config } from "../config/env";
import { userRepository } from "../repositories/user.repository";
import { passwordChangeRequiredError, unauthorizedError } from "../utils/response.util";

// While a temporary password is in use, the user may only read their own profile and change the password.
const ALLOWED_WHILE_PASSWORD_CHANGE_REQUIRED = [
    { method: "GET", path: /^\/api\/auth\/me$/ },
    { method: "PUT", path: /^\/api\/users\/[^/]+\/change-password$/ },
];

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return unauthorizedError(res);
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as tokenPayload;

        if (!decoded?.companyId || !decoded?.id) {
            return unauthorizedError(res);
        }

        // One small read per request: it is what lets a password change (or a forced logout) end older JWTs.
        const user = await userRepository(decoded.companyId)
            .findById(decoded.id)
            .select("jwtTokenRevokedAt mustChangePassword")
            .lean();
        if (!user) {
            return unauthorizedError(res);
        }

        // The token carries the revocation marker it was issued under; any later revocation makes it differ.
        // (An exact match, unlike comparing iat, has no one-second blind spot.)
        const currentMarker = user.jwtTokenRevokedAt ? user.jwtTokenRevokedAt.getTime() : 0;
        if ((decoded.jtr ?? 0) !== currentMarker) {
            return unauthorizedError(res);
        }

        if (user.mustChangePassword) {
            const path = req.originalUrl.split("?")[0];
            const allowed = ALLOWED_WHILE_PASSWORD_CHANGE_REQUIRED.some(
                r => r.method === req.method && r.path.test(path),
            );
            if (!allowed) {
                return passwordChangeRequiredError(res);
            }
        }

        req.decoded = decoded;
        next();
    } catch {
        return unauthorizedError(res);
    }
};
