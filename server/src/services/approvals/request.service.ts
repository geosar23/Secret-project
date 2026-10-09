import { Types } from "mongoose";
import { IFlowScope } from "../../interfaces/approval-flow.interface";
import { IRequest, IRequestAction, RequestActionType, RequestStatus } from "../../interfaces/request.interface";
import { EngineActor } from "../../interfaces/request-type.interface";
import { requestRepository } from "../../repositories/request.repository";
import { userRepository } from "../../repositories/user.repository";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../utils/app-error.util";
import { FlowService } from "./flow.service";
import { getRequestType } from "./request-type.registry";
import { RequestTypeConfigService } from "./request-type-config.service";
import { resolveApprovers } from "./resolver.service";

export interface CreateRequestInput {
    type: string;
    subjectId?: string; // defaults to the actor (self-service)
    payload: unknown;
    scope?: IFlowScope; // extra scope dimensions (for example leaveType); country and department come from the subject
    ref?: { collection: string; id: string };
    /** Authorized creator records the decision immediately (HR entering leave for someone). */
    onBehalf?: { reason: string };
}

const asRequest = (doc: unknown) => doc as IRequest | null;
const idOf = (value: unknown) => String(value);
const objectId = (id: string) => new Types.ObjectId(id);

async function load(companyId: string, requestId: string): Promise<IRequest> {
    const request = asRequest(await requestRepository(companyId).findById(requestId).lean());
    if (!request) {
        throw new NotFoundError("Request not found");
    }
    return request;
}

/** One timeline entry. `status` is the request status right after the action. */
function action(
    type: RequestActionType,
    status: RequestStatus,
    user: string | "system",
    data?: Record<string, unknown>,
): IRequestAction {
    return { action: type, status, user: user === "system" ? "system" : objectId(user), date: new Date(), data };
}

/** Timeline entries of the given step (step keys are unique inside a request). */
const stepEntries = (request: IRequest, stepKey: string) =>
    request.actionsHistory.filter(entry => entry.data?.stepKey === stepKey);

/**
 * Activates step `index`: resolves approvers and stores them as `pendingApprovers` in one write.
 * Safe to call twice: only the call that moves the step from "waiting" proceeds.
 */
async function activateStep(companyId: string, requestId: string, index: number): Promise<IRequest> {
    const request = await load(companyId, requestId);
    const step = request.flow.steps[index];
    const repo = requestRepository(companyId);
    const now = new Date();
    const guard = { _id: requestId, status: "pending", currentStepIndex: index, [`steps.${index}.state`]: "waiting" };

    const resolution = await resolveApprovers(step, {
        companyId,
        requesterId: idOf(request.requester),
        subjectId: idOf(request.subject),
        type: getRequestType(request.type),
    });

    if (resolution.skipped) {
        const isLast = index === request.flow.steps.length - 1;
        const anyApproved = request.steps.some(s => s.state === "approved");

        if (isLast && !anyApproved) {
            // Every step would be skipped: never auto-approve, send it to admins instead.
            await repo.findOneAndUpdate(guard, {
                $set: {
                    [`steps.${index}.state`]: "active",
                    [`steps.${index}.activatedAt`]: now,
                    needsRouting: true,
                    pendingApprovers: [],
                },
                $push: {
                    actionsHistory: action("needsRouting", "pending", "system", {
                        stepKey: step.key,
                        reason: "allStepsSkipped",
                    }),
                },
            });
            return load(companyId, requestId);
        }

        const skipped = await repo.findOneAndUpdate(guard, {
            $set: {
                [`steps.${index}.state`]: "skipped",
                [`steps.${index}.completedAt`]: now,
                currentStepIndex: isLast ? index : index + 1,
            },
            $push: { actionsHistory: action("stepSkipped", "pending", "system", { stepKey: step.key }) },
        });
        if (!skipped) {
            return load(companyId, requestId);
        }
        return isLast
            ? finish(companyId, requestId, index, "approved", "system", "skipped")
            : activateStep(companyId, requestId, index + 1);
    }

    await repo.findOneAndUpdate(guard, {
        $set: {
            [`steps.${index}.state`]: "active",
            [`steps.${index}.activatedAt`]: now,
            ...(resolution.resolvedFrom ? { [`steps.${index}.resolvedFrom`]: resolution.resolvedFrom } : {}),
            needsRouting: resolution.needsRouting,
            pendingApprovers: resolution.userIds.map(objectId),
        },
        $push: {
            actionsHistory: resolution.needsRouting
                ? action("needsRouting", "pending", "system", { stepKey: step.key, reason: "noApprover" })
                : action("stepActivated", "pending", "system", {
                      stepKey: step.key,
                      flowVersion: request.flow.version,
                      assignees: resolution.userIds,
                      resolvedFrom: resolution.resolvedFrom,
                  }),
        },
    });
    return load(companyId, requestId);
}

