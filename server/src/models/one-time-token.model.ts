import { Schema, model } from "mongoose";
import { IOneTimeToken, ONE_TIME_TOKEN_PURPOSES } from "../interfaces/one-time-token.interface";

// Tokens are kept for a day after expiry so the per-account email rate limit can count recent requests.
const RETENTION_AFTER_EXPIRY_SECONDS = 24 * 60 * 60;

const OneTimeTokenSchema = new Schema<IOneTimeToken>(
    {
        tokenHash: { type: String, required: true },
        user: { type: Schema.Types.ObjectId, ref: "Users", required: true },
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        purpose: { type: String, enum: ONE_TIME_TOKEN_PURPOSES, required: true },
        expiresAt: { type: Date, required: true },
        usedAt: { type: Date, default: null },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: "OneTimeTokens", autoIndex: false },
);

OneTimeTokenSchema.index({ tokenHash: 1 }, { unique: true });
OneTimeTokenSchema.index({ company: 1, user: 1, purpose: 1, createdAt: -1 });
OneTimeTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: RETENTION_AFTER_EXPIRY_SECONDS });

export const OneTimeTokenModel = model<IOneTimeToken>("OneTimeTokens", OneTimeTokenSchema);
