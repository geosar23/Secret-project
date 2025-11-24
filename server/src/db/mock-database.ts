/**
 * Mock Database
 * Centralized in-memory data store for development/testing
 * Enable by setting USE_MOCK_DB=true in .env
 */

import { IUser } from "../interfaces/user.interface";
import { UserRole } from "../enums/user-role.enum";
import { IRole } from "../interfaces/role.interface";
import { IPermission } from "../interfaces/permission.interface";

// ============================================================================
// Mock Roles Collection
// ============================================================================

export const mockRoles: IRole[] = [
    {
        _id: "role-god",
        role: UserRole.GOD,
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
        role: UserRole.SUPER_ADMIN,
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
        role: UserRole.ADMIN,
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
        role: UserRole.HR,
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
        role: UserRole.MANAGER,
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
        role: UserRole.EMPLOYEE,
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
        category: "system",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-2",
        key: "system.companies.view",
        name: "View All Companies",
        description: "View all companies in the system",
        category: "system",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-3",
        key: "system.companies.manage",
        name: "Manage All Companies",
        description: "Create, edit, and delete companies in the system",
        category: "system",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },

    // Company Permissions
    {
        _id: "perm-10",
        key: "company.view",
        name: "View Company",
        description: "View company information and settings",
        category: "company",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-11",
        key: "company.edit",
        name: "Edit Company",
        description: "Edit company information and settings",
        category: "company",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-12",
        key: "company.delete",
        name: "Delete Company",
        description: "Delete company account",
        category: "company",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },

    // User Management Permissions
    {
        _id: "perm-20",
        key: "users.view",
        name: "View Users",
        description: "View user accounts in the company",
        category: "users",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-21",
        key: "users.create",
        name: "Create Users",
        description: "Create new user accounts",
        category: "users",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-22",
        key: "users.edit",
        name: "Edit Users",
        description: "Edit user account information",
        category: "users",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-23",
        key: "users.delete",
        name: "Delete Users",
        description: "Delete user accounts",
        category: "users",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-24",
        key: "users.assign_roles",
        name: "Assign User Roles",
        description: "Assign roles to user accounts",
        category: "users",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },

    // Employee Permissions
    {
        _id: "perm-30",
        key: "employees.view",
        name: "View Employees",
        description: "View employee records in the company",
        category: "employees",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-31",
        key: "employees.create",
        name: "Create Employees",
        description: "Create new employee records",
        category: "employees",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-32",
        key: "employees.edit",
        name: "Edit Employees",
        description: "Edit employee information",
        category: "employees",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-33",
        key: "employees.delete",
        name: "Delete Employees",
        description: "Delete employee records",
        category: "employees",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-34",
        key: "employees.view_salary",
        name: "View Employee Salaries",
        description: "View employee salary information",
        category: "employees",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-35",
        key: "employees.edit_salary",
        name: "Edit Employee Salaries",
        description: "Edit employee salary information",
        category: "employees",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },

    // Department Permissions
    {
        _id: "perm-40",
        key: "departments.view",
        name: "View Departments",
        description: "View department information",
        category: "departments",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-41",
        key: "departments.create",
        name: "Create Departments",
        description: "Create new departments",
        category: "departments",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-42",
        key: "departments.edit",
        name: "Edit Departments",
        description: "Edit department information",
        category: "departments",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-43",
        key: "departments.delete",
        name: "Delete Departments",
        description: "Delete departments",
        category: "departments",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },

    // Leave Request Permissions
    {
        _id: "perm-50",
        key: "requests.leaves.view",
        name: "View Leave Requests",
        description: "View leave requests",
        category: "requests.leaves",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-51",
        key: "requests.leaves.create",
        name: "Create Leave Requests",
        description: "Submit leave requests",
        category: "requests.leaves",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-52",
        key: "requests.leaves.approve",
        name: "Approve Leave Requests",
        description: "Approve or reject leave requests",
        category: "requests.leaves",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-53",
        key: "requests.leaves.cancel",
        name: "Cancel Leave Requests",
        description: "Cancel leave requests",
        category: "requests.leaves",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },

    // Additional Payment Request Permissions
    {
        _id: "perm-60",
        key: "requests.additional_payments.view",
        name: "View Additional Payment Requests",
        description: "View additional payment requests",
        category: "requests.additional_payments",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-61",
        key: "requests.additional_payments.create",
        name: "Create Additional Payment Requests",
        description: "Submit additional payment requests",
        category: "requests.additional_payments",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-62",
        key: "requests.additional_payments.approve",
        name: "Approve Additional Payment Requests",
        description: "Approve or reject additional payment requests",
        category: "requests.additional_payments",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },

    // Deduction Request Permissions
    {
        _id: "perm-70",
        key: "requests.deductions.view",
        name: "View Deduction Requests",
        description: "View deduction requests",
        category: "requests.deductions",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-71",
        key: "requests.deductions.create",
        name: "Create Deduction Requests",
        description: "Submit deduction requests",
        category: "requests.deductions",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-72",
        key: "requests.deductions.approve",
        name: "Approve Deduction Requests",
        description: "Approve or reject deduction requests",
        category: "requests.deductions",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },

    // Remote Work Request Permissions
    {
        _id: "perm-80",
        key: "requests.remote_work.view",
        name: "View Remote Work Requests",
        description: "View remote work requests",
        category: "requests.remote_work",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-81",
        key: "requests.remote_work.create",
        name: "Create Remote Work Requests",
        description: "Submit remote work requests",
        category: "requests.remote_work",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-82",
        key: "requests.remote_work.approve",
        name: "Approve Remote Work Requests",
        description: "Approve or reject remote work requests",
        category: "requests.remote_work",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },

    // Reports Permissions
    {
        _id: "perm-90",
        key: "reports.view",
        name: "View Reports",
        description: "View company reports and analytics",
        category: "reports",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-91",
        key: "reports.export",
        name: "Export Reports",
        description: "Export reports to various formats",
        category: "reports",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },

    // Role Management Permissions
    {
        _id: "perm-100",
        key: "roles.view",
        name: "View Roles",
        description: "View role definitions and permissions",
        category: "roles",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-101",
        key: "roles.create",
        name: "Create Roles",
        description: "Create custom roles",
        category: "roles",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-102",
        key: "roles.edit",
        name: "Edit Roles",
        description: "Edit role definitions and permissions",
        category: "roles",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-103",
        key: "roles.delete",
        name: "Delete Roles",
        description: "Delete custom roles",
        category: "roles",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },

    // Permission Management Permissions
    {
        _id: "perm-110",
        key: "permissions.view",
        name: "View Permissions",
        description: "View available permissions in the system",
        category: "permissions",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        _id: "perm-111",
        key: "permissions.manage",
        name: "Manage Permissions",
        description: "Activate or deactivate permissions",
        category: "permissions",
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
        role: UserRole.GOD,
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
        role: UserRole.SUPER_ADMIN,
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
        role: UserRole.ADMIN,
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
        role: UserRole.HR,
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
        role: UserRole.MANAGER,
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
        role: UserRole.EMPLOYEE,
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
        role: UserRole.EMPLOYEE,
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
        role: UserRole.EMPLOYEE,
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
        role: UserRole.SUPER_ADMIN,
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
        role: UserRole.EMPLOYEE,
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

    static getRoleByType(roleType: UserRole): IRole | undefined {
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
    static getPermissionsForRole(roleType: UserRole): string[] {
        const role = this.getRoleByType(roleType);
        return role?.permissions || [];
    }

    // Helper: Get role hierarchy
    static getRoleHierarchy(): IRole[] {
        return mockRoles.sort((a, b) => b.level - a.level);
    }

    // Helper: Check if role A is higher than role B
    static isHigherRole(roleA: UserRole, roleB: UserRole): boolean {
        const roleAData = this.getRoleByType(roleA);
        const roleBData = this.getRoleByType(roleB);
        if (!roleAData || !roleBData) return false;
        return roleAData.level > roleBData.level;
    }
}
