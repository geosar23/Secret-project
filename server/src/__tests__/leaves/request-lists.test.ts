/** Requests page lists over HTTP: Team scope, needs-routing and submitted-date filters, summary cards. */
import request from "supertest";
import app from "../../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "../helpers/db";
import { COMPANY_A_ID } from "../helpers/seed";
import { UserModel } from "../../models/user.model";
import { api, auth, buildWorld, day, LeaveWorld, syncLeaveIndexes } from "./fixtures";

let w: LeaveWorld;

const submit = () =>
    api.createLeave(w.employee, { leaveType: w.leaveTypes.annual, startDate: day(3), endDate: day(3, 4) });

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

describe("request lists", () => {
    it("team lists requests about readable people, never the viewer's own, and an employee has none", async () => {
        await submit();
        const managerTeam = await request(app).get("/api/requests/team").set(auth(w.manager));
        expect(managerTeam.body.data.total).toBe(1);
        expect(managerTeam.body.data.items[0].subject.name).toBe("employee");

        const employeeTeam = await request(app).get("/api/requests/team").set(auth(w.employee));
        expect(employeeTeam.body.data.total).toBe(0);
        expect((await request(app).get("/api/requests/summary").set(auth(w.employee))).body.data.hasTeam).toBe(false);
        expect((await request(app).get("/api/requests/summary").set(auth(w.manager))).body.data.hasTeam).toBe(true);

        const own = await request(app).get("/api/requests/team").set(auth(w.manager));
        expect(
            own.body.data.items.every((i: { subject: { id: string } }) => i.subject.id !== String(w.manager._id)),
        ).toBe(true);
    });

    it("filters by submitted dates and by needs routing, and summarises routing and the oldest waiting request", async () => {
        await submit();
        const today = new Date().toISOString().slice(0, 10);
        const inRange = await request(app).get(`/api/requests/mine?from=${today}&to=${today}`).set(auth(w.employee));
        expect(inRange.body.data.total).toBe(1);
        const past = await request(app).get("/api/requests/mine?to=2000-01-01").set(auth(w.employee));
        expect(past.body.data.total).toBe(0);
        expect((await request(app).get("/api/requests/mine?from=bogus").set(auth(w.employee))).status).toBe(400);

        const summary = await request(app).get("/api/requests/summary").set(auth(w.manager));
        expect(summary.body.data.oldestPendingForMe).toBeTruthy();
        expect(summary.body.data.needsRouting).toBe(0);

        await UserModel.updateOne({ _id: w.employee._id }, { $unset: { manager: 1, hrRepresentative: 1 } });
        await api.createLeave(w.employee, { leaveType: w.leaveTypes.annual, startDate: day(4), endDate: day(4) });
        const routing = await request(app).get("/api/requests/summary").set(auth(w.hr));
        expect(routing.body.data.needsRouting).toBe(1);
        const stuck = await request(app).get("/api/requests/team?status=needsRouting").set(auth(w.hr));
        expect(stuck.body.data.total).toBe(1);
    });
});
