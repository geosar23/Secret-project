import { Schema, model } from "mongoose";
import { IRequest } from "../interfaces/request.interface";

const ResolverSchema = new Schema(
    {
        kind: { type: String, required: true },
        levelsUp: { type: Number },
        roleId: { type: Schema.Types.ObjectId },
        userId: { type: Schema.Types.ObjectId },
    },
    { _id: false },
);

const FlowStepSchema = new Schema(
    {
        key: { type: String, required: true },
        name: { type: String, required: true },
        resolver: { type: ResolverSchema, required: true },
        fallback: { type: ResolverSchema },
        mode: { type: String, enum: ["any", "all"], required: true },
        onReject: { type: String, enum: ["rejectRequest"], required: true },
        allowSelfApproval: { type: Boolean, required: true },
        skipIfRequesterIsApprover: { type: Boolean, required: true },
    },
    { _id: false },
);

const StepStateSchema = new Schema(
    {
        key: { type: String, required: true },
        state: { type: String, enum: ["waiting", "active", "approved", "rejected", "skipped"], required: true },
        activatedAt: { type: Date },
        completedAt: { type: Date },
        resolvedFrom: { type: ResolverSchema },
    },
    { _id: false },
);

const ActionSchema = new Schema(
    {
        action: {
            type: String,
            required: true,
            enum: [
                "submitted",
                "stepActivated",
                "stepSkipped",
                "stepCompleted",
                "approved",
                "rejected",
                "requestApproved",
                "requestRejected",
                "needsRouting",
                "canceled",
            ],
        },
        status: { type: String, enum: ["pending", "approved", "rejected", "canceled"], required: true },
        user: { type: Schema.Types.Mixed, required: true }, // user ObjectId or the string "system"
        date: { type: Date, required: true },
        data: { type: Schema.Types.Mixed },
    },
    { _id: false },
);

const RequestSchema = new Schema<IRequest>(
    {
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        type: { type: String, required: true, trim: true },
        typeVersion: { type: Number, required: true },
        requester: { type: Schema.Types.ObjectId, ref: "Users", required: true },
        subject: { type: Schema.Types.ObjectId, ref: "Users", required: true },
        status: { type: String, enum: ["pending", "approved", "rejected", "canceled"], default: "pending" },
        flow: {
            flowId: { type: Schema.Types.ObjectId, ref: "ApprovalFlows" },
            version: { type: Number, required: true },
            steps: { type: [FlowStepSchema], required: true },
        },
        currentStepIndex: { type: Number, default: null },
        steps: { type: [StepStateSchema], required: true },
        pendingApprovers: [{ type: Schema.Types.ObjectId, ref: "Users" }],
        actionsHistory: { type: [ActionSchema], default: [] },
        payload: { type: Schema.Types.Mixed },
        ref: {
            collection: { type: String },
            id: { type: Schema.Types.ObjectId },
        },
        needsRouting: { type: Boolean, default: false },
        cancelReason: { type: String, trim: true },
        canceledBy: { type: Schema.Types.ObjectId, ref: "Users" },
        decidedAt: { type: Date },
    },
    { timestamps: true, collection: "Requests", autoIndex: false },
);

// Inbox and badge count: only pending requests are indexed, so finished ones never add entries
RequestSchema.index(
    { company: 1, pendingApprovers: 1, createdAt: -1 },
    { partialFilterExpression: { status: "pending" } },
);
RequestSchema.index({ company: 1, requester: 1, status: 1, createdAt: -1 });
RequestSchema.index({ company: 1, subject: 1, createdAt: -1 });
RequestSchema.index({ company: 1, status: 1, needsRouting: 1 });
// Per-person lookups of one type by status (leave overlap checks and pending quantities)
RequestSchema.index({ company: 1, type: 1, subject: 1, status: 1 });

export const RequestModel = model<IRequest>("Requests", RequestSchema);
