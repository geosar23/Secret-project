import request from "supertest";
import app from "../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { COMPANY_A_ID, COMPANY_B_ID, SeededUser, seedUserInCompany } from "./helpers/seed";
import { DepartmentModel } from "../models/department.model";
import { SubDepartmentModel } from "../models/sub-department.model";
import { EmploymentTitleModel } from "../models/employment-title.model";
import { RoleModel } from "../models/role.model";
import { UserModel } from "../models/user.model";
import { PermissionKeys } from "../enums/permissions.enum";

let admin: SeededUser;
let limited: SeededUser;
let roleId: string;
let org: Record<string, string>;
const bearer = (u: SeededUser = admin) => ({ Authorization: `Bearer ${u.token}` });
const id = (doc: { _id: unknown }) => String(doc._id);

const post = (path: string, body: Record<string, unknown>, u: SeededUser = admin) =>
    request(app).post(`/api/org-moves${path}`).set(bearer(u)).send(body);

async function makeUser(name: string, extra: Record<string, unknown>) {
    const user = await UserModel.create({
        name,
        email: `${name.toLowerCase().replace(/\s/g, "-")}@move.test`,
        password: "Test@1234",
        role: roleId,
        company: COMPANY_A_ID,
        ...extra,
    });
    return id(user);
}

const stored = async (userId: string) => {
    const u = await UserModel.findById(userId).lean();
    return {
        primaryDepartment: u?.primaryDepartment && String(u.primaryDepartment),
        primarySubDepartment: u?.primarySubDepartment && String(u.primarySubDepartment),
        employmentTitle: u?.employmentTitle && String(u.employmentTitle),
        secondaryDepartments: (u?.secondaryDepartments ?? []).map(String),
        secondarySubDepartments: (u?.secondarySubDepartments ?? []).map(String),
    };
};

beforeAll(async () => {
    await connectTestDB();
    admin = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "move-admin@test.com",
        name: "Move Admin",
        permissions: ["*:*:*"],
        roleKey: "move-admin",
    });
    limited = await seedUserInCompany({
        companyId: COMPANY_A_ID,
        email: "move-limited@test.com",
        name: "Move Limited",
        permissions: [PermissionKeys.SUB_DEPARTMENTS_MANAGEMENT_WRITE_ALL],
        roleKey: "move-limited",
    });
    const role = await RoleModel.create({
        role: "move-low",
        name: "Move Low",
        description: "low",
        level: 5,
        permissions: [],
        isSystemRole: false,
        company: COMPANY_A_ID,
    });
    roleId = id(role);

    const mk = async (name: string) => DepartmentModel.create({ name, company: COMPANY_A_ID });
    const [eng, ops, sales] = [await mk("Engineering"), await mk("Operations"), await mk("Sales")];
    const closed = await DepartmentModel.create({ name: "Closed", company: COMPANY_A_ID, isActive: false });
    const otherCompanyDept = await DepartmentModel.create({ name: "Foreign", company: COMPANY_B_ID });
    const sub = (name: string, dept: { _id: unknown }) =>
        SubDepartmentModel.create({ name, department: dept._id, company: COMPANY_A_ID });
    const [platform, qa, support, deals] = [
        await sub("Platform", eng),
        await sub("QA", eng),
        await sub("Support", ops),
        await sub("Deals", sales),
    ];
    const title = (name: string, s: { _id: unknown }) =>
        EmploymentTitleModel.create({ name, subDepartment: s._id, company: COMPANY_A_ID });
    const [engineer, tester, agent, rep] = [
        await title("Engineer", platform),
        await title("Tester", qa),
        await title("Agent", support),
        await title("Rep", deals),
    ];

    org = {
        eng: id(eng),
        ops: id(ops),
        sales: id(sales),
        closed: id(closed),
        foreign: id(otherCompanyDept),
        platform: id(platform),
        qa: id(qa),
        support: id(support),
        deals: id(deals),
        engineer: id(engineer),
        tester: id(tester),
        agent: id(agent),
        rep: id(rep),
    };
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

