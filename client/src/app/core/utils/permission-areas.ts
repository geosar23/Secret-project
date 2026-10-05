import { PermissionKeys } from "../enums/permissions.enum";

export type ManagementArea =
    | "users"
    | "roles"
    | "departments"
    | "subDepartments"
    | "employmentTitles"
    | "countries"
    | "levels"
    | "offices";

interface AreaPermissions {
    read: readonly string[];
    write: readonly string[];
}

const readWriteAll = (read: string, write: string): AreaPermissions => ({ read: [read], write: [write] });

/** Permissions that gate each management page. A page is visible with any read or write key. */
export const AREA_PERMISSIONS: Record<ManagementArea, AreaPermissions> = {
    users: {
        read: [
            PermissionKeys.USERS_MANAGEMENT_READ_ALL,
            PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT,
            PermissionKeys.USERS_MANAGEMENT_READ_COUNTRY,
            PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT_COUNTRY,
            PermissionKeys.USERS_MANAGEMENT_READ_MANAGED,
            PermissionKeys.USERS_MANAGEMENT_READ_SELF,
        ],
        write: [
            PermissionKeys.USERS_MANAGEMENT_WRITE_ALL,
            PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT,
            PermissionKeys.USERS_MANAGEMENT_WRITE_COUNTRY,
            PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT_COUNTRY,
            PermissionKeys.USERS_MANAGEMENT_WRITE_MANAGED,
            PermissionKeys.USERS_MANAGEMENT_WRITE_SELF,
        ],
    },
    roles: readWriteAll(PermissionKeys.ROLES_MANAGEMENT_READ_ALL, PermissionKeys.ROLES_MANAGEMENT_WRITE_ALL),
    departments: readWriteAll(
        PermissionKeys.DEPARTMENTS_MANAGEMENT_READ_ALL,
        PermissionKeys.DEPARTMENTS_MANAGEMENT_WRITE_ALL,
    ),
    subDepartments: readWriteAll(
        PermissionKeys.SUB_DEPARTMENTS_MANAGEMENT_READ_ALL,
        PermissionKeys.SUB_DEPARTMENTS_MANAGEMENT_WRITE_ALL,
    ),
    employmentTitles: readWriteAll(
        PermissionKeys.EMPLOYMENT_TITLES_MANAGEMENT_READ_ALL,
        PermissionKeys.EMPLOYMENT_TITLES_MANAGEMENT_WRITE_ALL,
    ),
    countries: readWriteAll(
        PermissionKeys.COUNTRIES_MANAGEMENT_READ_ALL,
        PermissionKeys.COUNTRIES_MANAGEMENT_WRITE_ALL,
    ),
    levels: readWriteAll(PermissionKeys.LEVELS_MANAGEMENT_READ_ALL, PermissionKeys.LEVELS_MANAGEMENT_WRITE_ALL),
    offices: readWriteAll(PermissionKeys.OFFICES_MANAGEMENT_READ_ALL, PermissionKeys.OFFICES_MANAGEMENT_WRITE_ALL),
};
