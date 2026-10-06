import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { COMPANY_A_ID, SeededUser, seedUserInCompany } from "./helpers/seed";
import { RoleModel } from "../models/role.model";
import { UserModel } from "../models/user.model";
import { validateUserProfilePayload } from "../utils/user-profile-validator.util";

const NOW = new Date("2026-06-15T00:00:00Z");

describe("validateUserProfilePayload", () => {
    const check = (body: Record<string, unknown>, existing?: Record<string, unknown>) =>
        validateUserProfilePayload(body, existing, NOW);

    it("accepts an empty payload and blank optional values", () => {
        expect(check({})).toBeNull();
        expect(check({ birthday: "", workPhone: null, gender: "", salary: "" })).toBeNull();
    });

    it("accepts a fully valid profile", () => {
        expect(
            check({
                gender: "female",
                maritalStatus: "single",
                employmentType: "full_time",
                birthday: "1990-04-02",
                employmentDate: "2026-09-01",
                workPhone: "+30 210 123 4567",
                additionalPhones: ["(210) 123-4567"],
                nationalities: ["Greek"],
                emergencyContact: { name: "A", relationship: "Sibling", phone: "+306900000000" },
                education: [{ institution: "AUTH", degreeLevel: "bachelor", yearAchieved: 2012 }],
                salary: "4500.50",
            }),
        ).toBeNull();
    });

    it.each([
        ["gender", { gender: "robot" }],
        ["maritalStatus", { maritalStatus: "complicated" }],
        ["employmentType", { employmentType: "volunteer" }],
        ["unparseable birthday", { birthday: "not-a-date" }],
        ["future birthday", { birthday: "2030-01-01" }],
        ["ancient birthday", { birthday: "1850-01-01" }],
        ["employmentDate far in the future", { employmentDate: "2030-01-01" }],
        ["short phone", { workPhone: "123" }],
        ["lettered phone", { personalPhone: "call me" }],
        ["bad additional phone", { additionalPhones: ["12"] }],
        ["bad emergency phone", { emergencyContact: { phone: "abc" } }],
        ["too many nationalities", { nationalities: Array.from({ length: 11 }, () => "x") }],
        ["bad degree level", { education: [{ degreeLevel: "wizard" }] }],
        ["fractional graduation year", { education: [{ yearAchieved: 2010.5 }] }],
        ["graduation year in the far future", { education: [{ yearAchieved: 2100 }] }],
        ["negative salary", { salary: "-5" }],
        ["non-numeric salary", { salary: "50k" }],
        ["absurd salary", { salary: "99999999999" }],
        ["overlong name", { legalName: "x".repeat(101) }],
    ])("rejects %s", (_label, body) => {
        expect(check(body)).toEqual(expect.any(String));
    });

    it("skips fields whose value is unchanged from the stored record (legacy data)", () => {
        const existing = { workPhone: "n/a", birthday: new Date("2030-01-01"), gender: "robot" };
        expect(check({ workPhone: "n/a", birthday: "2030-01-01T00:00:00.000Z", gender: "robot" }, existing)).toBeNull();
    });

    it("still validates a legacy field once it is changed", () => {
        expect(check({ workPhone: "still bad" }, { workPhone: "n/a" })).toEqual(expect.any(String));
    });
});

describe("user create/update profile validation (API)", () => {
    let hr: SeededUser;
    let roleId: string;

    const bearer = () => ({ Authorization: `Bearer ${hr.token}` });
    const payload = (email: string, extra: Record<string, unknown> = {}) => ({
        name: "New Person",
        email,
        password: "Test@1234",
        role: roleId,
        ...extra,
    });

    beforeAll(async () => {
        await connectTestDB();
        hr = await seedUserInCompany({
            companyId: COMPANY_A_ID,
            email: "pv-hr@test.com",
            name: "HR",
            permissions: ["*:*:*"],
            roleKey: "pv-hr",
        });
        const role = await RoleModel.create({
            role: "pv-low",
            name: "Role pv-low",
            description: "pv-low",
            level: 4,
            permissions: ["usersManagement:read:*"],
            isSystemRole: false,
            company: COMPANY_A_ID,
        });
        roleId = String(role._id);
    });

    afterAll(async () => {
        await clearCollections();
        await disconnectTestDB();
    });

    it("rejects creating a user with an invalid profile field and stores nothing", async () => {
        const res = await request(app)
            .post("/api/users")
            .set(bearer())
            .send(payload("pv-bad@test.com", { birthday: "2999-01-01" }));
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/birthday/);
        expect(await UserModel.findOne({ email: "pv-bad@test.com" })).toBeNull();
    });

    it("creates a user with a valid profile", async () => {
        const res = await request(app)
            .post("/api/users")
            .set(bearer())
            .send(payload("pv-ok@test.com", { birthday: "1990-01-01", workPhone: "+302101234567", salary: "3000" }));
        expect(res.body.success).toBe(true);
    });

    it("rejects an invalid update without modifying the record", async () => {
        const user = await UserModel.create({
            name: "Upd",
            email: "pv-upd@test.com",
            password: "Test@1234",
            role: new mongoose.Types.ObjectId(roleId),
            company: COMPANY_A_ID,
            isActive: true,
        });
        const res = await request(app)
            .put(`/api/users/${user._id}`)
            .set(bearer())
            .send({ name: "Renamed", salary: "lots" });
        expect(res.body.success).toBe(false);
        expect((await UserModel.findById(user._id))?.name).toBe("Upd");
    });

    it("lets a legacy record with bad stored data be edited when that data is left unchanged", async () => {
        const legacy = await UserModel.create({
            name: "Legacy",
            email: "pv-legacy@test.com",
            password: "Test@1234",
            role: new mongoose.Types.ObjectId(roleId),
            company: COMPANY_A_ID,
            isActive: true,
            workPhone: "n/a",
        });
        const res = await request(app)
            .put(`/api/users/${legacy._id}`)
            .set(bearer())
            .send({ name: "Legacy Renamed", workPhone: "n/a" });
        expect(res.body.success).toBe(true);
        expect((await UserModel.findById(legacy._id))?.name).toBe("Legacy Renamed");
    });
});
