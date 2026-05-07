/**
 * One-off script: delete every GOD role whose company is NOT OG_COMPANY_ID.
 *
 * Run from the server/ directory:
 *   npx ts-node src/scripts/cleanup-god-roles.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { RoleModel } from "../models/role.model";
import { DefaultUserRoles } from "../enums/user-role.enum";

const OG_COMPANY_ID = process.env.OG_COMPANY_ID;

if (!OG_COMPANY_ID) {
    console.error("OG_COMPANY_ID is not set in environment. Aborting.");
    process.exit(1);
}

async function run(): Promise<void> {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to MongoDB");

    // Find GOD roles that belong to a company other than OG_COMPANY_ID
    const strayGodRoles = await RoleModel.find({
        role: DefaultUserRoles.GOD,
        company: { $ne: new mongoose.Types.ObjectId(OG_COMPANY_ID) },
    })
        .select("_id company name")
        .lean();

    if (strayGodRoles.length === 0) {
        console.log("No stray GOD roles found. Nothing to delete.");
        await mongoose.disconnect();
        return;
    }

    console.log(`Found ${strayGodRoles.length} stray GOD role(s):`);
    for (const r of strayGodRoles) {
        console.log(`  _id=${r._id}  company=${r.company}  name=${r.name}`);
    }

    const ids = strayGodRoles.map(r => r._id);

    // Use collection-level deleteMany to bypass the isSystemRole pre-hook guard
    const result = await RoleModel.collection.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted ${result.deletedCount} stray GOD role(s).`);

    await mongoose.disconnect();
    console.log("Done.");
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
