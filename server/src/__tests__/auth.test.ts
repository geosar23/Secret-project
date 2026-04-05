import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { connectTestDB, disconnectTestDB } from "./helpers/db";
import { seedAdminUser, SeededUser } from "./helpers/seed";

let admin: SeededUser;

beforeAll(async () => {
    await connectTestDB();
    admin = await seedAdminUser();
});

afterAll(async () => {
    await disconnectTestDB();
});

afterEach(async () => {
    // Don't wipe DB between tests in this file — admin user is reused across all cases
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
    it("returns a token for valid credentials", async () => {
        const res = await request(app).post("/api/auth/login").send({
            email: admin.email,
            password: admin.plainPassword,
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("token");
        expect(typeof res.body.data.token).toBe("string");
    });

    it("rejects wrong password", async () => {
        const res = await request(app).post("/api/auth/login").send({
            email: admin.email,
            password: "WrongPassword!",
        });

        expect(res.status).toBe(200); // API uses soft errors (200 + success:false)
        expect(res.body.success).toBe(false);
        expect(res.body).not.toHaveProperty("data.token");
    });

    it("rejects unknown email", async () => {
        const res = await request(app).post("/api/auth/login").send({
            email: "nobody@nowhere.com",
            password: "Whatever1!",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
    });

    it("rejects missing credentials", async () => {
        const res = await request(app).post("/api/auth/login").send({});

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
    });

    it("rejects missing password", async () => {
        const res = await request(app).post("/api/auth/login").send({ email: admin.email });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
    });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
    it("returns the authenticated user for a valid token", async () => {
        const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${admin.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user).toHaveProperty("email", admin.email);
        expect(res.body.data.user).not.toHaveProperty("password");
    });

    it("returns 401 when no Authorization header is sent", async () => {
        const res = await request(app).get("/api/auth/me");

        expect(res.status).toBe(401);
    });

    it("returns 403 for a malformed token", async () => {
        const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer this.is.not.a.valid.jwt");

        expect(res.status).toBe(403);
    });

    it("returns 403 for a token signed with a different secret", async () => {
        const badToken = jwt.sign({ id: "fake", companyId: "fake" }, "wrong-secret");

        const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${badToken}`);

        expect(res.status).toBe(403);
    });
});

// ─── GET /api/health ────────────────────────────────────────────────────────

describe("GET /api/health", () => {
    it("returns ok without authentication", async () => {
        const res = await request(app).get("/api/health");

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("status");
    });
});
