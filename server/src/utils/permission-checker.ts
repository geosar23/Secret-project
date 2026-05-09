import { Types } from "mongoose";
import { IUser } from "../interfaces/user.interface";
import { AccessContext, PermissionKey } from "../interfaces/permission.interface";
import { PermissionKeys } from "../enums/permissions.enum";

/**
 * Shape of a populated role object on IUser.
 * IUser.role is typed as ObjectId but is populated at runtime.
 */
interface PopulatedRole {
    _id: Types.ObjectId;
    permissions: string[];
}

/**
 * Compute effective permissions for a user:
 *   (role.permissions ∪ grantedPermissions) ∖ revokedPermissions
 *
 * Handles the mismatch between IUser types (ObjectId[]) and actual
 * DB storage (string[]) via runtime casts.
 */
export function getEffectivePermissions(user: IUser): Set<string> {
    const role = user.role as unknown as PopulatedRole;
    const rolePerms: string[] = Array.isArray(role?.permissions) ? role.permissions : [];
    const granted: string[] = (user.grantedPermissions as unknown as string[]) ?? [];
    const revoked: string[] = (user.revokedPermissions as unknown as string[]) ?? [];

    const effective = new Set([...rolePerms, ...granted]);
    for (const p of revoked) {
        effective.delete(p);
    }
    return effective;
}

/**
 * Build the actor portion of an AccessContext from a fully-populated IUser.
 * Exposed so policy functions can construct a context without re-computing
 * effective permissions.
 */
export function buildActorContext(actor: IUser): AccessContext["actor"] {
    const effective = getEffectivePermissions(actor);
    return {
        id: actor._id!.toString(),
        companyId: (actor.company as unknown as Types.ObjectId | undefined)?.toString() ?? "",
        departmentId: actor.department?.toString(),
        countryId: actor.country?.toString(),
        managerId: actor.manager?.toString(),
        permissions: effective as unknown as Set<PermissionKey>,
    };
}

/**
 * Check whether an effective permission set covers a required key,
 * honouring wildcard segments ("*") and parent-category hierarchy.
 *
 * Permission format: `{category}:{action}:{scope}`
 *
 * A granted key covers a required key when every segment of the granted
 * key either matches exactly or is the wildcard "*".
 * We test all 8 wildcard combinations so that e.g. "*:*:*",
 * "usersManagement:*:*" and "usersManagement:read:*" all satisfy
 * a required "usersManagement:read:department".
 *
 * For sub-categories (e.g. "userProfile.identity"), a parent-category
 * permission (e.g. "userProfile:write:country") also covers the sub-category
 * permission ("userProfile.identity:write:country").
 */
export function matchesWildcard(effectivePerms: Set<string>, required: string): boolean {
    const parts = required.split(":");
    if (parts.length !== 3) {
        return false;
    }

    const [cat, action, scope] = parts;
    const W = "*";

    const candidates = [
        `${W}:${W}:${W}`,
        `${cat}:${W}:${W}`,
        `${W}:${action}:${W}`,
        `${W}:${W}:${scope}`,
        `${cat}:${action}:${W}`,
        `${cat}:${W}:${scope}`,
        `${W}:${action}:${scope}`,
        `${cat}:${action}:${scope}`,
    ];

    if (candidates.some(c => effectivePerms.has(c))) {
        return true;
    }

    // If this is a sub-category (e.g. "userProfile.identity"), also check
    // whether any parent-category permission covers it.
    // e.g. "userProfile:write:country" covers "userProfile.identity:write:country"
    const dotIdx = cat.lastIndexOf(".");
    if (dotIdx !== -1) {
        const parentCat = cat.substring(0, dotIdx);
        const parentCandidates = [
            `${parentCat}:${W}:${W}`,
            `${parentCat}:${action}:${W}`,
            `${parentCat}:${W}:${scope}`,
            `${parentCat}:${action}:${scope}`,
        ];
        return parentCandidates.some(c => effectivePerms.has(c));
    }

    return false;
}

export const PermissionChecker = {
    getEffectivePermissions,

    /**
     * Returns true if the user holds the required permission (wildcard-aware).
     * The optional `resource` parameter is reserved for future policy-based
     * scope checks (e.g. canViewUser in user.policy.ts).
     */
    canAccess: async (user: IUser, permission: string): Promise<boolean> => {
        const effective = getEffectivePermissions(user);
        return matchesWildcard(effective, permission);
    },

    /** Returns true if the user holds ANY of the given permissions. */
    hasAnyPermission: async (user: IUser, permissions: string[]): Promise<boolean> => {
        const effective = getEffectivePermissions(user);
        return permissions.some(perm => matchesWildcard(effective, perm));
    },

    /** Returns true if the user holds ALL of the given permissions. */
    hasAllPermissions: async (user: IUser, permissions: string[]): Promise<boolean> => {
        const effective = getEffectivePermissions(user);
        return permissions.every(perm => matchesWildcard(effective, perm));
    },

    hasPermissionInCategory: async (user: IUser, category: string): Promise<boolean> => {
        const effective = getEffectivePermissions(user);
        return Array.from(effective).some(perm => {
            const [permCategory] = perm.split(":");
            return permCategory === category || permCategory === "*";
        });
    },
};

export function isValidPermissionKey(permissionKey: string): boolean {
    return Object.values(PermissionKeys).includes(
        permissionKey as (typeof PermissionKeys)[keyof typeof PermissionKeys],
    );
}
