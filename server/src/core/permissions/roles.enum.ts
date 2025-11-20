/**
 * User roles in the HR SAAS system
 * Hierarchy: GOD > SUPER_ADMIN > ADMIN > HR > MANAGER > EMPLOYEE
 */
export enum UserRole {
    GOD = "god", // System administrator (developer) - cross-company access
    SUPER_ADMIN = "super_admin", // Company owner - full company control
    ADMIN = "admin", // Company admin - most permissions except delete
    HR = "hr", // HR staff - employee and leave management
    MANAGER = "manager", // Department/team manager - team-level access
    EMPLOYEE = "employee", // Regular employee - own data only
}
