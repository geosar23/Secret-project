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
    name: string;
    permissions: IPermissionItem[];
}

export interface IPermissionItem {
    permission: string;
    description: string;
    hasPermission: boolean;
}

export interface IPermissionDefinition {
    permission: string;
    description: string;
    category: string;
}
