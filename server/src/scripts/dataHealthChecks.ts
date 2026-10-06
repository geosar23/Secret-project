/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Data Health Check Script
 *
 * Runs on-demand integrity checks against the database to catch data that
 * violates model constraints (referential integrity, required fields, enum
 * values, company scoping rules, etc.).
 *
 * Usage (from server/):
 *   npx ts-node src/scripts/dataHealthChecks.ts
 */

import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { CompanyModel } from "../models/company.model";
import { UserModel } from "../models/user.model";
import { RoleModel } from "../models/role.model";
import { DepartmentModel } from "../models/department.model";
import { SubDepartmentModel } from "../models/sub-department.model";
import { EmploymentTitleModel } from "../models/employment-title.model";
import { CountryModel } from "../models/country.model";
import { LevelModel } from "../models/level.model";
import { OfficeModel } from "../models/office.model";
import { UserDocumentModel } from "../models/user-document.model";
import { DefaultUserRoles } from "../enums/user-role.enum";
import { validateUserProfilePayload } from "../utils/user-profile-validator.util";
import { Gender, MaritalStatus, EmploymentType, DegreeLevel, DocumentType } from "../enums/profile.enum";

// ─── Helpers ────────────────────────────────────────────────────────────────

let totalIssues = 0;

function report(collection: string, id: unknown, message: string): void {
    totalIssues++;
    console.warn(`  [${collection}] ${id} — ${message}`);
}

async function getAllIds(model: mongoose.Model<unknown>): Promise<Set<string>> {
    const docs = await model.find({}, { _id: 1 }).lean();
    return new Set(docs.map((d: unknown) => String((d as { _id: Types.ObjectId })._id)));
}

// ─── Checks ─────────────────────────────────────────────────────────────────

async function checkCompanies(): Promise<void> {
    console.log("\n── Companies ──────────────────────────────────────────────");
    const companies = await CompanyModel.find({}).lean();
    for (const c of companies) {
        if (!c.name?.trim()) {
            report("Companies", c._id, "missing name");
        }
        if (!c.slug?.trim()) {
            report("Companies", c._id, "missing slug");
        }
    }
    console.log(`   ${companies.length} documents checked`);
}

async function checkRoles(companyIds: Set<string>): Promise<void> {
    console.log("\n── Roles ───────────────────────────────────────────────────");
    const roles = await RoleModel.find({}).lean();
    const systemRoleSlugs = new Set(Object.values(DefaultUserRoles) as string[]);

    for (const r of roles) {
        const id = r._id;
        if (!r.company) {
            report("Roles", id, "missing company (all roles must be company-scoped)");
        } else if (!companyIds.has(String(r.company))) {
            report("Roles", id, `company ${r.company} does not exist`);
        }

        if (!r.name?.trim()) {
            report("Roles", id, "missing name");
        }
        if (!r.description?.trim()) {
            report("Roles", id, "missing description");
        }
        if (r.level == null) {
            report("Roles", id, "missing level");
        }

        if (r.isSystemRole && !systemRoleSlugs.has(r.role)) {
            report("Roles", id, `isSystemRole=true but role slug "${r.role}" is not a DefaultUserRoles value`);
        }

        if (r.isSystemRole && r.isActive === false) {
            report("Roles", id, "system role must not be inactive");
        }
    }
    console.log(`   ${roles.length} documents checked`);
}

