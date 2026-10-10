/**
 * Bring existing companies up to date for the leave slice. Idempotent: safe to run again.
 *
 * For every company (or only `--company <slug>`):
 *   1. RequestTypes rows and the default approval flow (version 1) for every system request type
 *   2. The starter leave configuration (Monday–Friday schedule; Annual 20, Unpaid 30, Sick untracked), only when missing
 *   3. Leave and request permissions added to the default system roles (never removed)
 *   4. This year's leave grants for every active user
 *
 * New companies get all of this from seedDemoCompany. Run syncIndexes.ts first.
 *
 * Usage (from server/):
 *   npx ts-node src/scripts/setupLeaves.ts [--company <slug>]
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { CompanyModel } from "../models/company.model";
import { RoleModel } from "../models/role.model";
import { UserModel } from "../models/user.model";
import { DefaultUserRoles } from "../enums/user-role.enum";
import "../services/approvals/register-request-types";
import { RequestTypeConfigService } from "../services/approvals/request-type-config.service";
import { LeaveSettingsService } from "../services/leaves/leave-settings.service";
import { LeaveLedgerService } from "../services/leaves/leave-ledger.service";
import { LEAVE_ROLE_PERMISSIONS } from "../services/seed.service";

const argValue = (name: string) => {
    const index = process.argv.indexOf(name);
    return index === -1 ? undefined : process.argv[index + 1];
};

async function run(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI is not set in environment");
        process.exit(1);
    }
    await mongoose.connect(mongoUri);

    const slug = argValue("--company");
    const companies = await CompanyModel.find(slug ? { slug } : {}, { _id: 1, name: 1 }).lean();
    const year = String(new Date().getUTCFullYear());

    for (const company of companies) {
        const companyId = String(company._id);
        const superAdminRole = await RoleModel.findOne({ company: company._id, role: DefaultUserRoles.SUPER_ADMIN })
            .select("_id")
            .lean();
        const owner = await UserModel.findOne({
            company: company._id,
            isActive: true,
            ...(superAdminRole ? { role: superAdminRole._id } : {}),
        })
            .select("_id")
            .lean();
        if (!owner) {
            console.warn(`  [SKIP] "${company.name}": no active user to record as creator`);
            continue;
        }
        const ownerId = String(owner._id);

        const types = await RequestTypeConfigService.ensureSystemTypes(companyId, ownerId);
        await LeaveSettingsService.seedDefaults(companyId, ownerId, year);

        let rolesUpdated = 0;
        for (const [role, permissions] of Object.entries(LEAVE_ROLE_PERMISSIONS)) {
            if (!permissions.length) {
                continue;
            }
            const result = await RoleModel.updateMany(
                { company: company._id, role, isSystemRole: true },
                { $addToSet: { permissions: { $each: permissions } } },
            );
            rolesUpdated += result.modifiedCount;
        }

        const grants = await LeaveLedgerService.ensureEntitlements(companyId, year);
        console.log(
            `  [OK]   "${company.name}": request types added ${types.length}, roles updated ${rolesUpdated}, ` +
                `grants posted for ${year}: ${grants}`,
        );
    }

    await mongoose.disconnect();
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