/** Moves the request to its final state exactly once and runs the type's effect. */
async function finish(
    companyId: string,
    requestId: string,
    index: number,
    outcome: "approved" | "rejected",
    actorId: string,
    lastStepState: "approved" | "rejected" | "skipped" = outcome,
    data: Record<string, unknown> = {},
): Promise<IRequest> {
    const now = new Date();
    const updated = asRequest(
        await requestRepository(companyId)
            .findOneAndUpdate(
                { _id: requestId, status: "pending", currentStepIndex: index },
                {
                    $set: {
                        status: outcome,
                        currentStepIndex: null,
                        pendingApprovers: [],
                        decidedAt: now,
                        needsRouting: false,
                        [`steps.${index}.state`]: lastStepState,
                        [`steps.${index}.completedAt`]: now,
                    },
                    $push: {
                        actionsHistory: action(
                            outcome === "approved" ? "requestApproved" : "requestRejected",
                            outcome,
                            actorId,
                            data,
                        ),
                    },
                },
            )
            .lean(),
    );
    if (!updated) {
        return load(companyId, requestId); // someone else finished it
    }

    const type = getRequestType(updated.type);
    if (outcome === "approved") {
        await type.onApproved(updated);
    } else {
        await type.onRejected?.(updated);
    }
    return updated;
}

/**
 * Re-evaluates the current step from the stored state alone. Idempotent, so a retry after a crash is safe:
 * a stuck request (step done but not advanced) is recognisable by an empty pendingApprovers with approvals recorded.
 */
async function completeStep(companyId: string, requestId: string, actorId: string): Promise<IRequest> {
    const request = await load(companyId, requestId);
    if (request.status !== "pending" || request.currentStepIndex === null) {
        return request;
    }

    const index = request.currentStepIndex;
    if (request.steps[index].state === "waiting") {
        return activateStep(companyId, requestId, index); // a crash interrupted the activation
    }

    const step = request.flow.steps[index];
    const entries = stepEntries(request, step.key);
    const pending = request.pendingApprovers.map(idOf);

    if (entries.some(entry => entry.action === "rejected")) {
        return finish(companyId, requestId, index, "rejected", actorId, "rejected", {
            stepKey: step.key,
            canceledApprovers: pending,
        });
    }

    const approved = entries.some(entry => entry.action === "approved");
    const stepDone = approved && (step.mode === "any" || pending.length === 0);
    if (!stepDone) {
        return request;
    }

    const superseded = step.mode === "any" ? pending : [];
    if (index === request.flow.steps.length - 1) {
        return finish(companyId, requestId, index, "approved", actorId, "approved", { stepKey: step.key, superseded });
    }

    const now = new Date();
    const advanced = await requestRepository(companyId).findOneAndUpdate(
        { _id: requestId, status: "pending", currentStepIndex: index },
        {
            $set: {
                [`steps.${index}.state`]: "approved",
                [`steps.${index}.completedAt`]: now,
                currentStepIndex: index + 1,
                pendingApprovers: [],
            },
            $push: { actionsHistory: action("stepCompleted", "pending", actorId, { stepKey: step.key, superseded }) },
        },
    );
    if (!advanced) {
        return load(companyId, requestId);
    }
    return activateStep(companyId, requestId, index + 1);
}

/**
 * Atomically removes `approverId` from the pending list and records the decision.
 * Resolves to null when that person is no longer expected to act (double click, retry, someone else finished).
 */
