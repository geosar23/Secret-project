/**
 * Backfill User Departments
 *
 * Users used to store only an employment title, with department derived through
 * title -> sub-department -> department. They now store primaryDepartment and
 * primarySubDepartment directly. For every user that has a title but no primary
 * sub-department, this script copies both from the title's hierarchy.
 * Idempotent: users that already have a primary sub-department are skipped.
 *
 * Usage (from server/):
 *   npx ts-node src/scripts/backfillUserDepartments.ts            # dry run
 *   npx ts-node src/scripts/backfillUserDepartments.ts --apply    # write changes
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { UserModel } from "../models/user.model";
import { SubDepartmentModel } from "../models/sub-department.model";
import { EmploymentTitleModel } from "../models/employment-title.model";

async function run(): Promise<void> {
    const apply = process.argv.includes("--apply");
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI is not set in environment");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log(apply ? "Applying changes.\n" : "Dry run (pass --apply to write).\n");

    const [subDepts, titles] = await Promise.all([
        SubDepartmentModel.find({}, { department: 1 }).lean(),
        EmploymentTitleModel.find({}, { subDepartment: 1 }).lean(),
    ]);
    const deptOfSub = new Map(subDepts.map(s => [String(s._id), s.department]));
    const subOfTitle = new Map(titles.map(t => [String(t._id), t.subDepartment]));

    const users = await UserModel.find(
        { employmentTitle: { $exists: true, $ne: null }, primarySubDepartment: { $exists: false } },
        { employmentTitle: 1 },
    ).lean();

    let updated = 0;
    let skipped = 0;
    for (const user of users) {
        const subDepartment = subOfTitle.get(String(user.employmentTitle));
        const department = subDepartment ? deptOfSub.get(String(subDepartment)) : undefined;
        if (!subDepartment || !department) {
            console.warn(`  [Users] ${user._id} — title ${user.employmentTitle} has no resolvable hierarchy, skipped`);
            skipped++;
            continue;
        }
        if (apply) {
            await UserModel.updateOne(
                { _id: user._id },
                { primarySubDepartment: subDepartment, primaryDepartment: department },
            );
        }
        updated++;
    }

    console.log(`\n${apply ? "Updated" : "Would update"} ${updated} user(s), skipped ${skipped}.`);
    await mongoose.disconnect();
}

run().catch(err => {
    console.error("Backfill failed:", err);
    process.exit(1);
});
