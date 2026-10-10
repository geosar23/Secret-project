/**
 * Leave on the approval engine, end to end over HTTP: submit, approve / reject / cancel, balance effects,
 * on-behalf entry, rules (overlap, balance, backdating) and the authority checks.
 */
import request from "supertest";
import app from "../../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "../helpers/db";
import { COMPANY_A_ID } from "../helpers/seed";
import { RequestModel } from "../../models/request.model";
import { LeaveLedgerModel } from "../../models/leave-ledger.model";
import { LeaveRequestModel } from "../../models/leave-request.model";
import { LeaveTypeModel } from "../../models/leave-type.model";
import { UserModel } from "../../models/user.model";
import { api, auth, balanceOf, buildWorld, day, LeaveWorld, syncLeaveIndexes, YEAR } from "./fixtures";

let w: LeaveWorld;

/** Monday–Friday of the first full week of March (5 working days). */
const week = () => ({ startDate: day(3), endDate: day(3, 4) });

const submit = async (who = () => w.employee, body: Record<string, unknown> = {}) => {
    const res = await api.createLeave(who(), { leaveType: w.leaveTypes.annual, ...week(), ...body });
    return res;
};

const usageOf = (requestId: string) => LeaveLedgerModel.find({ request: requestId }).sort({ createdAt: 1 }).lean();

beforeAll(async () => {
    await connectTestDB();
    await syncLeaveIndexes();
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
    w = await buildWorld(COMPANY_A_ID);
});

describe("submit and approve", () => {
    it("routes to the line manager, reserves the days, and posts usage on approval", async () => {
        const created = await submit();
        expect(created.status).toBe(201);
        expect(created.body.data.status).toBe("pending");
        expect(created.body.data.pendingApprovers).toEqual([String(w.manager._id)]);
        const requestId = created.body.data.requestId;

        const leave = await LeaveRequestModel.findById(created.body.data.leaveRequestId).lean();
        expect(String(leave!.request)).toBe(requestId);
        expect(leave).not.toHaveProperty("status");
        expect(leave!.totals.quantity).toBe(5);

        expect(await balanceOf(w.employee, w.leaveTypes.annual)).toMatchObject({
            tracked: true,
            granted: 20,
            used: 0,
            pending: 5,
            available: 15,
        });

        const summary = await request(app).get("/api/requests/summary").set(auth(w.manager));
        expect(summary.body.data).toMatchObject({ pendingForMe: 1, myPending: 0, unreadNotifications: 0 });
        const inbox = await request(app).get("/api/requests/inbox").set(auth(w.manager));
        expect(inbox.body.data.total).toBe(1);
        expect(inbox.body.data.items[0].summary.title).toMatch(
            /^Annual leave, \d{2}\/03\/\d{4} – \d{2}\/03\/\d{4} \(5 days\)$/,
        );
        expect(inbox.body.data.items[0].subject.name).toBe("employee");

        const approved = await api.decide(w.manager, requestId, "approve", "Enjoy");
        expect(approved.status).toBe(200);
        expect(approved.body.data.status).toBe("approved");

        const entries = await usageOf(requestId);
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ kind: "usage", amount: -5, period: YEAR, effectiveDate: day(3) });
        expect(await balanceOf(w.employee, w.leaveTypes.annual)).toMatchObject({
            granted: 20,
            used: 5,
            pending: 0,
            balance: 15,
            available: 15,
        });
        const after = await request(app).get("/api/requests/summary").set(auth(w.manager));
        expect(after.body.data.pendingForMe).toBe(0);
    });

    it("a second decision on the same request conflicts", async () => {
        const requestId = (await submit()).body.data.requestId;
        expect((await api.decide(w.manager, requestId, "approve")).status).toBe(200);
        expect((await api.decide(w.manager, requestId, "approve")).status).toBe(409);
        expect(await usageOf(requestId)).toHaveLength(1);
    });

    it("previews days and balance without saving anything", async () => {
        const res = await request(app)
            .post("/api/leaves/preview")
            .set(auth(w.employee))
            .send({ leaveType: w.leaveTypes.annual, ...week() });
        expect(res.status).toBe(200);
        expect(res.body.data.totals.quantity).toBe(5);
        expect(res.body.data.tracked).toBe(true);
        expect(await LeaveRequestModel.countDocuments({})).toBe(0);
        expect(await RequestModel.countDocuments({})).toBe(0);
    });
});

describe("reject", () => {
    it("is final and touches no balance", async () => {
        const requestId = (await submit()).body.data.requestId;
        const rejected = await api.decide(w.manager, requestId, "reject", "Team offsite");
        expect(rejected.body.data.status).toBe("rejected");
        expect(await usageOf(requestId)).toHaveLength(0);
        expect(await balanceOf(w.employee, w.leaveTypes.annual)).toMatchObject({ used: 0, pending: 0, available: 20 });
        expect((await api.decide(w.manager, requestId, "approve")).status).toBe(409);
        expect((await api.cancel(w.employee, requestId)).status).toBe(409);
    });
});

