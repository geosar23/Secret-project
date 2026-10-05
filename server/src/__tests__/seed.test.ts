import request from "supertest";
import app from "../app";
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { seedDemoCompany } from "../services/seed.service";
import { RoleModel } from "../models/role.model";

const options = {
    companyName: "Acme",
    slug: "acme",
    adminEmail: "admin@acme.com",
    adminPassword: "Seed@Pass1",
};

let token: string;

beforeAll(async () => {
    await connectTestDB();
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

describe("seedDemoCompany", () => {
    it("creates a company the super admin can log into and use", async () => {
        const result = await seedDemoCompany(options);
        expect(result.counts).toMatchObject({ roles: 5, departments: 5, subDepartments: 5, employmentTitles: 5 });

        const login = await request(app)
            .post("/api/auth/login")
            .send({ email: options.adminEmail, password: options.adminPassword });
        expect(login.status).toBe(200);
        token = login.body.data.token;

        const departments = await request(app)
            .get("/api/departments")
            .set({ Authorization: `Bearer ${token}` });
        expect(departments.body.data).toHaveLength(5);

        const roles = await request(app)
            .get("/api/roles")
            .set({ Authorization: `Bearer ${token}` });
        expect(roles.status).toBe(200);
    });

    it("refuses to seed the same slug or admin email twice", async () => {
        await expect(seedDemoCompany(options)).rejects.toThrow(/already exists/);
        await expect(seedDemoCompany({ ...options, slug: "other" })).rejects.toThrow(/already exists/);
    });

    it("lets the seeded HR role manage users but not roles", async () => {
        const create = await request(app)
            .post("/api/users")
            .set({ Authorization: `Bearer ${token}` })
            .send({ name: "HR One", email: "hr@acme.com", password: "Hr@Pass123", role: await roleId("hr") });
        expect(create.body.success).toBe(true);

        const login = await request(app).post("/api/auth/login").send({ email: "hr@acme.com", password: "Hr@Pass123" });
        const hrHeader = { Authorization: `Bearer ${login.body.data.token}` };

        const users = await request(app).get("/api/users").set(hrHeader);
        expect(users.body.data.users.length).toBeGreaterThan(0);

        const createRole = await request(app).post("/api/roles").set(hrHeader).send({ role: "x", name: "X" });
        expect(createRole.status).toBe(403);
    });
});

async function roleId(key: string): Promise<string> {
    const role = await RoleModel.findOne({ role: key }).lean();
    return String(role!._id);
}
