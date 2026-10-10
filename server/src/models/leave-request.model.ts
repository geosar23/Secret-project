import { Schema, model } from "mongoose";
import { ILeaveRequest } from "../interfaces/leave.interface";

const LineSchema = new Schema(
    {
        date: { type: String, required: true },
        quantity: { type: Number, required: true },
        period: { type: String, required: true },
        note: { type: String, enum: ["nonWorkingDay"] },
    },
    { _id: false },
);

const OverrideSchema = new Schema(
    {
        rule: { type: String, enum: ["insufficientBalance", "backdated"], required: true },
        reason: { type: String, required: true, trim: true },
    },
    { _id: false },
);

// No status and no approver: workflow state lives only on the linked Request
const LeaveRequestSchema = new Schema<ILeaveRequest>(
    {
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        request: { type: Schema.Types.ObjectId, ref: "Requests" },
        user: { type: Schema.Types.ObjectId, ref: "Users", required: true },
        leaveType: { type: Schema.Types.ObjectId, ref: "LeaveTypes", required: true },
        startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
        endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
        reason: { type: String, trim: true },
        overrides: { type: [OverrideSchema], default: [] },
        lines: { type: [LineSchema], required: true },
        totals: { quantity: { type: Number, required: true } },
        policy: {
            policyId: { type: Schema.Types.ObjectId, ref: "LeavePolicies", required: true },
            version: { type: Number, required: true },
        },
        workSchedule: { type: Schema.Types.ObjectId, ref: "WorkSchedules" },
        calculatedAt: { type: Date, required: true },
    },
    { timestamps: true, collection: "LeaveRequests", autoIndex: false },
);

// Overlap checks and calendars: leave of one person by date range
LeaveRequestSchema.index({ company: 1, user: 1, startDate: 1, endDate: 1 });
LeaveRequestSchema.index(
    { company: 1, request: 1 },
    { unique: true, partialFilterExpression: { request: { $exists: true } } },
);

export const LeaveRequestModel = model<ILeaveRequest>("LeaveRequests", LeaveRequestSchema);