describe("cancel", () => {
    it("a pending leave by the employee: no ledger entry, the reservation disappears", async () => {
        const requestId = (await submit()).body.data.requestId;
        const res = await api.cancel(w.employee, requestId);
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("canceled");
        expect(await usageOf(requestId)).toHaveLength(0);
        expect(await balanceOf(w.employee, w.leaveTypes.annual)).toMatchObject({ pending: 0, available: 20 });
    });

    it("requires a reason", async () => {
        const requestId = (await submit()).body.data.requestId;
        const res = await request(app).post(`/api/requests/${requestId}/cancel`).set(auth(w.employee)).send({});
        expect(res.status).toBe(400);
    });

    it("an approved leave before its start: reversed in the ledger, balance restored", async () => {
        const requestId = (await submit()).body.data.requestId;
        await api.decide(w.manager, requestId, "approve");
        const res = await api.cancel(w.employee, requestId);
        expect(res.body.data.status).toBe("canceled");

        const entries = await usageOf(requestId);
        expect(entries.map(e => [e.kind, e.amount])).toEqual([
            ["usage", -5],
            ["usageReversal", 5],
        ]);
        expect(await balanceOf(w.employee, w.leaveTypes.annual)).toMatchObject({ used: 0, balance: 20, available: 20 });
    });

    it("an approved leave that started: not by the employee, but by HR", async () => {
        const requestId = (await submit()).body.data.requestId;
        await api.decide(w.manager, requestId, "approve");
        await RequestModel.updateOne({ _id: requestId }, { "payload.startDate": "2020-01-06" });

        expect((await api.cancel(w.employee, requestId)).status).toBe(403);
        expect((await api.cancel(w.manager, requestId)).status).toBe(403); // approve authority is not cancel authority
        const byHr = await api.cancel(w.hr, requestId, "Returned to work early");
        expect(byHr.status).toBe(200);
        const reversal = (await usageOf(requestId)).find(e => e.kind === "usageReversal");
        expect(String(reversal!.createdBy)).toBe(String(w.hr._id));
    });

    it("someone unrelated cannot cancel", async () => {
        const requestId = (await submit()).body.data.requestId;
        expect((await api.cancel(w.colleague, requestId)).status).toBe(403);
    });
});

describe("routing", () => {
    it("falls back to the HR representative when there is no manager", async () => {
        await UserModel.updateOne({ _id: w.employee._id }, { $unset: { manager: 1 } });
        const res = await submit();
        expect(res.body.data.pendingApprovers).toEqual([String(w.hr._id)]);
    });

    it("flags needsRouting when nobody can approve, never auto-approves", async () => {
        await UserModel.updateOne({ _id: w.employee._id }, { $unset: { manager: 1, hrRepresentative: 1 } });
        const res = await submit();
        expect(res.body.data.status).toBe("pending");
        expect(res.body.data.needsRouting).toBe(true);
        expect(res.body.data.pendingApprovers).toEqual([]);
    });
});

describe("authority", () => {
    it("the employee cannot decide their own leave", async () => {
        const requestId = (await submit()).body.data.requestId;
        expect((await api.decide(w.employee, requestId, "approve")).status).toBe(403);
    });

    it("someone not pending cannot decide, even with authority", async () => {
        const requestId = (await submit()).body.data.requestId;
        expect((await api.decide(w.hr, requestId, "approve")).status).toBe(403);
    });

    it("a manager who lost leaves:approve is blocked and stays pending", async () => {
        const requestId = (await submit()).body.data.requestId;
        await UserModel.updateOne({ _id: w.manager._id }, { $push: { revokedPermissions: "leaves:approve:managed" } });
        expect((await api.decide(w.manager, requestId, "approve")).status).toBe(403);
        const stored = await RequestModel.findById(requestId).lean();
        expect(stored!.status).toBe("pending");
        expect(stored!.pendingApprovers.map(String)).toEqual([String(w.manager._id)]);
    });

    it("rejects an invalid decision value", async () => {
        const requestId = (await submit()).body.data.requestId;
        const res = await request(app)
            .post(`/api/requests/${requestId}/decision`)
            .set(auth(w.manager))
            .send({ decision: "maybe" });
        expect(res.status).toBe(400);
    });
});

