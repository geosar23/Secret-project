import { Types } from "mongoose";
import { OrgMoveOperation, OrgState } from "../services/org-move.resolver";

/** Previous values of everything a move touched, enough to put it back. */
export interface IOrgMoveSnapshot {
    entities: { model: "SubDepartments" | "EmploymentTitles"; id: string; set: Record<string, unknown> }[];
    users: { id: string; state: OrgState }[];
}

export interface IOrgMove {
    _id?: Types.ObjectId;
    company: Types.ObjectId;
    operation: OrgMoveOperation;
    source: Types.ObjectId;
    target: Types.ObjectId;
    actor: Types.ObjectId;
    affectedUsers: number;
    snapshot: IOrgMoveSnapshot;
    /** `${kind}:${id}` -> updatedAt (ms) right after the move, used to refuse an undo over later edits. */
    after: Record<string, number>;
    undoneAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
