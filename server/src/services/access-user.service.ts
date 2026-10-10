import { IUserPopulated } from "../interfaces/user.interface";
import { userRepository } from "../repositories/user.repository";

/**
 * Loads a user for scope-based policy checks: role populated (effective permissions), while manager, country and
 * departments stay plain ids so the scope comparisons in user.policy work on them.
 */
export async function loadAccessUser(companyId: string, userId: string): Promise<IUserPopulated | null> {
    const user = await userRepository(companyId)
        .findById(userId)
        .populate("role")
        .select(
            "name email role company country manager hrRepresentative primaryDepartment secondaryDepartments " +
                "grantedPermissions revokedPermissions isActive employmentDate workSchedule",
        )
        .lean();
    return user as unknown as IUserPopulated | null;
}
