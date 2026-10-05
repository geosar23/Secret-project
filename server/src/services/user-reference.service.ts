/* eslint-disable no-unused-vars */
import { Types } from "mongoose";
import { roleRepository } from "../repositories/role.repository";
import { countryRepository } from "../repositories/country.repository";
import { employmentTitleRepository } from "../repositories/employment-title.repository";
import { levelRepository } from "../repositories/level.repository";
import { officeRepository } from "../repositories/office.repository";
import { userRepository } from "../repositories/user.repository";

type RefField = "country" | "employmentTitle" | "level" | "office" | "manager" | "hrRepresentative";

/** Reference ids the user already holds; unchanged ones may stay even if the target is now inactive. */
export type CurrentUserRefs = Partial<Record<RefField | "role", string | undefined>>;

export interface UserReferenceCheck {
    invalidField?: string;
    message?: string;
    rolePermissions?: string[];
}

interface RefDoc {
    _id: Types.ObjectId;
    country?: Types.ObjectId;
}

/**
 * Verifies that every reference on a user payload points to an active record of the actor's company
 * (unchanged references are exempt from the active check), and that office and HR representative
 * belong to the user's country when both are known.
 * Keys missing from `data` mean "unchanged"; null means "cleared".
 */
export async function validateUserReferences(
    companyId: string,
    data: Record<string, unknown>,
    current: CurrentUserRefs = {},
): Promise<UserReferenceCheck> {
    const requested = (field: string): string | undefined => {
        const v = data[field];
        return typeof v === "string" ? v : undefined;
    };
    const effective = (field: RefField): string | undefined => (field in data ? requested(field) : current[field]);

    const finders: Record<RefField, (filter: Record<string, unknown>) => PromiseLike<unknown>> = {
        country: f => countryRepository(companyId).findOne(f).select("_id").lean(),
        employmentTitle: f => employmentTitleRepository(companyId).findOne(f).select("_id").lean(),
        level: f => levelRepository(companyId).findOne(f).select("_id").lean(),
        office: f => officeRepository(companyId).findOne(f).select("_id country").lean(),
        manager: f => userRepository(companyId).findOne(f).select("_id").lean(),
        hrRepresentative: f => userRepository(companyId).findOne(f).select("_id country").lean(),
    };

    const docs: Partial<Record<RefField, RefDoc>> = {};
    for (const field of Object.keys(finders) as RefField[]) {
        const refId = requested(field);
        if (!refId) {
            continue;
        }
        const filter = current[field] === refId ? { _id: refId } : { _id: refId, isActive: true };
        const doc = (await finders[field](filter)) as RefDoc | null;
        if (!doc) {
            return { invalidField: field };
        }
        docs[field] = doc;
    }

    const userCountry = effective("country");
    for (const field of ["office", "hrRepresentative"] as const) {
        const refId = effective(field);
        if (!userCountry || !refId || !(field in data || "country" in data)) {
            continue;
        }
        const doc = docs[field] ?? ((await finders[field]({ _id: refId })) as RefDoc | null);
        if (doc?.country && String(doc.country) !== userCountry) {
            return {
                invalidField: field,
                message:
                    field === "office"
                        ? "The office must be in the user's country"
                        : "The HR representative must be in the user's country",
            };
        }
    }

    const roleId = requested("role");
    if (roleId) {
        const filter = current.role === roleId ? { _id: roleId } : { _id: roleId, isActive: true };
        const role = await roleRepository(companyId).findOne(filter).select("permissions").lean();
        if (!role) {
            return { invalidField: "role" };
        }
        return { rolePermissions: (role.permissions as unknown as string[]) ?? [] };
    }

    return {};
}
