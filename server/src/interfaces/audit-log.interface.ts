import { Types } from "mongoose";

export interface IAuditChange {
    field: string;
    from?: unknown;
    to?: unknown;
    /** Values are withheld for sensitive fields; only the fact that it changed is kept. */
    redacted?: boolean;
}

export interface IAuditLog {
    _id?: Types.ObjectId;
    company?: Types.ObjectId;
    actor: Types.ObjectId | "system";
    entity: string;
    entityId: Types.ObjectId;
    action: string;
    changes: IAuditChange[];
    createdAt?: Date;
}
