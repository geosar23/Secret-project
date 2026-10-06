/* eslint-disable no-unused-vars */
import { Types } from "mongoose";
import { roleRepository } from "../repositories/role.repository";
import { countryRepository } from "../repositories/country.repository";
import { departmentRepository } from "../repositories/department.repository";
import { subDepartmentRepository } from "../repositories/sub-department.repository";
import { employmentTitleRepository } from "../repositories/employment-title.repository";
import { levelRepository } from "../repositories/level.repository";
import { officeRepository } from "../repositories/office.repository";
import { userRepository } from "../repositories/user.repository";

type RefField =
    | "country"
    | "primaryDepartment"
    | "primarySubDepartment"
    | "employmentTitle"
    | "level"
    | "office"
    | "manager"
    | "hrRepresentative";

type SecondaryField = "secondaryDepartments" | "secondarySubDepartments";

/** Reference ids the user already holds; unchanged ones may stay even if the target is now inactive. */
export type CurrentUserRefs = Partial<Record<RefField | "role", string | undefined>> &
    Partial<Record<SecondaryField, string[]>>;

export interface UserReferenceCheck {
    invalidField?: string;
    message?: string;
    rolePermissions?: string[];
}

interface RefDoc {
    _id: Types.ObjectId;
    country?: Types.ObjectId;
    department?: Types.ObjectId;
    subDepartment?: Types.ObjectId;
}

const secondaryFinders: Record<
    SecondaryField,
    (companyId: string, filter: Record<string, unknown>) => PromiseLike<unknown>
> = {
    secondaryDepartments: (companyId, f) => departmentRepository(companyId).findOne(f).select("_id").lean(),
    secondarySubDepartments: (companyId, f) => subDepartmentRepository(companyId).findOne(f).select("_id").lean(),
};

/**
 * Verifies that every reference on a user payload points to an active record of the actor's company
 * (unchanged references are exempt from the active check), and that office and HR representative
 * belong to the user's country when both are known. Primary/secondary department and sub-department
 * must form a consistent hierarchy, and the employment title must belong to the primary sub-department.
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
    const requestedList = (field: SecondaryField): string[] | undefined => {
        const v = data[field];
        return Array.isArray(v) ? v.map(String) : undefined;
    };

    const finders: Record<RefField, (filter: Record<string, unknown>) => PromiseLike<unknown>> = {
        country: f => countryRepository(companyId).findOne(f).select("_id").lean(),
        primaryDepartment: f => departmentRepository(companyId).findOne(f).select("_id").lean(),
        primarySubDepartment: f => subDepartmentRepository(companyId).findOne(f).select("_id department").lean(),
        employmentTitle: f => employmentTitleRepository(companyId).findOne(f).select("_id subDepartment").lean(),
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

    for (const field of Object.keys(secondaryFinders) as SecondaryField[]) {
        const ids = requestedList(field);
        if (!ids) {
            continue;
        }
        if (new Set(ids).size !== ids.length) {
            return { invalidField: field, message: "Duplicate secondary department entries" };
        }
        const unchanged = new Set(current[field] ?? []);
        for (const id of ids) {
            const filter = unchanged.has(id) ? { _id: id } : { _id: id, isActive: true };
            if (!(await secondaryFinders[field](companyId, filter))) {
                return { invalidField: field };
            }
        }
    }

    const orgFields = [
        "primaryDepartment",
        "primarySubDepartment",
        "employmentTitle",
        "secondaryDepartments",
        "secondarySubDepartments",
    ];
    if (orgFields.some(f => f in data)) {
        const loadDoc = async (field: RefField, refId: string): Promise<RefDoc | null> =>
            docs[field] && String(docs[field]?._id) === refId
                ? (docs[field] as RefDoc)
                : ((await finders[field]({ _id: refId })) as RefDoc | null);

        const primaryDept = effective("primaryDepartment");
        const primarySub = effective("primarySubDepartment");
        const titleId = effective("employmentTitle");
        const secondaryDepts = requestedList("secondaryDepartments") ?? current.secondaryDepartments ?? [];
        const secondarySubs = requestedList("secondarySubDepartments") ?? current.secondarySubDepartments ?? [];

        if (primarySub && !primaryDept) {
            return {
                invalidField: "primaryDepartment",
                message: "A primary sub-department requires a primary department",
            };
        }
        if (titleId && !primarySub) {
            return {
                invalidField: "primarySubDepartment",
                message: "A primary sub-department is required when an employment title is set",
            };
        }
        if (primarySub) {
            const subDoc = await loadDoc("primarySubDepartment", primarySub);
            if (String(subDoc?.department) !== primaryDept) {
                return {
                    invalidField: "primarySubDepartment",
                    message: "The primary sub-department does not belong to the primary department",
                };
            }
        }
        if (titleId) {
            const titleDoc = await loadDoc("employmentTitle", titleId);
            if (String(titleDoc?.subDepartment) !== primarySub) {
                return {
                    invalidField: "employmentTitle",
                    message: "The employment title does not belong to the primary sub-department",
                };
            }
        }
        if (primaryDept && secondaryDepts.includes(primaryDept)) {
            return {
                invalidField: "secondaryDepartments",
                message: "A secondary department cannot be the primary one",
            };
        }
        if (primarySub && secondarySubs.includes(primarySub)) {
            return {
                invalidField: "secondarySubDepartments",
                message: "A secondary sub-department cannot be the primary one",
            };
        }
        if (new Set(secondarySubs).size !== secondarySubs.length) {
            return { invalidField: "secondarySubDepartments", message: "Duplicate secondary sub-department entries" };
        }
        if (secondarySubs.length > 0) {
            const allowedDepts = new Set([primaryDept, ...secondaryDepts].filter(Boolean) as string[]);
            const subs = (await subDepartmentRepository(companyId)
                .find({ _id: { $in: secondarySubs } })
                .select("_id department")
                .lean()) as unknown as RefDoc[];
            if (subs.some(sub => !allowedDepts.has(String(sub.department)))) {
                return {
                    invalidField: "secondarySubDepartments",
                    message: "Each secondary sub-department must belong to one of the user's departments",
                };
            }
        }
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
