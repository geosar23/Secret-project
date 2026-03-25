import { FilterQuery } from "mongoose";
import { IUser } from "../interfaces/user.interface";
import { getEffectivePermissions, matchesWildcard } from "../utils/permission-checker";
import { toIdString } from "../utils/general.util";

interface SearchAccessPermissions {
    all: string;
    readAll: string;
    readCompany?: string;
    readDepartment?: string;
    readCountry?: string;
    readDepartmentCountry?: string;
    readManaged?: string;
    readSelf?: string;
    readOwn?: string;
}

interface SearchAccessFields {
    company: string;
    department?: string;
    country?: string;
    manager?: string;
    id?: string;
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
    actorUser: IUser,
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

    if (options.permissions.readCompany && matchesWildcard(effective, options.permissions.readCompany)) {
        const actorCompanyId = toIdString(actorUser.company);
        if (actorCompanyId) {
            scopeFilters.push({ [options.fields.company]: actorCompanyId } as unknown as FilterQuery<TDocument>);
        }
    }

    if (options.permissions.readDepartment && matchesWildcard(effective, options.permissions.readDepartment)) {
        const actorDepartmentId = toIdString(actorUser.department);
        if (actorDepartmentId && options.fields.department) {
            scopeFilters.push({
                [options.fields.department]: actorDepartmentId,
            } as unknown as FilterQuery<TDocument>);
        }
    }

    if (options.permissions.readCountry && matchesWildcard(effective, options.permissions.readCountry)) {
        const actorCountryId = toIdString((actorUser as IUser & { countryId?: unknown }).countryId);
        if (actorCountryId && options.fields.country) {
            scopeFilters.push({ [options.fields.country]: actorCountryId } as unknown as FilterQuery<TDocument>);
        }
    }

    if (
        options.permissions.readDepartmentCountry &&
        matchesWildcard(effective, options.permissions.readDepartmentCountry)
    ) {
        const actorCountryId = toIdString((actorUser as IUser & { countryId?: unknown }).countryId);
        const actorDepartmentId = toIdString(actorUser.department);
        if (actorDepartmentId && options.fields.department && actorCountryId && options.fields.country) {
            scopeFilters.push({
                $and: [
                    { [options.fields.department]: actorDepartmentId },
                    { [options.fields.country]: actorCountryId },
                ],
            } as unknown as FilterQuery<TDocument>);
        }
    }

    if (options.permissions.readManaged && matchesWildcard(effective, options.permissions.readManaged)) {
        const actorId = toIdString(actorUser._id);
        if (actorId && options.fields.manager) {
            scopeFilters.push({ [options.fields.manager]: actorId } as unknown as FilterQuery<TDocument>);
        }
    }

    if (options.permissions.readSelf && matchesWildcard(effective, options.permissions.readSelf)) {
        const actorId = toIdString(actorUser._id);
        if (actorId && options.fields.id) {
            scopeFilters.push({ [options.fields.id]: actorId } as unknown as FilterQuery<TDocument>);
        }
    }

    if (options.permissions.readOwn && matchesWildcard(effective, options.permissions.readOwn)) {
        const actorCompanyId = toIdString(actorUser.company);
        if (actorCompanyId) {
            scopeFilters.push({ [options.fields.company]: actorCompanyId } as unknown as FilterQuery<TDocument>);
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
