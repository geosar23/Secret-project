import { Types } from "mongoose";

export type ApproverResolver =
    | { kind: "lineManager" }
    | { kind: "managerChain"; levelsUp: number }
    | { kind: "departmentHead" }
    | { kind: "hrRepresentative" }
    | { kind: "role"; roleId: Types.ObjectId | string }
    | { kind: "user"; userId: Types.ObjectId | string };

export interface IFlowStep {
    key: string;
    name: string;
    resolver: ApproverResolver;
    fallback?: ApproverResolver;
    mode: "any" | "all";
    onReject: "rejectRequest";
    allowSelfApproval: false;
    skipIfRequesterIsApprover: boolean;
}

export interface IFlowScope {
    country?: Types.ObjectId;
    department?: Types.ObjectId;
    leaveType?: Types.ObjectId;
}

export interface IApprovalFlow {
    _id?: Types.ObjectId;
    company?: Types.ObjectId;
    requestType: string;
    scope?: IFlowScope;
    version: number;
    isActive: boolean;
    steps: IFlowStep[];
    createdBy: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}
