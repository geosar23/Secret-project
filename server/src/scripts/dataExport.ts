/**
 * Data Export Script
 *
 * Exports every collection to the console (table) and to an Excel workbook
 * (one sheet per collection). All ObjectId references are resolved to their
 * human-readable name / title so the output is immediately readable.
 *
 * Usage (from server/):
 *   npx ts-node src/scripts/dataExport.ts [--csv] [--out ./exports]
 *
 * Flags:
 *   --csv          Write one .csv file per collection instead of a single .xlsx
 *   --out <dir>    Output directory (default: ./exports)
 *   --company <id> Filter to a specific company (by ID, name, or slug)
 *
 * Example:
 * # Filter by company name
 * npx ts-node src/scripts/dataExport.ts --company "Acme Corp"
 *
 * # Filter by company ID
 * npx ts-node src/scripts/dataExport.ts --company "607c191e810c19729de860ea"
 *
 * # Filter by company slug
 * npx ts-node src/scripts/dataExport.ts --company "acme-corp"
 */

import mongoose, { Types } from "mongoose";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

import * as XLSX from "xlsx";

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

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const CSV_MODE = args.includes("--csv");
const outIndex = args.indexOf("--out");
const OUT_DIR = outIndex !== -1 && args[outIndex + 1] ? args[outIndex + 1] : "./exports";
const companyIndex = args.indexOf("--company");
const COMPANY_FILTER = companyIndex !== -1 && args[companyIndex + 1] ? args[companyIndex + 1] : null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type LookupMap = Map<string, string>;

/** Build a map of { id → name } from any model that has a `name` field. */
async function buildNameMap(model: mongoose.Model<unknown>, nameField = "name"): Promise<LookupMap> {
    const docs = await model.find({}, { _id: 1, [nameField]: 1 }).lean();
    const map = new Map<string, string>();
    for (const d of docs as Array<{ _id: Types.ObjectId; [key: string]: unknown }>) {
        map.set(String(d._id), String(d[nameField] ?? ""));
    }
    return map;
}

function resolve(map: LookupMap, id: unknown): string {
    if (!id) return "";
    return map.get(String(id)) ?? String(id);
}

function yesNo(val: unknown): string {
    if (val === true) return "Yes";
    if (val === false) return "No";
    return "";
}

function formatDate(val: unknown): string {
    if (!val) return "";
    const d = new Date(val as string | number | Date);
    if (isNaN(d.getTime())) return String(val);
    return d.toISOString().slice(0, 10);
}

// ─── Collection builders ──────────────────────────────────────────────────────

async function buildCompanies(companyId?: string): Promise<Record<string, unknown>[]> {
    const filter = companyId ? { _id: new mongoose.Types.ObjectId(companyId) } : {};
    const docs = await CompanyModel.find(filter).lean();
    return docs.map(c => ({
        ID: String(c._id),
        Name: c.name ?? "",
        Slug: c.slug ?? "",
        Active: yesNo(c.isActive),
    }));
}

async function buildRoles(companyMap: LookupMap, companyId?: string): Promise<Record<string, unknown>[]> {
    const filter = companyId ? { company: new mongoose.Types.ObjectId(companyId) } : {};
    const docs = await RoleModel.find(filter).lean();
    return docs.map(r => ({
        ID: String(r._id),
        Name: r.name ?? "",
        Description: r.description ?? "",
        Slug: r.role ?? "",
        Level: r.level ?? "",
        "System Role": yesNo(r.isSystemRole),
        Active: yesNo(r.isActive),
        Company: resolve(companyMap, r.company),
        "Permissions Count": Array.isArray(r.permissions) ? r.permissions.length : 0,
        Permissions: Array.isArray(r.permissions) ? r.permissions.join(", ") : "",
    }));
}

async function buildUsers(
    companyMap: LookupMap,
    roleMap: LookupMap,
    countryMap: LookupMap,
    titleMap: LookupMap,
    levelMap: LookupMap,
    officeMap: LookupMap,
    userMap: LookupMap,
    companyId?: string,
): Promise<Record<string, unknown>[]> {
    const filter = companyId ? { company: new mongoose.Types.ObjectId(companyId) } : {};
    const docs = await UserModel.find(filter).lean();
    return docs.map(u => ({
        ID: String(u._id),
        Name: u.name ?? "",
        Email: u.email ?? "",
        "Legal Name": u.legalName ?? "",
        "First Name": u.firstName ?? "",
        "Last Name": u.lastName ?? "",
        Gender: u.gender ?? "",
        Birthday: formatDate(u.birthday),
        "Marital Status": u.maritalStatus ?? "",
        Nationalities: Array.isArray(u.nationalities) ? u.nationalities.join(", ") : "",
        Religion: u.religion ?? "",
        Company: resolve(companyMap, u.company),
        Role: resolve(roleMap, u.role),
        Country: resolve(countryMap, u.country),
        "Employment Title": resolve(titleMap, u.employmentTitle),
        Level: resolve(levelMap, u.level),
        Office: resolve(officeMap, u.office),
        Manager: resolve(userMap, u.manager),
        "HR Representative": resolve(userMap, u.hrRepresentative),
        "Employment Type": u.employmentType ?? "",
        "Employment Date": formatDate(u.employmentDate),
        "Payroll ID": u.payrollId ?? "",
        Outsourced: yesNo(u.isOutsourced),
        "Work Phone": u.workPhone ?? "",
        "Personal Phone": u.personalPhone ?? "",
        Active: yesNo(u.isActive),
        // password and salary are intentionally omitted
    }));
}

