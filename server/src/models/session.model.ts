import { Schema, model } from "mongoose";
import { ISession } from "../interfaces/session.interface";

const SessionSchema = new Schema<ISession>(
    {
        sessionToken: { type: String, required: true, unique: true },
        userId: { type: String, required: true },
        ipAddress: { type: String, required: true },
        systemInfo: { type: String, required: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true },
);

export const SessionModel = model<ISession>("Session", SessionSchema);
