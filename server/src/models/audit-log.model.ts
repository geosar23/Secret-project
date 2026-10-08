import { Schema, model } from "mongoose";
import { IAuditLog } from "../interfaces/audit-log.interface";

const AuditLogSchema = new Schema<IAuditLog>(
    {
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        actor: { type: Schema.Types.Mixed, required: true }, // user ObjectId or the string "system"
        entity: { type: String, required: true, trim: true },
        entityId: { type: Schema.Types.ObjectId, required: true },
        action: { type: String, required: true, trim: true },
        changes: { type: Schema.Types.Mixed, default: [] }, // IAuditChange[]
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: "AuditLogs", autoIndex: false },
);

AuditLogSchema.index({ company: 1, entity: 1, entityId: 1, createdAt: 1 });

export const AuditLogModel = model<IAuditLog>("AuditLogs", AuditLogSchema);
