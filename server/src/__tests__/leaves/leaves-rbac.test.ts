/**
 * RBAC and company isolation for the request and leave routes (style of rbac.test.ts / company-isolation.test.ts).
 */
import request from "supertest";
import app from "../../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "../helpers/db";
import { COMPANY_A_ID, COMPANY_B_ID, seedUserInCompany, SeededUser } from "../helpers/seed";
import { LeaveTypeModel } from "../../models/leave-type.model";
import { api, auth, buildWorld, day, LeaveWorld, syncLeaveIndexes } from "./fixtures";

let a: LeaveWorld;
let b: LeaveWorld;
let noPermissions: SeededUser;
let requestIdA: string;
let leaveIdA: string;

beforeAll(async () => {
    await connectTestDB();
    await syncLeaveIndexes();
    a = await buildWorld(COMPANY_A_ID, "a");
    b = await buildWorld(COMPANY_B_ID, "b");
    noPermissions = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "nobody@test.com",
        name: "nobody",
        permissions: [],
        roleKey: "nobody",
    });
    const created = await api.createLeave(a.employee, {
        leaveType: a.leaveTypes.annual,
        startDate: day(3),
        endDate: day(3, 4),
    });
    requestIdA = created.body.data.requestId;
    leaveIdA = created.body.data.leaveRequestId;
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

const ROUTES: [method: "get" | "post" | "put", path: () => string][] = [
    ["get", () => "/api/requests/inbox"],
    ["get", () => "/api/requests/mine"],
    ["get", () => "/api/requests/summary"],
    ["get", () => `/api/requests/${requestIdA}`],
    ["post", () => `/api/requests/${requestIdA}/decision`],
    ["post", () => `/api/requests/${requestIdA}/cancel`],
    ["get", () => "/api/request-types"],
    ["post", () => "/api/leaves"],
    ["post", () => "/api/leaves/preview"],
    ["get", () => `/api/leaves/${leaveIdA}`],
    ["get", () => "/api/leaves/balances/me"],
    ["get", () => `/api/leaves/balances/${a.employee._id}`],
    ["post", () => `/api/leaves/balances/${a.employee._id}/adjust`],
    ["post", () => "/api/leaves/entitlements/run"],
    ["get", () => "/api/leave-settings"],
    ["put", () => "/api/leave-settings"],
    ["get", () => "/api/leave-types"],
    ["post", () => "/api/leave-types"],
    ["get", () => "/api/leave-policies"],
    ["post", () => "/api/leave-policies"],
    ["get", () => "/api/work-schedules"],
    ["post", () => "/api/work-schedules"],
];

describe("auth gate", () => {
    it.each(ROUTES)("%s %s returns 401 without a token", async (method, path) => {
        const res = await request(app)[method](path()).send({});
        expect(res.status).toBe(401);
    });
});

describe("permission gates for a user without leave permissions", () => {
    const FORBIDDEN: [method: "get" | "post" | "put", path: () => string][] = [
        ["post", () => "/api/leaves"],
        ["post", () => "/api/leaves/preview"],
        ["get", () => `/api/leaves/${leaveIdA}`],
        ["get", () => "/api/leaves/balances/me"],
        ["get", () => `/api/leaves/balances/${a.employee._id}`],
        ["post", () => `/api/leaves/balances/${a.employee._id}/adjust`],
        ["post", () => "/api/leaves/entitlements/run"],
        ["get", () => "/api/leave-settings"],
        ["put", () => "/api/leave-settings"],
        ["get", () => "/api/leave-types"],
        ["post", () => "/api/leave-types"],
        ["put", () => `/api/leave-types/${a.leaveTypes.annual}`],
        ["get", () => "/api/leave-policies"],
        ["post", () => "/api/leave-policies"],
        ["get", () => "/api/work-schedules"],
        ["post", () => "/api/work-schedules"],
        ["get", () => `/api/requests/${requestIdA}`],
        ["post", () => `/api/requests/${requestIdA}/decision`],
    ];

    it.each(FORBIDDEN)("%s %s returns 403", async (method, path) => {
        const res = await request(app)[method](path()).set(auth(noPermissions)).send({ decision: "approve" });
        expect(res.status).toBe(403);
    });

    it("own lists still work and are empty", async () => {
        const inbox = await request(app).get("/api/requests/inbox").set(auth(noPermissions));
        expect(inbox.status).toBe(200);
        expect(inbox.body.data.total).toBe(0);
        const summary = await request(app).get("/api/requests/summary").set(auth(noPermissions));
        expect(summary.body.data).toMatchObject({ pendingForMe: 0, myPending: 0, unreadNotifications: 0 });
    });
});

