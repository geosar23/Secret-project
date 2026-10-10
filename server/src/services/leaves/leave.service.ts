import { Types } from "mongoose";
import { PermissionCategories } from "../../enums/permissions.enum";
import { ILeavePolicy, ILeaveRequest, ILeaveType, LeavePayload } from "../../interfaces/leave.interface";
import { IRequest } from "../../interfaces/request.interface";
import { IUserPopulated } from "../../interfaces/user.interface";
import { canWriteLeaveFor } from "../../policies/leave.policy";
import { canViewRequest } from "../../policies/request.policy";
import { leaveRequestRepository } from "../../repositories/leave-request.repository";
import { leaveTypeRepository } from "../../repositories/leave-type.repository";
import { BadRequestError, ForbiddenError, NotFoundError, RuleViolationError } from "../../utils/app-error.util";
import { loadAccessUser } from "../access-user.service";
import { ApprovalEngine } from "../approvals/request.service";
import { calculateLeaveLines, isIsoDate, periodOf } from "./leave-calculator";
import { LeaveLedgerService } from "./leave-ledger.service";
import { LeavePolicyService } from "./leave-policy.service";
import { leaveDetail, leaveRequestType, validateOverrides } from "./leave.request-type";

export interface LeaveInput {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
    /** Subject when entering leave for someone else (HR, manager). Defaults to the actor. */
    onBehalfOf?: string;
    /** Records the approval immediately (authorized creator only, never for own leave). */
    autoApprove?: { reason: string };
    overrides?: unknown;
}

/** Longest range accepted in one request; protects the per-day calculation from absurd input. */
const MAX_RANGE_DAYS = 366;

function parseInput(body: unknown): LeaveInput {
    const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
    if (typeof b.leaveType !== "string" || !Types.ObjectId.isValid(b.leaveType)) {
        throw new BadRequestError("leaveType is required");
    }
    if (!isIsoDate(b.startDate) || !isIsoDate(b.endDate) || b.startDate > b.endDate) {
        throw new BadRequestError("startDate and endDate must be YYYY-MM-DD with startDate <= endDate");
    }
    const days = (Date.parse(b.endDate) - Date.parse(b.startDate)) / 86_400_000 + 1;
    if (days > MAX_RANGE_DAYS) {
        throw new BadRequestError("A leave request cannot be longer than a year");
    }
    if (b.onBehalfOf !== undefined && (typeof b.onBehalfOf !== "string" || !Types.ObjectId.isValid(b.onBehalfOf))) {
        throw new BadRequestError("onBehalfOf must be a user id");
    }
    let autoApprove: LeaveInput["autoApprove"];
    if (b.autoApprove !== undefined && b.autoApprove !== null && b.autoApprove !== false) {
        const reason = (b.autoApprove as { reason?: unknown }).reason;
        if (typeof reason !== "string" || !reason.trim()) {
            throw new BadRequestError("autoApprove needs a reason");
        }
        autoApprove = { reason: reason.trim() };
    }
    return {
        leaveType: b.leaveType,
        startDate: b.startDate,
        endDate: b.endDate,
        reason: typeof b.reason === "string" ? b.reason.trim() || undefined : undefined,
        onBehalfOf: b.onBehalfOf as string | undefined,
        autoApprove,
        overrides: b.overrides,
    };
}

async function resolveSubject(companyId: string, actorId: string, onBehalfOf?: string) {
    const actor = await loadAccessUser(companyId, actorId);
    const subject = onBehalfOf && onBehalfOf !== actorId ? await loadAccessUser(companyId, onBehalfOf) : actor;
    if (!actor) {
        throw new ForbiddenError("Unknown actor");
    }
    if (!subject) {
        throw new NotFoundError("Employee not found");
    }
    return { actor, subject };
}

/** Policy, schedule and per-day lines for a subject, leave type and range. */
async function calculate(companyId: string, subject: IUserPopulated, input: LeaveInput) {
    const leaveType = (await leaveTypeRepository(companyId)
        .findOne({ _id: input.leaveType, isActive: true })
        .lean()) as unknown as ILeaveType | null;
    if (!leaveType) {
        throw new RuleViolationError("leaveTypeUnavailable", "This leave type is not available");
    }
    const countryId = subject.country ? String(subject.country) : undefined;
    const policy = (await LeavePolicyService.resolvePolicy(
        companyId,
        String(leaveType._id),
        countryId,
        input.startDate,
    )) as ILeavePolicy | null;
    if (!policy) {
        throw new RuleViolationError("noPolicy", `No ${leaveType.name} policy applies to this employee`);
    }
    const schedule = await LeavePolicyService.resolveSchedule(companyId, subject);
    const calculation = calculateLeaveLines({
        startDate: input.startDate,
        endDate: input.endDate,
        workingDays: schedule.workingDays,
        unit: policy.counting.unit,
    });
    return { leaveType, policy, schedule, calculation };
}

