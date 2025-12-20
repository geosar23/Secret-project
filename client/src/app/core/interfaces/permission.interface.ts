import { PermissionActions, PermissionCategories, PermissionScopes } from "../enums/permissions.enum";

export interface IGrantedPermission {
    permission: string;
    grantedBy: string;
    grantedAt: Date;
    expiresAt?: Date;
    reason?: string;
    scope?: string;
}

export interface IPermissionHistory {
    granted: IGrantedPermission[];
    revoked: string[];
}

export interface IPermissionCategory {
    category: PermissionCategories;
    permissions: IPermissionItem[];
}

export interface IPermissionItem {
    key: string;
    description: string;
    hasPermission: boolean;
}

export interface IPermissionDefinition {
    _id: string;
    action: PermissionActions;
    createdAt: string;
    isActive: boolean;
    key: string;
    name: string;
    scope: PermissionScopes;
    description: string;
    category: PermissionCategories;
}
