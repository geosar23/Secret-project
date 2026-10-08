import { Types } from "mongoose";
import { ApproverResolver, IFlowStep } from "./approval-flow.interface";

export type RequestStatus = "pending" | "approved" | "rejected" | "canceled";
export type StepState = "waiting" | "active" | "approved" | "rejected" | "skipped";

/**
 * Everything that can appear in a request timeline. Per-approver decisions are "approved"/"rejected";
 * request-level outcomes are "requestApproved"/"requestRejected".
 */
export type RequestActionType =
    | "submitted"
    | "stepActivated"
    | "stepSkipped"
    | "stepCompleted"
    | "approved"
    | "rejected"
    | "requestApproved"
    | "requestRejected"
    | "needsRouting"
    | "canceled";

export interface IRequestAction {
    action: RequestActionType;
    /** Request status right after the action. */
    status: RequestStatus;
    user: Types.ObjectId | "system";
    date: Date;
    /** Typed per action: stepKey, comment, reason, isOverride, onBehalfOf, superseded, flowVersion, assignees... */
    data?: Record<string, unknown>;
}

export interface IRequestStepState {
    key: string;
    state: StepState;
    activatedAt?: Date;
    completedAt?: Date;
    resolvedFrom?: ApproverResolver;
}

export interface IRequest {
    _id?: Types.ObjectId;
    company?: Types.ObjectId;
    type: string;
    typeVersion: number;
    requester: Types.ObjectId;
    subject: Types.ObjectId;
    status: RequestStatus;
    flow: { flowId?: Types.ObjectId; version: number; steps: IFlowStep[] };
    currentStepIndex: number | null;
    steps: IRequestStepState[];
    /** Who must act on the current step. Emptied when the step or the request finishes. Source of the inbox. */
    pendingApprovers: Types.ObjectId[];
    /** Append-only timeline. State above is the truth; this is what happened. */
    actionsHistory: IRequestAction[];
    payload: unknown;
    ref?: { collection: string; id: Types.ObjectId };
    needsRouting: boolean;
    cancelReason?: string;
    canceledBy?: Types.ObjectId;
    decidedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
