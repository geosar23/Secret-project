import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../interfaces/auth.interface";
import { UserService } from "../services/user.service";
import { DefaultUserRoles } from "../enums/user-role.enum";

/**
 * Company Middleware: Extracts and attaches company ID from user's JWT token
 * Sets req.companyId for use in subsequent middleware and route handlers
 * GOD role users can access all data without company restrictions
 */
export const companyMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const decoded = req.decoded;

        if (!decoded) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // GOD role users don't have company restrictions
        if (decoded.role === DefaultUserRoles.GOD) {
            decoded.company = undefined;
            return next();
        }

        // Fetch user to get their company
        const user = await UserService.getById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Attach company ID to request
        decoded.company = user.company?.toString();

        // If user has no company, they shouldn't access multi-company data
        if (!decoded.company) {
            return res.status(403).json({ message: "User must belong to a company to access data" });
        }

        next();
    } catch (error) {
        next(error);
    }
};
