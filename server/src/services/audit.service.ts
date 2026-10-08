import { Types } from "mongoose";
import { AUDITED_ENTITIES, AuditedEntity } from "../config/audited-entities";
import { IAuditChange } from "../interfaces/audit-log.interface";
import { auditLogRepository } from "../repositories/audit-log.repository";

export interface AuditEntry {
    actor: string | "system";
    /** Must be listed in AUDITED_ENTITIES; anything else does not compile. */
    entity: AuditedEntity;
    entityId: Types.ObjectId | string;
    action: "create" | "update" | "delete" | (string & {});
    /** Snapshot before the change (omit on create). */
    before?: Record<string, unknown>;
    /** Snapshot after the change (omit on delete). */
    after?: Record<string, unknown>;
}

// ObjectIds and Dates become their JSON form so they compare and store predictably.
const normalize = (value: unknown): unknown => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
const sameValue = (a: unknown, b: unknown) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

export function diffChanges(
    entity: AuditedEntity,
    before: Record<string, unknown> = {},
    after: Record<string, unknown> = {},
) {
    const config = AUDITED_ENTITIES[entity];
    const skip = new Set(config.ignore);
    const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changes: IAuditChange[] = [];

    for (const field of fields) {
        if (skip.has(field) || sameValue(before[field], after[field])) {
            continue;
        }
        if (config.redact.includes(field)) {
            changes.push({ field, redacted: true });
        } else {
            changes.push({ field, from: normalize(before[field]), to: normalize(after[field]) });
        }
    }
    return changes;
}

// Minimal slice of P1-29: retention is not defined yet.
export const AuditService = {
    /** Records the field-level changes of an audited entity. Writes nothing when an update changed nothing. */
    record: async (companyId: string, entry: AuditEntry): Promise<void> => {
        const changes = diffChanges(entry.entity, entry.before, entry.after);
        if (entry.action === "update" && !changes.length) {
            return;
        }
        await auditLogRepository(companyId).create({
            actor: entry.actor === "system" ? "system" : new Types.ObjectId(entry.actor),
            entity: entry.entity,
            entityId: new Types.ObjectId(String(entry.entityId)),
            action: entry.action,
            changes,
        });
    },
};
