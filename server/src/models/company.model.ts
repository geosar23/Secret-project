import { Schema, model } from "mongoose";
import { ICompany } from "../interfaces/company.interface";

const CompanySchema = new Schema<ICompany>(
    {
        name: { type: String, required: true, unique: true, trim: true },
        slug: { type: String, required: true, unique: true, trim: true },
        isActive: { type: Boolean, default: true, required: true, trim: true },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
        collection: "Companies", // Use capital C to match MongoDB collection name
        autoIndex: false, // Disable automatic index creation
    },
);

export const CompanyModel = model<ICompany>("Companies", CompanySchema);
