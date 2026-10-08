import { Types } from "mongoose";
import { PermissionCategories } from "../../enums/permissions.enum";
import {
    ILeaveOverride,
    ILeavePolicy,
    ILeaveRequest,
    LeaveOverrideRule,
    LeavePayload,
} from "../../interfaces/leave.interface";
import { IRequest } from "../../interfaces/request.interface";
import { EngineActor, RequestTypeDefinition } from "../../interfaces/request-type.interface";
import { canApproveLeave, canManageLeaveOf, canWriteLeaveFor } from "../../policies/leave.policy";
import { leavePolicyRepository } from "../../repositories/leave-policy.repository";
import { leaveRequestRepository } from "../../repositories/leave-request.repository";
import { leaveTypeRepository } from "../../repositories/leave-type.repository";
import { requestRepository } from "../../repositories/request.repository";
import { BadRequestError, ForbiddenError, RuleViolationError } from "../../utils/app-error.util";
import { loadAccessUser } from "../access-user.service";
import { formatDisplayDate, isIsoDate, todayUtc } from "./leave-calculator";
import { LeaveLedgerService } from "./leave-ledger.service";

const OVERRIDE_RULES: LeaveOverrideRule[] = ["insufficientBalance", "backdated"];

const asRecord = (value: unknown): Record<string, unknown> =>
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

export function validateOverrides(value: unknown): ILeaveOverride[] {
    if (value === undefined || value === null) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new BadRequestError("overrides must be an array");
    }
    return value.map(item => {
        const { rule, reason } = asRecord(item);
        if (!OVERRIDE_RULES.includes(rule as LeaveOverrideRule)) {
            throw new BadRequestError(`Unknown override rule "${String(rule)}"`);
        }
        if (typeof reason !== "string" || !reason.trim()) {
            throw new BadRequestError("Every override needs a reason");
        }
        return { rule: rule as LeaveOverrideRule, reason: reason.trim() };
    });
}

function validatePayload(payload: unknown): LeavePayload {
    const p = asRecord(payload);
    const isId = (value: unknown) => typeof value === "string" && Types.ObjectId.isValid(value);
    if (!isId(p.leaveRequestId) || !isId(p.leaveType)) {
        throw new BadRequestError("leaveRequestId and leaveType are required");
    }
    if (!isIsoDate(p.startDate) || !isIsoDate(p.endDate) || p.startDate > p.endDate) {
        throw new BadRequestError("startDate and endDate must be YYYY-MM-DD with startDate <= endDate");
    }
    if (typeof p.quantity !== "number" || !(p.quantity > 0)) {
        throw new BadRequestError("quantity must be positive");
    }
    if (p.reason !== undefined && typeof p.reason !== "string") {
        throw new BadRequestError("reason must be a string");
    }
    return {
        leaveRequestId: p.leaveRequestId as string,
        leaveType: p.leaveType as string,
        leaveTypeName: typeof p.leaveTypeName === "string" ? p.leaveTypeName : "Leave",
        startDate: p.startDate,
        endDate: p.endDate,
        quantity: p.quantity,
        tracked: p.tracked === true,
        reason: (p.reason as string | undefined)?.trim() || undefined,
        overrides: validateOverrides(p.overrides),
    };
}

const payloadOf = (request: IRequest) => request.payload as LeavePayload;
const hasOverride = (payload: LeavePayload, rule: LeaveOverrideRule) => payload.overrides.some(o => o.rule === rule);

async function loadPair(companyId: string, actorId: string, subjectId: string) {
    const [actor, subject] = await Promise.all([
        loadAccessUser(companyId, actorId),
        loadAccessUser(companyId, subjectId),
    ]);
    return { actor, subject };
}

/** True when the subject already has leave in the range whose Request is pending or approved. */
async function hasOverlap(companyId: string, leave: ILeaveRequest): Promise<boolean> {
    const others = await leaveRequestRepository(companyId)
        .find({
            user: leave.user,
            _id: { $ne: leave._id },
            request: { $exists: true },
            startDate: { $lte: leave.endDate },
            endDate: { $gte: leave.startDate },
        })
        .select("request")
        .lean();
    if (!others.length) {
        return false;
    }
    const active = await requestRepository(companyId).count({
        _id: { $in: others.map(other => other.request) },
        status: { $in: ["pending", "approved"] },
    });
    return active > 0;
}

async function checkBalance(companyId: string, leave: ILeaveRequest, policy: ILeavePolicy): Promise<void> {
    if (policy.entitlement.type !== "fixed") {
        return;
    }
    const byPeriod = new Map<string, number>();
    for (const line of leave.lines) {
        byPeriod.set(line.period, (byPeriod.get(line.period) ?? 0) + line.quantity);
    }
    const limit = policy.negativeBalance?.allowed ? (policy.negativeBalance.maxAmount ?? Infinity) : 0;
    const userId = String(leave.user);
    const leaveTypeId = String(leave.leaveType);

    for (const [period, quantity] of byPeriod) {
        if (!quantity) {
            continue;
        }
        const [posted, pending] = await Promise.all([
            LeaveLedgerService.postedByType(companyId, userId, period),
            LeaveLedgerService.pendingByType(companyId, userId, period),
        ]);
        const sums = posted.get(leaveTypeId) ?? { granted: 0, adjusted: 0, used: 0 };
        const available = sums.granted + sums.adjusted - sums.used - (pending.get(leaveTypeId) ?? 0);
        if (quantity > available + limit) {
            throw new RuleViolationError(
                "insufficientBalance",
                `Not enough balance for ${period}: ${available} day(s) available, ${quantity} requested`,
            );
        }
    }
}

