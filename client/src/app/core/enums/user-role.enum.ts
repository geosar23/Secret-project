/**
 * Role enumeration
 * Values match server-side enum (lowercase with underscores)
 * Hierarchy: SUPER_ADMIN > ADMIN > HR > MANAGER > EMPLOYEE
 */
export enum UserRole {
    SUPER_ADMIN = "super_admin",
    ADMIN = "admin",
    HR = "hr",
    MANAGER = "manager",
    EMPLOYEE = "employee",
}
