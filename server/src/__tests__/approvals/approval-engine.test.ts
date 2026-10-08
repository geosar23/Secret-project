/* eslint-disable no-unused-vars */
/**
 * Approval engine core (P0-11B)
 *
 * Service-level integration tests against an in-memory MongoDB: lifecycle, idempotency,
 * resolver edge cases, authority rechecks and company isolation.
 * Live state is `pendingApprovers` on the request; `actionsHistory` is the append-only timeline.
 */
import mongoose from "mongoose";
import { connectTestDB, disconnectTestDB, clearCollections } from "../helpers/db";
import { seedUserInCompany, COMPANY_A_ID, COMPANY_B_ID, SeededUser } from "../helpers/seed";
import { ApprovalEngine } from "../../services/approvals/request.service";
import { FlowService, compareSpecificity, flowMatches } from "../../services/approvals/flow.service";
import { clearRequestTypes, registerRequestType } from "../../services/approvals/request-type.registry";
import { IFlowStep } from "../../interfaces/approval-flow.interface";
import { IRequest } from "../../interfaces/request.interface";
import { RequestTypeDefinition } from "../../interfaces/request-type.interface";
import { ApprovalFlowModel } from "../../models/approval-flow.model";
import { RequestModel } from "../../models/request.model";
import { RequestTypeModel } from "../../models/request-type.model";
import { UserModel } from "../../models/user.model";
import { requestRepository } from "../../repositories/request.repository";
import { ConflictError, ForbiddenError, NotFoundError, BadRequestError } from "../../utils/app-error.util";

const A = COMPANY_A_ID.toString();
const B = COMPANY_B_ID.toString();

const step = (over: Partial<IFlowStep> & Pick<IFlowStep, "key" | "resolver">): IFlowStep => ({
    name: over.key,
    mode: "any",
    onReject: "rejectRequest",
    allowSelfApproval: false,
    skipIfRequesterIsApprover: true,
    ...over,
});

const lineManagerStep = () =>
    step({ key: "lineManager", resolver: { kind: "lineManager" }, fallback: { kind: "hrRepresentative" } });

// Mutable knobs and spies for the test-only request type
const control = {
    canApprove: true,
    canApproveOnCreate: false,
    allowCancelAfterApproval: false,
    canCancel: undefined as undefined | ((actorId: string, request: IRequest) => boolean),
    unavailable: new Set<string>(),
    onApprovedHook: undefined as undefined | ((request: IRequest) => Promise<void>),
};
const onApproved = jest.fn();
const onRejected = jest.fn();
const onCanceled = jest.fn();
const onSubmitted = jest.fn();

const testType: RequestTypeDefinition<{ note?: string }> = {
    type: "test",
    version: 1,
    name: "Test",
    validatePayload: payload => {
        if (typeof payload !== "object" || payload === null) {
            throw new BadRequestError("payload must be an object");
        }
        return payload as { note?: string };
    },
    flowTemplate: [],
    canCreate: async () => undefined,
    onSubmitted: async request => void onSubmitted(request),
    onApproved: async request => {
        onApproved(request);
        await control.onApprovedHook?.(request);
    },
    onRejected: async request => void onRejected(request),
    onCanceled: async request => void onCanceled(request),
    summarize: () => ({ title: "Test request" }),
    canApprove: async () => control.canApprove,
    canApproveOnCreate: async () => control.canApproveOnCreate,
    get allowCancelAfterApproval() {
        return control.allowCancelAfterApproval;
    },
    // Undefined unless a test sets the knob, so the engine's default (requester only) is also covered
    get canCancel() {
        const rule = control.canCancel;
        return rule
            ? async (_companyId: string, actor: { id: string }, request: IRequest) => rule(actor.id, request)
            : undefined;
    },
    isUnavailable: async (_companyId, userId) => control.unavailable.has(userId),
    detail: async () => ({}),
};

let manager: SeededUser;
let hr: SeededUser;
let requester: SeededUser;
let outsider: SeededUser; // company B
let counter = 0;

const email = (label: string) => `${label}-${++counter}@test.com`;
const user = (label: string, over: Partial<Parameters<typeof seedUserInCompany>[0]> = {}) =>
    seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: email(label),
        name: label,
        permissions: [],
        roleKey: `${label}-${counter}`,
        ...over,
    });

