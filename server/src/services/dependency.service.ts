import { Types } from "mongoose";
import { UserModel } from "../models/user.model";
import { SubDepartmentModel } from "../models/sub-department.model";
import { EmploymentTitleModel } from "../models/employment-title.model";
import { OfficeModel } from "../models/office.model";

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
    const company = new Types.ObjectId(companyId);
    const entityId = new Types.ObjectId(id);
    const activeUsers = (field: string) => UserModel.countDocuments({ company, [field]: entityId, isActive: true });

    const found: string[] = [];
    const add = (count: number, singular: string, plural?: string) => {
        if (count > 0) {
            found.push(label(count, singular, plural));
        }
    };

    switch (entity) {
        case "department":
            add(
                await SubDepartmentModel.countDocuments({ company, department: entityId, isActive: true }),
                "sub-department",
            );
            break;
        case "subDepartment":
            add(
                await EmploymentTitleModel.countDocuments({ company, subDepartment: entityId, isActive: true }),
                "employment title",
            );
            break;
        case "employmentTitle":
            add(await activeUsers("employmentTitle"), "user");
            break;
        case "country":
            add(await activeUsers("country"), "user");
            add(await OfficeModel.countDocuments({ company, country: entityId, isActive: true }), "office");
            break;
        case "level":
            add(await activeUsers("level"), "user");
            break;
        case "office":
            add(await activeUsers("office"), "user");
            break;
        case "role":
            add(await activeUsers("role"), "user");
            break;
    }

    return found.length > 0
        ? `Cannot deactivate: ${found.join(" and ")} still depend on it. Reassign them first.`
        : null;
}
