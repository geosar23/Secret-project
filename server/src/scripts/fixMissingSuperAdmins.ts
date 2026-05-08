/**
 * Fix Missing Super-Admin Users
 *
 * For every company that has a super_admin role but no active user assigned to
 * it, this script creates a dummy super-admin user with:
 *   - email:    superadmin@<company-slug>.com  (unique per company)
 *   - password: password123  (bcrypt-hashed)
 *   - name:     Super Admin
 *
 * Usage (from server/):
 *   npx ts-node src/scripts/fixMissingSuperAdmins.ts
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

import { CompanyModel } from "../models/company.model";
import { RoleModel } from "../models/role.model";
import { UserModel } from "../models/user.model";
import { DefaultUserRoles } from "../enums/user-role.enum";

async function run(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI is not set in environment");
        process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected.\n");

    const companies = await CompanyModel.find({}, { _id: 1, name: 1, slug: 1 }).lean();

    // Index super_admin roles by company
    const superAdminRoles = await RoleModel.find({ role: DefaultUserRoles.SUPER_ADMIN }, { _id: 1, company: 1 }).lean();

    const roleByCompany = new Map<string, mongoose.Types.ObjectId>();
    for (const r of superAdminRoles) {
        roleByCompany.set(String(r.company), r._id as mongoose.Types.ObjectId);
    }

    const passwordHash = await bcrypt.hash("password123", 10);
    let created = 0;

    for (const company of companies) {
        const companyKey = String(company._id);
        const superAdminRoleId = roleByCompany.get(companyKey);

        if (!superAdminRoleId) {
            console.warn(`  [SKIP] Company "${company.name}" has no super_admin role — skipping`);
            continue;
        }

        // Check whether an active super_admin user already exists
        const existing = await UserModel.findOne({
            company: company._id,
            role: superAdminRoleId,
            isActive: true,
        }).lean();

        if (existing) {
            console.log(`  [OK]   Company "${company.name}" already has an active super_admin`);
            continue;
        }

        // Build a deterministic, unique email using the company slug (fall back to id)
        const slug = company.slug?.trim() || companyKey;
        const email = `superadmin@${slug}.com`;

        // Guard against accidental duplicate emails across runs
        const emailTaken = await UserModel.findOne({ email }).lean();
        if (emailTaken) {
            console.warn(`  [WARN] Email "${email}" already in use — skipping company "${company.name}"`);
            continue;
        }

        await UserModel.create({
            name: "Super Admin",
            email,
            password: passwordHash,
            company: company._id,
            role: superAdminRoleId,
            isActive: true,
        });

        console.log(`  [CREATED] superadmin for company "${company.name}" → ${email}`);
        created++;
    }

    console.log(`\nDone — ${created} user(s) created.`);

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => {
    console.error("Script failed:", err);
    process.exit(1);
});
