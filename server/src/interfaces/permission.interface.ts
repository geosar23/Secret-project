import { IUser } from "./user.interface";
import { Request } from "express";

export interface IPermission {
    _id: string;
    permission: string; // Format: entity:action:scope
    entity: string; // e.g., "employees", "leaves", "company"
    action: string; // e.g., "view", "create", "edit", "delete"
    scope: string; // e.g., "all", "department", "managed", "self"
    description: string;
    category: string; // For grouping in UI
    isActive: boolean;
    createdAt: Date;
}

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
