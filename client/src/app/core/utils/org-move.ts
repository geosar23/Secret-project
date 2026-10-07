import { IOrgMoveResolution, IOrgMoveUser, OrgMoveAction, OrgMoveOperation } from "../interfaces/org-move.interface";

/** A user's choice while the wizard is open; ids are empty strings until picked. */
export interface OrgMoveChoice {
    action: OrgMoveAction;
    subDepartmentId: string;
    titleId: string;
}

export const defaultChoice = (action: OrgMoveAction = "follow"): OrgMoveChoice => ({
    action,
    subDepartmentId: "",
    titleId: "",
});

const isSubDepartmentOperation = (operation: OrgMoveOperation): boolean =>
    operation === "moveSubDepartment" || operation === "mergeSubDepartment";

/** What a "reassign" needs for this user: a sub-department, a title, or both. */
export function reassignNeeds(
    operation: OrgMoveOperation,
    user: IOrgMoveUser,
): { subDepartment: boolean; title: boolean } {
    if (!isSubDepartmentOperation(operation)) {
        return { subDepartment: false, title: true };
    }
    return { subDepartment: true, title: user.relation === "primary" && !!user.titleId };
}

/** Why a user's choice is incomplete, or null when it can be sent. */
export function choiceProblem(operation: OrgMoveOperation, user: IOrgMoveUser, choice: OrgMoveChoice): string | null {
    if (choice.action !== "reassign") {
        return null;
    }
    const needs = reassignNeeds(operation, user);
    if (needs.subDepartment && !choice.subDepartmentId) {
        return "Choose a sub-department";
    }
    if (needs.title && !choice.titleId) {
        return "Choose an employment title";
    }
    return null;
}

export function toResolution(
    operation: OrgMoveOperation,
    user: IOrgMoveUser,
    choice: OrgMoveChoice,
): IOrgMoveResolution {
    if (choice.action !== "reassign") {
        return { userId: user.id, action: choice.action };
    }
    const needs = reassignNeeds(operation, user);
    return {
        userId: user.id,
        action: "reassign",
        reassignTo: {
            ...(needs.subDepartment ? { subDepartmentId: choice.subDepartmentId } : {}),
            ...(needs.title ? { titleId: choice.titleId } : {}),
        },
    };
}

/** Users whose choice is still incomplete, and users the current user may not change. */
export function blockers(
    operation: OrgMoveOperation,
    users: readonly IOrgMoveUser[],
    choices: Readonly<Record<string, OrgMoveChoice>>,
): { incomplete: number; forbidden: number } {
    return {
        incomplete: users.filter(u => choiceProblem(operation, u, choices[u.id] ?? defaultChoice())).length,
        forbidden: users.filter(u => !u.canManage).length,
    };
}
