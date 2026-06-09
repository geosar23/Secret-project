import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { seedEmployeeUser, SeededUser, TEST_COMPANY_ID } from "./helpers/seed";
import { DepartmentModel } from "../models/department.model";
import { SubDepartmentModel } from "../models/sub-department.model";
import { EmploymentTitleModel } from "../models/employment-title.model";
import { LevelModel } from "../models/level.model";
import { OfficeModel } from "../models/office.model";
import { UserDocumentModel } from "../models/user-document.model";
import { DocumentType } from "../enums/profile.enum";

let employee: SeededUser;
let departmentId: mongoose.Types.ObjectId;
let subDepartmentId: mongoose.Types.ObjectId;
let employmentTitleId: mongoose.Types.ObjectId;
let levelId: mongoose.Types.ObjectId;
let officeId: mongoose.Types.ObjectId;
let documentId: mongoose.Types.ObjectId;

beforeAll(async () => {
    await connectTestDB();
    employee = await seedEmployeeUser();

    const department = await DepartmentModel.create({
        name: "Engineering",
        company: TEST_COMPANY_ID,
        isActive: true,
    });
    departmentId = department._id as mongoose.Types.ObjectId;

    const subDepartment = await SubDepartmentModel.create({
        name: "Platform",
        department: departmentId,
        company: TEST_COMPANY_ID,
        isActive: true,
    });
    subDepartmentId = subDepartment._id as mongoose.Types.ObjectId;

    const employmentTitle = await EmploymentTitleModel.create({
        name: "Software Engineer",
        subDepartment: subDepartmentId,
        company: TEST_COMPANY_ID,
        isActive: true,
    });
    employmentTitleId = employmentTitle._id as mongoose.Types.ObjectId;

    const level = await LevelModel.create({
        name: "L1",
        order: 1,
        company: TEST_COMPANY_ID,
        isActive: true,
    });
    levelId = level._id as mongoose.Types.ObjectId;

    const office = await OfficeModel.create({
        name: "HQ",
        company: TEST_COMPANY_ID,
        isActive: true,
    });
    officeId = office._id as mongoose.Types.ObjectId;

    const document = await UserDocumentModel.create({
        user: employee._id,
        company: TEST_COMPANY_ID,
        type: DocumentType.PASSPORT,
        documentNumber: "EMP-001",
    });
    documentId = document._id as mongoose.Types.ObjectId;
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

describe("RBAC audit coverage for HR entity write routes", () => {
    const auth = () => ({ Authorization: `Bearer ${employee.token}` });

    it("POST /api/departments should return 403 for plain employee", async () => {
        const res = await request(app).post("/api/departments").set(auth()).send({ name: "Operations" });
        expect(res.status).toBe(403);
    });

    it("PUT /api/departments/:id should return 403 for plain employee", async () => {
        const res = await request(app)
            .put(`/api/departments/${departmentId.toString()}`)
            .set(auth())
            .send({ name: "Engineering Updated" });
        expect(res.status).toBe(403);
    });

    it("DELETE /api/departments/:id should return 403 for plain employee", async () => {
        const res = await request(app).delete(`/api/departments/${departmentId.toString()}`).set(auth());
        expect(res.status).toBe(403);
    });

    it("POST /api/sub-departments should return 403 for plain employee", async () => {
        const res = await request(app)
            .post("/api/sub-departments")
            .set(auth())
            .send({ name: "Infra", departmentId: departmentId.toString() });
        expect(res.status).toBe(403);
    });

    it("PUT /api/sub-departments/:id should return 403 for plain employee", async () => {
        const res = await request(app)
            .put(`/api/sub-departments/${subDepartmentId.toString()}`)
            .set(auth())
            .send({ name: "Platform Updated" });
        expect(res.status).toBe(403);
    });

    it("DELETE /api/sub-departments/:id should return 403 for plain employee", async () => {
        const res = await request(app).delete(`/api/sub-departments/${subDepartmentId.toString()}`).set(auth());
        expect(res.status).toBe(403);
    });

    it("POST /api/employment-titles should return 403 for plain employee", async () => {
        const res = await request(app)
            .post("/api/employment-titles")
            .set(auth())
            .send({ name: "Lead Engineer", subDepartmentId: subDepartmentId.toString() });
        expect(res.status).toBe(403);
    });

    it("PUT /api/employment-titles/:id should return 403 for plain employee", async () => {
        const res = await request(app)
            .put(`/api/employment-titles/${employmentTitleId.toString()}`)
            .set(auth())
            .send({ name: "Software Engineer II" });
        expect(res.status).toBe(403);
    });

    it("DELETE /api/employment-titles/:id should return 403 for plain employee", async () => {
        const res = await request(app).delete(`/api/employment-titles/${employmentTitleId.toString()}`).set(auth());
        expect(res.status).toBe(403);
    });

    it("POST /api/levels should return 403 for plain employee", async () => {
        const res = await request(app).post("/api/levels").set(auth()).send({ name: "L2", order: 2 });
        expect(res.status).toBe(403);
    });

    it("PUT /api/levels/:id should return 403 for plain employee", async () => {
        const res = await request(app)
            .put(`/api/levels/${levelId.toString()}`)
            .set(auth())
            .send({ name: "L1 Updated" });
        expect(res.status).toBe(403);
    });

    it("DELETE /api/levels/:id should return 403 for plain employee", async () => {
        const res = await request(app).delete(`/api/levels/${levelId.toString()}`).set(auth());
        expect(res.status).toBe(403);
    });

    it("POST /api/offices should return 403 for plain employee", async () => {
        const res = await request(app).post("/api/offices").set(auth()).send({ name: "Satellite" });
        expect(res.status).toBe(403);
    });

    it("PUT /api/offices/:id should return 403 for plain employee", async () => {
        const res = await request(app)
            .put(`/api/offices/${officeId.toString()}`)
            .set(auth())
            .send({ name: "HQ Updated" });
        expect(res.status).toBe(403);
    });

    it("DELETE /api/offices/:id should return 403 for plain employee", async () => {
        const res = await request(app).delete(`/api/offices/${officeId.toString()}`).set(auth());
        expect(res.status).toBe(403);
    });
});

describe("RBAC audit coverage for user-documents write routes", () => {
    const auth = () => ({ Authorization: `Bearer ${employee.token}` });

    it("POST /api/user-documents/user/:userId should return 403 for plain employee", async () => {
        const res = await request(app)
            .post(`/api/user-documents/user/${employee._id.toString()}`)
            .set(auth())
            .send({ type: DocumentType.NATIONAL_ID, documentNumber: "ID-001" });
        expect(res.status).toBe(403);
    });

    it("PUT /api/user-documents/:id should return 403 for plain employee", async () => {
        const res = await request(app)
            .put(`/api/user-documents/${documentId.toString()}`)
            .set(auth())
            .send({ notes: "updated" });
        expect(res.status).toBe(403);
    });

    it("DELETE /api/user-documents/:id should return 403 for plain employee", async () => {
        const res = await request(app).delete(`/api/user-documents/${documentId.toString()}`).set(auth());
        expect(res.status).toBe(403);
    });
});

describe("Roles route baseline auth behavior", () => {
    it("GET /api/roles requires authentication", async () => {
        const res = await request(app).get("/api/roles");
        expect(res.status).toBe(401);
    });
});
