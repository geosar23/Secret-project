import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { COMPANY_A_ID, COMPANY_B_ID, SeededUser, seedUserInCompany } from "./helpers/seed";
import { CompanyModel } from "../models/company.model";
import { EmailService } from "../services/email/email.service";

const sendSpy = jest.spyOn(EmailService, "send");

let admin: SeededUser;
let noAccess: SeededUser;
let target: SeededUser;
let otherCompanyUser: SeededUser;

const bearer = (u: SeededUser) => ({ Authorization: `Bearer ${u.token}` });
const reset = (as: SeededUser, body: Record<string, unknown>) =>
    request(app).post("/api/auth/reset-password").set(bearer(as)).send(body);
const flush = () => new Promise(resolve => setImmediate(resolve));

beforeAll(async () => {
    await connectTestDB();
    await CompanyModel.create([
        { _id: COMPANY_A_ID, name: "Acme <b>Ltd</b>", slug: "acme" },
        { _id: COMPANY_B_ID, name: "Beta Corp", slug: "beta" },
    ]);
    admin = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "reset-admin@acme.test",
        name: "Admin",
        permissions: ["*:*:*"],
        roleKey: "reset-admin",
    });
    noAccess = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "reset-none@acme.test",
        name: "Nobody",
        permissions: [],
        roleKey: "reset-none",
    });
    target = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "reset-target@acme.test",
        name: "Tara Target",
        permissions: [],
        roleKey: "reset-target",
    });
    otherCompanyUser = await seedUserInCompany({
        companyId: COMPANY_B_ID,
        email: "reset-b@beta.test",
        name: "Bea",
        permissions: [],
        roleKey: "reset-b",
    });
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

let logSpy: jest.SpyInstance;
beforeEach(() => {
    sendSpy.mockReset();
    sendSpy.mockResolvedValue({ ok: true, attempts: 1 });
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => logSpy.mockRestore());

describe("POST /api/auth/reset-password — security notice", () => {
    it("sends exactly one notice to the subject user with their own company branding and the temporary password", async () => {
        const res = await reset(admin, { userId: String(target._id), newPassword: "Brand-New#Pass1" });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ success: true });
        await flush();

        expect(sendSpy).toHaveBeenCalledTimes(1);
        const [template, to, data, ctx] = sendSpy.mock.calls[0];
        expect(template).toBe("password-reset-notice");
        expect(to).toBe("reset-target@acme.test");
        expect(ctx.company.companyName).toBe("Acme <b>Ltd</b>");
        expect(ctx.companyId).toBe(String(COMPANY_A_ID));
        expect(data).toMatchObject({ recipientName: "Tara Target", temporaryPassword: "Brand-New#Pass1" });
        expect(JSON.stringify(ctx)).not.toContain("Brand-New#Pass1");
    });

    it("sends nothing when the actor is not allowed (403)", async () => {
        const res = await reset(noAccess, { userId: String(target._id), newPassword: "Brand-New#Pass1" });
        expect(res.status).toBe(403);
        await flush();
        expect(sendSpy).not.toHaveBeenCalled();
    });

    it("sends nothing for invalid requests or users of another company", async () => {
        await reset(admin, { userId: String(target._id) });
        await reset(admin, { userId: String(new mongoose.Types.ObjectId()), newPassword: "Brand-New#Pass1" });
        await reset(admin, { userId: String(otherCompanyUser._id), newPassword: "Brand-New#Pass1" });
        await flush();
        expect(sendSpy).not.toHaveBeenCalled();
    });

    it("returns the same success response even when the email transport fails", async () => {
        const ok = await reset(admin, { userId: String(target._id), newPassword: "Brand-New#Pass1" });

        sendSpy.mockRejectedValue(new Error("provider exploded"));
        const failing = await reset(admin, { userId: String(target._id), newPassword: "Another#Pass22" });
        await flush();

        expect(failing.status).toBe(ok.status);
        expect(failing.body).toEqual(ok.body);
        expect(sendSpy).toHaveBeenCalledTimes(2);
    });

    it("does not wait for a slow email send", async () => {
        sendSpy.mockImplementation(() => new Promise(() => undefined)); // never resolves
        const res = await reset(admin, { userId: String(target._id), newPassword: "Another#Pass22" });
        expect(res.status).toBe(200);
    });
});
