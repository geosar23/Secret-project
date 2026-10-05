import { IUser, IOffice } from "../interfaces/user.interface";
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

/** Offices in the user's country; offices without a country, or a user without one, are never excluded. */
export function officesIn(offices: readonly IOffice[], countryId: string, currentId = ""): IOffice[] {
    return selectable(offices, currentId).filter(o => !countryId || !o.country || refId(o.country) === countryId);
}

/** Active people (managers, HR representatives) from the user's country when both countries are known. */
export function peopleIn(users: readonly IUser[], countryId: string, currentId = ""): IUser[] {
    return selectable(users, currentId).filter(u => !countryId || !u.country || refId(u.country) === countryId);
}
