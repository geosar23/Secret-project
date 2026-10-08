export interface AuditedEntityConfig {
    /** Fields whose change is recorded but whose values are never stored (secrets, salary). */
    redact: string[];
    /** Fields that are never compared or stored (timestamps, versioning noise). */
    ignore: string[];
}

const defineAuditedEntities = <T extends Record<string, AuditedEntityConfig>>(config: T) => config;

/**
 * Opt-in list of entities that are audited through AuditService.record.
 *
 * Only mutable records belong here (a user whose fields get overwritten). Records that carry their own
 * append-only timeline, like Requests with `actionsHistory`, are intentionally not listed.
 *
 * To audit another collection: add it here, then call AuditService.record from the service that changes it
 * (repository updates bypass Mongoose hooks, so there is no automatic capture).
 */
export const AUDITED_ENTITIES = defineAuditedEntities({
    user: {
        redact: ["password", "salary"],
        ignore: ["createdAt", "updatedAt", "__v"],
    },
});

export type AuditedEntity = keyof typeof AUDITED_ENTITIES;
