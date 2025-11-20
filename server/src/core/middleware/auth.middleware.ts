import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "./authorize.middleware";

interface JwtPayload {
    id: string;
    email: string;
    name?: string;
    role?: string;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        req.decoded = decoded;
        next();
    } catch {
        return res.status(403).json({ message: "Invalid token" });
    }
};
