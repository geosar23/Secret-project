import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import app from "../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { COMPANY_A_ID, COMPANY_B_ID, SeededUser, seedUserInCompany } from "./helpers/seed";
import { CompanyModel } from "../models/company.model";
import { UserModel } from "../models/user.model";
import { AuditLogModel } from "../models/audit-log.model";
import { OneTimeTokenModel } from "../models/one-time-token.model";
import { EmailService } from "../services/email/email.service";
import { ConsoleTransport } from "../services/email/email.transports";
import { drainBackground } from "../services/password-setup.service";
import { resetAuthRateLimits } from "../middleware/rate-limit.middleware";
import { hashToken } from "../utils/one-time-token.util";
import { config } from "../config/env";

const realSend = EmailService.send.bind(EmailService);
const sendSpy = jest.spyOn(EmailService, "send");

const GENERIC = "If an account exists for that email, a reset link is on its way.";
const NEW_PASSWORD = "Brand#New-Pass7";

let alice: SeededUser; // company A
let bob: SeededUser; // company A, inactive
let carol: SeededUser; // company B
let dave: SeededUser; // company A, for rate limits

const forgot = async (email: unknown) => {
    const res = await request(app).post("/api/auth/forgot-password").send({ email });
    await drainBackground();
    return res;
};
const setup = (token: unknown, newPassword: unknown = NEW_PASSWORD) =>
    request(app).post("/api/auth/password-setup").send({ token, newPassword });
const login = (email: string, password: string) => request(app).post("/api/auth/login").send({ email, password });
const resetEmails = () => sendSpy.mock.calls.filter(c => c[0] === "password-reset");
const tokenFromLink = (link: string) => new URL(link).searchParams.get("token") as string;
/** The raw token from the most recent reset email. */
const lastToken = () => tokenFromLink((resetEmails().at(-1)?.[2] as { resetLink: string }).resetLink);
const requestToken = async (email: string) => {
    await forgot(email);
    return lastToken();
};
const flush = () => new Promise(resolve => setImmediate(resolve));

beforeAll(async () => {
    await connectTestDB();
    await CompanyModel.create([
        { _id: COMPANY_A_ID, name: "Acme", slug: "acme" },
        { _id: COMPANY_B_ID, name: "Beta Corp", slug: "beta" },
    ]);
    alice = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "alice@acme.test",
        name: "Alice",
        permissions: [],
        roleKey: "ps-alice",
    });
    bob = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "bob@acme.test",
        name: "Bob",
        permissions: [],
        roleKey: "ps-bob",
        isActive: false,
    });
    carol = await seedUserInCompany({
        companyId: COMPANY_B_ID,
        email: "carol@beta.test",
        name: "Carol",
        permissions: [],
        roleKey: "ps-carol",
    });
    dave = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "dave@acme.test",
        name: "Dave",
        permissions: [],
        roleKey: "ps-dave",
    });
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

let infoSpy: jest.SpyInstance;
beforeEach(async () => {
    resetAuthRateLimits();
    await OneTimeTokenModel.deleteMany({});
    await UserModel.updateMany({}, { password: await bcrypt.hash("Test@Company1", 4), tokensRevokedAt: null });
    sendSpy.mockReset();
    sendSpy.mockResolvedValue({ ok: true, attempts: 1 });
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => undefined);
});
afterEach(() => infoSpy.mockRestore());

