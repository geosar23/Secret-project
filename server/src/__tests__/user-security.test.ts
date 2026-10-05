import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { COMPANY_A_ID, COMPANY_B_ID, SeededUser, seedUserInCompany } from "./helpers/seed";
import { RoleModel } from "../models/role.model";
import { UserModel } from "../models/user.model";
import { UserDocumentModel } from "../models/user-document.model";
import { DocumentType } from "../enums/profile.enum";
import { decryptString, encryptString } from "../utils/encryption.util";

let admin: SeededUser;
let adminB: SeededUser;
let viewer: SeededUser;
let hr: SeededUser;
let selfEditor: SeededUser;
let employee: SeededUser;
let targetId: string;
let targetDocId: string;
let employeeDocId: string;
let elevatedRoleId: string;
let lowRoleId: string;
let altLowRoleId: string;

const bearer = (u: SeededUser) => ({ Authorization: `Bearer ${u.token}` });

async function makeRole(key: string, permissions: string[]): Promise<string> {
    const role = await RoleModel.create({
        role: key,
        name: `Role ${key}`,
        description: key,
        level: 4,
        permissions,
        isSystemRole: false,
        company: COMPANY_A_ID,
    });
    return String(role._id);
}

beforeAll(async () => {
    await connectTestDB();

    admin = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "sec-admin@test.com",
        name: "Admin",
        permissions: ["*:*:*"],
        roleKey: "sec-admin",
    });
    adminB = await seedUserInCompany({
        companyId: COMPANY_B_ID,
        email: "sec-admin-b@test.com",
        name: "Admin B",
        permissions: ["*:*:*"],
        roleKey: "sec-admin-b",
    });
    viewer = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "sec-viewer@test.com",
        name: "Viewer",
        permissions: ["usersManagement:read:*"],
        roleKey: "sec-viewer",
    });
    hr = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "sec-hr@test.com",
        name: "HR",
        permissions: ["usersManagement:read:*", "usersManagement:write:*", "userCreate:write:*"],
        roleKey: "sec-hr",
    });
    selfEditor = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "sec-self@test.com",
        name: "Self Editor",
        permissions: ["usersManagement:write:self"],
        roleKey: "sec-self",
    });
    employee = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "sec-employee@test.com",
        name: "Employee",
        permissions: [],
        roleKey: "sec-employee",
    });

    elevatedRoleId = await makeRole("sec-elevated", ["*:*:*"]);
    lowRoleId = await makeRole("sec-low", ["usersManagement:read:*"]);
    altLowRoleId = await makeRole("sec-low-alt", ["usersManagement:read:*"]);

    const target = await UserModel.create({
        name: "Target",
        email: "sec-target@test.com",
        password: "Test@1234",
        role: new mongoose.Types.ObjectId(lowRoleId),
        company: COMPANY_A_ID,
        isActive: true,
        salary: encryptString("5000"),
    });
    targetId = String(target._id);

    const targetDoc = await UserDocumentModel.create({
        user: target._id,
        company: COMPANY_A_ID,
        type: DocumentType.PASSPORT,
        documentNumber: "T-001",
    });
    targetDocId = String(targetDoc._id);

    const employeeDoc = await UserDocumentModel.create({
        user: employee._id,
        company: COMPANY_A_ID,
        type: DocumentType.PASSPORT,
        documentNumber: "E-001",
    });
    employeeDocId = String(employeeDoc._id);
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