async function checkUsers(companyIds: Set<string>, roleIds: Set<string>): Promise<void> {
    console.log("\n── Users ───────────────────────────────────────────────────");
    const users = await UserModel.find({}).lean();
    const countryIds = await getAllIds(CountryModel as unknown as mongoose.Model<unknown>);
    const titleIds = await getAllIds(EmploymentTitleModel as unknown as mongoose.Model<unknown>);
    const levelIds = await getAllIds(LevelModel as unknown as mongoose.Model<unknown>);
    const officeIds = await getAllIds(OfficeModel as unknown as mongoose.Model<unknown>);
    const userIds = new Set(users.map(u => String(u._id)));

    const validGenders = new Set(Object.values(Gender) as string[]);
    const validMarital = new Set(Object.values(MaritalStatus) as string[]);
    const validEmployment = new Set(Object.values(EmploymentType) as string[]);
    const validDegree = new Set(Object.values(DegreeLevel) as string[]);

    for (const u of users) {
        const id = u._id;

        if (!u.name?.trim()) {
            report("Users", id, "missing name");
        }
        if (!u.email?.trim()) {
            report("Users", id, "missing email");
        }
        if (!u.password) {
            report("Users", id, "missing password hash");
        }

        // Company
        if (!u.company) {
            report("Users", id, "missing company");
        } else if (!companyIds.has(String(u.company))) {
            report("Users", id, `company ${u.company} does not exist`);
        }

        // Role
        if (!u.role) {
            report("Users", id, "missing role");
        } else if (!roleIds.has(String(u.role))) {
            report("Users", id, `role ${u.role} does not exist`);
        }

        // Optional refs — check existence only if set
        if (u.country && !countryIds.has(String(u.country))) {
            report("Users", id, `country ${u.country} does not exist`);
        }
        if (u.employmentTitle && !titleIds.has(String(u.employmentTitle))) {
            report("Users", id, `employmentTitle ${u.employmentTitle} does not exist`);
        }
        if (u.level && !levelIds.has(String(u.level))) {
            report("Users", id, `level ${u.level} does not exist`);
        }
        if (u.office && !officeIds.has(String(u.office))) {
            report("Users", id, `office ${u.office} does not exist`);
        }
        if (u.manager && !userIds.has(String(u.manager))) {
            report("Users", id, `manager ${u.manager} does not exist`);
        }
        if (u.hrRepresentative && !userIds.has(String(u.hrRepresentative))) {
            report("Users", id, `hrRepresentative ${u.hrRepresentative} does not exist`);
        }

        // Enum fields
        if (u.gender && !validGenders.has(u.gender)) {
            report("Users", id, `invalid gender "${u.gender}"`);
        }
        if (u.maritalStatus && !validMarital.has(u.maritalStatus)) {
            report("Users", id, `invalid maritalStatus "${u.maritalStatus}"`);
        }
        if (u.employmentType && !validEmployment.has(u.employmentType)) {
            report("Users", id, `invalid employmentType "${u.employmentType}"`);
        }
        if (Array.isArray(u.education)) {
            u.education.forEach((e, i) => {
                if (e.degreeLevel && !validDegree.has(e.degreeLevel)) {
                    report("Users", id, `education[${i}] invalid degreeLevel "${e.degreeLevel}"`);
                }
            });
        }

        // Profile field rules (the same ones enforced on create/update). Salary is encrypted at rest, so skip it.
        const { salary: _salary, password: _password, ...profile } = u as Record<string, unknown>;
        const profileIssue = validateUserProfilePayload(profile);
        if (profileIssue) {
            report("Users", id, `legacy profile data: ${profileIssue}`);
        }
    }
    console.log(`   ${users.length} documents checked`);
}

async function checkDepartments(companyIds: Set<string>): Promise<void> {
    console.log("\n── Departments ─────────────────────────────────────────────");
    const docs = await DepartmentModel.find({}).lean();
    for (const d of docs) {
        if (!d.name?.trim()) {
            report("Departments", d._id, "missing name");
        }
        if (!d.company) {
            report("Departments", d._id, "missing company");
        } else if (!companyIds.has(String(d.company))) {
            report("Departments", d._id, `company ${d.company} does not exist`);
        }
    }
    console.log(`   ${docs.length} documents checked`);
}

