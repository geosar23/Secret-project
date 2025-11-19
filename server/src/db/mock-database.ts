/**
 * Mock Database
 * Centralized in-memory data store for development/testing
 * Enable by setting USE_MOCK_DB=true in .env
 */

import { IUser } from "../modules/users/user.interface";

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

    // Add more entity operations as needed
}