describe("entering leave on someone's behalf", () => {
    it("HR submits for the employee: HR is the requester, the manager still approves", async () => {
        const res = await submit(() => w.hr, { onBehalfOf: String(w.employee._id) });
        expect(res.status).toBe(201);
        const stored = await RequestModel.findById(res.body.data.requestId).lean();
        expect(String(stored!.requester)).toBe(String(w.hr._id));
        expect(String(stored!.subject)).toBe(String(w.employee._id));
        expect(stored!.pendingApprovers.map(String)).toEqual([String(w.manager._id)]);
    });

    it("an employee cannot submit for someone else", async () => {
        const res = await submit(() => w.employee, { onBehalfOf: String(w.colleague._id) });
        expect(res.status).toBe(403);
        expect(await LeaveRequestModel.countDocuments({})).toBe(0);
    });

    it("autoApprove with a reason records the approval immediately and posts usage", async () => {
        const res = await submit(() => w.hr, {
            onBehalfOf: String(w.employee._id),
            autoApprove: { reason: "Agreed by phone" },
        });
        expect(res.body.data.status).toBe("approved");
        const stored = await RequestModel.findById(res.body.data.requestId).lean();
        const decision = stored!.actionsHistory.find(entry => entry.action === "approved")!;
        expect(decision.data).toMatchObject({ isOverride: true, reason: "Agreed by phone" });
        expect(await usageOf(res.body.data.requestId)).toHaveLength(1);
    });

    it("autoApprove needs a reason and is never allowed for one's own leave", async () => {
        const noReason = await submit(() => w.hr, { onBehalfOf: String(w.employee._id), autoApprove: { reason: " " } });
        expect(noReason.status).toBe(400);
        const own = await submit(() => w.hr, { autoApprove: { reason: "Me" } });
        expect(own.status).toBe(403);
        expect(await LeaveRequestModel.countDocuments({})).toBe(0);
        expect(await RequestModel.countDocuments({})).toBe(0);
    });
});

describe("rules", () => {
    const ruleOf = (res: request.Response) => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        return res.body.error.rule as string;
    };

    it("blocks overlap with pending or approved leave, but not with rejected leave", async () => {
        const first = (await submit()).body.data.requestId;
        expect(ruleOf(await submit(undefined, { startDate: day(3, 2), endDate: day(3, 2) }))).toBe("overlap");

        await api.decide(w.manager, first, "reject");
        const retry = await submit(undefined, { startDate: day(3, 2), endDate: day(3, 2) });
        expect(retry.status).toBe(201);
        expect(await LeaveRequestModel.countDocuments({})).toBe(2); // the refused attempt left nothing behind
    });

    it("blocks a request over the available balance, allows an HR override with a reason", async () => {
        const fiveWeeks = { startDate: day(4), endDate: day(4, 32) }; // 25 working days > 20
        expect(ruleOf(await submit(undefined, fiveWeeks))).toBe("insufficientBalance");

        const selfOverride = await submit(undefined, {
            ...fiveWeeks,
            overrides: [{ rule: "insufficientBalance", reason: "please" }],
        });
        expect(selfOverride.status).toBe(403);

        const byHr = await submit(() => w.hr, {
            ...fiveWeeks,
            onBehalfOf: String(w.employee._id),
            overrides: [{ rule: "insufficientBalance", reason: "Advance agreed with the director" }],
        });
        expect(byHr.status).toBe(201);
        const leave = await LeaveRequestModel.findById(byHr.body.data.leaveRequestId).lean();
        expect(leave!.overrides).toEqual([{ rule: "insufficientBalance", reason: "Advance agreed with the director" }]);
    });

    it("counts pending days against the balance", async () => {
        await submit(undefined, { startDate: day(4), endDate: day(4, 18) }); // 15 days pending
        expect(ruleOf(await submit(undefined, { startDate: day(6), endDate: day(6, 7) }))).toBe("insufficientBalance"); // 6 more
    });

    it("unpaid leave has its own allowance and never touches annual leave", async () => {
        const res = await submit(undefined, { leaveType: w.leaveTypes.unpaid });
        await api.decide(w.manager, res.body.data.requestId, "approve");
        expect(await balanceOf(w.employee, w.leaveTypes.unpaid)).toMatchObject({ granted: 30, used: 5, available: 25 });
        expect(await balanceOf(w.employee, w.leaveTypes.annual)).toMatchObject({ granted: 20, used: 0, available: 20 });
    });

    it("sick leave is untracked: no balance limit, usage still recorded", async () => {
        const res = await submit(undefined, { leaveType: w.leaveTypes.sick, startDate: day(4), endDate: day(4, 39) });
        expect(res.status).toBe(201);
        await api.decide(w.manager, res.body.data.requestId, "approve");
        const sick = await balanceOf(w.employee, w.leaveTypes.sick);
        expect(sick).toMatchObject({ tracked: false, granted: 0, used: 30 });
    });

    it("blocks backdated annual leave but allows backdated sick leave", async () => {
        const lastYear = Number(YEAR) - 2; // inside the seeded policies, before today
        const past = { startDate: `${lastYear}-03-02`, endDate: `${lastYear}-03-08` };
        expect(ruleOf(await submit(undefined, past))).toBe("backdated");
        const sick = await submit(undefined, { ...past, leaveType: w.leaveTypes.sick });
        expect(sick.status).toBe(201);
    });

    it("refuses a range with no working days and an inactive leave type", async () => {
        expect(ruleOf(await submit(undefined, { startDate: day(3, 5), endDate: day(3, 6) }))).toBe("noWorkingDays");
        await LeaveTypeModel.updateOne({ _id: w.leaveTypes.annual }, { isActive: false });
        expect(ruleOf(await submit())).toBe("leaveTypeUnavailable");
    });

    it("validates the input", async () => {
        expect((await submit(undefined, { startDate: "2027-02-30" })).status).toBe(400);
        expect((await submit(undefined, { startDate: day(3, 4), endDate: day(3) })).status).toBe(400);
        expect((await submit(undefined, { leaveType: "nope" })).status).toBe(400);
    });
});

