import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { COMPANY_A_ID, COMPANY_B_ID, seedUserInCompany, SeededUser } from "./helpers/seed";
import { UserModel } from "../models/user.model";
import { DepartmentModel } from "../models/department.model";
import { SubDepartmentModel } from "../models/sub-department.model";
import { EmploymentTitleModel } from "../models/employment-title.model";

let employee: SeededUser;
let manager: SeededUser;
let departmentId: mongoose.Types.ObjectId;
let subDepartmentId: mongoose.Types.ObjectId;

beforeAll(async () => {
    await connectTestDB();

    // No permissions at all: the org chart must still be readable.
    employee = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "oc-employee@test.com",
        name: "OC Employee",
        permissions: [],
        roleKey: "oc-employee",
    });
    manager = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "oc-manager@test.com",
        name: "OC Manager",
        permissions: [],
        roleKey: "oc-manager",
    });
    await seedUserInCompany({
        companyId: COMPANY_B_ID,
        email: "oc-other@test.com",
        name: "Other Company",
        permissions: [],
        roleKey: "oc-other",
    });

    const department = await DepartmentModel.create({ name: "Engineering", company: COMPANY_A_ID, isActive: true });
    departmentId = department._id as mongoose.Types.ObjectId;
    const subDepartment = await SubDepartmentModel.create({
        name: "Platform",
        department: departmentId,
        company: COMPANY_A_ID,
        isActive: true,
    });
    subDepartmentId = subDepartment._id as mongoose.Types.ObjectId;
    const title = await EmploymentTitleModel.create({
        name: "Engineer",
        subDepartment: subDepartmentId,
        company: COMPANY_A_ID,
        isActive: true,
    });

    await UserModel.updateOne(
        { _id: employee._id },
        { manager: manager._id, employmentTitle: title._id, salary: "encrypted-secret" },
    );
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

describe("GET /api/users/org-chart", () => {
    it("requires authentication", async () => {
        const res = await request(app).get("/api/users/org-chart");
        expect(res.status).toBe(401);
    });

    it("is readable by an employee without any permissions", async () => {
        const res = await request(app).get("/api/users/org-chart").set("Authorization", `Bearer ${employee.token}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.departments).toEqual([{ _id: departmentId.toString(), name: "Engineering" }]);
        expect(res.body.data.subDepartments).toEqual([
            { _id: subDepartmentId.toString(), name: "Platform", departmentId: departmentId.toString() },
        ]);
    });

    it("links users to their manager, title and sub-department", async () => {
        const res = await request(app).get("/api/users/org-chart").set("Authorization", `Bearer ${employee.token}`);
        const entry = res.body.data.users.find((u: { _id: string }) => u._id === employee._id.toString());
        expect(entry).toMatchObject({
            name: "OC Employee",
            managerId: manager._id.toString(),
            title: "Engineer",
            subDepartmentId: subDepartmentId.toString(),
        });
    });

    it("only exposes non-sensitive fields", async () => {
        const res = await request(app).get("/api/users/org-chart").set("Authorization", `Bearer ${employee.token}`);
        const allowed = ["_id", "name", "email", "managerId", "title", "subDepartmentId"];
        for (const user of res.body.data.users) {
            expect(Object.keys(user).sort()).toEqual([...allowed].sort());
        }
    });

    it("never includes users from another company", async () => {
        const res = await request(app).get("/api/users/org-chart").set("Authorization", `Bearer ${employee.token}`);
        const emails = res.body.data.users.map((u: { email: string }) => u.email);
        expect(emails).toEqual(expect.arrayContaining(["oc-employee@test.com", "oc-manager@test.com"]));
        expect(emails).not.toContain("oc-other@test.com");
    });
});