async function buildDepartments(companyMap: LookupMap, companyId?: string): Promise<Record<string, unknown>[]> {
    const filter = companyId ? { company: new mongoose.Types.ObjectId(companyId) } : {};
    const docs = await DepartmentModel.find(filter).lean();
    return docs.map(d => ({
        ID: String(d._id),
        Name: d.name ?? "",
        Description: d.description ?? "",
        Active: yesNo(d.isActive),
        Company: resolve(companyMap, d.company),
    }));
}

async function buildSubDepartments(
    companyMap: LookupMap,
    deptMap: LookupMap,
    companyId?: string,
): Promise<Record<string, unknown>[]> {
    const filter = companyId ? { company: new mongoose.Types.ObjectId(companyId) } : {};
    const docs = await SubDepartmentModel.find(filter).lean();
    return docs.map(d => ({
        ID: String(d._id),
        Name: d.name ?? "",
        Description: d.description ?? "",
        Active: yesNo(d.isActive),
        Company: resolve(companyMap, d.company),
        Department: resolve(deptMap, d.department),
    }));
}

async function buildEmploymentTitles(
    companyMap: LookupMap,
    subDeptMap: LookupMap,
    companyId?: string,
): Promise<Record<string, unknown>[]> {
    const filter = companyId ? { company: new mongoose.Types.ObjectId(companyId) } : {};
    const docs = await EmploymentTitleModel.find(filter).lean();
    return docs.map(d => ({
        ID: String(d._id),
        Name: d.name ?? "",
        Description: d.description ?? "",
        Active: yesNo(d.isActive),
        Company: resolve(companyMap, d.company),
        "Sub-Department": resolve(subDeptMap, d.subDepartment),
    }));
}

async function buildCountries(companyMap: LookupMap, companyId?: string): Promise<Record<string, unknown>[]> {
    const filter = companyId ? { company: new mongoose.Types.ObjectId(companyId) } : {};
    const docs = await CountryModel.find(filter).lean();
    return docs.map(d => ({
        ID: String(d._id),
        Name: d.name ?? "",
        Description: d.description ?? "",
        Active: yesNo(d.isActive),
        Company: resolve(companyMap, d.company),
    }));
}

async function buildLevels(companyMap: LookupMap, companyId?: string): Promise<Record<string, unknown>[]> {
    const filter = companyId ? { company: new mongoose.Types.ObjectId(companyId) } : {};
    const docs = await LevelModel.find(filter).lean();
    return docs.map(d => ({
        ID: String(d._id),
        Name: d.name ?? "",
        Order: d.order ?? "",
        Active: yesNo(d.isActive),
        Company: resolve(companyMap, d.company),
    }));
}

async function buildOffices(
    companyMap: LookupMap,
    countryMap: LookupMap,
    companyId?: string,
): Promise<Record<string, unknown>[]> {
    const filter = companyId ? { company: new mongoose.Types.ObjectId(companyId) } : {};
    const docs = await OfficeModel.find(filter).lean();
    return docs.map(d => ({
        ID: String(d._id),
        Name: d.name ?? "",
        Active: yesNo(d.isActive),
        Company: resolve(companyMap, d.company),
        Country: resolve(countryMap, d.country),
        "Address Line 1": d.address?.line1 ?? "",
        "Address Line 2": d.address?.line2 ?? "",
        City: d.address?.city ?? "",
        State: d.address?.state ?? "",
        "Postal Code": d.address?.postalCode ?? "",
    }));
}

async function buildUserDocuments(
    companyMap: LookupMap,
    userMap: LookupMap,
    companyId?: string,
): Promise<Record<string, unknown>[]> {
    const filter = companyId ? { company: new mongoose.Types.ObjectId(companyId) } : {};
    const docs = await UserDocumentModel.find(filter).lean();
    return docs.map(d => ({
        ID: String(d._id),
        "Document Type": d.type ?? "",
        "Document Number": d.documentNumber ?? "",
        "Expiry Date": formatDate(d.expiryDate),
        "Issuing Country": d.issuingCountry ?? "",
        Notes: d.notes ?? "",
        Company: resolve(companyMap, d.company),
        User: resolve(userMap, d.user),
    }));
}

// ─── Output helpers ───────────────────────────────────────────────────────────