/** Users store primary/secondary department and sub-department; they must agree with the org hierarchy. */
async function checkUserOrgHierarchy(): Promise<void> {
    console.log("\nChecking user department assignments...");
    const [users, subDepts, titles] = await Promise.all([
        UserModel.find(
            {},
            {
                employmentTitle: 1,
                primaryDepartment: 1,
                primarySubDepartment: 1,
                secondaryDepartments: 1,
                secondarySubDepartments: 1,
            },
        ).lean(),
        SubDepartmentModel.find({}, { department: 1 }).lean(),
        EmploymentTitleModel.find({}, { subDepartment: 1 }).lean(),
    ]);
    const deptOfSub = new Map(subDepts.map(s => [String(s._id), String(s.department)]));
    const subOfTitle = new Map(titles.map(t => [String(t._id), String(t.subDepartment)]));

    for (const u of users) {
        const id = u._id;
        const primaryDept = u.primaryDepartment ? String(u.primaryDepartment) : undefined;
        const primarySub = u.primarySubDepartment ? String(u.primarySubDepartment) : undefined;
        const secondaryDepts = (u.secondaryDepartments ?? []).map(String);
        const secondarySubs = (u.secondarySubDepartments ?? []).map(String);

        if (u.employmentTitle && !primarySub) {
            report("Users", id, "has an employment title but no primary sub-department (run backfillUserDepartments)");
        }
        if (primarySub && deptOfSub.get(primarySub) !== primaryDept) {
            report("Users", id, "primarySubDepartment does not belong to primaryDepartment");
        }
        if (u.employmentTitle && primarySub && subOfTitle.get(String(u.employmentTitle)) !== primarySub) {
            report("Users", id, "employmentTitle does not belong to primarySubDepartment");
        }
        if (primaryDept && secondaryDepts.includes(primaryDept)) {
            report("Users", id, "primaryDepartment is also listed as a secondary department");
        }
        if (primarySub && secondarySubs.includes(primarySub)) {
            report("Users", id, "primarySubDepartment is also listed as a secondary sub-department");
        }
        const allowed = new Set([primaryDept, ...secondaryDepts]);
        for (const sub of secondarySubs) {
            if (!allowed.has(deptOfSub.get(sub))) {
                report("Users", id, `secondary sub-department ${sub} is outside the user's departments`);
            }
        }
    }
}

async function checkSubDepartments(companyIds: Set<string>, departmentIds: Set<string>): Promise<void> {
    console.log("\n── Sub-Departments ─────────────────────────────────────────");
    const docs = await SubDepartmentModel.find({}).lean();
    for (const d of docs) {
        if (!d.name?.trim()) {
            report("SubDepartments", d._id, "missing name");
        }
        if (!d.company) {
            report("SubDepartments", d._id, "missing company");
        } else if (!companyIds.has(String(d.company))) {
            report("SubDepartments", d._id, `company ${d.company} does not exist`);
        }
        if (!d.department) {
            report("SubDepartments", d._id, "missing department");
        } else if (!departmentIds.has(String(d.department))) {
            report("SubDepartments", d._id, `department ${d.department} does not exist`);
        }
    }
    console.log(`   ${docs.length} documents checked`);
}

async function checkEmploymentTitles(companyIds: Set<string>, subDeptIds: Set<string>): Promise<void> {
    console.log("\n── Employment Titles ───────────────────────────────────────");
    const docs = await EmploymentTitleModel.find({}).lean();
    for (const d of docs) {
        if (!d.name?.trim()) {
            report("EmploymentTitles", d._id, "missing name");
        }
        if (!d.company) {
            report("EmploymentTitles", d._id, "missing company");
        } else if (!companyIds.has(String(d.company))) {
            report("EmploymentTitles", d._id, `company ${d.company} does not exist`);
        }
        if (!d.subDepartment) {
            report("EmploymentTitles", d._id, "missing subDepartment");
        } else if (!subDeptIds.has(String(d.subDepartment))) {
            report("EmploymentTitles", d._id, `subDepartment ${d.subDepartment} does not exist`);
        }
    }
    console.log(`   ${docs.length} documents checked`);
}

async function checkCountries(companyIds: Set<string>): Promise<void> {
    console.log("\n── Countries ───────────────────────────────────────────────");
    const docs = await CountryModel.find({}).lean();
    for (const d of docs) {
        if (!d.name?.trim()) {
            report("Countries", d._id, "missing name");
        }
        if (!d.company) {
            report("Countries", d._id, "missing company");
        } else if (!companyIds.has(String(d.company))) {
            report("Countries", d._id, `company ${d.company} does not exist`);
        }
    }
    console.log(`   ${docs.length} documents checked`);
}