const actorOf = (u: SeededUser) => ({ id: u._id.toString() });
/** Flows live in the DB: each call stores a new company-wide version, which new requests then use. */
const useFlow = (steps: IFlowStep[]) =>
    FlowService.createVersion(A, { requestType: "test", steps, createdBy: id(manager) });
const id = (u: SeededUser) => u._id.toString();
const submit = (over: Record<string, unknown> = {}) =>
    ApprovalEngine.create(A, actorOf(requester), { type: "test", payload: {}, ...over });
const approve = (u: SeededUser, requestId: unknown) =>
    ApprovalEngine.decide(A, actorOf(u), String(requestId), { decision: "approve" });
const reject = (u: SeededUser, requestId: unknown) =>
    ApprovalEngine.decide(A, actorOf(u), String(requestId), { decision: "reject" });

const stored = async (requestId: unknown) => (await RequestModel.findById(requestId).lean())!;
const pendingOf = async (requestId: unknown) => (await stored(requestId)).pendingApprovers.map(String);
const historyOf = async (requestId: unknown) => (await stored(requestId)).actionsHistory;
const actionsOf = async (requestId: unknown) => (await historyOf(requestId)).map(entry => entry.action);

beforeAll(async () => {
    await connectTestDB();
    // Models use autoIndex:false, so build the indexes the engine relies on (see scripts/syncIndexes.ts)
    await Promise.all([ApprovalFlowModel.syncIndexes(), RequestModel.syncIndexes(), RequestTypeModel.syncIndexes()]);
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
    jest.clearAllMocks();
    clearRequestTypes();
    registerRequestType(testType);
    Object.assign(control, {
        canApprove: true,
        canApproveOnCreate: false,
        allowCancelAfterApproval: false,
        canCancel: undefined,
        onApprovedHook: undefined,
    });
    control.unavailable.clear();

    manager = await user("manager");
    hr = await user("hr");
    requester = await user("requester", { manager: manager._id, hrRepresentative: hr._id });
    outsider = await seedUserInCompany({
        companyId: COMPANY_B_ID,
        email: email("outsider"),
        name: "outsider",
        permissions: [],
        roleKey: `outsider-${counter}`,
    });
    await RequestTypeModel.create({ company: COMPANY_A_ID, key: "test", name: "Test", kind: "system", isActive: true });
    await useFlow([lineManagerStep()]);
});

describe("approve", () => {
    it("puts the line manager in pendingApprovers and approves the request", async () => {
        const created = await submit();
        expect(created.status).toBe("pending");
        expect(created.currentStepIndex).toBe(0);
        expect(created.flow.version).toBe(1);
        expect(created.flow.flowId).toBeDefined();
        expect(created.pendingApprovers.map(String)).toEqual([id(manager)]);
        expect(created.steps[0].resolvedFrom).toEqual({ kind: "lineManager" });
        expect(onSubmitted).toHaveBeenCalledTimes(1);

        const done = await approve(manager, created._id);
        expect(done.status).toBe("approved");
        expect(done.currentStepIndex).toBeNull();
        expect(done.pendingApprovers).toHaveLength(0);
        expect(onApproved).toHaveBeenCalledTimes(1);

        expect(await actionsOf(created._id)).toEqual(["submitted", "stepActivated", "approved", "requestApproved"]);
        const decision = (await historyOf(created._id))[2];
        expect(String(decision.user)).toBe(id(manager));
        expect(decision.data?.stepKey).toBe("lineManager");
    });
});

describe("reject", () => {
    it("is final: request rejected, effect called, later decisions conflict", async () => {
        const created = await submit();

        const done = await ApprovalEngine.decide(A, actorOf(manager), String(created._id), {
            decision: "reject",
            comment: "no",
        });
        expect(done.status).toBe("rejected");
        expect(onRejected).toHaveBeenCalledTimes(1);
        expect(onApproved).not.toHaveBeenCalled();
        expect(await actionsOf(created._id)).toEqual(["submitted", "stepActivated", "rejected", "requestRejected"]);

        await expect(approve(manager, created._id)).rejects.toBeInstanceOf(ConflictError);
        await expect(
            ApprovalEngine.cancel(A, String(created._id), { reason: "x", actor: actorOf(requester) }),
        ).rejects.toBeInstanceOf(ConflictError);
    });
});