async function recordDecision(
    companyId: string,
    request: IRequest,
    approverId: string,
    decision: "approved" | "rejected",
    by: string,
    data: Record<string, unknown>,
): Promise<IRequest | null> {
    const step = request.flow.steps[request.currentStepIndex as number];
    return asRequest(
        await requestRepository(companyId)
            .findOneAndUpdate(
                {
                    _id: request._id,
                    status: "pending",
                    currentStepIndex: request.currentStepIndex,
                    pendingApprovers: approverId,
                },
                {
                    $pull: { pendingApprovers: objectId(approverId) },
                    $push: { actionsHistory: action(decision, "pending", by, { stepKey: step.key, ...data }) },
                },
            )
            .lean(),
    );
}

export const ApprovalEngine = {
    create: async (companyId: string, actor: EngineActor, input: CreateRequestInput): Promise<IRequest> => {
        await RequestTypeConfigService.assertUsable(companyId, input.type);
        const type = getRequestType(input.type);
        const subjectId = input.subjectId ?? actor.id;

        const subject = await userRepository(companyId)
            .findById(subjectId)
            .select("country primaryDepartment isActive")
            .lean();
        if (!subject) {
            throw new NotFoundError("Subject not found");
        }

        const payload = type.validatePayload(input.payload);
        await type.canCreate(companyId, actor, subjectId, payload);

        const flow = await FlowService.resolve(companyId, input.type, {
            country: subject.country,
            department: subject.primaryDepartment,
            ...input.scope,
        });

        const draft: IRequest = {
            company: objectId(companyId),
            type: input.type,
            typeVersion: type.version,
            requester: objectId(actor.id),
            subject: objectId(subjectId),
            status: "pending",
            flow: { flowId: flow.flowId, version: flow.version, steps: flow.steps },
            currentStepIndex: 0,
            steps: flow.steps.map(step => ({ key: step.key, state: "waiting" as const })),
            pendingApprovers: [],
            actionsHistory: [
                action("submitted", "pending", actor.id, { flowVersion: flow.version, subject: subjectId }),
            ],
            payload,
            ref: input.ref ? { collection: input.ref.collection, id: objectId(input.ref.id) } : undefined,
            needsRouting: false,
        };

        if (input.onBehalf) {
            if (!input.onBehalf.reason?.trim()) {
                throw new BadRequestError("A reason is required for immediate approval");
            }
            const allowed = (await type.canApproveOnCreate?.(companyId, actor, draft)) ?? false;
            if (!allowed) {
                throw new ForbiddenError("Immediate approval is not permitted");
            }
        }

        const created = (await requestRepository(companyId).create(draft)).toObject() as unknown as IRequest;
        let current = await activateStep(companyId, idOf(created._id), 0);
        await type.onSubmitted?.(current);

        if (input.onBehalf) {
            current = await recordImmediateApproval(companyId, actor, current, input.onBehalf.reason.trim());
        }
        return current;
    },

    decide: async (
        companyId: string,
        actor: EngineActor,
        requestId: string,
        input: { decision: "approve" | "reject"; comment?: string },
    ): Promise<IRequest> => {
        const request = await load(companyId, requestId);
        if (request.status !== "pending" || request.currentStepIndex === null) {
            throw new ConflictError("Request is no longer pending");
        }

        const step = request.flow.steps[request.currentStepIndex];
        if (!request.pendingApprovers.map(idOf).includes(actor.id)) {
            const alreadyActed = stepEntries(request, step.key).some(
                entry => (entry.action === "approved" || entry.action === "rejected") && idOf(entry.user) === actor.id,
            );
            throw alreadyActed
                ? new ConflictError("Already decided")
                : new ForbiddenError("Not an approver of this request");
        }
        if (actor.id === idOf(request.subject) || actor.id === idOf(request.requester)) {
            throw new ForbiddenError("Self-approval is not allowed");
        }
        if (!(await getRequestType(request.type).canApprove(companyId, actor, request))) {
            throw new ForbiddenError("Approval authority lost");
        }

        const decided = await recordDecision(
            companyId,
            request,
            actor.id,
            input.decision === "approve" ? "approved" : "rejected",
            actor.id,
            { comment: input.comment },
        );
        if (!decided) {
            throw new ConflictError("Already decided");
        }
        return completeStep(companyId, requestId, actor.id);
    },

    /** Re-evaluates the current step; safe to repeat. Used for crash recovery and the future reconciliation job. */
    reevaluate: (companyId: string, requestId: string): Promise<IRequest> =>
        completeStep(companyId, requestId, "system"),

    /**
     * Cancels a request. Who may cancel is decided by the request type's `canCancel` (plan D5); without that hook only
     * the requester may. `actor: "system"` is reserved for engine effects (a change request superseding the original,
     * a deactivated requester) and is never reachable from user input.
     */
    cancel: async (
        companyId: string,
        requestId: string,
        input: { reason: string; actor: EngineActor | "system" },
    ): Promise<IRequest> => {
        if (!input.reason?.trim()) {
            throw new BadRequestError("A cancellation reason is required");
        }
        const actorId = input.actor === "system" ? "system" : input.actor.id;

        const request = await load(companyId, requestId);
        const type = getRequestType(request.type);

        if (input.actor !== "system") {
            const allowed = type.canCancel
                ? await type.canCancel(companyId, input.actor, request)
                : input.actor.id === idOf(request.requester);
            if (!allowed) {
                throw new ForbiddenError("Not allowed to cancel this request");
            }
        }
        if (request.status === "approved" && !type.allowCancelAfterApproval) {
            throw new ForbiddenError("This request type cannot be canceled after approval");
        }
        if (request.status !== "pending" && request.status !== "approved") {
            throw new ConflictError(`A ${request.status} request cannot be canceled`);
        }

        const reason = input.reason.trim();
        const canceled = asRequest(
            await requestRepository(companyId)
                .findOneAndUpdate(
                    { _id: requestId, status: request.status },
                    {
                        $set: {
                            status: "canceled",
                            currentStepIndex: null,
                            pendingApprovers: [],
                            needsRouting: false,
                            decidedAt: new Date(),
                            cancelReason: reason,
                            ...(input.actor === "system" ? {} : { canceledBy: objectId(input.actor.id) }),
                        },
                        $push: {
                            actionsHistory: action("canceled", "canceled", actorId, {
                                reason,
                                previousStatus: request.status,
                            }),
                        },
                    },
                )
                .lean(),
        );
        if (!canceled) {
            throw new ConflictError("Request changed state, try again");
        }

        await type.onCanceled?.(canceled);
        return canceled;
    },

    /** Inbox badge: pending requests waiting for this user. Served by the partial index on pendingApprovers. */
    countPendingFor: (companyId: string, userId: string) =>
        requestRepository(companyId).count({ status: "pending", pendingApprovers: userId }),

    /** Oldest request waiting for this user, for the "oldest from" hint. */
    oldestPendingFor: async (companyId: string, userId: string): Promise<Date | null> => {
        const oldest = (await requestRepository(companyId)
            .find(pendingForFilter(userId))
            .sort({ createdAt: 1 })
            .limit(1)
            .select("createdAt")
            .lean()) as unknown as Pick<IRequest, "createdAt">[];
        return oldest[0]?.createdAt ?? null;
    },

    /** Inbox list, newest first, optionally filtered by type, needs-routing and submitted dates. */
    listPendingFor: async (companyId: string, userId: string, options: MineOptions = {}) =>
        (await requestRepository(companyId)
            .find(pendingForFilter(userId, options))
            .sort({ createdAt: -1 })
            .skip(options.skip ?? 0)
            .limit(options.limit ?? 50)
            .lean()) as unknown as IRequest[],

    /** Total for the inbox pagination (same filter as listPendingFor). */
    countPendingForType: (companyId: string, userId: string, options: MineOptions = {}) =>
        requestRepository(companyId).count(pendingForFilter(userId, options)),

    /** Requests that cannot move because no approver was found (HR has to route them). */
    countNeedingRouting: (companyId: string, access: Record<string, unknown>[]) =>
        requestRepository(companyId).count({ $or: access, status: "pending", needsRouting: true }),

    /** Requests about people the viewer may read, newest first. `access` is built by the view service. */
    listTeam: async (companyId: string, options: TeamOptions) =>
        (await requestRepository(companyId)
            .find(teamFilter(options))
            .sort({ createdAt: -1 })
            .skip(options.skip ?? 0)
            .limit(options.limit ?? 50)
            .lean()) as unknown as IRequest[],

    countTeam: (companyId: string, options: TeamOptions) => requestRepository(companyId).count(teamFilter(options)),

    /** "My requests": requests I raised or that are about me, newest first. */
    listMine: async (companyId: string, userId: string, options: MineOptions = {}) =>
        (await requestRepository(companyId)
            .find(mineFilter(userId, options))
            .sort({ createdAt: -1 })
            .skip(options.skip ?? 0)
            .limit(options.limit ?? 50)
            .lean()) as unknown as IRequest[],

    countMine: (companyId: string, userId: string, options: MineOptions = {}) =>
        requestRepository(companyId).count(mineFilter(userId, options)),

    /** Requests about one person (their profile tab), newest first. `types` limits it to the types the viewer may read. */
    listAbout: async (companyId: string, subjectId: string, options: AboutOptions = {}) =>
        (await requestRepository(companyId)
            .find(aboutFilter(subjectId, options))
            .sort({ createdAt: -1 })
            .skip(options.skip ?? 0)
            .limit(options.limit ?? 50)
            .lean()) as unknown as IRequest[],

    countAbout: (companyId: string, subjectId: string, options: AboutOptions = {}) =>
        requestRepository(companyId).count(aboutFilter(subjectId, options)),

    get: load,
};

