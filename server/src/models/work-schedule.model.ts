import { Schema, model } from "mongoose";
import { IWorkSchedule } from "../interfaces/leave.interface";

const WorkScheduleSchema = new Schema<IWorkSchedule>(
    {
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        name: { type: String, required: true, trim: true },
        country: { type: Schema.Types.ObjectId, ref: "Countries" },
        workingDays: {
            type: [Number],
            required: true,
            validate: {
                validator: (days: number[]) =>
                    days.length > 0 &&
                    new Set(days).size === days.length &&
                    days.every(day => Number.isInteger(day) && day >= 0 && day <= 6),
                message: "workingDays must be distinct weekdays between 0 (Sunday) and 6 (Saturday)",
            },
        },
        isDefault: { type: Boolean, default: false },
    },
    { timestamps: true, collection: "WorkSchedules", autoIndex: false },
);

WorkScheduleSchema.index({ company: 1, country: 1 });

export const WorkScheduleModel = model<IWorkSchedule>("WorkSchedules", WorkScheduleSchema);
