import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { tokenPayload } from "../interfaces/auth.interface";
import { AuthenticatedRequest } from "../interfaces/auth.interface";

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as tokenPayload;
        req.decoded = decoded;
        next();
    } catch {
        return res.status(403).json({ message: "Invalid token" });
    }
};
