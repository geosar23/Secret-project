/**
 * Pure rules for what happens to a user's department / sub-department / title assignments when an
 * org entity is moved or merged. No database access: the service loads the data and feeds it in.
 */

export type OrgMoveOperation = "moveSubDepartment" | "moveTitle" | "mergeSubDepartment" | "mergeTitle";
export type OrgMoveAction = "follow" | "reassign" | "clear";

export interface OrgState {
    primaryDepartment?: string;
    primarySubDepartment?: string;
    secondaryDepartments: string[];
    secondarySubDepartments: string[];
    employmentTitle?: string;
}

/** Org hierarchy as it will be AFTER the move or merge has been applied. */
export interface OrgHierarchy {
    deptOfSub: ReadonlyMap<string, string>;
    subOfTitle: ReadonlyMap<string, string>;
    activeSubs: ReadonlySet<string>;
    activeTitles: ReadonlySet<string>;
}

export interface OrgResolution {
    action: OrgMoveAction;
    reassignTo?: { subDepartmentId?: string; titleId?: string };
}

export interface OrgMoveInput {
    operation: OrgMoveOperation;
    sourceId: string;
    targetId: string;
    /** Department the source sub-department belonged to before the move (sub-department operations). */
    sourceDepartmentId?: string;
}

export type OrgResolveResult = { state: OrgState } | { error: string };

const uniq = (ids: string[]): string[] => [...new Set(ids)];

export const isSubDepartmentOperation = (op: OrgMoveOperation): boolean =>
    op === "moveSubDepartment" || op === "mergeSubDepartment";

/** Departments a state needs for its secondary sub-departments are added; the primary is never duplicated. */
export function normalize(state: OrgState, h: OrgHierarchy): OrgState {
    const secondarySubDepartments = uniq(state.secondarySubDepartments).filter(id => id !== state.primarySubDepartment);
    const needed = secondarySubDepartments.map(id => h.deptOfSub.get(id)).filter((d): d is string => !!d);
    const secondaryDepartments = uniq([...state.secondaryDepartments, ...needed]).filter(
        id => id !== state.primaryDepartment,
    );
    return { ...state, secondaryDepartments, secondarySubDepartments };
}

/** Drops a secondary department no sub-department of the user lives in any more. */
function pruneUnused(state: OrgState, h: OrgHierarchy, departmentId?: string): OrgState {
    if (!departmentId || !state.secondaryDepartments.includes(departmentId)) {
        return state;
    }
    const subs = [state.primarySubDepartment, ...state.secondarySubDepartments].filter((s): s is string => !!s);
    if (subs.some(s => h.deptOfSub.get(s) === departmentId)) {
        return state;
    }
    return { ...state, secondaryDepartments: state.secondaryDepartments.filter(id => id !== departmentId) };
}

/**
 * Makes `subId` the primary sub-department (and its department the primary department).
 * The previous primary department stays as a secondary only while the user still has a sub-department in it.
 */
function setPrimary(state: OrgState, subId: string, h: OrgHierarchy, keepOldSub: boolean): OrgState {
    const oldSub = state.primarySubDepartment;
    const oldDept = state.primaryDepartment;
    const next: OrgState = {
        ...state,
        primarySubDepartment: subId,
        primaryDepartment: h.deptOfSub.get(subId),
        secondaryDepartments: [...state.secondaryDepartments],
        secondarySubDepartments: [...state.secondarySubDepartments],
    };
    if (oldDept && oldDept !== next.primaryDepartment) {
        next.secondaryDepartments.push(oldDept);
    }
    if (keepOldSub && oldSub && oldSub !== subId) {
        next.secondarySubDepartments.push(oldSub);
    }
    return pruneUnused(normalize(next, h), h, oldDept);
}

