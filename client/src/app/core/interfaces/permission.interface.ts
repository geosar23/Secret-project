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
    key: string;
    description: string;
    hasPermission: boolean;
}

export interface IPermissionDefinition {
    key: string;
    description: string;
    category: string;
}
