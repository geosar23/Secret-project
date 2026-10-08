import { Schema, model } from "mongoose";
import { ICompany } from "../interfaces/company.interface";
import { Model, FilterQuery, UpdateQuery, QueryOptions } from "mongoose";

const LogoSchema = new Schema(
    {
        bucket: { type: String, required: true },
        path: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        uploadedAt: { type: Date, required: true },
    },
    { _id: false },
);

const CompanySchema = new Schema<ICompany>(
    {
        name: { type: String, required: true, unique: true, trim: true },
        slug: { type: String, required: true, unique: true, trim: true },
        isActive: { type: Boolean, default: true, required: true, trim: true },
        logo: { type: LogoSchema, required: false },
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
        company: companyId,
    });

    return {
        find(filter?: FilterQuery<T>) {
            return Model.find(withCompany(filter));
        },

        findOne(filter?: FilterQuery<T>) {
            return Model.findOne(withCompany(filter));
        },

        findById(id: string) {
            return Model.findOne({ _id: id, company: companyId });
        },

        create(data: Partial<T>) {
            return Model.create({ ...data, company: companyId });
        },

        insertMany(items: Partial<T>[]) {
            return Model.insertMany(items.map(item => ({ ...item, company: companyId })));
        },

        updateOne(filter: FilterQuery<T>, update: Partial<T>) {
            return Model.updateOne(withCompany(filter), update);
        },

        // Atomic conditional update: resolves to null when the filter (for example a status guard) no longer matches.
        findOneAndUpdate(filter: FilterQuery<T>, update: UpdateQuery<T>, options: QueryOptions<T> = {}) {
            return Model.findOneAndUpdate(withCompany(filter), update, { new: true, ...options });
        },

        updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>) {
            return Model.updateMany(withCompany(filter), update);
        },

        deleteOne(filter: FilterQuery<T>) {
            return Model.deleteOne(withCompany(filter));
        },

        count(filter?: FilterQuery<T>) {
            return Model.countDocuments(withCompany(filter));
        },
    };
}