async function checkLevels(companyIds: Set<string>): Promise<void> {
    console.log("\n── Levels ──────────────────────────────────────────────────");
    const docs = await LevelModel.find({}).lean();
    for (const d of docs) {
        if (!d.name?.trim()) {
            report("Levels", d._id, "missing name");
        }
        if (!d.company) {
            report("Levels", d._id, "missing company");
        } else if (!companyIds.has(String(d.company))) {
            report("Levels", d._id, `company ${d.company} does not exist`);
        }
    }
    console.log(`   ${docs.length} documents checked`);
}

async function checkOffices(companyIds: Set<string>, countryIds: Set<string>): Promise<void> {
    console.log("\n── Offices ─────────────────────────────────────────────────");
    const docs = await OfficeModel.find({}).lean();
    for (const d of docs) {
        if (!d.name?.trim()) {
            report("Offices", d._id, "missing name");
        }
        if (!d.company) {
            report("Offices", d._id, "missing company");
        } else if (!companyIds.has(String(d.company))) {
            report("Offices", d._id, `company ${d.company} does not exist`);
        }
        if (d.country && !countryIds.has(String(d.country))) {
            report("Offices", d._id, `country ${d.country} does not exist`);
        }
    }
    console.log(`   ${docs.length} documents checked`);
}

async function checkUserDocuments(companyIds: Set<string>, userIds: Set<string>): Promise<void> {
    console.log("\n── User Documents ──────────────────────────────────────────");
    const docs = await UserDocumentModel.find({}).lean();
    const validDocTypes = new Set(Object.values(DocumentType) as string[]);

    for (const d of docs) {
        if (!d.company) {
            report("UserDocuments", d._id, "missing company");
        } else if (!companyIds.has(String(d.company))) {
            report("UserDocuments", d._id, `company ${d.company} does not exist`);
        }
        if (!d.user) {
            report("UserDocuments", d._id, "missing user");
        } else if (!userIds.has(String(d.user))) {
            report("UserDocuments", d._id, `user ${d.user} does not exist`);
        }
        if (!d.type) {
            report("UserDocuments", d._id, "missing document type");
        } else if (!validDocTypes.has(d.type)) {
            report("UserDocuments", d._id, `invalid document type "${d.type}"`);
        }
    }
    console.log(`   ${docs.length} documents checked`);
}

async function checkCompanyScopingConsistency(companyIds: Set<string>): Promise<void> {
    console.log("\n── Cross-collection Company Scoping ────────────────────────");

    // Users referencing roles from a different company
    const users = await UserModel.find({}, { _id: 1, company: 1, role: 1 }).lean();
    const roleCompanyMap = new Map<string, string>();
    const allRoles = await RoleModel.find({}, { _id: 1, company: 1 }).lean();
    for (const r of allRoles) {
        roleCompanyMap.set(String(r._id), String(r.company));
    }

    for (const u of users) {
        if (u.role && u.company) {
            const roleCompany = roleCompanyMap.get(String(u.role));
            if (roleCompany && roleCompany !== String(u.company)) {
                report(
                    "Users (cross-company)",
                    u._id,
                    `role ${u.role} belongs to company ${roleCompany}, but user belongs to ${u.company}`,
                );
            }
        }
    }

    // Sub-departments whose department belongs to a different company
    const subDepts = await SubDepartmentModel.find({}, { _id: 1, company: 1, department: 1 }).lean();
    const deptCompanyMap = new Map<string, string>();
    const allDepts = await DepartmentModel.find({}, { _id: 1, company: 1 }).lean();
    for (const d of allDepts) {
        deptCompanyMap.set(String(d._id), String(d.company));
    }

    for (const sd of subDepts) {
        if (sd.department && sd.company) {
            const deptCompany = deptCompanyMap.get(String(sd.department));
            if (deptCompany && deptCompany !== String(sd.company)) {
                report(
                    "SubDepartments (cross-company)",
                    sd._id,
                    `department ${sd.department} belongs to company ${deptCompany}, but sub-department belongs to ${sd.company}`,
                );
            }
        }
    }

    // Employment titles whose sub-department belongs to a different company
    const titles = await EmploymentTitleModel.find({}, { _id: 1, company: 1, subDepartment: 1 }).lean();
    const subDeptCompanyMap = new Map<string, string>();
    for (const sd of subDepts) {
        subDeptCompanyMap.set(String(sd._id), String(sd.company));
    }

    for (const t of titles) {
        if (t.subDepartment && t.company) {
            const sdCompany = subDeptCompanyMap.get(String(t.subDepartment));
            if (sdCompany && sdCompany !== String(t.company)) {
                report(
                    "EmploymentTitles (cross-company)",
                    t._id,
                    `subDepartment ${t.subDepartment} belongs to company ${sdCompany}, but title belongs to ${t.company}`,
                );
            }
        }
    }

    console.log(`   Cross-company scoping check complete`);
}