describe("scoped permissions", () => {
    it("an employee reads only their own balances; their manager reads the report's; HR reads anyone's", async () => {
        expect((await request(app).get("/api/leaves/balances/me").set(auth(a.employee))).status).toBe(200);
        const path = `/api/leaves/balances/${a.employee._id}`;
        expect((await request(app).get(`/api/leaves/balances/${a.colleague._id}`).set(auth(a.employee))).status).toBe(
            403,
        );
        expect((await request(app).get(path).set(auth(a.manager))).status).toBe(200);
        expect((await request(app).get(`/api/leaves/balances/${a.colleague._id}`).set(auth(a.manager))).status).toBe(
            403,
        );
        expect((await request(app).get(`/api/leaves/balances/${a.colleague._id}`).set(auth(a.hr))).status).toBe(200);
    });

    it("leave settings and manual adjustments are HR-only", async () => {
        expect((await request(app).get("/api/leave-types").set(auth(a.employee))).status).toBe(403);
        expect((await request(app).get("/api/leave-types").set(auth(a.hr))).status).toBe(200);
        const adjust = await request(app)
            .post(`/api/leaves/balances/${a.employee._id}/adjust`)
            .set(auth(a.manager))
            .send({ leaveType: a.leaveTypes.annual, year: "2027", amount: 1, reason: "x" });
        expect(adjust.status).toBe(403);
    });

    it("HR changes the hire-year rule per company and runs the grants on demand", async () => {
        const updated = await request(app)
            .put("/api/leave-settings")
            .set(auth(a.hr))
            .send({ hireYearEntitlement: "full" });
        expect(updated.status).toBe(200);
        expect(updated.body.data.hireYearEntitlement).toBe("full");
        // company B keeps its own (default) rule
        const other = await request(app).get("/api/leave-settings").set(auth(b.hr));
        expect(other.body.data.hireYearEntitlement).toBe("prorated");

        const run = await request(app).post("/api/leaves/entitlements/run").set(auth(a.hr)).send({ year: "2031" });
        expect(run.status).toBe(200);
        expect(run.body.data.posted).toBeGreaterThan(0);
        const again = await request(app).post("/api/leaves/entitlements/run").set(auth(a.hr)).send({ year: "2031" });
        expect(again.body.data.posted).toBe(0);
        const managerRun = await request(app).post("/api/leaves/entitlements/run").set(auth(a.manager)).send({});
        expect(managerRun.status).toBe(403);
    });

    it("HR can create a leave type and a policy version; duplicate codes conflict", async () => {
        const created = await request(app)
            .post("/api/leave-types")
            .set(auth(a.hr))
            .send({ name: "Study leave", code: "study" });
        expect(created.status).toBe(201);
        expect(created.body.data.code).toBe("STUDY");
        const duplicate = await request(app)
            .post("/api/leave-types")
            .set(auth(a.hr))
            .send({ name: "x", code: "STUDY" });
        expect(duplicate.status).toBe(409);

        const policy = await request(app)
            .post("/api/leave-policies")
            .set(auth(a.hr))
            .send({
                leaveType: created.body.data._id,
                name: "Study - company default",
                effectiveFrom: "2026-01-01",
                counting: { unit: "calendarDays" },
                entitlement: { type: "fixed", amountPerYear: 5 },
            });
        expect(policy.status).toBe(201);
        expect(policy.body.data.version).toBe(1);
        const invalid = await request(app)
            .post("/api/leave-policies")
            .set(auth(a.hr))
            .send({ leaveType: created.body.data._id, name: "x", effectiveFrom: "01/01/2026" });
        expect(invalid.status).toBe(400);
    });
});

describe("company isolation", () => {
    it("a company B user cannot read, decide or cancel a company A request", async () => {
        expect((await api.getRequest(b.hr, requestIdA)).status).toBe(404);
        expect((await api.decide(b.hr, requestIdA, "approve")).status).toBe(404);
        expect((await api.cancel(b.hr, requestIdA)).status).toBe(404);
        expect((await request(app).get(`/api/leaves/${leaveIdA}`).set(auth(b.hr))).status).toBe(404);
    });

    it("a company B user cannot see company A balances, leave types or inbox items", async () => {
        expect((await request(app).get(`/api/leaves/balances/${a.employee._id}`).set(auth(b.hr))).status).toBe(404);
        const types = await request(app).get("/api/leave-types").set(auth(b.hr));
        const ids = types.body.data.map((t: { _id: string }) => t._id);
        expect(ids).not.toContain(a.leaveTypes.annual);
        expect(ids).toHaveLength(3);
        const inbox = await request(app).get("/api/requests/inbox").set(auth(b.manager));
        expect(inbox.body.data.total).toBe(0);
    });

    it("cannot submit leave with another company's leave type or for another company's employee", async () => {
        const foreignType = await api.createLeave(b.employee, {
            leaveType: a.leaveTypes.annual,
            startDate: day(5),
            endDate: day(5),
        });
        expect(foreignType.body.error.rule).toBe("leaveTypeUnavailable");
        const foreignEmployee = await api.createLeave(b.hr, {
            leaveType: b.leaveTypes.annual,
            startDate: day(5),
            endDate: day(5),
            onBehalfOf: String(a.employee._id),
        });
        expect(foreignEmployee.status).toBe(404);
        expect(await LeaveTypeModel.countDocuments({ company: COMPANY_B_ID })).toBe(3);
    });
});
