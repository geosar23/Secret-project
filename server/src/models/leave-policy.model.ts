import { Schema, model } from "mongoose";
import { ILeavePolicy } from "../interfaces/leave.interface";

const LeavePolicySchema = new Schema<ILeavePolicy>(
    {
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        leaveType: { type: Schema.Types.ObjectId, ref: "LeaveTypes", required: true },
        name: { type: String, required: true, trim: true },
        appliesTo: {
            country: { type: Schema.Types.ObjectId, ref: "Countries" },
        },
        effectiveFrom: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
        version: { type: Number, required: true, min: 1 },
        counting: {
            unit: { type: String, enum: ["workingDays", "calendarDays"], required: true },
        },
        entitlement: {
            type: { type: String, enum: ["fixed", "none"], required: true },
            amountPerYear: { type: Number, min: 0 },
        },
        negativeBalance: {
            allowed: { type: Boolean, default: false },
            maxAmount: { type: Number, min: 0 },
        },
        requestRules: {
            allowBackdated: { type: Boolean, default: false },
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    },
    { timestamps: true, collection: "LeavePolicies", autoIndex: false },
);

// Versions are immutable documents; one version number per (leave type, country) scope
LeavePolicySchema.index({ company: 1, leaveType: 1, "appliesTo.country": 1, version: 1 }, { unique: true });

export const LeavePolicyModel = model<ILeavePolicy>("LeavePolicies", LeavePolicySchema);