interface AboutOptions extends MineOptions {
    /** Allowed request types. Omitted means every type. */
    types?: string[];
    createdFrom?: Date;
    createdTo?: Date;
}

const aboutTypeFilter = (options: AboutOptions) => {
    const allowed = options.types && options.type ? options.types.filter(t => t === options.type) : options.types;
    if (allowed) {
        return { type: { $in: allowed } };
    }
    return options.type ? { type: options.type } : {};
};

const aboutFilter = (subjectId: string, options: AboutOptions) => ({
    subject: subjectId,
    ...aboutTypeFilter(options),
    ...(options.status ? { status: options.status } : {}),
    ...(options.createdFrom || options.createdTo
        ? {
              createdAt: {
                  ...(options.createdFrom ? { $gte: options.createdFrom } : {}),
                  ...(options.createdTo ? { $lte: options.createdTo } : {}),
              },
          }
        : {}),
});

interface MineOptions {
    type?: string;
    status?: RequestStatus;
    /** Only requests nobody could be found to approve (they are still `pending`). */
    needsRouting?: boolean;
    createdFrom?: Date;
    createdTo?: Date;
    limit?: number;
    skip?: number;
}

/** type, status, needs-routing and submitted-date conditions shared by every list. */
const commonFilter = (options: MineOptions) => ({
    ...(options.type ? { type: options.type } : {}),
    ...(options.status ? { status: options.status } : {}),
    ...(options.needsRouting ? { needsRouting: true } : {}),
    ...(options.createdFrom || options.createdTo
        ? {
              createdAt: {
                  ...(options.createdFrom ? { $gte: options.createdFrom } : {}),
                  ...(options.createdTo ? { $lte: options.createdTo } : {}),
              },
          }
        : {}),
});

