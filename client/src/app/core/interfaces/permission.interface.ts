import { PermissionCategories, PermissionKeys } from "../enums/permissions.enum";

export type PermissionKey = (typeof PermissionKeys)[keyof typeof PermissionKeys];

export interface IPermissionItem {
    category: PermissionCategories;
    permissions: IUserPermissionItem[];
}

export interface IUserPermissionItem {
    key: string;
    hasPermission: boolean;
}
