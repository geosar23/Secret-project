import { FilterQuery } from "mongoose";
import { IUser } from "../interfaces/user.interface";
import { ISubDepartment } from "../interfaces/sub-department.interface";
import { IEmploymentTitle } from "../interfaces/employment-title.interface";
import { IOffice } from "../interfaces/office.interface";
import { userRepository } from "../repositories/user.repository";
import { subDepartmentRepository } from "../repositories/sub-department.repository";
import { employmentTitleRepository } from "../repositories/employment-title.repository";
import { officeRepository } from "../repositories/office.repository";

export type DependencyEntity =
    | "department"
    | "subDepartment"
    | "employmentTitle"
    | "country"
    | "level"
    | "office"
    | "role";

const label = (count: number, singular: string, plural = `${singular}s`) =>
    `${count} active ${count === 1 ? singular : plural}`;

/**
 * Returns a message describing the active records that still depend on an entity, or null if none.
 * Used to block deactivation until the dependencies have been moved elsewhere.
 */
export async function findActiveDependents(
    entity: DependencyEntity,
    id: string,
    companyId: string,
): Promise<string | null> {
    const activeUsersUsing = (field: keyof IUser) =>
        userRepository(companyId).count({ [field]: id, isActive: true } as FilterQuery<IUser>);

    const found: string[] = [];
    const add = (count: number, singular: string, plural?: string) => {
        if (count > 0) {
            found.push(label(count, singular, plural));
        }
    };

    const activeUsersInAny = (fields: (keyof IUser)[]) =>
        userRepository(companyId).count({
            $or: fields.map(field => ({ [field]: id })),
            isActive: true,
        } as FilterQuery<IUser>);

    switch (entity) {
        case "department":
            add(await activeUsersInAny(["primaryDepartment", "secondaryDepartments"]), "user");
            add(
                await subDepartmentRepository(companyId).count({
                    department: id,
                    isActive: true,
                } as FilterQuery<ISubDepartment>),
                "sub-department",
            );
            break;
        case "subDepartment":
            add(await activeUsersInAny(["primarySubDepartment", "secondarySubDepartments"]), "user");
            add(
                await employmentTitleRepository(companyId).count({
                    subDepartment: id,
                    isActive: true,
                } as FilterQuery<IEmploymentTitle>),
                "employment title",
            );
            break;
        case "employmentTitle":
            add(await activeUsersUsing("employmentTitle"), "user");
            break;
        case "country":
            add(await activeUsersUsing("country"), "user");
            add(
                await officeRepository(companyId).count({ country: id, isActive: true } as FilterQuery<IOffice>),
                "office",
            );
            break;
        case "level":
            add(await activeUsersUsing("level"), "user");
            break;
        case "office":
            add(await activeUsersUsing("office"), "user");
            break;
        case "role":
            add(await activeUsersUsing("role"), "user");
            break;
    }

    return found.length > 0
        ? `Cannot deactivate: ${found.join(" and ")} still depend on it. Reassign them first.`
        : null;
}

/**
 * Users store their department and sub-department directly, so moving a sub-department to another
 * department or a title to another sub-department would leave those users inconsistent.
 * Returns a message when any user (active or not) still references the entity, or null.
 */
export async function findReparentBlocker(
    entity: "subDepartment" | "employmentTitle",
    id: string,
    companyId: string,
): Promise<string | null> {
    const filter =
        entity === "subDepartment"
            ? { $or: [{ primarySubDepartment: id }, { secondarySubDepartments: id }] }
            : { employmentTitle: id };
    const count = await userRepository(companyId).count(filter as FilterQuery<IUser>);
    if (count === 0) {
        return null;
    }
    const parent = entity === "subDepartment" ? "department" : "sub-department";
    return `Cannot move to another ${parent}: ${count} ${count === 1 ? "user is" : "users are"} assigned. Reassign them first.`;
}
