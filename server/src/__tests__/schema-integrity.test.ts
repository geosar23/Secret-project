import mongoose from "mongoose";
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { TEST_COMPANY_ID } from "./helpers/seed";
import { RoleModel } from "../models/role.model";
import { DepartmentModel } from "../models/department.model";
import { SubDepartmentModel } from "../models/sub-department.model";
import { EmploymentTitleModel } from "../models/employment-title.model";
import { UserModel } from "../models/user.model";
import { UserService } from "../services/user.service";
import { buildUserSearchAccessQuery } from "../policies/user.policy";
import { PermissionKeys } from "../enums/permissions.enum";

describe("Schema integrity audit", () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await clearCollections();
        await disconnectTestDB();
    });

    it("User schema should not include a direct department field; department is derived from title hierarchy", () => {
        const departmentPath = UserModel.schema.path("department");
        const employmentTitlePath = UserModel.schema.path("employmentTitle");

        expect(departmentPath).toBeUndefined();
        expect(employmentTitlePath).toBeDefined();
    });

    it("Department filter in getUsers should return matching users via employmentTitle -> subDepartment -> department", async () => {
        const companyId = TEST_COMPANY_ID.toString();

        const role = await RoleModel.create({
            role: "schema-audit-role",
            name: "Schema Audit Role",
            description: "Used by schema integrity audit",
            level: 2,
            permissions: ["*:*:*"],
            isSystemRole: false,
            company: TEST_COMPANY_ID,
        });

        const departmentA = await DepartmentModel.create({
            name: "Department A",
            company: TEST_COMPANY_ID,
            isActive: true,
        });

        const departmentB = await DepartmentModel.create({
            name: "Department B",
            company: TEST_COMPANY_ID,
            isActive: true,
        });

        const subDepartmentA = await SubDepartmentModel.create({
            name: "SubDept A",
            department: departmentA._id,
            company: TEST_COMPANY_ID,
            isActive: true,
        });

        const subDepartmentB = await SubDepartmentModel.create({
            name: "SubDept B",
            department: departmentB._id,
            company: TEST_COMPANY_ID,
            isActive: true,
        });

        const employmentTitleA = await EmploymentTitleModel.create({
            name: "Title A",
            subDepartment: subDepartmentA._id,
            company: TEST_COMPANY_ID,
            isActive: true,
        });

        const employmentTitleB = await EmploymentTitleModel.create({
            name: "Title B",
            subDepartment: subDepartmentB._id,
            company: TEST_COMPANY_ID,
            isActive: true,
        });

        await UserModel.create({
            name: "Department A User",
            email: "dept-a-user@test.com",
            password: "Password@123",
            role: role._id,
            company: TEST_COMPANY_ID,
            employmentTitle: employmentTitleA._id,
            isActive: true,
        } as unknown as Record<string, unknown>);

        await UserModel.create({
            name: "Department B User",
            email: "dept-b-user@test.com",
            password: "Password@123",
            role: role._id,
            company: TEST_COMPANY_ID,
            employmentTitle: employmentTitleB._id,
            isActive: true,
        } as unknown as Record<string, unknown>);

        const result = await UserService.getUsers(
            {
                page: 1,
                limit: 20,
                departmentId: departmentA._id.toString(),
            },
            companyId,
        );

        expect(result.users).toHaveLength(1);
        expect(result.users[0].email).toBe("dept-a-user@test.com");
    });

    it("buildUserSearchAccessQuery should generate a department scope filter", () => {
        const actorId = new mongoose.Types.ObjectId();
        const actorCountryId = new mongoose.Types.ObjectId();
        const actorDepartmentId = new mongoose.Types.ObjectId();

        const actor = {
            _id: actorId,
            role: {
                _id: new mongoose.Types.ObjectId(),
                role: "auditor",
                name: "Auditor",
                permissions: [PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT],
            },
            company: { _id: TEST_COMPANY_ID, name: "Test Company", slug: "test-company", isActive: true },
            country: actorCountryId,
            employmentTitle: {
                _id: new mongoose.Types.ObjectId(),
                subDepartment: {
                    _id: new mongoose.Types.ObjectId(),
                    department: {
                        _id: actorDepartmentId,
                    },
                },
            },
            grantedPermissions: [],
            revokedPermissions: [],
        };

        const filter = buildUserSearchAccessQuery(actor as never);

        expect(filter).toEqual({ department: actorDepartmentId });
    });
});
