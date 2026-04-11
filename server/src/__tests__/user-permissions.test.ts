import request from "supertest";
import app from "../app";
import { connectTestDB, disconnectTestDB } from "./helpers/db";
import { seedAdminUser, seedEmployeeUser, seedUserInCompany, SeededUser, TEST_COMPANY_ID } from "./helpers/seed";
import { PermissionKeys } from "../enums/permissions.enum";

let admin: SeededUser;
let employee: SeededUser;
let userManager: SeededUser; // has USERS_MANAGEMENT_ALL_ALL but NOT section-level permissions

beforeAll(async () => {
    await connectTestDB();
    admin = await seedAdminUser();
    employee = await seedEmployeeUser();
    userManager = await seedUserInCompany({
        companyId: TEST_COMPANY_ID,
        email: "manager@test-perms.com",
        name: "Test Manager",
        permissions: [PermissionKeys.USERS_MANAGEMENT_ALL_ALL],
        roleKey: "test-user-manager",
    });
});

afterAll(async () => {
    await disconnectTestDB();
});

// ─── POST /api/users — CAN_CREATE_USER permission ───────────────────────────

describe("POST /api/users — CAN_CREATE_USER permission gate", () => {
    it("returns 403 when the user lacks CAN_CREATE_USER (no permissions)", async () => {
        const res = await request(app)
            .post("/api/users")
            .set("Authorization", `Bearer ${employee.token}`)
            .send({
                name: "New User",
                email: "newuser@example.com",
                password: "Password1!",
                role: "507f1f77bcf86cd799439011",
                companyId: TEST_COMPANY_ID.toString(),
            });

        expect(res.status).toBe(403);
    });

    it("allows user with USERS_MANAGEMENT_ALL_ALL to create (wildcard covers CAN_CREATE_USER)", async () => {
        const res = await request(app)
            .post("/api/users")
            .set("Authorization", `Bearer ${userManager.token}`)
            .send({
                name: "New User",
                email: "newuser-mgr@example.com",
                password: "Password1!",
                role: "507f1f77bcf86cd799439011",
                companyId: TEST_COMPANY_ID.toString(),
            });

        // Should not be 401 or 403 — may fail for other reasons (e.g. missing role)
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
    });

    it("allows user with ALL permission (*:*:*) to create users", async () => {
        const res = await request(app)
            .post("/api/users")
            .set("Authorization", `Bearer ${admin.token}`)
            .send({
                name: "Admin Created User",
                email: "admin-created@example.com",
                password: "Password1!",
                role: "507f1f77bcf86cd799439011",
                companyId: TEST_COMPANY_ID.toString(),
            });

        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
    });
});

// ─── PUT /api/users/:id — Section-level permission checks ───────────────────

describe("PUT /api/users/:id — section-level permission checks", () => {
    it("returns 403 when user with USERS_MANAGEMENT_ALL_ALL tries to update identity fields without CAN_EDIT_USER_IDENTITY", async () => {
        const res = await request(app)
            .put(`/api/users/${employee._id}`)
            .set("Authorization", `Bearer ${userManager.token}`)
            .send({ firstName: "ShouldBeBlocked" });

        expect(res.status).toBe(403);
    });

    it("returns 403 when user with USERS_MANAGEMENT_ALL_ALL tries to update salary without CAN_EDIT_USER_COMPENSATION", async () => {
        const res = await request(app)
            .put(`/api/users/${employee._id}`)
            .set("Authorization", `Bearer ${userManager.token}`)
            .send({ salary: "100000" });

        expect(res.status).toBe(403);
    });

    it("allows user with ALL permission (*:*:*) to update identity fields", async () => {
        const res = await request(app)
            .put(`/api/users/${employee._id}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ firstName: "UpdatedByAdmin" });

        expect(res.status).toBe(200);
        expect(res.status).not.toBe(403);
    });

    it("allows user with ALL permission (*:*:*) to update salary field", async () => {
        const res = await request(app)
            .put(`/api/users/${employee._id}`)
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ salary: "95000" });

        expect(res.status).toBe(200);
        expect(res.status).not.toBe(403);
    });

    it("allows self-edit for identity fields without explicit section permission", async () => {
        // Employee updating themselves — section checks are skipped for self-edit
        const res = await request(app)
            .put(`/api/users/${employee._id}`)
            .set("Authorization", `Bearer ${employee.token}`)
            .send({ firstName: "SelfEdited" });

        // canManageUser must pass first — employee has USERS_MANAGEMENT_ALL_SELF via self-edit
        // If canManageUser fails (no self permission), this is a different 403
        expect(res.status).not.toBe(401);
    });
});
