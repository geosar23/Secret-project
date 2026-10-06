import { FilterQuery } from "mongoose";
import { IUserPopulated } from "../interfaces/user.interface";
import { getEffectivePermissions, getUserDepartmentIds, matchesWildcard } from "../utils/permission-checker";

interface SearchAccessPermissions {
    all: string;
    readAll: string;
    readDepartment?: string;
    readCountry?: string;
    readDepartmentCountry?: string;
    readManaged?: string;
    readSelf?: string;
}

interface SearchAccessFields {
    /** Document fields holding a department id; a document matches when any of them contains one of the actor's. */
    department: string[];
    country: string;
    manager: string;
    id: string;
}

interface BuildSearchAccessQueryOptions {
    permissions: SearchAccessPermissions;
    fields: SearchAccessFields;
}

/**
 * Generic query builder for search/list endpoints with permission scopes.
 *
 * Returns:
 * - {} when actor has all/read-all access
 * - scoped $or filter when actor has partial read scopes
 * - null when actor has no search/list access
 */
export function buildSearchAccessQuery<TDocument>(
    actorUser: IUserPopulated,
    options: BuildSearchAccessQueryOptions,
): FilterQuery<TDocument> | null {
    const effective = getEffectivePermissions(actorUser);

    if (matchesWildcard(effective, options.permissions.all)) {
        return {};
    }

    if (matchesWildcard(effective, options.permissions.readAll)) {
        return {};
    }

    const scopeFilters: FilterQuery<TDocument>[] = [];
    const actorDepartmentIds = getUserDepartmentIds(actorUser);
    const departmentFilter = (): FilterQuery<TDocument> =>
        ({
            $or: options.fields.department.map(field => ({ [field]: { $in: actorDepartmentIds } })),
        }) as unknown as FilterQuery<TDocument>;

    if (options.permissions.readDepartment && matchesWildcard(effective, options.permissions.readDepartment)) {
        if (actorDepartmentIds.length > 0 && options.fields.department.length > 0) {
            scopeFilters.push(departmentFilter());
        }
    }

    if (options.permissions.readCountry && matchesWildcard(effective, options.permissions.readCountry)) {
        const actorCountryId = actorUser.country;
        if (actorCountryId && options.fields.country) {
            scopeFilters.push({ [options.fields.country]: actorCountryId } as unknown as FilterQuery<TDocument>);
        }
    }

    if (
        options.permissions.readDepartmentCountry &&
        matchesWildcard(effective, options.permissions.readDepartmentCountry)
    ) {
        const actorCountryId = actorUser.country;
        if (
            actorDepartmentIds.length > 0 &&
            options.fields.department.length > 0 &&
            actorCountryId &&
            options.fields.country
        ) {
            scopeFilters.push({
                $and: [departmentFilter(), { [options.fields.country]: actorCountryId }],
            } as unknown as FilterQuery<TDocument>);
        }
    }

    if (options.permissions.readManaged && matchesWildcard(effective, options.permissions.readManaged)) {
        if (actorUser._id && options.fields.manager) {
            scopeFilters.push({ [options.fields.manager]: actorUser._id } as unknown as FilterQuery<TDocument>);
        }
    }

    if (options.permissions.readSelf && matchesWildcard(effective, options.permissions.readSelf)) {
        if (actorUser._id && options.fields.id) {
            scopeFilters.push({ [options.fields.id]: actorUser._id } as unknown as FilterQuery<TDocument>);
        }
    }

    if (scopeFilters.length === 0) {
        return null;
    }

    if (scopeFilters.length === 1) {
        return scopeFilters[0];
    }

    return { $or: scopeFilters } as unknown as FilterQuery<TDocument>;
}
