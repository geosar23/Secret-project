import request from "supertest";
import app from "../app";
import { connectTestDB, disconnectTestDB } from "./helpers/db";
import { seedAdminUser, seedEmployeeUser, SeededUser } from "./helpers/seed";

let admin: SeededUser;
let employee: SeededUser;

beforeAll(async () => {
    await connectTestDB();
    admin = await seedAdminUser();
    employee = await seedEmployeeUser();
});

afterAll(async () => {
    await disconnectTestDB();
});

// ─── Protected routes: auth gate ────────────────────────────────────────────

describe("Auth gate on protected routes", () => {
    it("GET /api/users — returns 401 with no token", async () => {
        const res = await request(app).get("/api/users");
        expect(res.status).toBe(401);
    });

    it("GET /api/users — returns 401 with invalid token", async () => {
        const res = await request(app).get("/api/users").set("Authorization", "Bearer not.a.real.token");
        expect(res.status).toBe(401);
    });

    it("GET /api/roles — returns 401 with no token", async () => {
        const res = await request(app).get("/api/roles");
        expect(res.status).toBe(401);
    });

    it("GET /api/countries — returns 401 with no token", async () => {
        const res = await request(app).get("/api/countries");
        expect(res.status).toBe(401);
    });
});

// ─── GET /api/users — authenticated access ──────────────────────────────────

describe("GET /api/users (authenticated)", () => {
    it("returns 200 with a valid admin token", async () => {
        const res = await request(app).get("/api/users").set("Authorization", `Bearer ${admin.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ─── Permission middleware: grant permission ─────────────────────────────────

describe("POST /api/users/:id/grant-permission", () => {
    it("returns 401 with no token", async () => {
        const res = await request(app)
            .post(`/api/users/${employee._id}/grant-permission`)
            .send({ permission: "usersManagement:read:company" });

        expect(res.status).toBe(401);
    });

    it("returns 403 when authenticated user lacks required permission", async () => {
        // employee role has no permissions
        const res = await request(app)
            .post(`/api/users/${admin._id}/grant-permission`)
            .set("Authorization", `Bearer ${employee.token}`)
            .send({ permission: "usersManagement:read:company" });

        expect(res.status).toBe(403);
    });

    it("succeeds when authenticated user has ALL permission", async () => {
        const res = await request(app)
            .post(`/api/users/${employee._id}/grant-permission`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ permission: "usersManagement:read:company" });

        // 200 with success:true or success:false (invalid key) — important thing is NOT 401/403
        expect(res.status).toBe(200);
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
    });
});

// ─── Permission middleware: revoke permission ─────────────────────────────────

describe("POST /api/users/:id/revoke-permission", () => {
    it("returns 401 with no token", async () => {
        const res = await request(app)
            .post(`/api/users/${employee._id}/revoke-permission`)
            .send({ permission: "usersManagement:read:company" });

        expect(res.status).toBe(401);
    });

    it("returns 403 when authenticated user lacks required permission", async () => {
        const res = await request(app)
            .post(`/api/users/${admin._id}/revoke-permission`)
            .set("Authorization", `Bearer ${employee.token}`)
            .send({ permission: "usersManagement:read:company" });

        expect(res.status).toBe(403);
    });

    it("succeeds when authenticated user has ALL permission", async () => {
        const res = await request(app)
            .post(`/api/users/${employee._id}/revoke-permission`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ permission: "usersManagement:read:company" });

        expect(res.status).toBe(200);
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
    });
});