const ensureEntitlementsFor = async (companyId: string, userId: string, startDate: string, endDate: string) => {
    for (const year of new Set([periodOf(startDate), periodOf(endDate)])) {
        await LeaveLedgerService.ensureEntitlements(companyId, year, { userIds: [userId] });
    }
};

export const LeaveService = {
    parseInput,

    /** Days, policy and balance impact without saving anything. */
    preview: async (companyId: string, actorId: string, body: unknown) => {
        const input = parseInput(body);
        const { actor, subject } = await resolveSubject(companyId, actorId, input.onBehalfOf);
        if (!canWriteLeaveFor(actor, subject)) {
            throw new ForbiddenError("Not allowed to submit leave for this person");
        }
        const { leaveType, policy, calculation } = await calculate(companyId, subject, input);
        const balances = await LeaveLedgerService.getBalances(
            companyId,
            String(subject._id),
            periodOf(input.startDate),
        );
        return {
            leaveType: { id: String(leaveType._id), name: leaveType.name },
            policy: { id: String(policy._id), name: policy.name, version: policy.version },
            tracked: policy.entitlement.type === "fixed",
            lines: calculation.lines,
            totals: calculation.totals,
            byPeriod: calculation.byPeriod,
            balance: balances.find(b => b.leaveType.id === String(leaveType._id)) ?? null,
        };
    },

    /**
     * Creates the leave record and its Request through the engine. The leave record is written first (without a
     * status) so the engine can reference it; if the engine refuses, the record is removed again.
     */
    create: async (companyId: string, actorId: string, body: unknown) => {
        const input = parseInput(body);
        const overrides = validateOverrides(input.overrides);
        const { actor, subject } = await resolveSubject(companyId, actorId, input.onBehalfOf);
        if (!canWriteLeaveFor(actor, subject)) {
            throw new ForbiddenError("Not allowed to submit leave for this person");
        }
        const subjectId = String(subject._id);
        const { leaveType, policy, schedule, calculation } = await calculate(companyId, subject, input);
        if (calculation.totals.quantity <= 0) {
            throw new RuleViolationError("noWorkingDays", "The selected dates contain no working days");
        }
        await ensureEntitlementsFor(companyId, subjectId, input.startDate, input.endDate);

        const leaveRepo = leaveRequestRepository(companyId);
        const leave = await leaveRepo.create({
            user: new Types.ObjectId(subjectId),
            leaveType: leaveType._id as Types.ObjectId,
            startDate: input.startDate,
            endDate: input.endDate,
            reason: input.reason,
            overrides,
            lines: calculation.lines,
            totals: calculation.totals,
            policy: { policyId: policy._id as Types.ObjectId, version: policy.version },
            workSchedule: schedule._id,
            calculatedAt: new Date(),
        });
        const leaveId = String(leave._id);

        const payload: LeavePayload = {
            leaveRequestId: leaveId,
            leaveType: String(leaveType._id),
            leaveTypeName: leaveType.name,
            startDate: input.startDate,
            endDate: input.endDate,
            quantity: calculation.totals.quantity,
            tracked: policy.entitlement.type === "fixed",
            reason: input.reason,
            overrides,
        };

        let request: IRequest;
        try {
            request = await ApprovalEngine.create(
                companyId,
                { id: actorId },
                {
                    type: leaveRequestType.type,
                    subjectId,
                    payload,
                    scope: { leaveType: leaveType._id as Types.ObjectId },
                    ref: { collection: "LeaveRequests", id: leaveId },
                    onBehalf: input.autoApprove,
                },
            );
        } catch (error) {
            await leaveRepo.deleteOne({ _id: leaveId, request: { $exists: false } });
            throw error;
        }

        await leaveRepo.updateOne({ _id: leaveId }, { request: request._id } as Partial<ILeaveRequest>);
        return { request, leaveRequestId: leaveId };
    },

    /** Leave domain detail for someone allowed to see its Request. */
    get: async (companyId: string, actorId: string, leaveRequestId: string) => {
        if (!Types.ObjectId.isValid(leaveRequestId)) {
            throw new NotFoundError("Leave not found");
        }
        const leave = (await leaveRequestRepository(companyId)
            .findById(leaveRequestId)
            .lean()) as unknown as ILeaveRequest | null;
        if (!leave?.request) {
            throw new NotFoundError("Leave not found");
        }
        const request = await ApprovalEngine.get(companyId, String(leave.request));
        const [actor, subject] = await Promise.all([
            loadAccessUser(companyId, actorId),
            loadAccessUser(companyId, String(leave.user)),
        ]);
        if (!actor || !subject || !canViewRequest(actor, subject, request, PermissionCategories.LEAVES)) {
            throw new ForbiddenError("Not allowed to view this leave");
        }
        return {
            status: request.status,
            requestId: String(request._id),
            ...(await leaveDetail(request)),
        };
    },
};
