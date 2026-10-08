/**
 * Create the approval engine indexes.
 *
 * Models use `autoIndex: false`, so indexes declared in the schemas (inbox counts, the unique
 * partial index that stops duplicate tasks) only exist after this script has run.
 * Limited to the approval collections on purpose; it does not touch existing collections.
 *
 * Usage (from server/):
 *   npx ts-node src/scripts/syncApprovalIndexes.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { ApprovalFlowModel } from "../models/approval-flow.model";
import { RequestModel } from "../models/request.model";
import { AuditLogModel } from "../models/audit-log.model";

async function run(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI is not set in environment");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    for (const model of [ApprovalFlowModel, RequestModel, AuditLogModel]) {
        const dropped = await model.syncIndexes();
        console.log(`${model.collection.name}: indexes synced (dropped: ${dropped.length})`);
    }
    await mongoose.disconnect();
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
