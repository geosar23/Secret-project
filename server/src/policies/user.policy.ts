import { PermissionKeys, PermissionScopes } from "../enums/permissions.enum";
import { AccessContext } from "../interfaces/permission.interface";
import { IUser, IUserPopulated } from "../interfaces/user.interface";
import { buildActorContext, getEffectivePermissions, matchesWildcard } from "../utils/permission-checker";
import { FilterQuery } from "mongoose";
import { buildSearchAccessQuery } from "./search-access.policy";

/**
 * Builds a MongoDB filter that limits which users the actor can see in list endpoints.
 * Returns null when the actor has no list visibility for users.
 */
export function buildUserSearchAccessQuery(actorUser: IUserPopulated): FilterQuery<IUser> | null {
    return buildSearchAccessQuery<IUser>(actorUser, {
        permissions: {
            all: PermissionKeys.USERS_MANAGEMENT_WRITE_ALL,
            readAll: PermissionKeys.USERS_MANAGEMENT_READ_ALL,
            readDepartment: PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT,
            readCountry: PermissionKeys.USERS_MANAGEMENT_READ_COUNTRY,
            readDepartmentCountry: PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT_COUNTRY,
            readManaged: PermissionKeys.USERS_MANAGEMENT_READ_MANAGED,
            readSelf: PermissionKeys.USERS_MANAGEMENT_READ_SELF,
        },
        fields: {
            company: "company",
            department: "department",
            country: "country",
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
export function canAccessUserByScope(
    actor: AccessContext["actor"],
    target: IUserPopulated,
    scope: PermissionScopes,
): boolean {
    switch (scope) {
        case PermissionScopes.ALL:
            return true;

        case PermissionScopes.DEPARTMENT:
            return (
                !!actor.departmentId &&
                actor.departmentId === target.employmentTitle?.subDepartment?.department?._id.toString()
            );

        case PermissionScopes.COUNTRY:
            // Requires countryId on both actor and target (populated from company doc).
            return !!actor.countryId && actor.countryId === target.country?.toString();

        case PermissionScopes.DEPARTMENT_COUNTRY:
            return (
                !!actor.departmentId &&
                actor.departmentId === target.employmentTitle?.subDepartment?.department?._id.toString() &&
                !!actor.countryId &&
                actor.countryId === target.country?.toString()
            );

        case PermissionScopes.MANAGED:
            // Actor is the direct manager of the target.
            return target.manager?.toString() === actor.id;

        case PermissionScopes.SELF:
            return actor.id === target._id?.toString();

        default:
            return false;
    }
}

/**
 * Scope-aware access check for a category.
 * Iterates permission keys from broadest to narrowest scope.
 * Multiple permissions are additive (OR semantics) — any passing scope grants access.
 */
function checkScopedAccess(
    actorUser: IUserPopulated,
    targetUser: IUserPopulated,
    scopePairs: [string, PermissionScopes][],
): boolean {
    const effective = getEffectivePermissions(actorUser);
    const actorCtx = buildActorContext(actorUser);

    for (const [permKey, scope] of scopePairs) {
        if (matchesWildcard(effective, permKey)) {
            if (scope === PermissionScopes.ALL) {
                return true;
            }
            if (canAccessUserByScope(actorCtx, targetUser, scope)) {
                return true;
            }
        }
    }

    return false;
}

/** Can the actor read a target user (usersManagement category)? */
export function canViewUser(actorUser: IUserPopulated, targetUser: IUserPopulated): boolean {
    return checkScopedAccess(actorUser, targetUser, [
        [PermissionKeys.USERS_MANAGEMENT_READ_ALL, PermissionScopes.ALL],
        [PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USERS_MANAGEMENT_READ_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USERS_MANAGEMENT_READ_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USERS_MANAGEMENT_READ_SELF, PermissionScopes.SELF],
    ]);
}

/** Can the actor fully manage (read + write) a target user (usersManagement category)? */
export function canManageUser(actorUser: IUserPopulated, targetUser: IUserPopulated): boolean {
    return checkScopedAccess(actorUser, targetUser, [
        [PermissionKeys.USERS_MANAGEMENT_WRITE_ALL, PermissionScopes.ALL],
        [PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USERS_MANAGEMENT_WRITE_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USERS_MANAGEMENT_WRITE_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USERS_MANAGEMENT_WRITE_SELF, PermissionScopes.SELF],
    ]);
}

/** Can the actor read a target user's profile (userProfile category)? */
export function canViewUserProfile(actorUser: IUserPopulated, targetUser: IUserPopulated): boolean {
    return checkScopedAccess(actorUser, targetUser, [
        [PermissionKeys.USER_PROFILE_READ_ALL, PermissionScopes.ALL],
        [PermissionKeys.USER_PROFILE_READ_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USER_PROFILE_READ_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USER_PROFILE_READ_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USER_PROFILE_READ_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USER_PROFILE_READ_SELF, PermissionScopes.SELF],
    ]);
}

/** Can the actor write (edit) a target user's profile (userProfile:write:{scope})? */
export function canWriteUserProfile(actorUser: IUserPopulated, targetUser: IUserPopulated): boolean {
    return checkScopedAccess(actorUser, targetUser, [
        [PermissionKeys.USER_PROFILE_WRITE_ALL, PermissionScopes.ALL],
        [PermissionKeys.USER_PROFILE_WRITE_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USER_PROFILE_WRITE_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USER_PROFILE_WRITE_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USER_PROFILE_WRITE_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USER_PROFILE_WRITE_SELF, PermissionScopes.SELF],
    ]);
}

/**
 * Can the actor write a specific profile section for a target user?
 * Accepts the section's write permission keys (all scopes) to check against.
 *
 * Parent-category permissions (userProfile:write:{scope} and userProfile:*:{scope})
 * are automatically satisfied via the matchesWildcard parent-category check, so
 * only the section-specific scope pairs need to be supplied.
 *
 * Example usage:
 *   canWriteUserProfileSection(actor, target, [
 *     [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_ALL, PermissionScopes.ALL],
 *     [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_COUNTRY, PermissionScopes.COUNTRY],
 *     ...
 *   ])
 */
export function canWriteUserProfileSection(
    actorUser: IUserPopulated,
    targetUser: IUserPopulated,
    sectionScopePairs: [string, PermissionScopes][],
): boolean {
    return checkScopedAccess(actorUser, targetUser, sectionScopePairs);
}

/** Can the actor write the identity section of a target user's profile? */
export function canWriteUserProfileIdentity(actorUser: IUserPopulated, targetUser: IUserPopulated): boolean {
    return canWriteUserProfileSection(actorUser, targetUser, [
        [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_ALL, PermissionScopes.ALL],
        [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USER_PROFILE_IDENTITY_WRITE_SELF, PermissionScopes.SELF],
    ]);
}

/** Can the actor write the contact section of a target user's profile? */
export function canWriteUserProfileContact(actorUser: IUserPopulated, targetUser: IUserPopulated): boolean {
    return canWriteUserProfileSection(actorUser, targetUser, [
        [PermissionKeys.USER_PROFILE_CONTACT_WRITE_ALL, PermissionScopes.ALL],
        [PermissionKeys.USER_PROFILE_CONTACT_WRITE_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USER_PROFILE_CONTACT_WRITE_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USER_PROFILE_CONTACT_WRITE_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USER_PROFILE_CONTACT_WRITE_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USER_PROFILE_CONTACT_WRITE_SELF, PermissionScopes.SELF],
    ]);
}

/** Can the actor write the employment section of a target user's profile? */
export function canWriteUserProfileEmployment(actorUser: IUserPopulated, targetUser: IUserPopulated): boolean {
    return canWriteUserProfileSection(actorUser, targetUser, [
        [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_ALL, PermissionScopes.ALL],
        [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USER_PROFILE_EMPLOYMENT_WRITE_SELF, PermissionScopes.SELF],
    ]);
}

/** Can the actor write the education section of a target user's profile? */
export function canWriteUserProfileEducation(actorUser: IUserPopulated, targetUser: IUserPopulated): boolean {
    return canWriteUserProfileSection(actorUser, targetUser, [
        [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_ALL, PermissionScopes.ALL],
        [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USER_PROFILE_EDUCATION_WRITE_SELF, PermissionScopes.SELF],
    ]);
}

/** Can the actor write the compensation section of a target user's profile? */
export function canWriteUserProfileCompensation(actorUser: IUserPopulated, targetUser: IUserPopulated): boolean {
    return canWriteUserProfileSection(actorUser, targetUser, [
        [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_ALL, PermissionScopes.ALL],
        [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_DEPARTMENT, PermissionScopes.DEPARTMENT],
        [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_COUNTRY, PermissionScopes.COUNTRY],
        [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_DEPARTMENT_COUNTRY, PermissionScopes.DEPARTMENT_COUNTRY],
        [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_MANAGED, PermissionScopes.MANAGED],
        [PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_SELF, PermissionScopes.SELF],
    ]);
}
