import { Schema, model } from "mongoose";
import { ILeaveLedgerEntry } from "../interfaces/leave.interface";

// Append-only: entries are never updated or deleted; corrections are new entries
const LeaveLedgerSchema = new Schema<ILeaveLedgerEntry>(
    {
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        user: { type: Schema.Types.ObjectId, ref: "Users", required: true },
        leaveType: { type: Schema.Types.ObjectId, ref: "LeaveTypes", required: true },
        period: { type: String, required: true, match: /^\d{4}$/ },
        kind: { type: String, enum: ["grant", "usage", "usageReversal", "adjustment"], required: true },
        amount: { type: Number, required: true },
        effectiveDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
        request: { type: Schema.Types.ObjectId, ref: "Requests" },
        policy: {
            policyId: { type: Schema.Types.ObjectId, ref: "LeavePolicies" },
            version: { type: Number },
        },
        reason: { type: String, trim: true },
        key: { type: String },
        createdBy: { type: Schema.Types.Mixed, required: true }, // user ObjectId or the string "system"
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: "LeaveLedger", autoIndex: false },
);

LeaveLedgerSchema.index({ company: 1, user: 1, leaveType: 1, period: 1 });
// Idempotency of effects: one grant per year, one usage / reversal per request and period
LeaveLedgerSchema.index({ company: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $exists: true } } });

export const LeaveLedgerModel = model<ILeaveLedgerEntry>("LeaveLedger", LeaveLedgerSchema);
