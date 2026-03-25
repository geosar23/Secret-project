import { PermissionKeys, PermissionScopes } from "../enums/permissions.enum";
import { AccessContext } from "../interfaces/permission.interface";
import { IUser } from "../interfaces/user.interface";
import { buildActorContext, getEffectivePermissions, matchesWildcard } from "../utils/permission-checker";
import { toIdString } from "../utils/general.util";
import { FilterQuery } from "mongoose";
import { buildSearchAccessQuery } from "./search-access.policy";

/**
 * Builds a MongoDB filter that limits which users the actor can see in list endpoints.
 * Returns null when the actor has no list visibility for users.
 */
export function buildUserSearchAccessQuery(actorUser: IUser): FilterQuery<IUser> | null {
    return buildSearchAccessQuery<IUser>(actorUser, {
        permissions: {
            all: PermissionKeys.ALL,
            readAll: PermissionKeys.USERS_MANAGEMENT_READ_ALL,
            readCompany: PermissionKeys.USERS_MANAGEMENT_READ_COMPANY,
            readDepartment: PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT,
            readCountry: PermissionKeys.USERS_MANAGEMENT_READ_COUNTRY,
            readDepartmentCountry: PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT_COUNTRY,
            readManaged: PermissionKeys.USERS_MANAGEMENT_READ_MANAGED,
            readSelf: PermissionKeys.USERS_MANAGEMENT_READ_SELF,
            readOwn: PermissionKeys.USERS_MANAGEMENT_READ_OWN,
        },
        fields: {
            company: "company",
            department: "department",
            country: "countryId",
            manager: "manager",
            id: "_id",
        },
    });
}

// Backwards-compatible alias; remove after call sites migrate.
export const buildUserVisibilityFilter = buildUserSearchAccessQuery;

/**
 * Check whether the actor's scope restriction is satisfied for a specific target user.
 *
 * COUNTRY / DEPARTMENT_COUNTRY scopes require `actor.countryId` to be populated
 * externally (e.g. from the actor's company document) — if absent they return false.
 */
export function canAccessUserByScope(actor: AccessContext["actor"], target: IUser, scope: PermissionScopes): boolean {
    switch (scope) {
        case PermissionScopes.ALL:
            return true;

        case PermissionScopes.COMPANY:
            return !!actor.companyId && actor.companyId === toIdString(target.company);

        case PermissionScopes.DEPARTMENT:
            return !!actor.departmentId && actor.departmentId === toIdString(target.department);

        case PermissionScopes.COUNTRY:
            // Requires countryId on both actor and target (populated from company doc).
            return (
                !!actor.countryId &&
                actor.countryId === toIdString((target as IUser & { countryId?: unknown }).countryId)
            );

        case PermissionScopes.DEPARTMENT_COUNTRY:
            return (
                !!actor.departmentId &&
                actor.departmentId === toIdString(target.department) &&
                !!actor.countryId &&
                actor.countryId === toIdString((target as IUser & { countryId?: unknown }).countryId)
            );

        case PermissionScopes.MANAGED:
            // Actor is the direct manager of the target.
            return toIdString(target.manager) === actor.id;

        case PermissionScopes.OWN:
            // "own" — actor's company is the owning entity (same as company scope here).
            return !!actor.companyId && actor.companyId === toIdString(target.company);

        case PermissionScopes.SELF:
            return actor.id === toIdString(target._id);

        default:
            return false;
    }
}

/**
 * Scope-aware access check for a category.
 * Iterates permission keys from broadest to narrowest scope.
 * Multiple permissions are additive (OR semantics) — any passing scope grants access.
 */
function checkScopedAccess(actorUser: IUser, targetUser: IUser, scopePairs: [string, PermissionScopes][]): boolean {
    const effective = getEffectivePermissions(actorUser);
    const actorCtx = buildActorContext(actorUser);

    for (const [permKey, scope] of scopePairs) {
        if (matchesWildcard(effective, permKey)) {
            if (scope === PermissionScopes.ALL) return true;
            if (canAccessUserByScope(actorCtx, targetUser, scope)) return true;
        }
    }

    return false;
}

/** Can the actor read a target user (usersManagement category)? */
export function canViewUser(actorUser: IUser, targetUser: IUser): boolean {
    return checkScopedAccess(actorUser, targetUser, [
        [PermissionKeys.USERS_MANAGEMENT_READ_ALL, PermissionScopes.ALL],
        [PermissionKeys.USERS_MANAGEMENT_READ_COMPANY, PermissionScopes.COMPANY],
        [PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USERS_MANAGEMENT_READ_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USERS_MANAGEMENT_READ_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USERS_MANAGEMENT_READ_OWN, PermissionScopes.OWN],
        [PermissionKeys.USERS_MANAGEMENT_READ_SELF, PermissionScopes.SELF],
    ]);
}

/** Can the actor fully manage (read + write) a target user (usersManagement category)? */
export function canManageUser(actorUser: IUser, targetUser: IUser): boolean {
    return checkScopedAccess(actorUser, targetUser, [
        [PermissionKeys.USERS_MANAGEMENT_ALL_ALL, PermissionScopes.ALL],
        [PermissionKeys.USERS_MANAGEMENT_ALL_COMPANY, PermissionScopes.COMPANY],
        [PermissionKeys.USERS_MANAGEMENT_ALL_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USERS_MANAGEMENT_ALL_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USERS_MANAGEMENT_ALL_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USERS_MANAGEMENT_ALL_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USERS_MANAGEMENT_ALL_OWN, PermissionScopes.OWN],
        [PermissionKeys.USERS_MANAGEMENT_ALL_SELF, PermissionScopes.SELF],
    ]);
}

/** Can the actor read a target user's profile (userProfile category)? */
export function canViewUserProfile(actorUser: IUser, targetUser: IUser): boolean {
    return checkScopedAccess(actorUser, targetUser, [
        [PermissionKeys.USER_PROFILE_READ_ALL, PermissionScopes.ALL],
        [PermissionKeys.USER_PROFILE_READ_COMPANY, PermissionScopes.COMPANY],
        [PermissionKeys.USER_PROFILE_READ_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USER_PROFILE_READ_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USER_PROFILE_READ_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USER_PROFILE_READ_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USER_PROFILE_READ_OWN, PermissionScopes.OWN],
        [PermissionKeys.USER_PROFILE_READ_SELF, PermissionScopes.SELF],
    ]);
}

/** Can the actor fully manage a target user's profile (userProfile category)? */
export function canManageUserProfile(actorUser: IUser, targetUser: IUser): boolean {
    return checkScopedAccess(actorUser, targetUser, [
        [PermissionKeys.USER_PROFILE_ALL_ALL, PermissionScopes.ALL],
        [PermissionKeys.USER_PROFILE_ALL_COMPANY, PermissionScopes.COMPANY],
        [PermissionKeys.USER_PROFILE_ALL_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USER_PROFILE_ALL_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USER_PROFILE_ALL_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USER_PROFILE_ALL_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USER_PROFILE_ALL_OWN, PermissionScopes.OWN],
        [PermissionKeys.USER_PROFILE_ALL_SELF, PermissionScopes.SELF],
    ]);
}