describe("POST /api/auth/forgot-password", () => {
    it("answers identically for a known, unknown, inactive and malformed email", async () => {
        const known = await forgot(alice.email);
        const unknown = await forgot("nobody@nowhere.test");
        const inactive = await forgot(bob.email);
        const malformed = await forgot("not-an-email");
        const missing = await request(app).post("/api/auth/forgot-password").send({});

        for (const res of [unknown, inactive, malformed, missing]) {
            expect(res.status).toBe(known.status);
            expect(res.body).toEqual(known.body);
        }
        expect(known.body).toEqual({ success: true, data: { message: GENERIC } });
    });

    it("sends a branded link to an active account only", async () => {
        await forgot("nobody@nowhere.test");
        await forgot(bob.email);
        expect(sendSpy).not.toHaveBeenCalled();

        await forgot(alice.email);
        expect(sendSpy).toHaveBeenCalledTimes(1);
        const [template, to, data, ctx] = sendSpy.mock.calls[0];
        expect(template).toBe("password-reset");
        expect(to).toBe(alice.email);
        expect(ctx.company.companyName).toBe("Acme");
        expect(ctx.companyId).toBe(String(COMPANY_A_ID));
        const { resetLink, expiresInMinutes } = data as { resetLink: string; expiresInMinutes: number };
        expect(expiresInMinutes).toBe(30);
        expect(resetLink.startsWith("http://localhost:4200/password-setup?token=")).toBe(true);
    });

    it("stores only a hash of the token, scoped to the user's own company", async () => {
        const raw = await requestToken(alice.email);
        const docs = await OneTimeTokenModel.find({}).lean();
        expect(docs).toHaveLength(1);
        expect(JSON.stringify(docs)).not.toContain(raw);
        expect(docs[0].tokenHash).toBe(hashToken(raw));
        expect(String(docs[0].company)).toBe(String(COMPANY_A_ID));
        expect(String(docs[0].user)).toBe(String(alice._id));
        expect(docs[0].purpose).toBe("forgot");
        const lifetime = docs[0].expiresAt.getTime() - docs[0].createdAt!.getTime();
        expect(Math.abs(lifetime - 30 * 60 * 1000)).toBeLessThan(1000);
    });

    it("gives the same response even when the email transport fails or hangs", async () => {
        const ok = await forgot(alice.email);
        sendSpy.mockRejectedValue(new Error("provider exploded"));
        const failing = await forgot(alice.email);
        expect(failing.status).toBe(ok.status);
        expect(failing.body).toEqual(ok.body);

        sendSpy.mockImplementation(() => new Promise(() => undefined));
        const hanging = await request(app).post("/api/auth/forgot-password").send({ email: alice.email });
        expect(hanging.body).toEqual(ok.body);
    });

    it("only the newest link works", async () => {
        const first = await requestToken(alice.email);
        const second = await requestToken(alice.email);
        expect(first).not.toBe(second);

        const stale = await setup(first);
        expect(stale.body).toMatchObject({ success: false, error: { code: "used" } });
        expect((await setup(second)).body.success).toBe(true);
    });

    it("sends at most 3 links per account per hour, still answering the same", async () => {
        for (let i = 0; i < 3; i++) {
            await forgot(dave.email);
        }
        const fourth = await forgot(dave.email);
        expect(resetEmails()).toHaveLength(3);
        expect(fourth.body).toEqual({ success: true, data: { message: GENERIC } });
    });

    it("is rate limited per IP", async () => {
        for (let i = 0; i < 5; i++) {
            expect((await request(app).post("/api/auth/forgot-password").send({ email: "x@y.test" })).status).toBe(200);
        }
        const limited = await request(app).post("/api/auth/forgot-password").send({ email: "x@y.test" });
        expect(limited.status).toBe(429);
        expect(limited.body.code).toBe("TOO_MANY_REQUESTS");
        await drainBackground();
    });
});