async function checkCompanySuperAdmin(): Promise<void> {
    console.log("\n── Super-Admin Coverage ────────────────────────────────────");

    const companies = await CompanyModel.find({}, { _id: 1, name: 1 }).lean();

    // Find all super_admin roles grouped by company
    const superAdminRoles = await RoleModel.find({ role: DefaultUserRoles.SUPER_ADMIN }, { _id: 1, company: 1 }).lean();
    const superAdminRoleIdsByCompany = new Map<string, Set<string>>();
    for (const r of superAdminRoles) {
        const companyKey = String(r.company);
        if (!superAdminRoleIdsByCompany.has(companyKey)) {
            superAdminRoleIdsByCompany.set(companyKey, new Set());
        }
        superAdminRoleIdsByCompany.get(companyKey)!.add(String(r._id));
    }

    // For each company, check that at least one active user holds a super_admin role
    for (const company of companies) {
        const companyKey = String(company._id);
        const roleIds = superAdminRoleIdsByCompany.get(companyKey);

        if (!roleIds || roleIds.size === 0) {
            report("Companies (super-admin)", company._id, `no super_admin role exists for company "${company.name}"`);
            continue;
        }

        const superAdminUser = await UserModel.findOne({
            company: company._id,
            role: { $in: [...roleIds].map(id => new mongoose.Types.ObjectId(id)) },
            isActive: true,
        }).lean();

        if (!superAdminUser) {
            report("Companies (super-admin)", company._id, `company "${company.name}" has no active super_admin user`);
        }
    }

    console.log(`   ${companies.length} companies checked`);
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

async function run(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI is not set in environment");
        process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected.\n");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  DB Health Check");
    console.log("═══════════════════════════════════════════════════════════");

    const companyIds = await getAllIds(CompanyModel as unknown as mongoose.Model<unknown>);
    const roleIds = await getAllIds(RoleModel as unknown as mongoose.Model<unknown>);
    const departmentIds = await getAllIds(DepartmentModel as unknown as mongoose.Model<unknown>);
    const subDeptIds = await getAllIds(SubDepartmentModel as unknown as mongoose.Model<unknown>);
    const countryIds = await getAllIds(CountryModel as unknown as mongoose.Model<unknown>);
    const userDocs = await UserModel.find({}, { _id: 1 }).lean();
    const userIds = new Set(userDocs.map(u => String(u._id)));

    await checkCompanies();
    await checkRoles(companyIds);
    await checkUsers(companyIds, roleIds);
    await checkUserOrgHierarchy();
    await checkDepartments(companyIds);
    await checkSubDepartments(companyIds, departmentIds);
    await checkEmploymentTitles(companyIds, subDeptIds);
    await checkCountries(companyIds);
    await checkLevels(companyIds);
    await checkOffices(companyIds, countryIds);
    await checkUserDocuments(companyIds, userIds);
    await checkCompanyScopingConsistency(companyIds);
    await checkCompanySuperAdmin();

    console.log("\n═══════════════════════════════════════════════════════════");
    if (totalIssues === 0) {
        console.log("  ✓ All checks passed — no issues found");
    } else {
        console.log(`  ✗ ${totalIssues} issue(s) found`);
    }
    console.log("═══════════════════════════════════════════════════════════\n");

    await mongoose.disconnect();
    process.exit(totalIssues > 0 ? 1 : 0);
}

run().catch(err => {
    console.error("Health check failed:", err);
    process.exit(1);
});
