import { Schema, model } from "mongoose";
import { ISubDepartment } from "../interfaces/sub-department.interface";

const SubDepartmentSchema = new Schema<ISubDepartment>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: "" },
        department: { type: Schema.Types.ObjectId, ref: "Departments", required: true, index: true },
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true, index: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: "SubDepartments",
        autoIndex: false,
    },
);

SubDepartmentSchema.index({ company: 1, department: 1, name: 1 }, { unique: true });

export const SubDepartmentModel = model<ISubDepartment>("SubDepartments", SubDepartmentSchema);
