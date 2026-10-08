import { companyRepository } from "../repositories/company.repository";
import { roleRepository } from "../repositories/role.repository";
import { userIdentityRepository, userRepository } from "../repositories/user.repository";
import { countryRepository } from "../repositories/country.repository";
import { departmentRepository } from "../repositories/department.repository";
import { subDepartmentRepository } from "../repositories/sub-department.repository";
import { employmentTitleRepository } from "../repositories/employment-title.repository";
import { levelRepository } from "../repositories/level.repository";
import { officeRepository } from "../repositories/office.repository";
import { DefaultUserRoles } from "../enums/user-role.enum";
import { PermissionCategories as C } from "../enums/permissions.enum";
import "./approvals/register-request-types";
import { RequestTypeConfigService } from "./approvals/request-type-config.service";
import { LeaveSettingsService } from "./leaves/leave-settings.service";
import { LeaveLedgerService } from "./leaves/leave-ledger.service";

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

/**
 * Leave and request permissions of the default roles. Also used by scripts/addLeavePermissionsToSystemRoles.ts to
 * bring existing companies' system roles up to date.
 */
export const LEAVE_ROLE_PERMISSIONS: Record<DefaultUserRoles, string[]> = {
    [DefaultUserRoles.SUPER_ADMIN]: [],
    [DefaultUserRoles.ADMIN]: [...fullAccess([C.LEAVE_SETTINGS_MANAGEMENT]), `${C.REQUESTS}:read:*`],
    [DefaultUserRoles.HR]: [
        ...fullAccess([C.LEAVES, C.LEAVE_BALANCES, C.LEAVE_SETTINGS_MANAGEMENT]),
        `${C.REQUESTS}:read:*`,
    ],
    [DefaultUserRoles.MANAGER]: [
        `${C.LEAVES}:read:self`,
        `${C.LEAVES}:write:self`,
        `${C.LEAVE_BALANCES}:read:self`,
        `${C.LEAVES}:read:managed`,
        `${C.LEAVES}:approve:managed`,
        `${C.LEAVE_BALANCES}:read:managed`,
        `${C.REQUESTS}:read:managed`,
    ],
    [DefaultUserRoles.EMPLOYEE]: [`${C.LEAVES}:read:self`, `${C.LEAVES}:write:self`, `${C.LEAVE_BALANCES}:read:self`],
};
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
            ...LEAVE_ROLE_PERMISSIONS[DefaultUserRoles.ADMIN],
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
            ...LEAVE_ROLE_PERMISSIONS[DefaultUserRoles.HR],
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
            ...LEAVE_ROLE_PERMISSIONS[DefaultUserRoles.MANAGER],
        ],
    },
    {
        role: DefaultUserRoles.EMPLOYEE,
        name: "Employee",
        description: "Regular employee with access to own data",
        level: 5,
        permissions: [
            `${C.USERS_MANAGEMENT}:read:self`,
            `${C.USER_PROFILE}:read:self`,
            ...LEAVE_ROLE_PERMISSIONS[DefaultUserRoles.EMPLOYEE],
        ],
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

    if (await companyRepository().existsBySlug(slug)) {
        throw new Error(`A company with slug "${slug}" already exists`);
    }
    if (await userIdentityRepository().emailExists(adminEmail)) {
        throw new Error(`A user with email "${adminEmail}" already exists`);
    }

    const company = await companyRepository().create({ name: companyName, slug, isActive: true });
    const companyId = String(company._id);

    const roles = await roleRepository(companyId).insertMany(
        ROLE_DEFINITIONS.map(def => ({ ...def, isSystemRole: true, isActive: true })),
    );
    const superAdminRole = roles.find(r => r.role === DefaultUserRoles.SUPER_ADMIN)!;

    const greece = await countryRepository(companyId).create({ name: "Greece", isActive: true });

    let subDepartmentCount = 0;
    let titleCount = 0;
    for (const entry of DEPARTMENT_TREE) {
        const department = await departmentRepository(companyId).create({ name: entry.department });
        const subDepartment = await subDepartmentRepository(companyId).create({
            name: entry.subDepartment,
            department: department._id,
        });
        await employmentTitleRepository(companyId).create({
            name: entry.title,
            subDepartment: subDepartment._id,
        });
        subDepartmentCount++;
        titleCount++;
    }

    await levelRepository(companyId).insertMany(LEVELS.map((name, order) => ({ name, order, isActive: true })));

    await officeRepository(companyId).create({
        name: "Athens HQ",
        country: greece._id,
        address: { city: "Athens", country: "Greece" },
    });

    const admin = await userRepository(companyId).create({
        name: "Super Admin",
        email: adminEmail,
        password: adminPassword,
        role: superAdminRole._id,
        country: greece._id,
        isActive: true,
    });

    // Request types with their default approval flows, then the starter leave configuration and this year's grants
    const adminId = String(admin._id);
    const year = String(new Date().getUTCFullYear());
    const requestTypes = await RequestTypeConfigService.ensureSystemTypes(companyId, adminId);
    await LeaveSettingsService.seedDefaults(companyId, adminId, year);
    await LeaveLedgerService.ensureEntitlements(companyId, year);

    return {
        companyId,
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
            requestTypes: requestTypes.length,
        },
    };
}
