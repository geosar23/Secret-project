/**
 * Mock Database
 * Centralized in-memory data store for development/testing
 * Enable by setting USE_MOCK_DB=true in .env
 */

import { IUser, ISession } from "../interfaces";

// Mock Users Collection
export const mockUsers: IUser[] = [
    {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        role: "admin",
        password: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890", // hashed "password123"
    },
    {
        id: "2",
        name: "Jane Smith",
        email: "jane@example.com",
        role: "user",
        password: "$2a$10$abcdefghijklmnopqrstuvwxyz0987654321",
    },
    {
        id: "3",
        name: "Bob Wilson",
        email: "bob@example.com",
        role: "user",
        password: "$2a$10$zyxwvutsrqponmlkjihgfedcba1234567890",
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
        return mockUsers.find(user => user.id === id);
    }

    static getUserByEmail(email: string): IUser | undefined {
        return mockUsers.find(user => user.email === email);
    }

    static createUser(userData: Omit<IUser, "id">): IUser {
        const newUser: IUser = {
            id: String(mockUsers.length + 1),
            ...userData,
        };
        mockUsers.push(newUser);
        return newUser;
    }

    static updateUser(id: string, updates: Partial<IUser>): IUser | null {
        const index = mockUsers.findIndex(user => user.id === id);
        if (index === -1) return null;

        mockUsers[index] = {
            ...mockUsers[index],
            ...updates,
        };
        return mockUsers[index];
    }

    static deleteUser(id: string): boolean {
        const index = mockUsers.findIndex(user => user.id === id);
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

    static createSession(sessionData: Omit<ISession, "id" | "createdAt">): ISession {
        const newSession: ISession = {
            id: String(mockSessions.length + 1),
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
