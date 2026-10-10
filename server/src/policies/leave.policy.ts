import { PermissionActions, PermissionCategories } from "../enums/permissions.enum";
import { IUserPopulated } from "../interfaces/user.interface";
import { hasScopedAccess } from "./request.policy";

const sameUser = (a: IUserPopulated, b: IUserPopulated) => String(a._id) === String(b._id);

/** Submit leave for the subject: own leave needs `leaves:write:self` (or wider); someone else's a scope beyond self. */
export function canWriteLeaveFor(actor: IUserPopulated, subject: IUserPopulated): boolean {
    return hasScopedAccess(actor, subject, PermissionCategories.LEAVES, PermissionActions.WRITE, {
        beyondSelf: !sameUser(actor, subject),
    });
}

/** HR-style authority over someone's leave: `leaves:write` with a scope beyond self that covers the subject. */
export function canManageLeaveOf(actor: IUserPopulated, subject: IUserPopulated): boolean {
    return hasScopedAccess(actor, subject, PermissionCategories.LEAVES, PermissionActions.WRITE, { beyondSelf: true });
}

/** Approval authority, rechecked at decision time. Never over one's own leave. */
export function canApproveLeave(actor: IUserPopulated, subject: IUserPopulated): boolean {
    return (
        !sameUser(actor, subject) &&
        hasScopedAccess(actor, subject, PermissionCategories.LEAVES, PermissionActions.APPROVE)
    );
}

export function canReadLeaveBalances(actor: IUserPopulated, subject: IUserPopulated): boolean {
    return hasScopedAccess(actor, subject, PermissionCategories.LEAVE_BALANCES, PermissionActions.READ);
}
