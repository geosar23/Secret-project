import { Schema, Types, model } from "mongoose";
import { IApprovalFlow, IFlowStep } from "../interfaces/approval-flow.interface";

interface IResolverDoc {
    kind: string;
    levelsUp?: number;
    roleId?: Types.ObjectId;
    userId?: Types.ObjectId;
}

const ResolverSchema = new Schema<IResolverDoc>(
    {
        kind: {
            type: String,
            required: true,
            enum: ["lineManager", "managerChain", "departmentHead", "hrRepresentative", "role", "user"],
        },
        levelsUp: { type: Number },
        roleId: { type: Schema.Types.ObjectId, ref: "Roles" },
        userId: { type: Schema.Types.ObjectId, ref: "Users" },
    },
    { _id: false },
);

const FlowStepSchema = new Schema<IFlowStep>(
    {
        key: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        resolver: { type: ResolverSchema, required: true },
        fallback: { type: ResolverSchema },
        mode: { type: String, enum: ["any", "all"], default: "any", required: true },
        onReject: { type: String, enum: ["rejectRequest"], default: "rejectRequest", required: true },
        // Always false in v1
        allowSelfApproval: {
            type: Boolean,
            default: false,
            required: true,
            validate: { validator: (value: boolean) => value === false, message: "Self-approval is not allowed" },
        },
        skipIfRequesterIsApprover: { type: Boolean, default: true, required: true },
    },
    { _id: false },
);

const ScopeSchema = new Schema(
    {
        country: { type: Schema.Types.ObjectId, ref: "Countries" },
        department: { type: Schema.Types.ObjectId, ref: "Departments" },
        leaveType: { type: Schema.Types.ObjectId },
    },
    { _id: false },
);

const ApprovalFlowSchema = new Schema<IApprovalFlow>(
    {
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        requestType: { type: String, required: true, trim: true },
        scope: { type: ScopeSchema },
        version: { type: Number, required: true },
        isActive: { type: Boolean, default: true },
        steps: { type: [FlowStepSchema], required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    },
    { timestamps: true, collection: "ApprovalFlows", autoIndex: false },
);

ApprovalFlowSchema.index({ company: 1, requestType: 1, isActive: 1 });
ApprovalFlowSchema.index(
    {
        company: 1,
        requestType: 1,
        "scope.country": 1,
        "scope.department": 1,
        "scope.leaveType": 1,
        version: 1,
    },
    { unique: true },
);

export const ApprovalFlowModel = model<IApprovalFlow>("ApprovalFlows", ApprovalFlowSchema);
