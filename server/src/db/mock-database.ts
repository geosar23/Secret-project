/**
 * Mock Database
 * Centralized in-memory data store for development/testing
 * Enable by setting USE_MOCK_DB=true in .env
 */

import { IUser } from "../interfaces/user.interface";
import { DefaultUserRoles } from "../enums/user-role.enum";
import { IRole } from "../interfaces/role.interface";
import { IPermission } from "../interfaces/permission.interface";
import { PermissionCategories } from "../enums/permissions.enum";

// ============================================================================
// Mock Roles Collection
// ============================================================================

export const mockRoles: IRole[] = [
    {
        _id: "role-god",
        role: DefaultUserRoles.GOD,
        name: "God",
        description: "System super user with unrestricted access across all companies",
        level: 100,
        permissions: ["*"], // All permissions
        isSystemRole: true,
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "role-super-admin",
        role: DefaultUserRoles.SUPER_ADMIN,
        name: "Super Admin",
        description: "Company owner with full control over company resources",
        level: 90,
        permissions: ["company:*", "employees:*", "leaves:*", "departments:*", "reports:*", "users:*"],
        isSystemRole: true,
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "role-admin",
        role: DefaultUserRoles.ADMIN,
        name: "Admin",
        description: "Administrator with broad permissions but cannot delete critical resources",
        level: 80,
        permissions: [
            "company:settings:*",
            "company:billing:*",
            "company:view:*",
            "company:edit:*",
            "employees:view:*",
            "employees:create:*",
            "employees:edit:*",
            "employees:salary:*",
            "leaves:view:*",
            "leaves:approve:*",
            "leaves:request:*",
            "leaves:cancel:*",
            "departments:view:*",
            "departments:create:*",
            "departments:edit:*",
            "reports:view:*",
            "reports:export:*",
            "users:view:*",
            "users:create:*",
            "users:roles:*",
        ],
        isSystemRole: true,
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "role-hr",
        role: DefaultUserRoles.HR,
        name: "HR Manager",
        description: "Human Resources manager with employee and leave management permissions",
        level: 70,
        permissions: [
            "employees:view:all",
            "employees:create:all",
            "employees:edit:all",
            "employees:salary:view",
            "employees:salary:edit",
            "leaves:view:all",
            "leaves:approve:all",
            "leaves:cancel:all",
            "departments:view:all",
            "reports:view:all",
            "users:view:all",
        ],
        isSystemRole: true,
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "role-manager",
        role: DefaultUserRoles.MANAGER,
        name: "Manager",
        description: "Department or team manager with limited management permissions",
        level: 60,
        permissions: [
            "employees:view:managed",
            "employees:edit:managed",
            "leaves:view:managed",
            "leaves:approve:managed",
            "departments:view:all",
            "reports:view:department",
        ],
        isSystemRole: true,
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "role-employee",
        role: DefaultUserRoles.EMPLOYEE,
        name: "Employee",
        description: "Regular employee with basic self-service permissions",
        level: 50,
        permissions: [
            "employees:view:self",
            "employees:edit:self",
            "leaves:view:self",
            "leaves:request:self",
            "leaves:cancel:self",
            "departments:view:all",
        ],
        isSystemRole: true,
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
];

// ============================================================================
// Mock Permissions Collection
// ============================================================================

export const mockPermissions: IPermission[] = [
    // System Permissions
    {
        _id: "perm-1",
        key: "system.all",
        name: "System Administrator",
        description: "Unrestricted access to all resources across all companies",
        category: PermissionCategories.SETTINGS,
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
];

// Mock Users Collection
// Test credentials: password123 for all users
// Company structure: Company A (companyId: "company-a"), Company B (companyId: "company-b")
// Departments: dept-eng (Engineering), dept-hr (HR), dept-sales (Sales)
export const mockUsers: IUser[] = [
    {
        _id: "1",
        name: "God User",
        email: "god@system.com",
        role: DefaultUserRoles.GOD,
        password: "$2a$10$ZLtIHiqNSJoW1qG//nrfTubOrYz/eTxHMJb.HbZB/Tq3Lwy5tNT8e", // password123
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        // GOD has no company restriction
    },
    {
        _id: "2",
        name: "Super Admin A",
        email: "superadmin@companya.com",
        role: DefaultUserRoles.SUPER_ADMIN,
        companyId: "company-a",
        password: "$2a$10$ZLtIHiqNSJoW1qG//nrfTubOrYz/eTxHMJb.HbZB/Tq3Lwy5tNT8e", // password123
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "3",
        name: "Admin A",
        email: "admin@companya.com",
        role: DefaultUserRoles.ADMIN,
        companyId: "company-a",
        password: "$2a$10$ZLtIHiqNSJoW1qG//nrfTubOrYz/eTxHMJb.HbZB/Tq3Lwy5tNT8e", // password123
        isActive: true,
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date("2024-01-02"),
    },
    {
        _id: "4",
        name: "HR Manager A",
        email: "hr@companya.com",
        role: DefaultUserRoles.HR,
        companyId: "company-a",
        departmentId: "dept-hr",
        password: "$2a$10$ZLtIHiqNSJoW1qG//nrfTubOrYz/eTxHMJb.HbZB/Tq3Lwy5tNT8e", // password123
        isActive: true,
        createdAt: new Date("2024-01-05"),
        updatedAt: new Date("2024-01-05"),
    },
    {
        _id: "5",
        name: "Engineering Manager",
        email: "eng-manager@companya.com",
        role: DefaultUserRoles.MANAGER,
        companyId: "company-a",
        departmentId: "dept-eng",
        managedDepartments: ["dept-eng"],
        password: "$2a$10$ZLtIHiqNSJoW1qG//nrfTubOrYz/eTxHMJb.HbZB/Tq3Lwy5tNT8e", // password123
        isActive: true,
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
    },
    {
        _id: "6",
        name: "John Developer",
        email: "john@companya.com",
        role: DefaultUserRoles.EMPLOYEE,
        companyId: "company-a",
        departmentId: "dept-eng",
        managerId: "5", // Managed by Engineering Manager
        password: "$2a$10$ZLtIHiqNSJoW1qG//nrfTubOrYz/eTxHMJb.HbZB/Tq3Lwy5tNT8e", // password123
        isActive: true,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
    },
    {
        _id: "7",
        name: "Jane Developer",
        email: "jane@companya.com",
        role: DefaultUserRoles.EMPLOYEE,
        companyId: "company-a",
        departmentId: "dept-eng",
        managerId: "5", // Managed by Engineering Manager
        password: "$2a$10$ZLtIHiqNSJoW1qG//nrfTubOrYz/eTxHMJb.HbZB/Tq3Lwy5tNT8e", // password123
        isActive: true,
        createdAt: new Date("2024-01-20"),
        updatedAt: new Date("2024-01-20"),
        // Example: Jane has extra permission granted
        grantedPermissions: [
            {
                permission: "reports.view",
                grantedBy: "2", // Granted by Super Admin
                grantedAt: new Date("2024-02-01"),
                expiresAt: new Date("2024-12-31"),
                reason: "Needs access for team reporting",
                scope: "company",
            },
        ],
    },
    {
        _id: "8",
        name: "Bob Sales",
        email: "bob@companya.com",
        role: DefaultUserRoles.EMPLOYEE,
        companyId: "company-a",
        departmentId: "dept-sales",
        password: "$2a$10$ZLtIHiqNSJoW1qG//nrfTubOrYz/eTxHMJb.HbZB/Tq3Lwy5tNT8e", // password123
        isActive: true,
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
    },
    {
        _id: "9",
        name: "Super Admin B",
        email: "superadmin@companyb.com",
        role: DefaultUserRoles.SUPER_ADMIN,
        companyId: "company-b",
        password: "$2a$10$ZLtIHiqNSJoW1qG//nrfTubOrYz/eTxHMJb.HbZB/Tq3Lwy5tNT8e", // password123
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "10",
        name: "Alice Employee B",
        email: "alice@companyb.com",
        role: DefaultUserRoles.EMPLOYEE,
        companyId: "company-b",
        password: "$2a$10$ZLtIHiqNSJoW1qG//nrfTubOrYz/eTxHMJb.HbZB/Tq3Lwy5tNT8e", // password123
        isActive: true,
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
    },
];

// Add more collections as needed
// export const mockProducts: Product[] = [];
// export const mockOrders: Order[] = [];

/**
 * Mock Database Operations
 */

export class MockDatabase {
    // User operations
    static getAllUsers(): IUser[] {
        console.log("MockDatabase.getAllUsers called");
        return mockUsers;
    }

    static getUserById(id: string): IUser | undefined {
        return mockUsers.find(user => user._id === id);
    }

    static getUserByEmail(email: string): IUser | undefined {
        return mockUsers.find(user => user.email === email);
    }

    static createUser(userData: Omit<IUser, "_id">): IUser {
        const newUser: IUser = {
            _id: String(mockUsers.length + 1),
            ...userData,
        };
        mockUsers.push(newUser);
        return newUser;
    }

    static updateUser(id: string, updates: Partial<IUser>): IUser | null {
        const index = mockUsers.findIndex(user => user._id === id);
        if (index === -1) return null;

        mockUsers[index] = {
            ...mockUsers[index],
            ...updates,
        };
        return mockUsers[index];
    }

    static deleteUser(id: string): boolean {
        const index = mockUsers.findIndex(user => user._id === id);
        if (index === -1) return false;

        mockUsers.splice(index, 1);
        return true;
    }

    // Role operations
    static getAllRoles(): IRole[] {
        return mockRoles;
    }

    static getRoleById(id: string): IRole | undefined {
        return mockRoles.find(role => role._id === id);
    }

    static getRoleByType(roleType: DefaultUserRoles): IRole | undefined {
        return mockRoles.find(role => role.role === roleType);
    }

    static getRolesByCompany(companyId?: string): IRole[] {
        return mockRoles.filter(role => role.companyId === companyId || !role.companyId);
    }

    static createRole(roleData: Omit<IRole, "_id">): IRole {
        const newRole: IRole = {
            _id: `role-${mockRoles.length + 1}`,
            ...roleData,
        };
        mockRoles.push(newRole);
        return newRole;
    }

    static updateRole(id: string, updates: Partial<IRole>): IRole | null {
        const index = mockRoles.findIndex(role => role._id === id);
        if (index === -1) return null;

        // Prevent modification of system roles
        if (mockRoles[index].isSystemRole) {
            throw new Error("Cannot modify system roles");
        }

        mockRoles[index] = {
            ...mockRoles[index],
            ...updates,
            updatedAt: new Date(),
        };
        return mockRoles[index];
    }

    static deleteRole(id: string): boolean {
        const index = mockRoles.findIndex(role => role._id === id);
        if (index === -1) return false;

        // Prevent deletion of system roles
        if (mockRoles[index].isSystemRole) {
            throw new Error("Cannot delete system roles");
        }

        mockRoles.splice(index, 1);
        return true;
    }

    // Permission operations
    static getAllPermissions(): IPermission[] {
        return mockPermissions;
    }

    static getPermissionById(id: string): IPermission | undefined {
        return mockPermissions.find(perm => perm._id === id);
    }

    static getPermissionsByCategory(category: string): IPermission[] {
        return mockPermissions.filter(perm => perm.category === category);
    }

    static getPermissionCategories(): string[] {
        return [...new Set(mockPermissions.map(perm => perm.category))];
    }

    // Helper: Get permissions for a role
    static getPermissionsForRole(roleType: DefaultUserRoles): string[] {
        const role = this.getRoleByType(roleType);
        return role?.permissions || [];
    }

    // Helper: Get role hierarchy
    static getRoleHierarchy(): IRole[] {
        return mockRoles.sort((a, b) => b.level - a.level);
    }

    // Helper: Check if role A is higher than role B
    static isHigherRole(roleA: DefaultUserRoles, roleB: DefaultUserRoles): boolean {
        const roleAData = this.getRoleByType(roleA);
        const roleBData = this.getRoleByType(roleB);
        if (!roleAData || !roleBData) return false;
        return roleAData.level > roleBData.level;
    }
}
