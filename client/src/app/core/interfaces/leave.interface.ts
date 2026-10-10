import { ILeaveBalance } from "./request.interface";

export interface ILeaveBalancesResponse {
    year: string;
    items: ILeaveBalance[];
}

export interface ILeaveInput {
    leaveType: string;
    /** YYYY-MM-DD */
    startDate: string;
    /** YYYY-MM-DD */
    endDate: string;
    reason?: string;
    onBehalfOf?: string;
    autoApprove?: { reason: string };
    overrides?: { rule: string; reason: string }[];
}

export interface ILeavePreview {
    leaveType: { id: string; name: string };
    policy: { id: string; name: string; version: number };
    tracked: boolean;
    lines: { date: string; quantity: number; period: string; note?: string }[];
    totals: { quantity: number };
    byPeriod: Record<string, number>;
    balance: ILeaveBalance | null;
}

export interface ILeaveCreated {
    leaveRequestId: string;
    requestId: string;
    status: string;
    needsRouting: boolean;
    pendingApprovers: string[];
}
