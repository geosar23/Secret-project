import { Schema, model } from "mongoose";
import { IDepartment } from "../interfaces/department.interface";

const DepartmentSchema = new Schema<IDepartment>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: "" },
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true, index: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: "Departments",
        autoIndex: false,
    },
);

DepartmentSchema.index({ company: 1, name: 1 }, { unique: true });

export const DepartmentModel = model<IDepartment>("Departments", DepartmentSchema);
