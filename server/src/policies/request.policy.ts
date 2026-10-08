import { PermissionActions, PermissionCategories, PermissionScopes } from "../enums/permissions.enum";
import { IRequest } from "../interfaces/request.interface";
import { IUserPopulated } from "../interfaces/user.interface";
import { buildActorContext, getEffectivePermissions, matchesWildcard } from "../utils/permission-checker";
import { canAccessUserByScope } from "./user.policy";

const SCOPES_WIDEST_FIRST: PermissionScopes[] = [
    PermissionScopes.ALL,
    PermissionScopes.DEPARTMENT,
    PermissionScopes.COUNTRY,
    PermissionScopes.DEPARTMENT_COUNTRY,
    PermissionScopes.MANAGED,
    PermissionScopes.SELF,
];

/**
 * True when the actor holds `{category}:{action}:{scope}` for a scope that covers the subject.
 * `beyondSelf` ignores the `self` scope, for actions on someone else's behalf.
 */
export function hasScopedAccess(
    actor: IUserPopulated,
    subject: IUserPopulated,
    category: PermissionCategories,
    action: PermissionActions,
    options: { beyondSelf?: boolean } = {},
): boolean {
    const effective = getEffectivePermissions(actor);
    const actorCtx = buildActorContext(actor);
    return SCOPES_WIDEST_FIRST.filter(scope => !(options.beyondSelf && scope === PermissionScopes.SELF)).some(
        scope =>
            matchesWildcard(effective, `${category}:${action}:${scope}`) &&
            canAccessUserByScope(actorCtx, subject, scope),
    );
}

/**
 * Who may read a request (plan 8.2, visibility is separate from approval authority): the requester, the subject,
 * anyone currently pending or who acted on it, and scoped viewers through `requests:read` or the type's own read
 * permission (for leave: `leaves:read`).
 */
export function canViewRequest(
    actor: IUserPopulated,
    subject: IUserPopulated,
    request: IRequest,
    typeReadCategory?: PermissionCategories,
): boolean {
    const actorId = String(actor._id);
    const involved =
        String(request.requester) === actorId ||
        String(request.subject) === actorId ||
        request.pendingApprovers.some(id => String(id) === actorId) ||
        request.actionsHistory.some(entry => entry.user !== "system" && String(entry.user) === actorId);
    if (involved) {
        return true;
    }
    if (hasScopedAccess(actor, subject, PermissionCategories.REQUESTS, PermissionActions.READ, { beyondSelf: true })) {
        return true;
    }
    return (
        !!typeReadCategory &&
        hasScopedAccess(actor, subject, typeReadCategory, PermissionActions.READ, { beyondSelf: true })
    );
}
