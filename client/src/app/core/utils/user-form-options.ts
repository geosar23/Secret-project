import { IUser, IOffice } from "../interfaces/user.interface";
import { IDepartment } from "../interfaces/department.interface";
import { ISubDepartment } from "../interfaces/sub-department.interface";
import { IEmploymentTitle } from "../interfaces/employment-title.interface";

interface Selectable {
    _id?: string;
    isActive?: boolean;
}

/** Id of a reference that may be a plain id or a populated object. */
export function refId(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    return (value as { _id?: string } | null | undefined)?._id ?? "";
}

/** Active items only; the item already saved on the record stays selectable even if inactive. */
export function selectable<T extends Selectable>(items: readonly T[], currentId = ""): T[] {
    return items.filter(item => item.isActive !== false || (!!currentId && item._id === currentId));
}

export function subDepartmentsOf(
    subDepartments: readonly ISubDepartment[],
    departmentId: string,
    currentId = "",
): ISubDepartment[] {
    if (!departmentId) {
        return [];
    }
    return selectable(subDepartments, currentId).filter(s => refId(s.department) === departmentId);
}

export function titlesOf(
    titles: readonly IEmploymentTitle[],
    subDepartmentId: string,
    currentId = "",
): IEmploymentTitle[] {
    if (!subDepartmentId) {
        return [];
    }
    return selectable(titles, currentId).filter(t => refId(t.subDepartment) === subDepartmentId);
}

/** Departments a user can additionally belong to: active ones other than the primary (saved ones stay). */
export function secondaryDepartmentsOf(
    departments: readonly IDepartment[],
    primaryId: string,
    currentIds: readonly string[] = [],
): IDepartment[] {
    return departments.filter(
        d => d._id !== primaryId && (d.isActive !== false || (!!d._id && currentIds.includes(d._id))),
    );
}

/** Sub-departments of any of the user's departments, except the primary sub-department (saved ones stay). */
export function secondarySubDepartmentsOf(
    subDepartments: readonly ISubDepartment[],
    departmentIds: readonly string[],
    primarySubId: string,
    currentIds: readonly string[] = [],
): ISubDepartment[] {
    return subDepartments.filter(
        s =>
            s._id !== primarySubId &&
            departmentIds.includes(refId(s.department)) &&
            (s.isActive !== false || (!!s._id && currentIds.includes(s._id))),
    );
}

/** Offices in the user's country; offices without a country, or a user without one, are never excluded. */
export function officesIn(offices: readonly IOffice[], countryId: string, currentId = ""): IOffice[] {
    return selectable(offices, currentId).filter(o => !countryId || !o.country || refId(o.country) === countryId);
}

/** Active people (managers, HR representatives) from the user's country when both countries are known. */
export function peopleIn(users: readonly IUser[], countryId: string, currentId = ""): IUser[] {
    return selectable(users, currentId).filter(u => !countryId || !u.country || refId(u.country) === countryId);
}

/** Drops secondary sub-department ids that no longer belong to one of the user's departments (or became primary). */
export function keepSecondarySubDepartments(
    subDepartments: readonly ISubDepartment[],
    selectedIds: readonly string[],
    departmentIds: readonly string[],
    primarySubId: string,
): string[] {
    return selectedIds.filter(id => {
        const sub = subDepartments.find(s => s._id === id);
        return !!sub && id !== primarySubId && departmentIds.includes(refId(sub.department));
    });
}
