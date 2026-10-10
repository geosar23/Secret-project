import { Schema, model } from "mongoose";
import { ILeaveType } from "../interfaces/leave.interface";

const LeaveTypeSchema = new Schema<ILeaveType>(
    {
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        name: { type: String, required: true, trim: true },
        code: { type: String, required: true, trim: true, uppercase: true },
        color: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "LeaveTypes", autoIndex: false },
);

LeaveTypeSchema.index({ company: 1, code: 1 }, { unique: true });

export const LeaveTypeModel = model<ILeaveType>("LeaveTypes", LeaveTypeSchema);
