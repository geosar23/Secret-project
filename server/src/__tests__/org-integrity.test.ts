import request from "supertest";
import app from "../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { COMPANY_A_ID, COMPANY_B_ID, SeededUser, seedUserInCompany } from "./helpers/seed";
import { CountryModel } from "../models/country.model";
import { DepartmentModel } from "../models/department.model";
import { SubDepartmentModel } from "../models/sub-department.model";
import { EmploymentTitleModel } from "../models/employment-title.model";
import { LevelModel } from "../models/level.model";
import { OfficeModel } from "../models/office.model";
import { RoleModel } from "../models/role.model";
import { UserModel } from "../models/user.model";

let admin: SeededUser;
let ids: Record<string, string>;
const bearer = () => ({ Authorization: `Bearer ${admin.token}` });
const id = (doc: { _id: unknown }) => String(doc._id);

beforeAll(async () => {
    await connectTestDB();
    admin = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "org-admin@test.com",
        name: "Org Admin",
        permissions: ["*:*:*"],
        roleKey: "org-admin",
    });

    const greece = await CountryModel.create({ name: "Greece", company: COMPANY_A_ID });
    const cyprus = await CountryModel.create({ name: "Cyprus", company: COMPANY_A_ID });
    const closedCountry = await CountryModel.create({ name: "Closed", company: COMPANY_A_ID, isActive: false });
    const countryB = await CountryModel.create({ name: "Other", company: COMPANY_B_ID });

    const dept = await DepartmentModel.create({ name: "Engineering", company: COMPANY_A_ID });
    const closedDept = await DepartmentModel.create({ name: "Closed Dept", company: COMPANY_A_ID, isActive: false });
    const deptB = await DepartmentModel.create({ name: "Dept B", company: COMPANY_B_ID });
    const sub = await SubDepartmentModel.create({ name: "Platform", department: dept._id, company: COMPANY_A_ID });
    const subB = await SubDepartmentModel.create({ name: "Sub B", department: deptB._id, company: COMPANY_B_ID });
    const title = await EmploymentTitleModel.create({
        name: "Engineer",
        subDepartment: sub._id,
        company: COMPANY_A_ID,
    });

    const closedLevel = await LevelModel.create({ name: "Retired", company: COMPANY_A_ID, isActive: false });
    const greekOffice = await OfficeModel.create({ name: "Athens", company: COMPANY_A_ID, country: greece._id });
    const cypriotOffice = await OfficeModel.create({ name: "Nicosia", company: COMPANY_A_ID, country: cyprus._id });
    const role = await RoleModel.create({
        role: "org-low",
        name: "Org Low",
        description: "low",
        level: 5,
        permissions: [],
        isSystemRole: false,
        company: COMPANY_A_ID,
    });
    const greekRep = await UserModel.create({
        name: "Greek Rep",
        email: "org-greek-rep@test.com",
        password: "Test@1234",
        role: role._id,
        company: COMPANY_A_ID,
        country: greece._id,
    });
    const cypriotRep = await UserModel.create({
        name: "Cypriot Rep",
        email: "org-cypriot-rep@test.com",
        password: "Test@1234",
        role: role._id,
        company: COMPANY_A_ID,
        country: cyprus._id,
    });

    ids = {
        greece: id(greece),
        cyprus: id(cyprus),
        closedCountry: id(closedCountry),
        countryB: id(countryB),
        dept: id(dept),
        closedDept: id(closedDept),
        deptB: id(deptB),
        sub: id(sub),
        subB: id(subB),
        title: id(title),
        closedLevel: id(closedLevel),
        greekOffice: id(greekOffice),
        cypriotOffice: id(cypriotOffice),
        role: id(role),
        greekRep: id(greekRep),
        cypriotRep: id(cypriotRep),
    };
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

describe("Org structure parent references", () => {
    it("rejects a sub-department under another company's department", async () => {
        const res = await request(app)
            .post("/api/sub-departments")
            .set(bearer())
            .send({ name: "Bad", departmentId: ids.deptB });
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Invalid department");
    });

    it("rejects a sub-department under an inactive department", async () => {
        const res = await request(app)
            .post("/api/sub-departments")
            .set(bearer())
            .send({ name: "Bad", departmentId: ids.closedDept });
        expect(res.body.success).toBe(false);
    });

    it("rejects an employment title under another company's sub-department", async () => {
        const res = await request(app)
            .post("/api/employment-titles")
            .set(bearer())
            .send({ name: "Bad", subDepartmentId: ids.subB });
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Invalid sub-department");
    });

    it("rejects an office in another company's country", async () => {
        const res = await request(app)
            .post("/api/offices")
            .set(bearer())
            .send({ name: "Bad", countryId: ids.countryB });
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Invalid country");
    });

    it("creates a sub-department under an active department of the same company", async () => {
        const res = await request(app)
            .post("/api/sub-departments")
            .set(bearer())
            .send({ name: "Good", departmentId: ids.dept });
        expect(res.body.success).toBe(true);
    });
});

describe("Deactivation with active dependents", () => {
    it("blocks deactivating a department that has active sub-departments", async () => {
        const res = await request(app).put(`/api/departments/${ids.dept}`).set(bearer()).send({ isActive: false });
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Cannot deactivate.*sub-department/);
    });

    it("blocks deactivating a country that active users use", async () => {
        const res = await request(app).put(`/api/countries/${ids.greece}`).set(bearer()).send({ isActive: false });
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/user/);
    });

    it("allows deactivating once dependents are inactive", async () => {
        await SubDepartmentModel.updateMany({ department: ids.dept }, { isActive: false });
        const res = await request(app).put(`/api/departments/${ids.dept}`).set(bearer()).send({ isActive: false });
        expect(res.body.success).toBe(true);
    });
});

describe("User reference rules", () => {
    const create = (extra: Record<string, unknown>, email: string) =>
        request(app)
            .post("/api/users")
            .set(bearer())
            .send({ name: "New", email, password: "Test@1234", role: ids.role, ...extra });

    it("rejects an inactive level", async () => {
        const res = await create({ levelId: ids.closedLevel }, "org-new-1@test.com");
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Invalid level");
    });

    it("rejects an inactive country", async () => {
        const res = await create({ countryId: ids.closedCountry }, "org-new-2@test.com");
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Invalid country");
    });

    it("rejects an office outside the user's country", async () => {
        const res = await create({ countryId: ids.greece, officeId: ids.cypriotOffice }, "org-new-3@test.com");
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("The office must be in the user's country");
    });

    it("rejects an HR representative from another country", async () => {
        const res = await create({ countryId: ids.greece, hrRepresentativeId: ids.cypriotRep }, "org-new-4@test.com");
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("The HR representative must be in the user's country");
    });

    it("accepts an office and HR representative from the user's country", async () => {
        const res = await create(
            { countryId: ids.greece, officeId: ids.greekOffice, hrRepresentativeId: ids.greekRep },
            "org-new-5@test.com",
        );
        expect(res.body.success).toBe(true);
    });

    it("keeps an unchanged inactive reference on update", async () => {
        const legacy = await UserModel.create({
            name: "Legacy",
            email: "org-legacy@test.com",
            password: "Test@1234",
            role: ids.role,
            company: COMPANY_A_ID,
            level: ids.closedLevel,
        });
        const res = await request(app)
            .put(`/api/users/${legacy._id}`)
            .set(bearer())
            .send({ name: "Legacy Renamed", levelId: ids.closedLevel });
        expect(res.body.success).toBe(true);
    });
});
