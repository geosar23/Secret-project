/**
 * Mock Database
 * Centralized in-memory data store for development/testing
 * Enable by setting USE_MOCK_DB=true in .env
 */

import { IUser, ISession } from "../interfaces";

// Mock Users Collection
// Test credentials: john@example.com / password123, jane@example.com / password456, bob@example.com / password789
export const mockUsers: IUser[] = [
    {
        _id: "1",
        name: "John Doe",
        email: "john@example.com",
        role: "admin",
        password: "$2a$10$ZLtIHiqNSJoW1qG//nrfTubOrYz/eTxHMJb.HbZB/Tq3Lwy5tNT8e", // password123
        isActive: true,
        createdAt: new Date("2024-01-01"),
    },
    {
        _id: "2",
        name: "Jane Smith",
        email: "jane@example.com",
        role: "employee",
        password: "$2a$10$vpPTr7qHXMz5azBrN8kZbOMgL2w.Pgz6YkbR9i.fryJYncT3847l.", // password456
        isActive: true,
        createdAt: new Date("2024-01-15"),
    },
    {
        _id: "3",
        name: "Bob Wilson",
        email: "bob@example.com",
        role: "employee",
        password: "$2a$10$vpPTr7qHXMz5azBrN8kZbOMgL2w.Pgz6YkbR9i.fryJYncT3847l.", // password789
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
