export enum PermissionCategories {
    USERS_MANAGEMENT = "usersManagement",
    USER_PROFILE = "userProfile",
}

export enum PermissionScopes {
    ALL = "*",
    COMPANY = "company",
    DEPARTMENT = "department",
    COUNTRY = "country",
    DEPARTMENT_COUNTRY = "department-country",
    MANAGED = "managed",
    OWN = "own",
    SELF = "self",
}

export enum PermissionActions {
    ALL = "*",
    READ = "read",
}