const pendingForFilter = (userId: string, options: MineOptions = {}) => ({
    ...commonFilter({ ...options, status: undefined }),
    status: "pending",
    pendingApprovers: userId,
});

const mineFilter = (userId: string, options: MineOptions) => ({
    $or: [{ requester: userId }, { subject: userId }],
    ...commonFilter(options),
});

interface TeamOptions extends MineOptions {
    /** Access clauses (an `$or` of type/subject pairs) built from what the viewer may read. */
    access: Record<string, unknown>[];
}

const teamFilter = (options: TeamOptions) => ({
    $or: options.access,
    ...commonFilter(options),
});

/** Records the pending approvers as approved by the creator (override), step by step, through the normal completion path. */
async function recordImmediateApproval(
    companyId: string,
    actor: EngineActor,
    request: IRequest,
    reason: string,
): Promise<IRequest> {
    let current = request;
    while (current.status === "pending" && current.currentStepIndex !== null) {
        const step = current.flow.steps[current.currentStepIndex];
        const pending = current.pendingApprovers.map(idOf);
        if (!pending.length) {
            break; // needs routing: cannot be approved on creation
        }

        for (const approverId of step.mode === "any" ? pending.slice(0, 1) : pending) {
            await recordDecision(companyId, current, approverId, "approved", actor.id, {
                isOverride: true,
                reason,
                onBehalfOf: approverId,
            });
        }
        current = await completeStep(companyId, idOf(current._id), actor.id);
    }
    return current;
}
