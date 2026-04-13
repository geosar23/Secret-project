import { PermissionActions, PermissionCategories, PermissionKeys } from "../enums/permissions.enum";

export type PermissionKey = (typeof PermissionKeys)[keyof typeof PermissionKeys];

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

export interface IPermissionItem {
    category: PermissionCategories;
    permissions: IUserPermissionItem[];
}

export interface IUserPermissionItem {
    key: string;
    hasPermission: boolean;
}
