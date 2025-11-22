export interface GrantedPermission {
    permission: string;
    grantedBy: string;
    grantedAt: Date;
    expiresAt?: Date;
    reason?: string;
    scope?: string;
}

export interface PermissionHistory {
    granted: GrantedPermission[];
    revoked: string[];
}

export interface PermissionCategory {
    name: string;
    permissions: PermissionItem[];
}

export interface PermissionItem {
    permission: string;
    description: string;
    hasPermission: boolean;
}

export interface PermissionDefinition {
    permission: string;
    description: string;
    category: string;
}
