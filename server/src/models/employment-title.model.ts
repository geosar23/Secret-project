import { Schema, model } from "mongoose";
import { IEmploymentTitle } from "../interfaces/employment-title.interface";

const EmploymentTitleSchema = new Schema<IEmploymentTitle>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: "" },
        subDepartment: { type: Schema.Types.ObjectId, ref: "SubDepartments", required: true, index: true },
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true, index: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: "EmploymentTitles",
        autoIndex: false,
    },
);

EmploymentTitleSchema.index({ company: 1, subDepartment: 1, name: 1 }, { unique: true });

export const EmploymentTitleModel = model<IEmploymentTitle>("EmploymentTitles", EmploymentTitleSchema);
