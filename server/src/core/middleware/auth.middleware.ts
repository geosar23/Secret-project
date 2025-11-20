import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserService } from "../../modules/users/user.service";
import { AuthenticatedRequest } from "./authorize.middleware";

interface JwtPayload {
    id: string;
    email: string;
    name?: string;
    role?: string;
}

export const authMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

        // Load full user from database
        const user = await UserService.getById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({ message: "User not found or inactive" });
        }

        // Attach user to request
        req.user = user;
        req.decoded = decoded;
        next();
    } catch {
        return res.status(403).json({ message: "Invalid token" });
    }
};
