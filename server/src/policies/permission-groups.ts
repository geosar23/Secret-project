import { PermissionKeys } from "../enums/permissions.enum";

/** Holders may read the reference data (roles, countries) that the user create/edit forms depend on. */
export const USER_FORM_REFERENCE_READ_PERMISSIONS: string[] = [
    PermissionKeys.USERS_MANAGEMENT_WRITE_ALL,
    PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT,
    PermissionKeys.USERS_MANAGEMENT_WRITE_COUNTRY,
    PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT_COUNTRY,
    PermissionKeys.USERS_MANAGEMENT_WRITE_MANAGED,
    PermissionKeys.USERS_MANAGEMENT_WRITE_SELF,
    PermissionKeys.USER_CREATE_WRITE_ALL,
    PermissionKeys.USER_CREATE_WRITE_DEPARTMENT,
    PermissionKeys.USER_CREATE_WRITE_COUNTRY,
    PermissionKeys.USER_CREATE_WRITE_DEPARTMENT_COUNTRY,
    PermissionKeys.USER_CREATE_WRITE_MANAGED,
];
