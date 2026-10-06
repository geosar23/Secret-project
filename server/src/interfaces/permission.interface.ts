import type { PermissionActions, PermissionKeys } from "../enums/permissions.enum";

export type PermissionKey = (typeof PermissionKeys)[keyof typeof PermissionKeys];

/**
 * Context for attribute-based access control
 */
export interface AccessContext<TResource = unknown> {
    actor: {
        id: string;
        companyId: string;
        /** Primary department. */
        departmentId?: string;
        /** Primary department first, then secondaries; scope checks match on any of them. */
        departmentIds?: string[];
        countryId?: string;
        managerId?: string;
        permissions: Set<PermissionKey>;
    };

    resource: TResource;

    action: PermissionActions;
}