function resolveSubDepartment(
    input: OrgMoveInput,
    state: OrgState,
    resolution: OrgResolution,
    h: OrgHierarchy,
): OrgResolveResult {
    const { sourceId, targetId } = input;
    const isMerge = input.operation === "mergeSubDepartment";
    const isPrimary = state.primarySubDepartment === sourceId;
    const fromDepartment = input.sourceDepartmentId;

    switch (resolution.action) {
        case "follow": {
            if (isPrimary) {
                return { state: setPrimary(state, isMerge ? targetId : sourceId, h, false) };
            }
            const secondarySubDepartments = isMerge
                ? state.secondarySubDepartments.map(id => (id === sourceId ? targetId : id))
                : state.secondarySubDepartments;
            return { state: pruneUnused(normalize({ ...state, secondarySubDepartments }, h), h, fromDepartment) };
        }

        case "reassign": {
            const subId = resolution.reassignTo?.subDepartmentId;
            if (!subId || subId === sourceId || !h.deptOfSub.has(subId) || !h.activeSubs.has(subId)) {
                return { error: "Choose an active sub-department to reassign to" };
            }
            if (isPrimary) {
                const titleId = resolution.reassignTo?.titleId;
                if (state.employmentTitle) {
                    if (!titleId || !h.activeTitles.has(titleId) || h.subOfTitle.get(titleId) !== subId) {
                        return { error: "Choose an active employment title in the new sub-department" };
                    }
                }
                const next = setPrimary(state, subId, h, false);
                return { state: titleId && state.employmentTitle ? { ...next, employmentTitle: titleId } : next };
            }
            const secondarySubDepartments = state.secondarySubDepartments.map(id => (id === sourceId ? subId : id));
            return { state: pruneUnused(normalize({ ...state, secondarySubDepartments }, h), h, fromDepartment) };
        }

        case "clear": {
            if (isPrimary) {
                return { state: { ...state, primarySubDepartment: undefined, employmentTitle: undefined } };
            }
            const secondarySubDepartments = state.secondarySubDepartments.filter(id => id !== sourceId);
            return { state: pruneUnused(normalize({ ...state, secondarySubDepartments }, h), h, fromDepartment) };
        }
    }
}

function resolveTitle(
    input: OrgMoveInput,
    state: OrgState,
    resolution: OrgResolution,
    h: OrgHierarchy,
): OrgResolveResult {
    const withTitle = (titleId: string): OrgResolveResult => {
        const subId = h.subOfTitle.get(titleId);
        if (!subId) {
            return { error: "The employment title no longer exists" };
        }
        const next = { ...state, employmentTitle: titleId };
        return { state: state.primarySubDepartment === subId ? next : setPrimary(next, subId, h, true) };
    };

    switch (resolution.action) {
        case "follow":
            return withTitle(input.operation === "mergeTitle" ? input.targetId : input.sourceId);

        case "reassign": {
            const titleId = resolution.reassignTo?.titleId;
            if (!titleId || titleId === input.sourceId || !h.activeTitles.has(titleId)) {
                return { error: "Choose an active employment title to reassign to" };
            }
            return withTitle(titleId);
        }

        case "clear":
            return { state: { ...state, employmentTitle: undefined } };
    }
}

/** Computes a user's new assignments for the chosen resolution, or the reason it can't be applied. */
export function resolveUserMove(
    input: OrgMoveInput,
    state: OrgState,
    resolution: OrgResolution,
    h: OrgHierarchy,
): OrgResolveResult {
    return isSubDepartmentOperation(input.operation)
        ? resolveSubDepartment(input, state, resolution, h)
        : resolveTitle(input, state, resolution, h);
}

/** The hierarchy rules every stored user state has to satisfy. Returns a message, or null when valid. */
export function validateOrgState(state: OrgState, h: OrgHierarchy): string | null {
    const { primaryDepartment, primarySubDepartment, employmentTitle } = state;
    if (primarySubDepartment && !primaryDepartment) {
        return "A primary sub-department requires a primary department";
    }
    if (primarySubDepartment && h.deptOfSub.get(primarySubDepartment) !== primaryDepartment) {
        return "The primary sub-department does not belong to the primary department";
    }
    if (employmentTitle && !primarySubDepartment) {
        return "An employment title requires a primary sub-department";
    }
    if (employmentTitle && h.subOfTitle.get(employmentTitle) !== primarySubDepartment) {
        return "The employment title does not belong to the primary sub-department";
    }
    if (primaryDepartment && state.secondaryDepartments.includes(primaryDepartment)) {
        return "A secondary department cannot be the primary one";
    }
    if (primarySubDepartment && state.secondarySubDepartments.includes(primarySubDepartment)) {
        return "A secondary sub-department cannot be the primary one";
    }
    const departments = new Set([primaryDepartment, ...state.secondaryDepartments]);
    if (state.secondarySubDepartments.some(s => !departments.has(h.deptOfSub.get(s)))) {
        return "A secondary sub-department is outside the user's departments";
    }
    return null;
}