describe("move sub-department", () => {
    let primaryUser: string;
    let secondaryUser: string;
    let moveId: string;

    beforeAll(async () => {
        primaryUser = await makeUser("Primary Pat", {
            primaryDepartment: org.eng,
            primarySubDepartment: org.platform,
            employmentTitle: org.engineer,
        });
        secondaryUser = await makeUser("Secondary Sam", {
            primaryDepartment: org.sales,
            primarySubDepartment: org.deals,
            secondaryDepartments: [org.eng],
            secondarySubDepartments: [org.platform],
        });
    });

    const move = { operation: "moveSubDepartment", sourceId: "", targetId: "" };
    beforeAll(() => {
        move.sourceId = org.platform;
        move.targetId = org.ops;
    });

    it("previews the affected users", async () => {
        const res = await post("/preview", move);
        expect(res.body.success).toBe(true);
        const byName = Object.fromEntries(res.body.data.users.map((u: { name: string }) => [u.name, u]));
        expect(byName["Primary Pat"]).toMatchObject({ relation: "primary", titleName: "Engineer", canManage: true });
        expect(byName["Secondary Sam"]).toMatchObject({ relation: "secondary", canManage: true });
        expect(res.body.data.childTitleCount).toBe(1);
    });

    it("rejects invalid destinations", async () => {
        for (const targetId of [org.closed, org.foreign, org.eng]) {
            const res = await post("/preview", { ...move, targetId });
            expect(res.body.success).toBe(false);
        }
    });

    it("refuses to apply without a resolution for every user", async () => {
        const res = await post("/apply", {
            ...move,
            resolutions: [{ userId: primaryUser, action: "follow" }],
        });
        expect(res.body.success).toBe(false);
        expect(res.body.error.join(" ")).toMatch(/Secondary Sam/);
        expect((await SubDepartmentModel.findById(org.platform).lean())?.department?.toString()).toBe(org.eng);
    });

    it("rejects a reassign without a valid title and leaves everything unchanged", async () => {
        const res = await post("/apply", {
            ...move,
            resolutions: [
                { userId: primaryUser, action: "reassign", reassignTo: { subDepartmentId: org.support } },
                { userId: secondaryUser, action: "follow" },
            ],
        });
        expect(res.body.success).toBe(false);
        expect(res.body.error.join(" ")).toMatch(/employment title/);
        expect((await stored(primaryUser)).primaryDepartment).toBe(org.eng);
    });

    it("applies per-user choices atomically and records the move", async () => {
        const res = await post("/apply", {
            ...move,
            resolutions: [
                { userId: primaryUser, action: "follow" },
                { userId: secondaryUser, action: "follow" },
            ],
        });
        expect(res.body.success).toBe(true);
        expect(res.body.data.updated).toBe(2);
        moveId = res.body.data.moveId;

        expect((await SubDepartmentModel.findById(org.platform).lean())?.department?.toString()).toBe(org.ops);
        expect(await stored(primaryUser)).toMatchObject({
            primaryDepartment: org.ops,
            primarySubDepartment: org.platform,
            employmentTitle: org.engineer,
            secondaryDepartments: [],
        });
        expect(await stored(secondaryUser)).toMatchObject({
            primaryDepartment: org.sales,
            secondaryDepartments: [org.ops],
            secondarySubDepartments: [org.platform],
        });
    });

    it("refuses to undo after a later edit, then undoes cleanly", async () => {
        await UserModel.updateOne({ _id: secondaryUser }, { name: "Secondary Sam Renamed" });
        const blocked = await post(`/${moveId}/undo`, {});
        expect(blocked.body.success).toBe(false);
        expect(blocked.body.message).toMatch(/Cannot undo/);

        // A fresh move that nobody touches afterwards can be undone.
        const again = await post("/apply", {
            operation: "moveSubDepartment",
            sourceId: org.platform,
            targetId: org.sales,
            resolutions: [
                { userId: primaryUser, action: "follow" },
                { userId: secondaryUser, action: "clear" },
            ],
        });
        expect(again.body.success).toBe(true);
        expect((await stored(secondaryUser)).secondarySubDepartments).toEqual([]);

        const undone = await post(`/${again.body.data.moveId}/undo`, {});
        expect(undone.body.success).toBe(true);
        expect((await SubDepartmentModel.findById(org.platform).lean())?.department?.toString()).toBe(org.ops);
        expect(await stored(primaryUser)).toMatchObject({ primaryDepartment: org.ops });
        expect((await stored(secondaryUser)).secondarySubDepartments).toEqual([org.platform]);

        const twice = await post(`/${again.body.data.moveId}/undo`, {});
        expect(twice.body.message).toMatch(/already been undone/);
    });
});

