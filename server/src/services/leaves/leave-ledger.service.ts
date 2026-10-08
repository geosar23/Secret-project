import { Types } from "mongoose";
import {
    ILeaveBalance,
    ILeaveLedgerEntry,
    ILeavePolicy,
    ILeaveRequest,
    ILeaveType,
} from "../../interfaces/leave.interface";
import { IRequest } from "../../interfaces/request.interface";
import { leaveLedgerRepository } from "../../repositories/leave-ledger.repository";
import { leaveRequestRepository } from "../../repositories/leave-request.repository";
import { leaveTypeRepository } from "../../repositories/leave-type.repository";
import { requestRepository } from "../../repositories/request.repository";
import { userRepository } from "../../repositories/user.repository";
import { BadRequestError } from "../../utils/app-error.util";
import { entitlementForYear, isIsoDate, periodOf, todayUtc } from "./leave-calculator";
import { LeavePolicyService, pickPolicy } from "./leave-policy.service";
import { LeaveSettingsService } from "./leave-settings.service";

const objectId = (id: unknown) => new Types.ObjectId(String(id));
const isDuplicateKey = (error: unknown) => (error as { code?: number }).code === 11000;
const toIsoDate = (value?: Date | string) => (value ? new Date(value).toISOString().slice(0, 10) : undefined);

/** Reference date for "which policy applies to this leave year": today inside the year, else its first or last day. */
function referenceDate(year: string, today: string): string {
    if (periodOf(today) === year) {
        return today;
    }
    return periodOf(today) < year ? `${year}-01-01` : `${year}-12-31`;
}

/**
 * Appends a ledger entry. Entries with a `key` are idempotent: a second post with the same key is a no-op
 * (checked first, and guaranteed by the unique `{ company, key }` index under concurrency).
 */
async function post(companyId: string, entry: Omit<ILeaveLedgerEntry, "company">): Promise<boolean> {
    const repo = leaveLedgerRepository(companyId);
    if (entry.key && (await repo.findOne({ key: entry.key }).select("_id").lean())) {
        return false;
    }
    try {
        await repo.create(entry);
        return true;
    } catch (error) {
        if (isDuplicateKey(error)) {
            return false;
        }
        throw error;
    }
}

/** Leave ids of the subject's leave Requests that are still pending (their days are reserved, not yet posted). */
async function pendingLeaveRequestIds(companyId: string, userId: string): Promise<string[]> {
    const pending = await requestRepository(companyId)
        .find({ type: "leave", subject: userId, status: "pending" })
        .select("ref")
        .lean();
    return pending.map(request => (request.ref?.id ? String(request.ref.id) : "")).filter(Boolean);
}

