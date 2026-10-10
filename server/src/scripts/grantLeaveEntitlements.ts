/**
 * Post the yearly leave grants for every company. Idempotent (one grant per user, leave type and year), so it can
 * run from cron on 01/01 and be re-run safely after a failure. Users hired during the year get a pro-rated grant.
 *
 * Usage (from server/):
 *   npx ts-node src/scripts/grantLeaveEntitlements.ts [--year 2027]
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { CompanyModel } from "../models/company.model";
import { LeaveLedgerService } from "../services/leaves/leave-ledger.service";

async function run(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI is not set in environment");
        process.exit(1);
    }
    const yearIndex = process.argv.indexOf("--year");
    const year = yearIndex === -1 ? String(new Date().getUTCFullYear()) : process.argv[yearIndex + 1];

    await mongoose.connect(mongoUri);
    const companies = await CompanyModel.find({ isActive: true }, { _id: 1, name: 1 }).lean();
    for (const company of companies) {
        const posted = await LeaveLedgerService.ensureEntitlements(String(company._id), year);
        console.log(`  "${company.name}": ${posted} grant(s) posted for ${year}`);
    }
    await mongoose.disconnect();
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
