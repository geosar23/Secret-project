import mongoose from "mongoose";
import { config } from "./env";

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
}

export const dbState = DatabaseState.getInstance();

export const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(config.MONGO_URI);

        // Test the connection by counting users
        const db = mongoose.connection.db;
        const usersCount = await db.collection("Users").countDocuments();
        console.log(`📦 Connected to MongoDB - Database: ${db.databaseName}`);
        console.log(`   Users in database: ${usersCount}`);

        dbState.setConnected(true);
        console.log("✅ Using real database");
    } catch (error) {
        dbState.setConnected(false);
        console.warn("To use real database, ensure MongoDB is running and MONGO_URI in .env => config is correct");
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
