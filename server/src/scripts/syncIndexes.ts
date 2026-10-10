/**
 * Create the indexes of the approval engine and leave collections and the one-time (email link) tokens.
 *
 * Models use `autoIndex: false`, so indexes declared in the schemas (the partial inbox index on pending requests,
 * the unique idempotency key of the leave ledger, unique codes and versions) only exist after this script has run.
 * Limited to these collections on purpose; it does not touch the older collections.
 * Re-run it whenever one of these schemas gains or changes an index.
 *
 * Usage (from server/):
 *   npx ts-node src/scripts/syncIndexes.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { ApprovalFlowModel } from "../models/approval-flow.model";
import { RequestModel } from "../models/request.model";
import { RequestTypeModel } from "../models/request-type.model";
import { AuditLogModel } from "../models/audit-log.model";
import { LeaveTypeModel } from "../models/leave-type.model";
import { LeavePolicyModel } from "../models/leave-policy.model";
import { WorkScheduleModel } from "../models/work-schedule.model";
import { LeaveRequestModel } from "../models/leave-request.model";
import { LeaveLedgerModel } from "../models/leave-ledger.model";
import { OneTimeTokenModel } from "../models/one-time-token.model";
import { LeaveCompanySettingsModel } from "../models/leave-company-settings.model";

const INDEXED_MODELS = [
    ApprovalFlowModel,
    RequestModel,
    RequestTypeModel,
    AuditLogModel,
    LeaveTypeModel,
    LeavePolicyModel,
    WorkScheduleModel,
    LeaveRequestModel,
    LeaveLedgerModel,
    LeaveCompanySettingsModel,
    OneTimeTokenModel,
];

async function run(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI is not set in environment");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    for (const model of INDEXED_MODELS) {
        const dropped = await model.syncIndexes();
        console.log(`${model.collection.name}: indexes synced (dropped: ${dropped.length})`);
    }
    await mongoose.disconnect();
}

if (require.main === module) {
    run().catch(error => {
        console.error(error);
        process.exit(1);
    });
}
