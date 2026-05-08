/**
 * Fix Cross-Company Role Assignments
 *
 * Finds users whose assigned role belongs to a different company than the user,
 * and reassigns them to the lowest-level (least powerful) active role within
 * their own company.
 *
 * Run AFTER reviewing the output of dataHealthChecks.ts.
 *
 * Usage (from server/):
 *   npx ts-node src/scripts/fixCrossCompanyRoles.ts
 *
 * Dry-run (no writes):
 *   DRY_RUN=true npx ts-node src/scripts/fixCrossCompanyRoles.ts
 */

import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { UserModel } from "../models/user.model";
import { RoleModel } from "../models/role.model";

const DRY_RUN = process.env.DRY_RUN === "true";

async function run(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI is not set in environment");
        process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log(`Connected. ${DRY_RUN ? "(DRY RUN — no writes will be made)" : ""}\n`);

    // Load all users with company + role
    const users = await UserModel.find({}, { _id: 1, name: 1, email: 1, company: 1, role: 1 }).lean();

    // Build role → company map
    const allRoles = await RoleModel.find({}, { _id: 1, company: 1, level: 1, name: 1 }).lean();
    const roleCompanyMap = new Map<string, string>();
    for (const r of allRoles) {
        roleCompanyMap.set(String(r._id), String(r.company));
    }

    // Cache: companyId → lowest-level role in that company
    const lowestRoleCache = new Map<string, { _id: Types.ObjectId; name: string; level: number }>();

    async function getLowestRoleForCompany(
        companyId: string,
    ): Promise<{ _id: Types.ObjectId; name: string; level: number } | null> {
        if (lowestRoleCache.has(companyId)) {
            return lowestRoleCache.get(companyId)!;
        }
        const role = await RoleModel.findOne(
            { company: new Types.ObjectId(companyId), isActive: true },
            { _id: 1, name: 1, level: 1 },
        )
            .sort({ level: 1 })
            .lean();

        if (role) {
            const entry = { _id: role._id as Types.ObjectId, name: role.name, level: role.level };
            lowestRoleCache.set(companyId, entry);
            return entry;
        }
        return null;
    }

    let fixed = 0;
    let skipped = 0;

    for (const u of users) {
        if (!u.role || !u.company) continue;

        const roleCompany = roleCompanyMap.get(String(u.role));
        if (!roleCompany || roleCompany === String(u.company)) continue;

        // Cross-company assignment detected
        const fallbackRole = await getLowestRoleForCompany(String(u.company));

        if (!fallbackRole) {
            console.warn(
                `  [SKIP] User ${u._id} (${u.email}) — no active role found in company ${u.company}, cannot fix`,
            );
            skipped++;
            continue;
        }

        console.log(
            `  [${DRY_RUN ? "DRY" : "FIX"}] User ${u._id} (${u.email})\n` +
                `         company:      ${u.company}\n` +
                `         current role: ${u.role} (company ${roleCompany})\n` +
                `         → new role:   ${fallbackRole._id} "${fallbackRole.name}" (level ${fallbackRole.level})`,
        );

        if (!DRY_RUN) {
            await UserModel.updateOne({ _id: u._id }, { $set: { role: fallbackRole._id } });
        }
        fixed++;
    }

    console.log(`\n─────────────────────────────────────────────────────────`);
    if (fixed === 0 && skipped === 0) {
        console.log("  ✓ No cross-company role assignments found.");
    } else {
        if (DRY_RUN) {
            console.log(`  DRY RUN: ${fixed} user(s) would be reassigned, ${skipped} skipped.`);
        } else {
            console.log(`  ✓ ${fixed} user(s) reassigned, ${skipped} skipped.`);
        }
    }
    console.log(`─────────────────────────────────────────────────────────\n`);

    await mongoose.disconnect();
    process.exit(skipped > 0 ? 1 : 0);
}

run().catch(err => {
    console.error("Fix script failed:", err);
    process.exit(1);
});