describe("move title", () => {
    it("follow re-homes the user and keeps the old sub-department as secondary; clear unsets the title", async () => {
        const follower = await makeUser("Title Follower", {
            primaryDepartment: org.ops,
            primarySubDepartment: org.support,
            employmentTitle: org.agent,
        });
        const cleared = await makeUser("Title Cleared", {
            primaryDepartment: org.ops,
            primarySubDepartment: org.support,
            employmentTitle: org.agent,
        });
        const res = await post("/apply", {
            operation: "moveTitle",
            sourceId: org.agent,
            targetId: org.qa,
            resolutions: [
                { userId: follower, action: "follow" },
                { userId: cleared, action: "clear" },
            ],
        });
        expect(res.body.success).toBe(true);
        expect((await EmploymentTitleModel.findById(org.agent).lean())?.subDepartment?.toString()).toBe(org.qa);
        expect(await stored(follower)).toMatchObject({
            primaryDepartment: org.eng,
            primarySubDepartment: org.qa,
            employmentTitle: org.agent,
            secondaryDepartments: [org.ops],
            secondarySubDepartments: [org.support],
        });
        const clearedState = await stored(cleared);
        expect(clearedState.employmentTitle).toBeUndefined();
        expect(clearedState.primarySubDepartment).toBe(org.support);
    });
});

describe("merge", () => {
    it("merges titles: follow users move to the target title and the source is deactivated", async () => {
        const user = await makeUser("Merge Title User", {
            primaryDepartment: org.sales,
            primarySubDepartment: org.deals,
            employmentTitle: org.rep,
        });
        const res = await post("/apply", {
            operation: "mergeTitle",
            sourceId: org.rep,
            targetId: org.tester,
            resolutions: [{ userId: user, action: "follow" }],
        });
        expect(res.body.success).toBe(true);
        expect((await EmploymentTitleModel.findById(org.rep).lean())?.isActive).toBe(false);
        expect(await stored(user)).toMatchObject({
            primaryDepartment: org.eng,
            primarySubDepartment: org.qa,
            employmentTitle: org.tester,
        });
    });

    it("merges sub-departments: child titles move to the target and the source is deactivated", async () => {
        const user = await makeUser("Merge Sub User", {
            primaryDepartment: org.sales,
            primarySubDepartment: org.deals,
        });
        const preview = await post("/preview", {
            operation: "mergeSubDepartment",
            sourceId: org.deals,
            targetId: org.support,
        });
        const resolutions = preview.body.data.users.map((u: { id: string }) => ({ userId: u.id, action: "follow" }));
        const res = await post("/apply", {
            operation: "mergeSubDepartment",
            sourceId: org.deals,
            targetId: org.support,
            resolutions,
        });
        expect(res.body.success).toBe(true);
        expect((await SubDepartmentModel.findById(org.deals).lean())?.isActive).toBe(false);
        expect(await stored(user)).toMatchObject({ primaryDepartment: org.ops, primarySubDepartment: org.support });
    });

    it("rejects merging into itself or into an inactive target", async () => {
        const self = await post("/preview", { operation: "mergeTitle", sourceId: org.tester, targetId: org.tester });
        expect(self.body.success).toBe(false);
        const inactive = await post("/preview", { operation: "mergeTitle", sourceId: org.tester, targetId: org.rep });
        expect(inactive.body.success).toBe(false);
    });
});

describe("permissions", () => {
    it("needs write access to the entity's area", async () => {
        const res = await post(
            "/preview",
            { operation: "moveTitle", sourceId: org.tester, targetId: org.platform },
            limited,
        );
        expect(res.status).toBe(403);
    });

    it("blocks the move when the actor cannot manage an affected user", async () => {
        const outsider = await makeUser("Out Of Scope", {
            primaryDepartment: org.eng,
            primarySubDepartment: org.qa,
        });
        const preview = await post(
            "/preview",
            { operation: "moveSubDepartment", sourceId: org.qa, targetId: org.ops },
            limited,
        );
        expect(preview.body.success).toBe(true);
        expect(preview.body.data.users.find((u: { id: string }) => u.id === outsider).canManage).toBe(false);

        const apply = await post(
            "/apply",
            {
                operation: "moveSubDepartment",
                sourceId: org.qa,
                targetId: org.ops,
                resolutions: [{ userId: outsider, action: "follow" }],
            },
            limited,
        );
        expect(apply.body.success).toBe(false);
        expect(apply.body.error.join(" ")).toMatch(/permission/);
        expect((await SubDepartmentModel.findById(org.qa).lean())?.department?.toString()).toBe(org.eng);
    });
});

describe("legacy guard", () => {
    it("points to the wizard when a plain update would orphan users", async () => {
        const res = await request(app)
            .put(`/api/sub-departments/${org.qa}`)
            .set(bearer())
            .send({ departmentId: org.sales });
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Move \/ Merge/);
    });
});
