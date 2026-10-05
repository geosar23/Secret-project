/**
 * Seed Demo Company
 *
 * Creates a company with default roles, a starter org structure
 * (1 country, 5 departments with a sub-department and title each, levels, 1 office)
 * and a super admin user.
 *
 * Usage (from server/):
 *   npm run seed:demo -- --name "Acme" --slug acme --email admin@acme.com [--password <pw>]
 *
 * Without --password a random one is generated and printed once.
 */

import mongoose from "mongoose";
import { randomBytes } from "crypto";
import dotenv from "dotenv";
dotenv.config();

import { seedDemoCompany } from "../services/seed.service";

function arg(name: string): string | undefined {
    const index = process.argv.indexOf(`--${name}`);
    return index !== -1 ? process.argv[index + 1] : undefined;
}

async function run(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI is not set in environment");
        process.exit(1);
    }

    const companyName = arg("name") ?? "Demo Company";
    const slug = (arg("slug") ?? companyName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const adminEmail = arg("email") ?? `admin@${slug}.com`;
    const providedPassword = arg("password");
    const adminPassword = providedPassword ?? randomBytes(9).toString("base64url");

    await mongoose.connect(mongoUri);
    const result = await seedDemoCompany({ companyName, slug, adminEmail, adminPassword });

    console.log(`Created company "${companyName}" (${result.companyId})`);
    console.log(result.counts);
    console.log(`Login: ${adminEmail}${providedPassword ? "" : ` / ${adminPassword}`}`);

    await mongoose.disconnect();
}

run().catch(async err => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    await mongoose.disconnect();
    process.exit(1);
});
