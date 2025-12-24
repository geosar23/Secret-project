import { PermissionActions, PermissionCategories, PermissionKeys, PermissionScopes } from "../enums/permissions.enum";

export type PermissionKey = (typeof PermissionKeys)[keyof typeof PermissionKeys];
export interface IPermissionDefinition {
    key: PermissionKey;
    category: PermissionCategories;
    action: PermissionActions;
    scopes: PermissionScopes[];
    name: string;
    description: string;
}

/**
 * Context for attribute-based access control
 */
export interface AccessContext<TResource = unknown> {
    actor: {
        id: string;
        companyId: string;
        departmentId?: string;
        countryId?: string;
        managerId?: string;
        permissions: Set<PermissionKey>;
    };

    resource: TResource;

    action: PermissionActions;
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