function printTable(label: string, rows: Record<string, unknown>[]): void {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ${label} (${rows.length} records)`);
    console.log("═".repeat(60));
    if (rows.length === 0) {
        console.log("  (no records)");
        return;
    }
    console.table(rows);
}

function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeCsv(dir: string, sheetName: string, rows: Record<string, unknown>[]): void {
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const filePath = path.join(dir, `${sheetName}.csv`);
    fs.writeFileSync(filePath, csv, "utf-8");
    console.log(`  Wrote ${filePath}`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function run(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI is not set in environment");
        process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected.\n");

    // ── Resolve company filter ────────────────────────────────────────────────
    let companyId: string | undefined;
    if (COMPANY_FILTER) {
        // Try treating it as an ObjectId first; fall back to name lookup
        let companyDoc: { _id: Types.ObjectId } | null = null;
        if (mongoose.Types.ObjectId.isValid(COMPANY_FILTER)) {
            companyDoc = (await CompanyModel.findById(COMPANY_FILTER, { _id: 1 }).lean()) as {
                _id: Types.ObjectId;
            } | null;
        }
        if (!companyDoc) {
            companyDoc = (await CompanyModel.findOne(
                { $or: [{ name: COMPANY_FILTER }, { slug: COMPANY_FILTER }] },
                { _id: 1 },
            ).lean()) as { _id: Types.ObjectId } | null;
        }
        if (!companyDoc) {
            console.error(`Company not found: "${COMPANY_FILTER}"`);
            await mongoose.disconnect();
            process.exit(1);
        }
        companyId = String(companyDoc._id);
        console.log(`Filtering by company: "${COMPANY_FILTER}" (${companyId})\n`);
    }

    // ── Build lookup maps ────────────────────────────────────────────────────
    const companyMap = await buildNameMap(CompanyModel as unknown as mongoose.Model<unknown>);
    const roleMap = await buildNameMap(RoleModel as unknown as mongoose.Model<unknown>);
    const deptMap = await buildNameMap(DepartmentModel as unknown as mongoose.Model<unknown>);
    const subDeptMap = await buildNameMap(SubDepartmentModel as unknown as mongoose.Model<unknown>);
    const countryMap = await buildNameMap(CountryModel as unknown as mongoose.Model<unknown>);
    const titleMap = await buildNameMap(EmploymentTitleModel as unknown as mongoose.Model<unknown>);
    const levelMap = await buildNameMap(LevelModel as unknown as mongoose.Model<unknown>);
    const officeMap = await buildNameMap(OfficeModel as unknown as mongoose.Model<unknown>);
    const userMap = await buildNameMap(UserModel as unknown as mongoose.Model<unknown>);

    // ── Build all datasets ───────────────────────────────────────────────────
    const datasets: Array<{ label: string; sheet: string; rows: Record<string, unknown>[] }> = [
        { label: "Companies", sheet: "Companies", rows: await buildCompanies(companyId) },
        { label: "Roles", sheet: "Roles", rows: await buildRoles(companyMap, companyId) },
        {
            label: "Users",
            sheet: "Users",
            rows: await buildUsers(companyMap, roleMap, countryMap, titleMap, levelMap, officeMap, userMap, companyId),
        },
        { label: "Departments", sheet: "Departments", rows: await buildDepartments(companyMap, companyId) },
        {
            label: "Sub-Departments",
            sheet: "Sub-Departments",
            rows: await buildSubDepartments(companyMap, deptMap, companyId),
        },
        {
            label: "Employment Titles",
            sheet: "Employment Titles",
            rows: await buildEmploymentTitles(companyMap, subDeptMap, companyId),
        },
        { label: "Countries", sheet: "Countries", rows: await buildCountries(companyMap, companyId) },
        { label: "Levels", sheet: "Levels", rows: await buildLevels(companyMap, companyId) },
        { label: "Offices", sheet: "Offices", rows: await buildOffices(companyMap, countryMap, companyId) },
        {
            label: "User Documents",
            sheet: "User Documents",
            rows: await buildUserDocuments(companyMap, userMap, companyId),
        },
    ];

    // ── Print to console ─────────────────────────────────────────────────────
    for (const { label, rows } of datasets) {
        printTable(label, rows);
    }

    // ── Write files ──────────────────────────────────────────────────────────
    ensureDir(OUT_DIR);

    if (CSV_MODE) {
        console.log(`\nWriting CSV files to ${OUT_DIR}/`);
        for (const { sheet, rows } of datasets) {
            writeCsv(OUT_DIR, sheet, rows);
        }
    } else {
        const wb = XLSX.utils.book_new();
        for (const { sheet, rows } of datasets) {
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, sheet);
        }
        const fileLabel = COMPANY_FILTER ? COMPANY_FILTER.replace(/[^a-z0-9_-]/gi, "_") : "data";
        const outPath = path.join(OUT_DIR, `${fileLabel}-export.xlsx`);
        XLSX.writeFile(wb, outPath);
        console.log(`\nExcel workbook written to: ${outPath}`);
    }

    await mongoose.disconnect();
}

run().catch(err => {
    console.error("Export failed:", err);
    process.exit(1);
});