export const LeaveLedgerService = {
    post,

    /** Pending quantity per leave type in one leave year, read live (nothing is written before approval). */
    pendingByType: async (companyId: string, userId: string, period: string): Promise<Map<string, number>> => {
        const ids = await pendingLeaveRequestIds(companyId, userId);
        const totals = new Map<string, number>();
        if (!ids.length) {
            return totals;
        }
        const leaves = (await leaveRequestRepository(companyId)
            .find({ _id: { $in: ids } })
            .select("leaveType lines")
            .lean()) as unknown as ILeaveRequest[];
        for (const leave of leaves) {
            const quantity = leave.lines.filter(l => l.period === period).reduce((sum, l) => sum + l.quantity, 0);
            const key = String(leave.leaveType);
            totals.set(key, (totals.get(key) ?? 0) + quantity);
        }
        return totals;
    },

    /** Sum of posted entries per leave type for one user and leave year, split by kind. */
    postedByType: async (companyId: string, userId: string, period: string) => {
        const entries = (await leaveLedgerRepository(companyId)
            .find({ user: userId, period })
            .select("leaveType kind amount")
            .lean()) as unknown as ILeaveLedgerEntry[];
        const totals = new Map<string, { granted: number; adjusted: number; used: number }>();
        for (const entry of entries) {
            const key = String(entry.leaveType);
            const sums = totals.get(key) ?? { granted: 0, adjusted: 0, used: 0 };
            if (entry.kind === "grant") {
                sums.granted += entry.amount;
            } else if (entry.kind === "adjustment") {
                sums.adjusted += entry.amount;
            } else {
                sums.used -= entry.amount; // usage is negative, reversals positive
            }
            totals.set(key, sums);
        }
        return totals;
    },

    /**
     * Posts the yearly `grant` for every active leave type with a fixed entitlement, for the given users (default:
     * all active users). Idempotent per (user, leave type, year), so the yearly run, user creation and the safety net
     * on leave creation can all call it. A policy changed after the grant was posted does not change it.
     */
    ensureEntitlements: async (
        companyId: string,
        year: string,
        options: { userIds?: string[]; createdBy?: string } = {},
    ): Promise<number> => {
        if (!/^\d{4}$/.test(year)) {
            throw new BadRequestError("year must be YYYY");
        }
        const users = await userRepository(companyId)
            .find({ isActive: true, ...(options.userIds ? { _id: { $in: options.userIds } } : {}) })
            .select("country employmentDate")
            .lean();
        const leaveTypes = await leaveTypeRepository(companyId).find({ isActive: true }).select("_id").lean();
        if (!users.length || !leaveTypes.length) {
            return 0;
        }
        const policies = await LeavePolicyService.loadPolicies(
            companyId,
            leaveTypes.map(type => String(type._id)),
        );
        const { hireYearEntitlement } = await LeaveSettingsService.getCompanySettings(companyId);

        let posted = 0;
        for (const user of users) {
            const hireDate = toIsoDate(user.employmentDate);
            if (hireDate && periodOf(hireDate) > year) {
                continue;
            }
            const isHireYear = !!hireDate && periodOf(hireDate) === year;
            const asOf = isHireYear ? hireDate : `${year}-01-01`;
            for (const type of leaveTypes) {
                const policy = pickPolicy(
                    policies,
                    String(type._id),
                    user.country ? String(user.country) : undefined,
                    asOf,
                );
                if (!policy || policy.entitlement.type !== "fixed") {
                    continue;
                }
                // A hire-year grant is posted even when the rule gives 0, so a later settings change never
                // retroactively grants it; HR corrects individual cases with an adjustment.
                const amount = entitlementForYear(
                    policy.entitlement.amountPerYear,
                    year,
                    hireDate,
                    hireYearEntitlement,
                );
                const created = await post(companyId, {
                    user: user._id as Types.ObjectId,
                    leaveType: type._id as Types.ObjectId,
                    period: year,
                    kind: "grant",
                    amount,
                    effectiveDate: asOf,
                    policy: { policyId: policy._id as Types.ObjectId, version: policy.version },
                    ...(isHireYear ? { reason: `Hire year (${hireYearEntitlement})` } : {}),
                    key: `grant:${user._id}:${type._id}:${year}`,
                    createdBy: options.createdBy ? objectId(options.createdBy) : "system",
                });
                posted += created ? 1 : 0;
            }
        }
        return posted;
    },

    /** Balances per active leave type for one leave year. Computed on read; never writes. */
    getBalances: async (
        companyId: string,
        userId: string,
        year: string,
        now: Date = new Date(),
    ): Promise<ILeaveBalance[]> => {
        const user = await userRepository(companyId).findById(userId).select("country").lean();
        if (!user) {
            return [];
        }
        const leaveTypes = (await leaveTypeRepository(companyId)
            .find({ isActive: true })
            .sort({ name: 1 })
            .lean()) as unknown as ILeaveType[];
        const [policies, posted, pending] = await Promise.all([
            LeavePolicyService.loadPolicies(
                companyId,
                leaveTypes.map(type => String(type._id)),
            ),
            LeaveLedgerService.postedByType(companyId, userId, year),
            LeaveLedgerService.pendingByType(companyId, userId, year),
        ]);
        const asOf = referenceDate(year, todayUtc(now));

        return leaveTypes.map(type => {
            const key = String(type._id);
            const policy: ILeavePolicy | null = pickPolicy(
                policies,
                key,
                user.country ? String(user.country) : undefined,
                asOf,
            );
            const sums = posted.get(key) ?? { granted: 0, adjusted: 0, used: 0 };
            const pendingQuantity = pending.get(key) ?? 0;
            const balance = sums.granted + sums.adjusted - sums.used;
            return {
                leaveType: { id: key, name: type.name, code: type.code, color: type.color },
                period: year,
                tracked: policy?.entitlement.type === "fixed",
                granted: sums.granted,
                adjusted: sums.adjusted,
                used: sums.used,
                pending: pendingQuantity,
                balance,
                available: balance - pendingQuantity,
            };
        });
    },

    /** Manual HR correction. Not idempotent by design: each call is a deliberate new fact with its reason. */
    adjust: async (
        companyId: string,
        actorId: string,
        input: {
            userId: string;
            leaveTypeId: string;
            year: string;
            amount: number;
            reason: string;
            effectiveDate?: string;
        },
    ) => {
        if (!/^\d{4}$/.test(input.year)) {
            throw new BadRequestError("year must be YYYY");
        }
        if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount === 0) {
            throw new BadRequestError("amount must be a non-zero number");
        }
        if (!input.reason?.trim()) {
            throw new BadRequestError("A reason is required");
        }
        const effectiveDate = input.effectiveDate ?? `${input.year}-01-01`;
        if (!isIsoDate(effectiveDate) || periodOf(effectiveDate) !== input.year) {
            throw new BadRequestError("effectiveDate must be a date inside the year");
        }
        const leaveType = await leaveTypeRepository(companyId).findById(input.leaveTypeId).select("_id").lean();
        const user = await userRepository(companyId).findById(input.userId).select("_id").lean();
        if (!leaveType || !user) {
            throw new BadRequestError("Unknown user or leave type");
        }
        await post(companyId, {
            user: objectId(input.userId),
            leaveType: objectId(input.leaveTypeId),
            period: input.year,
            kind: "adjustment",
            amount: input.amount,
            effectiveDate,
            reason: input.reason.trim(),
            createdBy: objectId(actorId),
        });
    },

    /** onApproved effect: one `usage` entry per leave year touched. Idempotent per request and year. */
    postUsage: async (request: IRequest): Promise<void> => {
        const companyId = String(request.company);
        const leave = await loadLeaveOf(request);
        for (const [period, quantity] of Object.entries(quantityByPeriod(leave))) {
            const firstDay = leave.lines.find(line => line.period === period && line.quantity > 0)!.date;
            await post(companyId, {
                user: leave.user,
                leaveType: leave.leaveType,
                period,
                kind: "usage",
                amount: -quantity,
                effectiveDate: firstDay,
                request: request._id,
                policy: leave.policy,
                key: `usage:${request._id}:${period}`,
                createdBy: "system",
            });
        }
    },

    /**
     * onCanceled effect: mirrors every `usage` entry of the request with a `usageReversal`. A pending request never
     * had usage, so cancelling it posts nothing. Idempotent per request and year.
     */
    reverseUsage: async (request: IRequest): Promise<void> => {
        const companyId = String(request.company);
        const usages = (await leaveLedgerRepository(companyId)
            .find({ request: request._id, kind: "usage" })
            .lean()) as unknown as ILeaveLedgerEntry[];
        const actor = request.canceledBy ? request.canceledBy : "system";
        for (const usage of usages) {
            await post(companyId, {
                user: usage.user,
                leaveType: usage.leaveType,
                period: usage.period,
                kind: "usageReversal",
                amount: -usage.amount,
                effectiveDate: usage.effectiveDate,
                request: request._id,
                policy: usage.policy,
                key: `usageReversal:${request._id}:${usage.period}`,
                createdBy: actor,
            });
        }
    },
};

async function loadLeaveOf(request: IRequest): Promise<ILeaveRequest> {
    const leave = request.ref?.id
        ? ((await leaveRequestRepository(String(request.company))
              .findById(String(request.ref.id))
              .lean()) as unknown as ILeaveRequest | null)
        : null;
    if (!leave) {
        throw new Error(`Leave record missing for request ${request._id}`);
    }
    return leave;
}

function quantityByPeriod(leave: ILeaveRequest): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const line of leave.lines) {
        if (line.quantity > 0) {
            totals[line.period] = (totals[line.period] ?? 0) + line.quantity;
        }
    }
    return totals;
}
