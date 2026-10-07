import { Schema, model } from "mongoose";
import { IOrgMove } from "../interfaces/org-move.interface";

const OrgMoveSchema = new Schema<IOrgMove>(
    {
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true, index: true },
        operation: {
            type: String,
            enum: ["moveSubDepartment", "moveTitle", "mergeSubDepartment", "mergeTitle"],
            required: true,
        },
        source: { type: Schema.Types.ObjectId, required: true },
        target: { type: Schema.Types.ObjectId, required: true },
        actor: { type: Schema.Types.ObjectId, ref: "Users", required: true },
        affectedUsers: { type: Number, required: true },
        snapshot: { type: Schema.Types.Mixed, required: true },
        after: { type: Schema.Types.Mixed, default: {} },
        undoneAt: { type: Date },
    },
    { timestamps: true, collection: "OrgMoves", autoIndex: false, minimize: false },
);

export const OrgMoveModel = model<IOrgMove>("OrgMoves", OrgMoveSchema);
