/**
 * Company scope isolation tests
 *
 * Verifies that:
 * - A user in company A CANNOT see users or data belonging to company B
 * - A user in company B CANNOT see users or data belonging to company A
 * - A god user (companyId === OG_COMPANY_ID) CAN see data across all companies
 *   because userRepository returns the base model with no company filter for that ID.
 */
import request from "supertest";
import app from "../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { seedGodUser, seedUserInCompany, COMPANY_A_ID, COMPANY_B_ID, SeededUser } from "./helpers/seed";
import { PermissionKeys } from "../enums/permissions.enum";

let god: SeededUser;
let companyAUser: SeededUser;
let companyBUser: SeededUser;
let companyAOtherUser: SeededUser;
let companyBOtherUser: SeededUser;

beforeAll(async () => {
    await connectTestDB();

    // God user — OG_COMPANY_ID, cross-company repo access
    god = await seedGodUser();

    // Company A — two users so we can assert the count/presence
    companyAUser = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "a-admin@test.com",
        name: "A Admin",
        permissions: [PermissionKeys.ALL],
        roleKey: "a-admin",
    });

    companyAOtherUser = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "a-employee@test.com",
        name: "A Employee",
        permissions: [],
        roleKey: "a-employee",
    });

    // Company B — two users
    companyBUser = await seedUserInCompany({
        companyId: COMPANY_B_ID,
        email: "b-admin@test.com",
        name: "B Admin",
        permissions: [PermissionKeys.ALL],
        roleKey: "b-admin",
    });

    companyBOtherUser = await seedUserInCompany({
        companyId: COMPANY_B_ID,
        email: "b-employee@test.com",
        name: "B Employee",
        permissions: [],
        roleKey: "b-employee",
    });
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

// ─── Repository scope: GET /api/users ────────────────────────────────────────

describe("Company A user — can only see company A users", () => {
    it("returns only company A users in the list", async () => {
        const res = await request(app).get("/api/users").set("Authorization", `Bearer ${companyAUser.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const emails: string[] = res.body.data.users.map((u: { email: string }) => u.email);

        // Must see own company users
        expect(emails).toContain("a-admin@test.com");
        expect(emails).toContain("a-employee@test.com");

        // Must NOT see company B users
        expect(emails).not.toContain("b-admin@test.com");
        expect(emails).not.toContain("b-employee@test.com");
    });

    it("cannot fetch a company B user by ID", async () => {
        const res = await request(app)
            .get(`/api/users/${companyBUser._id}`)
            .set("Authorization", `Bearer ${companyAUser.token}`);

        // Either not found (null → softError) or 404 — must not return company B data
        const returnedUser = res.body?.data?.user ?? res.body?.data ?? null;
        expect(returnedUser).toBeNull();
    });
});

describe("Company B user — can only see company B users", () => {
    it("returns only company B users in the list", async () => {
        const res = await request(app).get("/api/users").set("Authorization", `Bearer ${companyBUser.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const emails: string[] = res.body.data.users.map((u: { email: string }) => u.email);

        expect(emails).toContain("b-admin@test.com");
        expect(emails).toContain("b-employee@test.com");

        expect(emails).not.toContain("a-admin@test.com");
        expect(emails).not.toContain("a-employee@test.com");
    });

    it("cannot fetch a company A user by ID", async () => {
        const res = await request(app)
            .get(`/api/users/${companyAUser._id}`)
            .set("Authorization", `Bearer ${companyBUser.token}`);

        const returnedUser = res.body?.data?.user ?? res.body?.data ?? null;
        expect(returnedUser).toBeNull();
    });
});

// ─── God user — cross-company access ─────────────────────────────────────────

describe("God user — sees users from all companies", () => {
    it("returns users from both company A and company B", async () => {
        const res = await request(app).get("/api/users").set("Authorization", `Bearer ${god.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const emails: string[] = res.body.data.users.map((u: { email: string }) => u.email);

        expect(emails).toContain("a-admin@test.com");
        expect(emails).toContain("b-admin@test.com");
    });

    it("can fetch a company A user by ID", async () => {
        const res = await request(app)
            .get(`/api/users/${companyAOtherUser._id}`)
            .set("Authorization", `Bearer ${god.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe("a-employee@test.com");
    });

    it("can fetch a company B user by ID", async () => {
        const res = await request(app)
            .get(`/api/users/${companyBOtherUser._id}`)
            .set("Authorization", `Bearer ${god.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe("b-employee@test.com");
    });
});

// ─── Roles are company-scoped ─────────────────────────────────────────────────

describe("Roles are company-scoped", () => {
    it("company A user sees only company A roles", async () => {
        const res = await request(app).get("/api/roles").set("Authorization", `Bearer ${companyAUser.token}`);

        expect(res.status).toBe(200);

        const roles = res.body?.data ?? [];
        const companyIds: string[] = roles
            .filter((r: { company?: string }) => r.company)
            .map((r: { company: string }) => r.company.toString());

        // None of the returned company-scoped roles should belong to company B
        expect(companyIds).not.toContain(COMPANY_B_ID.toString());
    });
});
