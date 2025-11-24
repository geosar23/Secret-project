import { PermissionActions, PermissionCategories, PermissionScopes } from "../enums/permissions.enum";
import { IUser } from "./user.interface";
import { Request } from "express";

export interface IPermission {
    _id: string;
    key: string; // Unique key: e.g., "users.create", "requests.leaves.approve"
    name: string; // Human-readable name: e.g., "Create Users", "Approve Leave Requests"
    description: string; // Detailed description of what this permission allows
    category: PermissionCategories; // Category for grouping in UI (uses PermissionCategories enum)
    scope?: PermissionScopes; // Optional scope for the permission (uses PermissionScopes enum)
    action?: PermissionActions; // Specific action of the permission: e.g., "view", "create", "edit"
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
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
