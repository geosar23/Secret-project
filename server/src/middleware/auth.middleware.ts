import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { tokenPayload } from "../interfaces/auth.interface";
import { AuthenticatedRequest } from "../interfaces/auth.interface";
import { config } from "../config/env";
import { unauthorizedError } from "../utils/response.util";

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return unauthorizedError(res);
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as tokenPayload;

        if (!decoded?.companyId || !decoded?.id) {
            return unauthorizedError(res);
        }

        req.decoded = decoded;
        next();
    } catch {
        return unauthorizedError(res);
    }
};