async function canCreate(companyId: string, actor: EngineActor, subjectId: string, payload: LeavePayload) {
    const { actor: actorUser, subject } = await loadPair(companyId, actor.id, subjectId);
    if (!actorUser || !subject) {
        throw new ForbiddenError("Unknown actor or subject");
    }
    if (!canWriteLeaveFor(actorUser, subject)) {
        throw new ForbiddenError("Not allowed to submit leave for this person");
    }
    if (!subject.isActive) {
        throw new RuleViolationError("inactiveEmployee", "Leave cannot be requested for an inactive employee");
    }
    if (payload.overrides.length && actor.id === subjectId) {
        throw new ForbiddenError("Overrides are only for leave entered on someone else's behalf");
    }

    const leave = (await leaveRequestRepository(companyId)
        .findById(payload.leaveRequestId)
        .lean()) as unknown as ILeaveRequest | null;
    if (!leave || String(leave.user) !== subjectId || leave.request) {
        throw new BadRequestError("Leave record does not match the request");
    }
    const [leaveType, policy] = await Promise.all([
        leaveTypeRepository(companyId).findOne({ _id: leave.leaveType, isActive: true }).select("_id").lean(),
        leavePolicyRepository(companyId).findById(String(leave.policy.policyId)).lean(),
    ]);
    if (!leaveType || !policy) {
        throw new RuleViolationError("leaveTypeUnavailable", "This leave type is not available");
    }

    if (await hasOverlap(companyId, leave)) {
        throw new RuleViolationError("overlap", "This leave overlaps another pending or approved leave");
    }
    if (leave.startDate < todayUtc() && !policy.requestRules?.allowBackdated && !hasOverride(payload, "backdated")) {
        throw new RuleViolationError("backdated", "Leave in the past cannot be requested for this leave type");
    }
    if (!hasOverride(payload, "insufficientBalance")) {
        await checkBalance(companyId, leave, policy as unknown as ILeavePolicy);
    }
}

async function canApprove(companyId: string, actor: EngineActor, request: IRequest) {
    const { actor: actorUser, subject } = await loadPair(companyId, actor.id, String(request.subject));
    return !!actorUser && !!subject && canApproveLeave(actorUser, subject);
}

/** Immediate approval when HR enters leave: needs on-behalf write and approval authority, never for oneself. */
async function canApproveOnCreate(companyId: string, actor: EngineActor, request: IRequest) {
    if (actor.id === String(request.subject)) {
        return false;
    }
    const { actor: actorUser, subject } = await loadPair(companyId, actor.id, String(request.subject));
    return !!actorUser && !!subject && canManageLeaveOf(actorUser, subject) && canApproveLeave(actorUser, subject);
}

/**
 * Who may cancel (the engine enforces the state rules): the requester or subject while pending and before the
 * start date of an approved leave; `leaves:write` beyond self covering the subject at any time, including after the
 * leave started.
 */
async function canCancel(companyId: string, actor: EngineActor, request: IRequest) {
    const isOwner = actor.id === String(request.requester) || actor.id === String(request.subject);
    const { actor: actorUser, subject } = await loadPair(companyId, actor.id, String(request.subject));
    const canManage = !!actorUser && !!subject && canManageLeaveOf(actorUser, subject);

    if (request.status === "approved" && todayUtc() >= payloadOf(request).startDate) {
        return canManage;
    }
    return isOwner || canManage;
}

function summarize(request: IRequest) {
    const p = payloadOf(request);
    const range =
        p.startDate === p.endDate
            ? formatDisplayDate(p.startDate)
            : `${formatDisplayDate(p.startDate)} – ${formatDisplayDate(p.endDate)}`;
    return { title: `${p.leaveTypeName}, ${range} (${p.quantity} ${p.quantity === 1 ? "day" : "days"})` };
}

export async function leaveDetail(request: IRequest) {
    const companyId = String(request.company);
    const leave = request.ref?.id
        ? ((await leaveRequestRepository(companyId)
              .findById(String(request.ref.id))
              .lean()) as unknown as ILeaveRequest | null)
        : null;
    if (!leave) {
        return null;
    }
    const [leaveType, policy] = await Promise.all([
        leaveTypeRepository(companyId).findById(String(leave.leaveType)).select("name code color").lean(),
        leavePolicyRepository(companyId).findById(String(leave.policy.policyId)).select("name version").lean(),
    ]);
    const balances = await LeaveLedgerService.getBalances(companyId, String(leave.user), leave.startDate.slice(0, 4));
    return {
        leaveRequestId: String(leave._id),
        leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason,
        lines: leave.lines,
        totals: leave.totals,
        policy: policy ? { id: String(policy._id), name: policy.name, version: policy.version } : null,
        overrides: leave.overrides,
        balance: balances.find(b => b.leaveType.id === String(leave.leaveType)) ?? null,
    };
}

export const leaveRequestType: RequestTypeDefinition<LeavePayload> = {
    type: "leave",
    name: "Leave",
    readCategory: PermissionCategories.LEAVES,
    version: 1,
    validatePayload,
    flowTemplate: [
        {
            key: "lineManager",
            name: "Line manager",
            resolver: { kind: "lineManager" },
            fallback: { kind: "hrRepresentative" },
            mode: "any",
            onReject: "rejectRequest",
            allowSelfApproval: false,
            skipIfRequesterIsApprover: false,
        },
    ],
    canCreate,
    canApprove,
    canApproveOnCreate,
    allowCancelAfterApproval: true,
    canCancel,
    onApproved: request => LeaveLedgerService.postUsage(request),
    onCanceled: request => LeaveLedgerService.reverseUsage(request),
    summarize,
    detail: leaveDetail,
};
