import { IUser } from "./user.interface";
import { Request } from "express";

/**
 * Context for attribute-based access control
 */
export interface AccessContext {
    user: IUser;
    resource: Record<string, unknown>;
    action: string;
}

/**
 * Extended Request interface with user
 */
export interface AuthenticatedRequest extends Request {
    user?: IUser;
    decoded?: {
        id: string;
        email: string;
        name?: string;
        role?: string;
    };
}
