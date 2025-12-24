import { PermissionKeys } from "../enums/permissions.enum";
import { AccessContext } from "../interfaces/permission.interface";
import { IUser } from "../interfaces/user.interface";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function canViewUser(ctx: AccessContext<IUser>): boolean {
    const { actor, resource } = ctx;

    if (actor.permissions.has(PermissionKeys.USERS_MANAGEMENT_READ_ALL)) {
        return true;
    }

    if (actor.permissions.has(PermissionKeys.USERS_MANAGEMENT_READ_SELF) && actor.id === resource._id?.toString()) {
        return true;
    }

    if (
        actor.permissions.has(PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT) &&
        actor.departmentId &&
        actor.departmentId === resource.department?._id?.toString()
    ) {
        return true;
    }

    return false;
}
