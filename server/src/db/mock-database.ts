/**
 * Mock Database
 * Centralized in-memory data store for development/testing
 * Enable by setting USE_MOCK_DB=true in .env
 */

import { IUser, ISession } from "../interfaces";
import { UserRole } from "../enums";

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
        // Example: Jane has extra permission granted
        grantedPermissions: [
            {
                permission: "reports:view:all",
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
    },
];

// Mock Sessions Collection
export const mockSessions: ISession[] = [];

// Add more collections as needed
// export const mockProducts: Product[] = [];
// export const mockOrders: Order[] = [];

/**
 * Mock Database Operations
 */

export class MockDatabase {
    // User operations
    static getAllUsers(): IUser[] {
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

    // Session operations
    static getAllSessions(): ISession[] {
        return mockSessions;
    }

    static getSessionByToken(sessionToken: string): ISession | undefined {
        return mockSessions.find(session => session.sessionToken === sessionToken);
    }

    static getSessionsByUserId(userId: string): ISession[] {
        return mockSessions.filter(session => session.userId === userId);
    }

    static createSession(sessionData: Omit<ISession, "_id" | "createdAt">): ISession {
        const newSession: ISession = {
            _id: String(mockSessions.length + 1),
            ...sessionData,
            createdAt: new Date(),
        };
        mockSessions.push(newSession);
        return newSession;
    }

    static updateSession(sessionToken: string, updates: Partial<ISession>): ISession | null {
        const index = mockSessions.findIndex(session => session.sessionToken === sessionToken);
        if (index === -1) return null;

        mockSessions[index] = {
            ...mockSessions[index],
            ...updates,
        };
        return mockSessions[index];
    }

    static deleteSession(sessionToken: string): boolean {
        const index = mockSessions.findIndex(session => session.sessionToken === sessionToken);
        if (index === -1) return false;

        mockSessions.splice(index, 1);
        return true;
    }

    static cleanExpiredSessions(): number {
        const now = new Date();
        const initialLength = mockSessions.length;

        for (let i = mockSessions.length - 1; i >= 0; i--) {
            if (mockSessions[i].expiresAt < now) {
                mockSessions.splice(i, 1);
            }
        }

        return initialLength - mockSessions.length;
    }

    // Add more entity operations as needed
}