describe("visibility", () => {
    it("requester, approver and scoped HR can read the request; an unrelated colleague cannot", async () => {
        const requestId = (await submit()).body.data.requestId;

        const asEmployee = await api.getRequest(w.employee, requestId);
        expect(asEmployee.status).toBe(200);
        expect(asEmployee.body.data.can).toEqual({ decide: false, cancel: true });
        expect(asEmployee.body.data.detail.totals.quantity).toBe(5);

        const asManager = await api.getRequest(w.manager, requestId);
        expect(asManager.body.data.can).toEqual({ decide: true, cancel: false });

        expect((await api.getRequest(w.hr, requestId)).status).toBe(200); // requests:read:*
        expect((await api.getRequest(w.colleague, requestId)).status).toBe(403);
    });

    it("names everyone in the timeline so the UI can label each step", async () => {
        const requestId = (await submit()).body.data.requestId;
        await api.decide(w.manager, requestId, "approve");
        const { people, actionsHistory } = (await api.getRequest(w.employee, requestId)).body.data;
        for (const entry of actionsHistory) {
            if (entry.user !== "system") {
                expect(people[entry.user]?.name).toEqual(expect.any(String));
            }
        }
        expect(people[String(w.manager._id)]).toBeDefined();
    });

    it("a past approver can still read it after deciding", async () => {
        const requestId = (await submit()).body.data.requestId;
        await api.decide(w.manager, requestId, "approve");
        await UserModel.updateOne({ _id: w.employee._id }, { $unset: { manager: 1 } });
        const res = await api.getRequest(w.manager, requestId);
        expect(res.status).toBe(200);
        expect(res.body.data.can.decide).toBe(false);
    });

    it("GET /api/leaves/:id follows the same visibility", async () => {
        const leaveId = (await submit()).body.data.leaveRequestId;
        const own = await request(app).get(`/api/leaves/${leaveId}`).set(auth(w.employee));
        expect(own.status).toBe(200);
        expect(own.body.data.status).toBe("pending");
        expect(own.body.data.policy.name).toBe("Annual leave - company default");
        expect((await request(app).get(`/api/leaves/${leaveId}`).set(auth(w.colleague))).status).toBe(403);
    });
});

describe("lists", () => {
    it("inbox paginates and filters by type; mine lists own requests by status", async () => {
        await submit(undefined, { startDate: day(3), endDate: day(3) });
        await submit(undefined, { startDate: day(3, 1), endDate: day(3, 1) });
        await submit(undefined, { startDate: day(3, 2), endDate: day(3, 2) });

        const page1 = await request(app).get("/api/requests/inbox?limit=2&page=1").set(auth(w.manager));
        expect(page1.body.data).toMatchObject({ total: 3, page: 1, limit: 2, totalPages: 2 });
        expect(page1.body.data.items).toHaveLength(2);
        const page2 = await request(app).get("/api/requests/inbox?limit=2&page=2").set(auth(w.manager));
        expect(page2.body.data.items).toHaveLength(1);
        const otherType = await request(app).get("/api/requests/inbox?type=promotion").set(auth(w.manager));
        expect(otherType.body.data.total).toBe(0);

        const mine = await request(app).get("/api/requests/mine?status=pending").set(auth(w.employee));
        expect(mine.body.data.total).toBe(3);
        const summary = await request(app).get("/api/requests/summary").set(auth(w.employee));
        expect(summary.body.data).toMatchObject({ pendingForMe: 0, myPending: 3 });
        expect((await request(app).get("/api/requests/mine?status=bogus").set(auth(w.employee))).status).toBe(400);
    });

    it("lists the enabled request types", async () => {
        const res = await request(app).get("/api/request-types").set(auth(w.employee));
        expect(res.body.data.map((t: { key: string }) => t.key)).toEqual(["leave"]);
    });
});