describe("cancel", () => {
    it("clears the pending approvers and runs onCanceled once", async () => {
        const created = await submit();
        const canceled = await ApprovalEngine.cancel(A, String(created._id), {
            reason: "changed my mind",
            actor: actorOf(requester),
        });

        expect(canceled.status).toBe("canceled");
        expect(onCanceled).toHaveBeenCalledTimes(1);
        expect(await pendingOf(created._id)).toEqual([]);
        expect((await actionsOf(created._id)).slice(-1)).toEqual(["canceled"]);
        expect(await ApprovalEngine.countPendingFor(A, id(manager))).toBe(0);

        await expect(
            ApprovalEngine.cancel(A, String(created._id), { reason: "again", actor: actorOf(requester) }),
        ).rejects.toBeInstanceOf(ConflictError);
        expect(onCanceled).toHaveBeenCalledTimes(1);
    });

    it("defaults to requester only when the type defines no canCancel", async () => {
        const created = await submit();

        await expect(
            ApprovalEngine.cancel(A, String(created._id), { reason: "not needed", actor: actorOf(manager) }),
        ).rejects.toBeInstanceOf(ForbiddenError);
        await expect(
            ApprovalEngine.cancel(A, String(created._id), { reason: "not needed", actor: actorOf(hr) }),
        ).rejects.toBeInstanceOf(ForbiddenError);
        expect((await stored(created._id)).status).toBe("pending");
        expect(onCanceled).not.toHaveBeenCalled();

        // the system actor (engine effects) is not a user action
        const canceled = await ApprovalEngine.cancel(A, String(created._id), {
            reason: "requester deactivated",
            actor: "system",
        });
        expect(canceled.status).toBe("canceled");
    });

    it("lets the type decide who may cancel, including after approval", async () => {
        control.allowCancelAfterApproval = true;
        // type-level rule: the requester while pending, HR at any time
        control.canCancel = (actorId, request) =>
            actorId === id(hr) || (request.status === "pending" && actorId === String(request.requester));
        const created = await submit();
        await approve(manager, created._id);

        await expect(
            ApprovalEngine.cancel(A, String(created._id), { reason: "undo", actor: actorOf(requester) }),
        ).rejects.toBeInstanceOf(ForbiddenError); // approved: the requester no longer qualifies
        await expect(
            ApprovalEngine.cancel(A, String(created._id), { reason: "undo", actor: actorOf(manager) }),
        ).rejects.toBeInstanceOf(ForbiddenError);

        const canceled = await ApprovalEngine.cancel(A, String(created._id), {
            reason: "HR correction",
            actor: actorOf(hr),
        });
        expect(canceled.status).toBe("canceled");
        expect(canceled.canceledBy && String(canceled.canceledBy)).toBe(id(hr));
        expect(onCanceled).toHaveBeenCalledTimes(1);
    });

    it("still blocks cancel after approval when the type does not allow it, whoever asks", async () => {
        control.canCancel = () => true;
        const created = await submit();
        await approve(manager, created._id);

        await expect(
            ApprovalEngine.cancel(A, String(created._id), { reason: "undo", actor: actorOf(hr) }),
        ).rejects.toBeInstanceOf(ForbiddenError);
        expect((await stored(created._id)).status).toBe("approved");
    });

    it("requires a reason", async () => {
        const created = await submit();
        await expect(
            ApprovalEngine.cancel(A, String(created._id), { reason: " ", actor: "system" }),
        ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("after approval is forbidden unless the type opts in", async () => {
        const created = await submit();
        await approve(manager, created._id);

        await expect(
            ApprovalEngine.cancel(A, String(created._id), { reason: "undo", actor: actorOf(requester) }),
        ).rejects.toBeInstanceOf(ForbiddenError);

        control.allowCancelAfterApproval = true;
        const canceled = await ApprovalEngine.cancel(A, String(created._id), {
            reason: "undo",
            actor: actorOf(requester),
        });
        expect(canceled.status).toBe("canceled");
        expect(onCanceled).toHaveBeenCalledTimes(1);
        const last = (await historyOf(created._id)).slice(-1)[0];
        expect(last.data?.previousStatus).toBe("approved");
    });

    it("can be triggered from a handler: approving B cancels A as superseded", async () => {
        const original = await submit();
        const change = await submit();
        control.allowCancelAfterApproval = true;
        control.onApprovedHook = async request => {
            if (String(request._id) === String(change._id)) {
                await ApprovalEngine.cancel(A, String(original._id), { reason: "superseded", actor: "system" });
            }
        };

        await approve(manager, change._id);

        const after = await stored(original._id);
        expect(after.status).toBe("canceled");
        expect(after.cancelReason).toBe("superseded");
    });
});

describe("idempotency", () => {
    it("lets only one of two concurrent decisions win", async () => {
        const created = await submit();

        const results = await Promise.allSettled([approve(manager, created._id), approve(manager, created._id)]);

        expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
        const failure = results.find(r => r.status === "rejected") as PromiseRejectedResult;
        expect(failure.reason).toBeInstanceOf(ConflictError);
        expect(onApproved).toHaveBeenCalledTimes(1);
        expect((await actionsOf(created._id)).filter(a => a === "approved")).toHaveLength(1);
    });

    it("re-evaluating after a crash applies the effect exactly once", async () => {
        const created = await submit();
        // Crash window: the decision was recorded but the request was never advanced
        await RequestModel.updateOne(
            { _id: created._id },
            {
                $set: { pendingApprovers: [] },
                $push: {
                    actionsHistory: {
                        action: "approved",
                        status: "pending",
                        user: manager._id,
                        date: new Date(),
                        data: { stepKey: "lineManager" },
                    },
                },
            },
        );

        const first = await ApprovalEngine.reevaluate(A, String(created._id));
        const second = await ApprovalEngine.reevaluate(A, String(created._id));

        expect(first.status).toBe("approved");
        expect(second.status).toBe("approved");
        expect(onApproved).toHaveBeenCalledTimes(1);
    });

    it("re-evaluating a healthy request changes nothing", async () => {
        const created = await submit();
        const before = await historyOf(created._id);

        await ApprovalEngine.reevaluate(A, String(created._id));
        await ApprovalEngine.reevaluate(A, String(created._id));

        expect(await historyOf(created._id)).toHaveLength(before.length);
        expect(await pendingOf(created._id)).toEqual([id(manager)]);
    });
});

describe("approver resolution", () => {
    it("flags needsRouting instead of approving when nobody can be found", async () => {
        const lonely = await user("lonely");
        const created = await ApprovalEngine.create(A, actorOf(lonely), { type: "test", payload: {} });

        expect(created.status).toBe("pending");
        expect(created.needsRouting).toBe(true);
        expect(created.pendingApprovers).toHaveLength(0);
        expect(await actionsOf(created._id)).toEqual(["submitted", "needsRouting"]);
        expect(onApproved).not.toHaveBeenCalled();
    });

    it("uses the fallback when there is no manager and records which rule resolved", async () => {
        const noManager = await user("nomanager", { hrRepresentative: hr._id });
        const created = await ApprovalEngine.create(A, actorOf(noManager), { type: "test", payload: {} });

        expect(created.pendingApprovers.map(String)).toEqual([id(hr)]);
        expect(created.steps[0].resolvedFrom).toEqual({ kind: "hrRepresentative" });
        expect(created.needsRouting).toBe(false);
    });

    it("treats an inactive manager as nobody", async () => {
        await UserModel.updateOne({ _id: manager._id }, { isActive: false });
        const created = await submit();
        expect(created.pendingApprovers.map(String)).toEqual([id(hr)]);

        await UserModel.updateOne({ _id: hr._id }, { isActive: false });
        const second = await submit();
        expect(second.needsRouting).toBe(true);
        expect(second.pendingApprovers).toHaveLength(0);
    });

    it("treats an unavailable approver as nobody", async () => {
        control.unavailable.add(id(manager));
        const created = await submit();
        expect(created.pendingApprovers.map(String)).toEqual([id(hr)]);
    });

    it("never asks the requester to approve their own request", async () => {
        await UserModel.updateOne({ _id: requester._id }, { manager: requester._id });

        // skipIfRequesterIsApprover: step skipped, nothing left, so it is routed rather than auto-approved
        const skipped = await submit();
        expect(skipped.needsRouting).toBe(true);
        expect(skipped.status).toBe("pending");
        expect(skipped.pendingApprovers).toHaveLength(0);

        // without the skip flag the fallback is used
        await useFlow([
            step({
                key: "lineManager",
                resolver: { kind: "lineManager" },
                fallback: { kind: "hrRepresentative" },
                skipIfRequesterIsApprover: false,
            }),
        ]);
        const viaFallback = await submit();
        expect(viaFallback.pendingApprovers.map(String)).toEqual([id(hr)]);
    });

    it("blocks a decision by the requester even if they somehow are pending", async () => {
        const created = await submit();
        await RequestModel.updateOne({ _id: created._id }, { $push: { pendingApprovers: requester._id } });

        await expect(approve(requester, created._id)).rejects.toBeInstanceOf(ForbiddenError);
        expect(onApproved).not.toHaveBeenCalled();
    });

    it("rejects a decision from someone who is not an approver", async () => {
        const created = await submit();
        await expect(approve(hr, created._id)).rejects.toBeInstanceOf(ForbiddenError);
        expect(await pendingOf(created._id)).toEqual([id(manager)]);
    });
});

describe("authority", () => {
    it("blocks the decision when authority was lost and leaves the approver pending", async () => {
        const created = await submit();
        control.canApprove = false;

        await expect(approve(manager, created._id)).rejects.toBeInstanceOf(ForbiddenError);
        expect(await pendingOf(created._id)).toEqual([id(manager)]);
        expect(onApproved).not.toHaveBeenCalled();
    });
});

describe("immediate approval by an authorized creator", () => {
    it("records the decision with override, reason and who it replaced", async () => {
        control.canApproveOnCreate = true;
        const created = await ApprovalEngine.create(A, actorOf(hr), {
            type: "test",
            payload: {},
            subjectId: id(requester),
            onBehalf: { reason: "Phone call with employee" },
        });

        expect(created.status).toBe("approved");
        expect(onApproved).toHaveBeenCalledTimes(1);
        const decision = (await historyOf(created._id)).find(entry => entry.action === "approved")!;
        expect(String(decision.user)).toBe(id(hr));
        expect(decision.data).toMatchObject({
            isOverride: true,
            reason: "Phone call with employee",
            onBehalfOf: id(manager),
            stepKey: "lineManager",
        });
    });

    it("needs the permission and a reason, and stores nothing otherwise", async () => {
        const input = { type: "test", payload: {}, subjectId: id(requester) };

        await expect(
            ApprovalEngine.create(A, actorOf(hr), { ...input, onBehalf: { reason: "why" } }),
        ).rejects.toBeInstanceOf(ForbiddenError);

        control.canApproveOnCreate = true;
        await expect(
            ApprovalEngine.create(A, actorOf(hr), { ...input, onBehalf: { reason: "  " } }),
        ).rejects.toBeInstanceOf(BadRequestError);
        expect(await RequestModel.countDocuments({})).toBe(0);
    });
});

describe("multi-step readiness", () => {
    it("runs steps in order and never collapses the same approver", async () => {
        await useFlow([
            step({ key: "first", resolver: { kind: "user", userId: hr._id } }),
            step({ key: "second", resolver: { kind: "user", userId: hr._id } }),
        ]);
        const created = await submit();
        expect(created.pendingApprovers.map(String)).toEqual([id(hr)]);

        const afterFirst = await approve(hr, created._id);
        expect(afterFirst.status).toBe("pending");
        expect(afterFirst.currentStepIndex).toBe(1);
        expect(afterFirst.steps.map(s => s.state)).toEqual(["approved", "active"]);
        expect(afterFirst.pendingApprovers.map(String)).toEqual([id(hr)]); // asked again, separately

        const done = await approve(hr, created._id);
        expect(done.status).toBe("approved");
        expect(onApproved).toHaveBeenCalledTimes(1);
        expect(await actionsOf(created._id)).toEqual([
            "submitted",
            "stepActivated",
            "approved",
            "stepCompleted",
            "stepActivated",
            "approved",
            "requestApproved",
        ]);
    });

    it("'all' mode waits for every approver, 'any' mode supersedes the others", async () => {
        const second = await user("second-approver");
        const managerDoc = await UserModel.findById(manager._id).lean();
        await UserModel.updateOne({ _id: second._id }, { role: managerDoc!.role });
        const roleResolver = { kind: "role", roleId: managerDoc!.role } as const;

        await useFlow([step({ key: "committee", resolver: roleResolver, mode: "all" })]);
        const allRequest = await submit();
        expect((await pendingOf(allRequest._id)).sort()).toEqual([id(manager), id(second)].sort());

        const afterOne = await approve(manager, allRequest._id);
        expect(afterOne.status).toBe("pending");
        expect(afterOne.pendingApprovers.map(String)).toEqual([id(second)]);
        const done = await approve(second, allRequest._id);
        expect(done.status).toBe("approved");

        await useFlow([step({ key: "committee", resolver: roleResolver, mode: "any" })]);
        const anyRequest = await submit();
        const winner = (await pendingOf(anyRequest._id)).includes(id(manager)) ? manager : second;
        const loser = winner === manager ? second : manager;

        const anyDone = await approve(winner, anyRequest._id);
        expect(anyDone.status).toBe("approved");
        expect(anyDone.pendingApprovers).toHaveLength(0);
        const finalEntry = (await historyOf(anyRequest._id)).slice(-1)[0];
        expect(finalEntry.data?.superseded).toEqual([id(loser)]);
        await expect(approve(loser, anyRequest._id)).rejects.toBeInstanceOf(ConflictError);
    });

    it("a rejection in any step rejects the request", async () => {
        await useFlow([
            step({ key: "first", resolver: { kind: "user", userId: hr._id } }),
            step({ key: "second", resolver: { kind: "user", userId: manager._id } }),
        ]);
        const created = await submit();
        const done = await reject(hr, created._id);

        expect(done.status).toBe("rejected");
        expect(done.pendingApprovers).toHaveLength(0);
        expect(done.steps.map(s => s.state)).toEqual(["rejected", "waiting"]);
    });
});

describe("inbox", () => {
    it("counts and lists only pending requests waiting for the user", async () => {
        const first = await submit();
        const second = await submit();
        expect(await ApprovalEngine.countPendingFor(A, id(manager))).toBe(2);
        expect(await ApprovalEngine.countPendingFor(A, id(hr))).toBe(0);

        await approve(manager, first._id);
        expect(await ApprovalEngine.countPendingFor(A, id(manager))).toBe(1);
        const list = await ApprovalEngine.listPendingFor(A, id(manager));
        expect(list.map(r => String(r._id))).toEqual([String(second._id)]);
        expect(await ApprovalEngine.listPendingFor(A, id(manager), { type: "other" })).toHaveLength(0);
    });

    it("keeps the pending index partial, so finished requests are not indexed", async () => {
        const indexes = await RequestModel.collection.indexes();
        const inbox = indexes.find(index => index.key && "pendingApprovers" in index.key);
        expect(inbox?.partialFilterExpression).toEqual({ status: "pending" });
    });
});

describe("flow resolution", () => {
    const country = new mongoose.Types.ObjectId();
    const otherCountry = new mongoose.Types.ObjectId();
    const department = new mongoose.Types.ObjectId();
    const oneStep = [step({ key: "hr", resolver: { kind: "hrRepresentative" } })];

    it("refuses to create a request when no flow is configured (there is no code fallback)", async () => {
        await ApprovalFlowModel.deleteMany({});
        await expect(FlowService.resolve(A, "test", { country })).rejects.toBeInstanceOf(BadRequestError);
        await expect(submit()).rejects.toBeInstanceOf(BadRequestError);
        expect(await RequestModel.countDocuments({})).toBe(0);
    });

    it("seeds the default flow from the type template once, and never overwrites it", async () => {
        await ApprovalFlowModel.deleteMany({});
        Object.assign(testType, { flowTemplate: [lineManagerStep()] });
        try {
            expect(await FlowService.ensureDefault(A, "test", id(manager))).toBe(true);
            expect(await FlowService.ensureDefault(A, "test", id(manager))).toBe(false);
        } finally {
            Object.assign(testType, { flowTemplate: [] });
        }
        const flows = await ApprovalFlowModel.find({ company: COMPANY_A_ID, requestType: "test" }).lean();
        expect(flows).toHaveLength(1);
        expect(flows[0].version).toBe(1);
        expect((await submit()).pendingApprovers.map(String)).toEqual([id(manager)]);
    });

    it("picks the most specific active flow and ignores non-matching scopes", async () => {
        const create = (scope: object) =>
            FlowService.createVersion(A, { requestType: "test", scope, steps: oneStep, createdBy: id(manager) });
        const byCountry = await create({ country });
        const byBoth = await create({ country, department });
        await create({ country: otherCountry });

        expect(String((await FlowService.resolve(A, "test", { country })).flowId)).toBe(String(byCountry._id));
        expect(String((await FlowService.resolve(A, "test", { country, department })).flowId)).toBe(String(byBoth._id));
        expect((await FlowService.resolve(A, "test", {})).version).toBe(1); // the seeded company-wide flow
    });

    it("ranks ties by leaveType > department > country", () => {
        const leaveType = new mongoose.Types.ObjectId();
        expect(compareSpecificity({ scope: { leaveType } }, { scope: { department } })).toBeGreaterThan(0);
        expect(compareSpecificity({ scope: { department } }, { scope: { country } })).toBeGreaterThan(0);
        expect(compareSpecificity({ scope: { country, department } }, { scope: { leaveType } })).toBeGreaterThan(0);
        expect(flowMatches({ scope: { country, department } }, { country })).toBe(false);
    });

    it("versions flows and never changes in-flight requests", async () => {
        await ApprovalFlowModel.deleteMany({});
        const v1 = await FlowService.createVersion(A, { requestType: "test", steps: oneStep, createdBy: id(manager) });
        expect(v1.version).toBe(1);
        const created = await submit();
        expect(created.flow.version).toBe(1);

        const v2 = await FlowService.createVersion(A, {
            requestType: "test",
            steps: [step({ key: "other", resolver: { kind: "user", userId: manager._id } })],
            createdBy: id(manager),
        });
        expect(v2.version).toBe(2);
        expect((await ApprovalFlowModel.findById(v1._id).lean())?.isActive).toBe(false);

        const request = await stored(created._id);
        expect(request.flow.version).toBe(1);
        expect(request.flow.steps[0].key).toBe("hr");
        expect((await submit()).flow.version).toBe(2);
    });

    it("rejects empty flows and duplicate step keys", async () => {
        const base = { requestType: "test", createdBy: id(manager) };
        await expect(FlowService.createVersion(A, { ...base, steps: [] })).rejects.toBeInstanceOf(BadRequestError);
        await expect(FlowService.createVersion(A, { ...base, steps: [...oneStep, ...oneStep] })).rejects.toBeInstanceOf(
            BadRequestError,
        );
    });
});

describe("request type configuration", () => {
    it("refuses types the company has not enabled or has deactivated", async () => {
        await RequestTypeModel.updateOne({ company: COMPANY_A_ID, key: "test" }, { isActive: false });
        await expect(submit()).rejects.toBeInstanceOf(BadRequestError);
        await RequestTypeModel.deleteMany({});
        await expect(submit()).rejects.toBeInstanceOf(BadRequestError);
        expect(await RequestModel.countDocuments({})).toBe(0);
    });

    it("refuses an enabled type whose behaviour is not registered", async () => {
        await RequestTypeModel.create({
            company: COMPANY_A_ID,
            key: "ghost",
            name: "Ghost",
            kind: "system",
            isActive: true,
        });
        await expect(
            ApprovalEngine.create(A, actorOf(requester), { type: "ghost", payload: {} }),
        ).rejects.toBeInstanceOf(BadRequestError);
    });
});

describe("company isolation", () => {
    it("hides requests from other companies", async () => {
        const created = await submit();
        const outsiderActor = actorOf(outsider);

        await expect(
            ApprovalEngine.decide(B, outsiderActor, String(created._id), { decision: "approve" }),
        ).rejects.toBeInstanceOf(NotFoundError);
        await expect(
            ApprovalEngine.cancel(B, String(created._id), { reason: "nope", actor: outsiderActor }),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(await ApprovalEngine.countPendingFor(B, id(manager))).toBe(0);
        expect(await ApprovalEngine.countPendingFor(A, id(manager))).toBe(1);
    });

    it("scopes conditional updates by company and requires a company id", async () => {
        const created = await submit();
        const leaked = await requestRepository(B).findOneAndUpdate(
            { _id: created._id },
            { $set: { status: "canceled" } },
        );
        expect(leaked).toBeNull();
        expect((await stored(created._id)).status).toBe("pending");
        expect(() => requestRepository("")).toThrow();
    });

    it("cannot create a request for a subject from another company", async () => {
        await expect(
            ApprovalEngine.create(A, actorOf(requester), { type: "test", payload: {}, subjectId: id(outsider) }),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});
