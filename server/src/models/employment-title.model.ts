import { Schema, model } from "mongoose";
import { IEmploymentTitle } from "../interfaces/employment-title.interface";

const EmploymentTitleSchema = new Schema<IEmploymentTitle>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: "" },
        subDepartment: { type: Schema.Types.ObjectId, ref: "SubDepartments", required: true },
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: "EmploymentTitles",
        autoIndex: false,
    },
);

export const EmploymentTitleModel = model<IEmploymentTitle>("EmploymentTitles", EmploymentTitleSchema);
