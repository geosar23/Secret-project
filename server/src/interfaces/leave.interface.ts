import { Types } from "mongoose";

/** A category of leave inside the "leave" request type (Annual, Sick, Unpaid...). Rules live in policies. */
export interface ILeaveType {
    _id?: Types.ObjectId;
    company?: Types.ObjectId;
    name: string;
    code: string; // unique per company
    color?: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

/** Which weekdays count as working days. 0 = Sunday ... 6 = Saturday. */
export interface IWorkSchedule {
    _id?: Types.ObjectId;
    company?: Types.ObjectId;
    name: string;
    country?: Types.ObjectId; // default schedule for that country
    workingDays: number[];
    isDefault: boolean; // company-wide fallback
    createdAt?: Date;
    updatedAt?: Date;
}

export type LeaveCountingUnit = "workingDays" | "calendarDays";

/** How a fixed yearly entitlement is granted in the year someone is hired. */
export type HireYearEntitlement = "prorated" | "full" | "none";

/**
 * Company-wide leave settings (one document per company). A change applies to grants posted from then on;
 * grants already in the ledger are never rewritten.
 */
export interface ILeaveCompanySettings {
    _id?: Types.ObjectId;
    company?: Types.ObjectId;
    hireYearEntitlement: HireYearEntitlement;
    updatedBy?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export type LeaveEntitlement = { type: "fixed"; amountPerYear: number } | { type: "none" };

/** Rules for one leave type, optionally narrowed to a country. Immutable: a change is a new version. */
export interface ILeavePolicy {
    _id?: Types.ObjectId;
    company?: Types.ObjectId;
    leaveType: Types.ObjectId;
    name: string;
    appliesTo: { country?: Types.ObjectId }; // empty = company-wide fallback
    effectiveFrom: string; // YYYY-MM-DD, inclusive
    version: number;
    counting: { unit: LeaveCountingUnit };
    entitlement: LeaveEntitlement;
    negativeBalance: { allowed: boolean; maxAmount?: number | null }; // maxAmount unset = unlimited when allowed
    requestRules: { allowBackdated: boolean };
    createdBy: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ILeaveLine {
    date: string; // YYYY-MM-DD
    quantity: number; // days counted against the balance
    period: string; // leave year the line draws from ("2027")
    note?: "nonWorkingDay";
}

export interface ILeaveOverride {
    rule: LeaveOverrideRule;
    reason: string;
}

/** Validations an authorized creator may bypass, always with a reason. */
export type LeaveOverrideRule = "insufficientBalance" | "backdated";

/** The leave domain record. Workflow status and approvers live only on the linked Request. */
export interface ILeaveRequest {
    _id?: Types.ObjectId;
    company?: Types.ObjectId;
    request?: Types.ObjectId; // set right after the Request is created
    user: Types.ObjectId; // the subject: whose leave this is
    leaveType: Types.ObjectId;
    startDate: string;
    endDate: string;
    reason?: string;
    overrides: ILeaveOverride[];
    lines: ILeaveLine[];
    totals: { quantity: number };
    policy: { policyId: Types.ObjectId; version: number };
    workSchedule?: Types.ObjectId;
    calculatedAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export type LeaveLedgerKind = "grant" | "usage" | "usageReversal" | "adjustment";

/** One signed, immutable change to a user's balance for a leave type and leave year. */
export interface ILeaveLedgerEntry {
    _id?: Types.ObjectId;
    company?: Types.ObjectId;
    user: Types.ObjectId;
    leaveType: Types.ObjectId;
    period: string; // leave year, "2027"
    kind: LeaveLedgerKind;
    amount: number; // signed, in days; usage is negative
    effectiveDate: string; // YYYY-MM-DD
    request?: Types.ObjectId; // the shared Request (usage / usageReversal)
    policy?: { policyId: Types.ObjectId; version: number };
    reason?: string; // required for adjustments
    key?: string; // idempotency key, unique per company when present
    createdBy: Types.ObjectId | "system";
    createdAt?: Date;
}

/** What the engine stores on Request.payload for a leave. The domain record is Request.ref. */
export interface LeavePayload {
    leaveRequestId: string;
    leaveType: string;
    leaveTypeName: string;
    startDate: string;
    endDate: string;
    quantity: number;
    tracked: boolean;
    reason?: string;
    overrides: ILeaveOverride[];
}

export interface ILeaveBalance {
    leaveType: { id: string; name: string; code: string; color?: string };
    period: string;
    tracked: boolean;
    granted: number;
    adjusted: number;
    used: number; // net of reversals, positive number
    pending: number;
    balance: number; // granted + adjusted - used
    available: number; // balance - pending
}
