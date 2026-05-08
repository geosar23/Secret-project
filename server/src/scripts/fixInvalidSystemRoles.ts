/**
 * Fix Invalid System Roles
 *
 * Finds roles marked as isSystemRole=true whose slug does not match any value
 * in the DefaultUserRoles enum, and demotes them to custom roles (isSystemRole=false).
 *
 * Run AFTER reviewing the output of dataHealthChecks.ts.
 *
 * Usage (from server/):
 *   npx ts-node src/scripts/fixInvalidSystemRoles.ts
 *
 * Dry-run (no writes):
 *   DRY_RUN=true npx ts-node src/scripts/fixInvalidSystemRoles.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { RoleModel } from "../models/role.model";
import { DefaultUserRoles } from "../enums/user-role.enum";

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

    const validSystemSlugs = new Set(Object.values(DefaultUserRoles) as string[]);

    const invalidSystemRoles = await RoleModel.find({ isSystemRole: true }).lean();
    const targets = invalidSystemRoles.filter(r => !validSystemSlugs.has(r.role));

    if (targets.length === 0) {
        console.log("✓ No invalid system roles found.");
        await mongoose.disconnect();
        process.exit(0);
    }

    for (const r of targets) {
        console.log(
            `  [${DRY_RUN ? "DRY" : "FIX"}] Role ${r._id}\n` +
                `         name:    "${r.name}"\n` +
                `         slug:    "${r.role}"\n` +
                `         company: ${r.company}\n` +
                `         → setting isSystemRole: false`,
        );

        if (!DRY_RUN) {
            // Use updateOne to bypass the pre-save hook (which only blocks *creating* system roles)
            await RoleModel.updateOne({ _id: r._id }, { $set: { isSystemRole: false } });
        }
    }

    console.log(`\n─────────────────────────────────────────────────────────`);
    if (DRY_RUN) {
        console.log(`  DRY RUN: ${targets.length} role(s) would be demoted to custom.`);
    } else {
        console.log(`  ✓ ${targets.length} role(s) demoted to custom (isSystemRole=false).`);
    }
    console.log(`─────────────────────────────────────────────────────────\n`);

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => {
    console.error("Fix script failed:", err);
    process.exit(1);
});
