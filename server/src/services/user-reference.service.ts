/* eslint-disable no-unused-vars */
import { roleRepository } from "../repositories/role.repository";
import { countryRepository } from "../repositories/country.repository";
import { employmentTitleRepository } from "../repositories/employment-title.repository";
import { levelRepository } from "../repositories/level.repository";
import { officeRepository } from "../repositories/office.repository";
import { userRepository } from "../repositories/user.repository";

export interface UserReferenceCheck {
    invalidField?: string;
    rolePermissions?: string[];
}

/**
 * Verifies that every reference on a user payload points to a record in the actor's company.
 * Null/undefined values (unset) are skipped.
 */
export async function validateUserReferences(
    companyId: string,
    data: Record<string, unknown>,
): Promise<UserReferenceCheck> {
    const id = (field: string): string | null => {
        const v = data[field];
        return typeof v === "string" ? v : null;
    };

    const exists = async (field: string, lookup: (refId: string) => PromiseLike<unknown>): Promise<boolean> => {
        const refId = id(field);
        if (!refId) {
            return true;
        }
        return !!(await lookup(refId));
    };

    const checks: [string, (refId: string) => PromiseLike<unknown>][] = [
        ["country", refId => countryRepository(companyId).findById(refId).select("_id").lean()],
        ["employmentTitle", refId => employmentTitleRepository(companyId).findById(refId).select("_id").lean()],
        ["level", refId => levelRepository(companyId).findById(refId).select("_id").lean()],
        ["office", refId => officeRepository(companyId).findById(refId).select("_id").lean()],
        ["manager", refId => userRepository(companyId).findById(refId).select("_id").lean()],
        ["hrRepresentative", refId => userRepository(companyId).findById(refId).select("_id").lean()],
    ];

    for (const [field, lookup] of checks) {
        if (!(await exists(field, lookup))) {
            return { invalidField: field };
        }
    }

    const roleId = id("role");
    if (roleId) {
        const role = await roleRepository(companyId).findById(roleId).select("permissions").lean();
        if (!role) {
            return { invalidField: "role" };
        }
        return { rolePermissions: (role.permissions as unknown as string[]) ?? [] };
    }

    return {};
}
