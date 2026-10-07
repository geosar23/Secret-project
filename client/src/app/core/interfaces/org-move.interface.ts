export type OrgMoveOperation = "moveSubDepartment" | "moveTitle" | "mergeSubDepartment" | "mergeTitle";
export type OrgMoveAction = "follow" | "reassign" | "clear";

export interface IOrgMoveRequest {
    operation: OrgMoveOperation;
    sourceId: string;
    targetId: string;
}

export interface IOrgMoveUser {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    /** How the user is tied to the entity being changed. */
    relation: "primary" | "secondary" | "title";
    titleId?: string;
    titleName?: string;
    /** False when the current user may not change this user; the change cannot be applied then. */
    canManage: boolean;
}

export interface IOrgMovePreview {
    operation: OrgMoveOperation;
    source: { id: string; name: string };
    target: { id: string; name: string };
    childTitleCount: number;
    users: IOrgMoveUser[];
}

export interface IOrgMoveResolution {
    userId: string;
    action: OrgMoveAction;
    reassignTo?: { subDepartmentId?: string; titleId?: string };
}

export interface IOrgMoveApplyRequest extends IOrgMoveRequest {
    resolutions: IOrgMoveResolution[];
}

export interface IOrgMoveApplyResult {
    moveId: string;
    updated: number;
}
