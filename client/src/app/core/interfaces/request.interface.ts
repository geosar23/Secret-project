export type RequestStatus = "pending" | "approved" | "rejected" | "canceled";

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

export interface IRequestPerson {
    id: string;
    name?: string;
    email?: string;
}

export interface IRequestListItem {
    id: string;
    type: string;
    status: RequestStatus;
    summary: { title: string };
    requester: IRequestPerson;
    subject: IRequestPerson;
    currentStep: { key: string; name: string } | null;
    needsRouting: boolean;
    createdAt: string;
    decidedAt?: string;
}

export interface IPagedList<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface IRequestSummary {
    pendingForMe: number;
    myPending: number;
    /** When the oldest request waiting for the user was submitted, or null. */
    oldestPendingForMe: string | null;
    /** Pending requests the user may read that have no approver yet. */
    needsRouting: number;
    /** True when the user may read requests about other people (shows the Team tab). */
    hasTeam: boolean;
    unreadNotifications: number;
}

export interface IRequestAction {
    action: RequestActionType;
    status: RequestStatus;
    /** User id, or "system". */
    user: string;
    date: string;
    data?: Record<string, unknown>;
}

export interface IRequestStep {
    key: string;
    name?: string;
    state: "waiting" | "active" | "approved" | "rejected" | "skipped";
}

export interface ILeaveDetailLine {
    date: string;
    quantity: number;
    period: string;
    note?: string;
}

export interface ILeaveDetail {
    leaveRequestId: string;
    leaveType: { _id: string; name: string; code: string; color?: string } | null;
    startDate: string;
    endDate: string;
    reason?: string;
    lines: ILeaveDetailLine[];
    totals: { quantity: number };
    policy: { id: string; name: string; version: number } | null;
    overrides?: { rule: string; reason: string }[];
    balance: ILeaveBalance | null;
}

export interface IRequestDetail extends IRequestListItem {
    steps: IRequestStep[];
    pendingApprovers: string[];
    actionsHistory: IRequestAction[];
    cancelReason?: string;
    /** Names for every user id that appears in the timeline or as a pending approver. */
    people?: Record<string, IRequestPerson>;
    /** Type-specific detail. Leave is the only type today. */
    detail: ILeaveDetail | null;
    can: { decide: boolean; cancel: boolean };
}

/** A status, or "needsRouting" for pending requests nobody could be found to approve. */
export type RequestStatusFilter = RequestStatus | "needsRouting";

export interface IRequestListQuery {
    type?: string;
    status?: RequestStatusFilter;
    /** Submission date range, "YYYY-MM-DD", inclusive. */
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

export interface ILeaveBalance {
    leaveType: { id: string; name: string; code: string; color?: string };
    period: string;
    tracked: boolean;
    granted: number;
    adjusted: number;
    used: number;
    pending: number;
    balance: number;
    available: number;
}

/** A request type the company has enabled (`GET /api/request-types`). */
export interface IRequestTypeInfo {
    key: string;
    name: string;
    kind: "system" | "custom";
    description?: string;
}
