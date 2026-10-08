import { Schema, model } from "mongoose";
import { ILeaveCompanySettings } from "../interfaces/leave.interface";

const LeaveCompanySettingsSchema = new Schema<ILeaveCompanySettings>(
    {
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        hireYearEntitlement: { type: String, enum: ["prorated", "full", "none"], default: "prorated", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "Users" },
    },
    { timestamps: true, collection: "LeaveCompanySettings", autoIndex: false },
);

// One settings document per company
LeaveCompanySettingsSchema.index({ company: 1 }, { unique: true });

export const LeaveCompanySettingsModel = model<ILeaveCompanySettings>(
    "LeaveCompanySettings",
    LeaveCompanySettingsSchema,
);