describe("GET /api/users/:id — scope and salary visibility", () => {
    it("returns 403 to a user without read access to the subject", async () => {
        const res = await request(app).get(`/api/users/${targetId}`).set(bearer(employee));
        expect(res.status).toBe(403);
    });

    it("lets a user read their own record", async () => {
        const res = await request(app).get(`/api/users/${employee._id}`).set(bearer(employee));
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("omits salary when the actor lacks compensation read permission", async () => {
        const res = await request(app).get(`/api/users/${targetId}`).set(bearer(viewer));
        expect(res.status).toBe(200);
        expect(res.body.data.salary).toBeUndefined();
    });

    it("includes decrypted salary for an actor with compensation read permission", async () => {
        const res = await request(app).get(`/api/users/${targetId}`).set(bearer(admin));
        expect(res.status).toBe(200);
        expect(res.body.data.salary).toBe("5000");
    });

    it("never exposes the password hash through ?fields", async () => {
        const res = await request(app).get(`/api/users/${targetId}?fields=password,name`).set(bearer(admin));
        expect(res.status).toBe(200);
        expect(res.body.data.password).toBeUndefined();
        expect(res.body.data.name).toBe("Target");
    });
});

describe("PUT /api/users/:id — hardening", () => {
    it("returns 403 when the actor cannot manage the subject", async () => {
        const res = await request(app).put(`/api/users/${targetId}`).set(bearer(employee)).send({ name: "x" });
        expect(res.status).toBe(403);
    });

    it("ignores salary and companyId from an actor without compensation write permission", async () => {
        const before = await UserModel.findById(targetId).lean();
        const res = await request(app)
            .put(`/api/users/${targetId}`)
            .set(bearer(hr))
            .send({ name: "Target Renamed", salary: "9999", companyId: String(COMPANY_B_ID) });

        expect(res.status).toBe(200);
        const after = await UserModel.findById(targetId).lean();
        expect(after?.name).toBe("Target Renamed");
        expect(after?.salary).toBe(before?.salary);
        expect(String(after?.company)).toBe(String(COMPANY_A_ID));
    });

    it("updates salary for an actor with compensation write permission", async () => {
        const res = await request(app).put(`/api/users/${targetId}`).set(bearer(admin)).send({ salary: "7000" });
        expect(res.status).toBe(200);
        const after = await UserModel.findById(targetId).lean();
        expect(decryptString(after!.salary as string)).toBe("7000");
    });

    it("rejects a manager from another company", async () => {
        const res = await request(app)
            .put(`/api/users/${targetId}`)
            .set(bearer(hr))
            .send({ managerId: String(adminB._id) });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Invalid manager");
    });

    it("rejects assigning a role that carries permissions the actor lacks", async () => {
        const res = await request(app).put(`/api/users/${targetId}`).set(bearer(hr)).send({ role: elevatedRoleId });
        expect(res.status).toBe(403);
    });

    it("allows assigning a role within the actor's own permissions", async () => {
        const res = await request(app).put(`/api/users/${targetId}`).set(bearer(hr)).send({ role: altLowRoleId });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("blocks changing one's own role", async () => {
        const res = await request(app)
            .put(`/api/users/${selfEditor._id}`)
            .set(bearer(selfEditor))
            .send({ role: lowRoleId });
        expect(res.status).toBe(403);
    });
});

describe("POST /api/users — hardening", () => {
    const payload = (email: string, role: string, extra: Record<string, unknown> = {}) => ({
        name: "New Hire",
        email,
        password: "Test@1234",
        role,
        ...extra,
    });

    it("returns 403 for a user without any create permission", async () => {
        const res = await request(app)
            .post("/api/users")
            .set(bearer(employee))
            .send(payload("sec-new-1@test.com", lowRoleId));
        expect(res.status).toBe(403);
    });

    it("returns 403 when the role exceeds the creator's permissions", async () => {
        const res = await request(app)
            .post("/api/users")
            .set(bearer(hr))
            .send(payload("sec-new-2@test.com", elevatedRoleId));
        expect(res.status).toBe(403);
        expect(await UserModel.findOne({ email: "sec-new-2@test.com" })).toBeNull();
    });

    it("rejects references to another company's records", async () => {
        const res = await request(app)
            .post("/api/users")
            .set(bearer(hr))
            .send(payload("sec-new-3@test.com", lowRoleId, { managerId: String(adminB._id) }));
        expect(res.body.success).toBe(false);
        expect(await UserModel.findOne({ email: "sec-new-3@test.com" })).toBeNull();
    });

    it("creates the user in the actor's company and drops salary without compensation write", async () => {
        const res = await request(app)
            .post("/api/users")
            .set(bearer(hr))
            .send(payload("sec-new-4@test.com", lowRoleId, { salary: "1234", companyId: String(COMPANY_B_ID) }));

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const created = await UserModel.findOne({ email: "sec-new-4@test.com" }).lean();
        expect(String(created?.company)).toBe(String(COMPANY_A_ID));
        expect(created?.salary).toBeUndefined();
    });

    it("stores the password so the new user can log in", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "sec-new-4@test.com", password: "Test@1234" });
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty("token");
    });
});

describe("Permission grant/revoke escalation", () => {
    it("blocks granting a permission to oneself", async () => {
        const res = await request(app)
            .post(`/api/users/${selfEditor._id}/grant-permission`)
            .set(bearer(selfEditor))
            .send({ permissionKey: "usersManagement:read:*" });
        expect(res.status).toBe(403);
    });

    it("blocks granting a permission the actor does not hold", async () => {
        const res = await request(app)
            .post(`/api/users/${targetId}/grant-permission`)
            .set(bearer(hr))
            .send({ permissionKey: "rolesManagement:write:*" });
        expect(res.status).toBe(403);
    });

    it("allows granting a permission the actor holds", async () => {
        const res = await request(app)
            .post(`/api/users/${targetId}/grant-permission`)
            .set(bearer(hr))
            .send({ permissionKey: "usersManagement:read:*" });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("blocks revoking permissions of a user the actor cannot manage", async () => {
        const res = await request(app)
            .post(`/api/users/${targetId}/revoke-permission`)
            .set(bearer(selfEditor))
            .send({ permissionKey: "usersManagement:read:*" });
        expect(res.status).toBe(403);
    });
});

describe("Company and role read access", () => {
    it("returns 403 when requesting another company", async () => {
        const res = await request(app).get(`/api/companies/${COMPANY_B_ID}`).set(bearer(admin));
        expect(res.status).toBe(403);
    });

    it("allows requesting the actor's own company", async () => {
        const res = await request(app).get(`/api/companies/${COMPANY_A_ID}`).set(bearer(admin));
        expect(res.status).toBe(200);
    });

    it("returns 403 on GET /api/roles for a user with no role-related permission", async () => {
        const res = await request(app).get("/api/roles").set(bearer(employee));
        expect(res.status).toBe(403);
    });

    it("allows GET /api/roles for a user manager", async () => {
        const res = await request(app).get("/api/roles").set(bearer(hr));
        expect(res.status).toBe(200);
    });

    it("allows GET /api/countries for a user manager but not for a plain employee", async () => {
        const allowed = await request(app).get("/api/countries").set(bearer(hr));
        const denied = await request(app).get("/api/countries").set(bearer(employee));
        expect(allowed.status).toBe(200);
        expect(denied.status).toBe(403);
    });
});

describe("User documents access", () => {
    it("lets a user list their own documents", async () => {
        const res = await request(app).get(`/api/user-documents/user/${employee._id}`).set(bearer(employee));
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    it("blocks reading another user's documents", async () => {
        const res = await request(app).get(`/api/user-documents/user/${targetId}`).set(bearer(employee));
        expect(res.status).toBe(403);
    });

    it("blocks reading another user's document by id and its attachment url", async () => {
        const byId = await request(app).get(`/api/user-documents/${targetDocId}`).set(bearer(employee));
        const url = await request(app).get(`/api/user-documents/${targetDocId}/attachment-url`).set(bearer(employee));
        expect(byId.status).toBe(403);
        expect(url.status).toBe(403);
    });

    it("blocks writing to one's own documents without write permission", async () => {
        const res = await request(app)
            .put(`/api/user-documents/${employeeDocId}`)
            .set(bearer(employee))
            .send({ notes: "x" });
        expect(res.status).toBe(403);
    });

    it("lets a user manager update documents", async () => {
        const res = await request(app)
            .put(`/api/user-documents/${targetDocId}`)
            .set(bearer(hr))
            .send({ notes: "checked" });
        expect(res.status).toBe(200);
        expect(res.body.data.notes).toBe("checked");
    });

    it("returns 404 for a document in another company", async () => {
        const res = await request(app).get(`/api/user-documents/${targetDocId}`).set(bearer(adminB));
        expect(res.status).toBe(404);
    });
});
