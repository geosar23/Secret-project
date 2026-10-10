import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import app from "../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { COMPANY_A_ID, COMPANY_B_ID, SeededUser, seedUserInCompany } from "./helpers/seed";
import { CompanyModel } from "../models/company.model";
import { UserModel } from "../models/user.model";
import { AuditLogModel } from "../models/audit-log.model";
import { EmailService } from "../services/email/email.service";
import { config } from "../config/env";

const sendSpy = jest.spyOn(EmailService, "send");

let admin: SeededUser;
let noAccess: SeededUser;
let target: SeededUser;
let otherCompanyUser: SeededUser;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const reset = (as: SeededUser, body: Record<string, unknown>) =>
    request(app).post("/api/auth/reset-password").set(bearer(as.token)).send(body);
const flush = () => new Promise(resolve => setImmediate(resolve));
const login = (email: string, password: string) => request(app).post("/api/auth/login").send({ email, password });
/** A JWT issued before any revocation (no tra claim), like every token issued before the reset. */
const oldTokenFor = (user: SeededUser) =>
    jwt.sign({ id: String(user._id), companyId: String(user.companyId) }, config.JWT_SECRET, { expiresIn: "1h" });
const lastTemporaryPassword = () => (sendSpy.mock.calls.at(-1)?.[2] as { temporaryPassword: string }).temporaryPassword;

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

describe("POST /api/auth/reset-password (admin) - temporary password", () => {
    it("emails a random temporary password to the subject user, never returns it, and forces a change", async () => {
        const res = await reset(admin, { userId: String(target._id) });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ success: true });
        await flush();

        expect(sendSpy).toHaveBeenCalledTimes(1);
        const [template, to, data, ctx] = sendSpy.mock.calls[0];
        expect(template).toBe("temporary-password");
        expect(to).toBe("reset-target@acme.test");
        expect(ctx.company.companyName).toBe("Acme <b>Ltd</b>");
        expect(ctx.companyId).toBe(String(COMPANY_A_ID));
        const temp = lastTemporaryPassword();
        expect(temp).toHaveLength(16);
        expect((data as { expiresInHours: number }).expiresInHours).toBe(24);
        expect(JSON.stringify(res.body)).not.toContain(temp);

        const stored = await UserModel.findById(target._id).lean();
        expect(stored?.password).not.toBe(temp);
        expect(await bcrypt.compare(temp, stored?.password as string)).toBe(true);
        expect(stored?.mustChangePassword).toBe(true);
        expect(stored?.temporaryPasswordExpiresAt?.getTime()).toBeGreaterThan(Date.now() + 23 * 3600 * 1000);
    });

    it("ignores any password sent by the caller", async () => {
        await reset(admin, { userId: String(target._id), newPassword: "Chosen#ByAdmin1" });
        await flush();
        const stored = await UserModel.findById(target._id).lean();
        expect(await bcrypt.compare("Chosen#ByAdmin1", stored?.password as string)).toBe(false);
    });

    it("records an audit entry without the password", async () => {
        await reset(admin, { userId: String(target._id) });
        const entry = await AuditLogModel.findOne({ entityId: target._id, action: "password_reset_by_admin" }).lean();
        expect(String(entry?.actor)).toBe(String(admin._id));
        expect(entry?.changes).toEqual([{ field: "password", redacted: true }]);
    });

    it("sends nothing when the actor is not allowed (403)", async () => {
        const res = await reset(noAccess, { userId: String(target._id) });
        expect(res.status).toBe(403);
        await flush();
        expect(sendSpy).not.toHaveBeenCalled();
    });

    it("sends nothing for invalid requests or users of another company", async () => {
        await reset(admin, {});
        await reset(admin, { userId: String(new mongoose.Types.ObjectId()) });
        await reset(admin, { userId: String(otherCompanyUser._id) });
        await flush();
        expect(sendSpy).not.toHaveBeenCalled();
    });

    it("returns the same success response even when the email transport fails", async () => {
        const ok = await reset(admin, { userId: String(target._id) });

        sendSpy.mockRejectedValue(new Error("provider exploded"));
        const failing = await reset(admin, { userId: String(target._id) });
        await flush();

        expect(failing.status).toBe(ok.status);
        expect(failing.body).toEqual(ok.body);
        expect(sendSpy).toHaveBeenCalledTimes(2);
    });

    it("does not wait for a slow email send", async () => {
        sendSpy.mockImplementation(() => new Promise(() => undefined)); // never resolves
        const res = await reset(admin, { userId: String(target._id) });
        expect(res.status).toBe(200);
    });
});

describe("temporary password lifecycle", () => {
    it("rejects JWTs issued before the reset and flags the forced change at sign-in", async () => {
        await reset(admin, { userId: String(target._id) });
        await flush();
        const temp = lastTemporaryPassword();

        const oldToken = oldTokenFor(target);
        expect((await request(app).get("/api/auth/me").set(bearer(oldToken))).status).toBe(401);

        const res = await login(target.email, temp);
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ mustChangePassword: true });
    });

    it("only allows /me and change-password until the password is changed, then forces a re-login", async () => {
        await reset(admin, { userId: String(target._id) });
        await flush();
        const temp = lastTemporaryPassword();
        const token = (await login(target.email, temp)).body.data.token as string;

        expect((await request(app).get("/api/auth/me").set(bearer(token))).status).toBe(200);

        const blocked = await request(app).get("/api/users").set(bearer(token));
        expect(blocked.status).toBe(403);
        expect(blocked.body.code).toBe("PASSWORD_CHANGE_REQUIRED");

        const changed = await request(app)
            .put(`/api/users/${target._id}/change-password`)
            .set(bearer(token))
            .send({ currentPassword: temp, newPassword: "My#Own-Pass9" });
        expect(changed.body.success).toBe(true);

        // The JWT used to change the password stops working too.
        expect((await request(app).get("/api/auth/me").set(bearer(token))).status).toBe(401);

        expect((await login(target.email, temp)).status).toBe(401);
        const fresh = await login(target.email, "My#Own-Pass9");
        expect(fresh.body.data).toMatchObject({ mustChangePassword: false });
        expect((await request(app).get("/api/auth/me").set(bearer(fresh.body.data.token))).status).toBe(200);
    });

    it("rejects an expired temporary password at sign-in", async () => {
        await reset(admin, { userId: String(target._id) });
        await flush();
        const expiredTemp = lastTemporaryPassword();
        await UserModel.updateOne({ _id: target._id }, { temporaryPasswordExpiresAt: new Date(Date.now() - 1000) });

        expect((await login(target.email, expiredTemp)).status).toBe(401);
    });
});
