import { Schema, model } from "mongoose";
import { ICompany } from "../interfaces/company.interface";
import { Model, FilterQuery } from "mongoose";

export const CompanyFields = {
    companyId: {
        type: Schema.Types.ObjectId,
        ref: "Companies",
        required: true,
        index: true,
    },
};

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

//Company Factory for company-scoped access
export function companyModel<T>(Model: Model<T>, companyId: string) {
    if (!companyId) {
        throw new Error("companyId is required for company-scoped access");
    }

    const withCompany = (filter: FilterQuery<T> = {}) => ({
        ...filter,
        companyId,
    });

    return {
        find(filter?: FilterQuery<T>) {
            return Model.find(withCompany(filter));
        },

        findOne(filter?: FilterQuery<T>) {
            return Model.findOne(withCompany(filter));
        },

        findById(id: string) {
            return Model.findOne({ _id: id, companyId });
        },

        create(data: Partial<T>) {
            return Model.create({ ...data, companyId });
        },

        updateOne(filter: FilterQuery<T>, update: Partial<T>) {
            return Model.updateOne(withCompany(filter), update);
        },

        deleteOne(filter: FilterQuery<T>) {
            return Model.deleteOne(withCompany(filter));
        },

        count(filter?: FilterQuery<T>) {
            return Model.countDocuments(withCompany(filter));
        },
    };
}
