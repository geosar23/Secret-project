import mongoose from "mongoose";
import { config } from "./env";

/**
 * Database connection state
 * Determines whether to use MongoDB or fall back to mock database
 */
class DatabaseState {
    private static instance: DatabaseState;
    private _isConnected: boolean = false;

    private constructor() {}

    static getInstance(): DatabaseState {
        if (!DatabaseState.instance) {
            DatabaseState.instance = new DatabaseState();
        }
        return DatabaseState.instance;
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    setConnected(status: boolean): void {
        this._isConnected = status;
    }

    /**
     * Check if we should use mock database
     * Returns true if MongoDB is not connected
     */
    get useMock(): boolean {
        return !this._isConnected;
    }
}

export const dbState = DatabaseState.getInstance();

/**
 * Connect to MongoDB
 * If connection fails, automatically fall back to mock database
 */
export const connectDB = async (): Promise<void> => {
    try {
        const res = await mongoose.connect(config.MONGO_URI);

        //Query Users collection to ensure connection is valid
        const test = await res.connection.db.listCollections({ name: "Users" }).toArray();

        //Find all users to test
        const users = await res.connection.db.collection("Users").find().toArray();
        console.log("Test query result:", test);
        console.log("Users found:", users);

        dbState.setConnected(true);
        console.log("📦 Connected to MongoDB - Using real database");
    } catch (error) {
        dbState.setConnected(false);
        console.warn("⚠️  MongoDB connection failed - Falling back to mock database");
        console.warn("   To use real database, ensure MongoDB is running and MONGO_URI is correct");
        if (error instanceof Error) {
            console.warn("   Error:", error.message);
        }
    }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDB = async (): Promise<void> => {
    if (dbState.isConnected) {
        await mongoose.disconnect();
        dbState.setConnected(false);
        console.log("📦 Disconnected from MongoDB");
    }
};