describe("POST /api/auth/password-setup", () => {
    it("sets the new password, revokes older JWTs, audits it and confirms by email", async () => {
        const raw = await requestToken(alice.email);
        const oldToken = (await login(alice.email, "Test@Company1")).body.data.token as string;
        expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${oldToken}`)).status).toBe(200);

        const res = await setup(raw);
        expect(res.body.success).toBe(true);
        await flush();

        expect((await login(alice.email, "Test@Company1")).status).toBe(401);
        const fresh = await login(alice.email, NEW_PASSWORD);
        expect(fresh.status).toBe(200);
        expect(fresh.body.data.mustChangePassword).toBe(false);

        expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${oldToken}`)).status).toBe(401);
        const freshMe = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${fresh.body.data.token}`);
        expect(freshMe.status).toBe(200);

        const confirmation = sendSpy.mock.calls.find(c => c[0] === "password-changed");
        expect(confirmation?.[1]).toBe(alice.email);
        expect(JSON.stringify(confirmation)).not.toContain(NEW_PASSWORD);

        const entry = await AuditLogModel.findOne({ entityId: alice._id, action: "password_reset" }).lean();
        expect(String(entry?.actor)).toBe(String(alice._id));
        expect(entry?.changes).toEqual([{ field: "password", redacted: true }]);
    });

    it("hashes exactly once (the stored value verifies against the typed password)", async () => {
        await setup(await requestToken(alice.email));
        const stored = await UserModel.findById(alice._id).lean();
        expect(stored?.password).not.toBe(NEW_PASSWORD);
        expect(await bcrypt.compare(NEW_PASSWORD, stored?.password as string)).toBe(true);
    });

    it("clears a pending forced change", async () => {
        await UserModel.updateOne({ _id: alice._id }, { mustChangePassword: true });
        await setup(await requestToken(alice.email));
        const stored = await UserModel.findById(alice._id).lean();
        expect(stored?.mustChangePassword).toBe(false);
    });

    it("rejects a link that was already used", async () => {
        const raw = await requestToken(alice.email);
        expect((await setup(raw)).body.success).toBe(true);
        const again = await setup(raw, "Another#Pass123");
        expect(again.body).toMatchObject({ success: false, error: { code: "used" } });
        expect(
            await bcrypt.compare(NEW_PASSWORD, (await UserModel.findById(alice._id).lean())?.password as string),
        ).toBe(true);
    });

    it("rejects an expired link", async () => {
        const raw = await requestToken(alice.email);
        await OneTimeTokenModel.updateOne({ tokenHash: hashToken(raw) }, { expiresAt: new Date(Date.now() - 1000) });
        expect((await setup(raw)).body).toMatchObject({ success: false, error: { code: "expired" } });
        expect((await login(alice.email, "Test@Company1")).status).toBe(200);
    });

    it("rejects tampered, empty and non-string tokens", async () => {
        const raw = await requestToken(alice.email);
        const tampered = raw.slice(0, -1) + (raw.endsWith("A") ? "B" : "A");
        for (const bad of [tampered, "x".repeat(43), "", undefined, null, 12345, { $ne: "" }]) {
            expect((await setup(bad)).body).toMatchObject({ success: false, error: { code: "invalid" } });
        }
        expect((await setup(raw)).body.success).toBe(true); // the genuine link still works
    });

    it("rejects a token issued for another purpose", async () => {
        const raw = "wrong-purpose-token-".padEnd(43, "z");
        await OneTimeTokenModel.create({
            tokenHash: hashToken(raw),
            user: alice._id,
            company: COMPANY_A_ID,
            purpose: "invite",
            expiresAt: new Date(Date.now() + 60_000),
        });
        expect((await setup(raw)).body).toMatchObject({ success: false, error: { code: "invalid" } });
        expect((await login(alice.email, "Test@Company1")).status).toBe(200);
    });

    it("lets only one of two concurrent requests succeed", async () => {
        const raw = await requestToken(alice.email);
        const results = await Promise.all([setup(raw, "Concurrent#Pass1"), setup(raw, "Concurrent#Pass2")]);
        const successes = results.filter(r => r.body.success);
        expect(successes).toHaveLength(1);
        expect(results.find(r => !r.body.success)?.body.error.code).toBe("used");
    });

    it("enforces the password policy without burning the link", async () => {
        const raw = await requestToken(alice.email);
        const weak = await setup(raw, "short");
        expect(weak.body).toMatchObject({
            success: false,
            message: "Password must be at least 6 characters.",
            error: { code: "weak_password" },
        });
        expect((await setup(raw, null)).body.error.code).toBe("weak_password");
        expect((await setup(raw)).body.success).toBe(true);
    });

    it("never crosses tenants: a token pointing at another company's user changes nothing", async () => {
        const raw = "cross-tenant-token--".padEnd(43, "q");
        await OneTimeTokenModel.create({
            tokenHash: hashToken(raw),
            user: carol._id, // belongs to company B
            company: COMPANY_A_ID, // but the token claims company A
            purpose: "forgot",
            expiresAt: new Date(Date.now() + 60_000),
        });
        const res = await setup(raw);
        expect(res.body).toMatchObject({ success: false, error: { code: "invalid" } });
        expect((await login(carol.email, "Test@Company1")).status).toBe(200);
    });

    it("does not set a password for an account deactivated after the link was sent", async () => {
        const raw = await requestToken(alice.email);
        await UserModel.updateOne({ _id: alice._id }, { isActive: false });
        expect((await setup(raw)).body.success).toBe(false);
        await UserModel.updateOne({ _id: alice._id }, { isActive: true });
        expect((await login(alice.email, "Test@Company1")).status).toBe(200);
    });

    it("is rate limited per IP", async () => {
        for (let i = 0; i < 10; i++) {
            expect((await setup("nope")).status).toBe(200);
        }
        const limited = await setup("nope");
        expect(limited.status).toBe(429);
    });
});

describe("no secrets in logs", () => {
    it("keeps the token and link out of every console line during the whole flow", async () => {
        sendSpy.mockImplementation((...args) => realSend(...args));
        const captured: string[] = [];
        const transportSpy = jest.spyOn(ConsoleTransport.prototype, "send").mockImplementation(async message => {
            captured.push(message.text);
        });
        const lines: string[] = [];
        const record = (...args: unknown[]) => lines.push(args.map(String).join(" "));
        const spies = (["log", "info", "warn", "error"] as const).map(level =>
            jest.spyOn(console, level).mockImplementation(record),
        );

        try {
            await forgot(alice.email);
            const raw = tokenFromLink(captured[0].match(/https?:\/\/\S+/)?.[0] as string);
            expect(raw.length).toBeGreaterThan(30);
            await setup("bad-token-bad-token-bad-token");
            await setup(raw, "short");
            await setup(raw);
            await setup(raw); // reuse
            await flush();

            expect(lines.length).toBeGreaterThan(0);
            const all = lines.join("\n");
            expect(all).not.toContain(raw);
            expect(all).not.toContain("password-setup?token");
            expect(all).not.toContain(NEW_PASSWORD);
        } finally {
            spies.forEach(s => s.mockRestore());
            transportSpy.mockRestore();
        }
    });
});

describe("JWTs issued before this feature", () => {
    it("still accepts JWTs issued before this feature existed (no tra claim, never revoked)", async () => {
        const legacy = jwt.sign({ id: String(alice._id), companyId: String(COMPANY_A_ID) }, config.JWT_SECRET, {
            expiresIn: "1h",
        });
        expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${legacy}`)).status).toBe(200);
    });
});
