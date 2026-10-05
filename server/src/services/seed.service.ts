import { Types } from "mongoose";
import { CompanyModel } from "../models/company.model";
import { RoleModel } from "../models/role.model";
import { UserModel } from "../models/user.model";
import { CountryModel } from "../models/country.model";
import { DepartmentModel } from "../models/department.model";
import { SubDepartmentModel } from "../models/sub-department.model";
import { EmploymentTitleModel } from "../models/employment-title.model";
import { LevelModel } from "../models/level.model";
import { OfficeModel } from "../models/office.model";
import { DefaultUserRoles } from "../enums/user-role.enum";
import { PermissionCategories as C } from "../enums/permissions.enum";

export interface SeedDemoCompanyOptions {
    companyName: string;
    slug: string;
    adminEmail: string;
    adminPassword: string;
}

export interface SeedDemoCompanyResult {
    companyId: string;
    adminEmail: string;
    counts: Record<string, number>;
}

const ORG_ENTITIES = [
    C.COUNTRIES_MANAGEMENT,
    C.DEPARTMENTS_MANAGEMENT,
    C.SUB_DEPARTMENTS_MANAGEMENT,
    C.EMPLOYMENT_TITLES_MANAGEMENT,
    C.LEVELS_MANAGEMENT,
    C.OFFICES_MANAGEMENT,
];

const fullAccess = (categories: string[]) => categories.map(c => `${c}:*:*`);
const readAll = (categories: string[]) => categories.map(c => `${c}:read:*`);

const ROLE_DEFINITIONS: {
    role: DefaultUserRoles;
    name: string;
    description: string;
    level: number;
    permissions: string[];
}[] = [
    {
        role: DefaultUserRoles.SUPER_ADMIN,
        name: "Super Admin",
        description: "Company owner with full control",
        level: 1,
        permissions: ["*:*:*"],
    },
    {
        role: DefaultUserRoles.ADMIN,
        name: "Admin",
        description: "Company administrator",
        level: 2,
        permissions: [
            ...fullAccess([C.USERS_MANAGEMENT, C.USER_PROFILE, C.ROLES_MANAGEMENT, ...ORG_ENTITIES]),
            `${C.USER_CREATE}:write:*`,
            `${C.RESET_PASSWORD}:write:*`,
        ],
    },
    {
        role: DefaultUserRoles.HR,
        name: "HR",
        description: "HR staff managing employees",
        level: 3,
        permissions: [
            ...fullAccess([C.USERS_MANAGEMENT, C.USER_PROFILE]),
            `${C.USER_CREATE}:write:*`,
            `${C.RESET_PASSWORD}:write:*`,
            ...readAll(ORG_ENTITIES),
        ],
    },
    {
        role: DefaultUserRoles.MANAGER,
        name: "Manager",
        description: "Team manager with access to direct reports",
        level: 4,
        permissions: [
            `${C.USERS_MANAGEMENT}:read:managed`,
            `${C.USER_PROFILE}:read:managed`,
            `${C.USER_PROFILE}:read:self`,
        ],
    },
    {
        role: DefaultUserRoles.EMPLOYEE,
        name: "Employee",
        description: "Regular employee with access to own data",
        level: 5,
        permissions: [`${C.USERS_MANAGEMENT}:read:self`, `${C.USER_PROFILE}:read:self`],
    },
];

const DEPARTMENT_TREE = [
    { department: "Engineering", subDepartment: "Software Development", title: "Software Engineer" },
    { department: "HR", subDepartment: "People Operations", title: "HR Specialist" },
    { department: "Marketing", subDepartment: "Digital Marketing", title: "Marketing Specialist" },
    { department: "Finance", subDepartment: "Accounting", title: "Accountant" },
    { department: "Sales", subDepartment: "Inside Sales", title: "Sales Representative" },
];

const LEVELS = ["Junior", "Mid", "Senior", "Lead"];

/** Creates one company with default roles, a starter org structure and a super admin. Throws if the slug exists. */
export async function seedDemoCompany(options: SeedDemoCompanyOptions): Promise<SeedDemoCompanyResult> {
    const { companyName, slug, adminEmail, adminPassword } = options;

    if (await CompanyModel.exists({ slug })) {
        throw new Error(`A company with slug "${slug}" already exists`);
    }
    if (await UserModel.exists({ email: adminEmail })) {
        throw new Error(`A user with email "${adminEmail}" already exists`);
    }

    const company = await CompanyModel.create({ name: companyName, slug, isActive: true });
    const companyId = company._id as Types.ObjectId;

    const roles = await RoleModel.insertMany(
        ROLE_DEFINITIONS.map(def => ({ ...def, isSystemRole: true, isActive: true, company: companyId })),
    );
    const superAdminRole = roles.find(r => r.role === DefaultUserRoles.SUPER_ADMIN)!;

    const greece = await CountryModel.create({ name: "Greece", company: companyId, isActive: true });

    let subDepartmentCount = 0;
    let titleCount = 0;
    for (const entry of DEPARTMENT_TREE) {
        const department = await DepartmentModel.create({ name: entry.department, company: companyId });
        const subDepartment = await SubDepartmentModel.create({
            name: entry.subDepartment,
            department: department._id,
            company: companyId,
        });
        await EmploymentTitleModel.create({
            name: entry.title,
            subDepartment: subDepartment._id,
            company: companyId,
        });
        subDepartmentCount++;
        titleCount++;
    }

    await LevelModel.insertMany(LEVELS.map((name, order) => ({ name, order, company: companyId, isActive: true })));

    await OfficeModel.create({
        name: "Athens HQ",
        company: companyId,
        country: greece._id,
        address: { city: "Athens", country: "Greece" },
    });

    await UserModel.create({
        name: "Super Admin",
        email: adminEmail,
        password: adminPassword,
        company: companyId,
        role: superAdminRole._id,
        country: greece._id,
        isActive: true,
    });

    return {
        companyId: String(companyId),
        adminEmail,
        counts: {
            roles: roles.length,
            countries: 1,
            departments: DEPARTMENT_TREE.length,
            subDepartments: subDepartmentCount,
            employmentTitles: titleCount,
            levels: LEVELS.length,
            offices: 1,
            users: 1,
        },
    };
}
